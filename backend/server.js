const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');

const SECRET_KEY = process.env.JWT_SECRET || 'lab_secret_key_123';

// PostgreSQL connection pool using environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'shoestore',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

const app = express();
app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---- AUTHENTICATION & LOGIN ----
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // A03 & A07: Login SQL Injection + User Enumeration
    // Vulnerable string concatenation matching Juice Shop style bypasses (e.g. admin' --)
    const userCheck = await pool.query(`SELECT * FROM usuarios WHERE username = '${username}'`);
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    const result = await pool.query(`SELECT * FROM usuarios WHERE username = '${username}' AND password = '${password}'`);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '2h' });
    
    // A09: Security Logging and Monitoring Failures (Logging sensitive data successfully)
    console.log('Login exitoso. Usuario:', username, 'Contraseña:', password);
    res.json({ message: 'Login exitoso', token, role: user.role });
  } catch (err) {
    // A09: Removed error logging for failed attempts intentionally
    // A05: Security Misconfiguration (returning stack trace)
    res.status(500).send(err.stack);
  }
});

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
}

// A02: Cryptographic Failures (Sensitive Data Exposure) 
app.get('/api/config/jwt', (req, res) => {
  res.json({ jwtSecretConfig: SECRET_KEY, note: 'Do not share this' });
});

// A01: Broken Access Control (IDOR)
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query('SELECT id, username, role, password FROM usuarios WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.stack);
  }
});

// GET all shoes (excluding hidden)
app.get('/api/zapatos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventario_calzado WHERE oculto = false ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching shoes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search shoes by modelo (case-insensitive)
app.get('/api/zapatos/buscar', async (req, res) => {
  const modelo = req.query.modelo;
  if (!modelo) {
    return res.status(400).json({ error: 'Missing modelo query parameter' });
  }
  try {
    // A03: Injection (SQL Injection)
    const query = `SELECT * FROM inventario_calzado WHERE modelo ILIKE '%${modelo}%' AND oculto = false`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    // A05: Security Misconfiguration
    res.status(500).send(err.stack);
  }
});

// Create a new shoe record
app.post('/api/zapatos', authenticateToken, requireAdmin, async (req, res) => {
  const { modelo, marca, talla, color, precio, stock, proveedor_id, fecha_ingreso, descripcion, oculto } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO inventario_calzado (modelo, marca, talla, color, precio, stock, proveedor_id, fecha_ingreso, descripcion, oculto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [modelo, marca, talla, color, precio, stock, proveedor_id, fecha_ingreso, descripcion, oculto]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating shoe:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update price of a shoe by ID
app.put('/api/zapatos/:id/precio', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { precio } = req.body;
  if (isNaN(id) || precio === undefined) {
    return res.status(400).json({ error: 'Invalid id or precio' });
  }
  try {
    const result = await pool.query('UPDATE inventario_calzado SET precio = $1 WHERE id = $2 RETURNING *', [precio, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Shoe not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating price:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a shoe by ID
app.delete('/api/zapatos/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const result = await pool.query('DELETE FROM inventario_calzado WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Shoe not found' });
    }
    res.json({ message: 'Shoe deleted', deletedId: id });
  } catch (err) {
    console.error('Error deleting shoe:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// A04: Insecure Design (Mass Assignment / Logic Flaw)
// Un usuario puede actualizar su propio perfil y, al no tener restricciones, se puede asignar el rol de 'admin'
app.put('/api/users/me', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const updates = req.body;
  // Intentionally iterating blindly over submitted fields
  let queryParts = [];
  let values = [];
  let counter = 1;
  for (const [key, value] of Object.entries(updates)) {
    queryParts.push(`${key} = $${counter}`);
    values.push(value);
    counter++;
  }
  values.push(userId);
  try {
    const query = `UPDATE usuarios SET ${queryParts.join(', ')} WHERE id = $${counter} RETURNING *`;
    const result = await pool.query(query, values);
    res.json({ message: 'Perfil actualizado', user: result.rows[0] });
  } catch (err) {
    res.status(500).send(err.stack);
  }
});

// A08: Software and Data Integrity Failures (Insecure Deserialization via eval)
app.post('/api/profile/import', authenticateToken, (req, res) => {
  try {
    const { encodedProfile } = req.body;
    const decoded = Buffer.from(encodedProfile, 'base64').toString('ascii');
    // VULNERABLE: Using eval
    const profileData = eval('(' + decoded + ')');
    res.json({ message: 'Perfil importado', profile: profileData });
  } catch (err) {
    res.status(500).send(err.stack);
  }
});

// A10: Server-Side Request Forgery (SSRF)
app.post('/api/zapatos/external-info', authenticateToken, (req, res) => {
  const externalUrl = req.body.url;
  if (!externalUrl) return res.status(400).send('URL required');

  const client = externalUrl.startsWith('https') ? https : http;

  client.get(externalUrl, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => res.send(data));
  }).on('error', (err) => {
    res.status(500).send(err.message);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
