document.addEventListener('DOMContentLoaded', () => {
  const shoesTableBody = document.getElementById('shoesTableBody');
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const saveShoeBtn = document.getElementById('saveShoeBtn');
  const addShoeForm = document.getElementById('addShoeForm');

  /* TODO: FASE 2 - Migrar a los nuevos endpoints de admin y perfil
   * GET /api/users/:id -> Para cargar la tarjeta de perfil pública de los compañeros
   * PUT /api/users/me  -> Para guardar preferencias de tema oscuro { theme: 'dark' } y rol
   * GET /api/config/jwt -> Eliminar antes de salir a producción, expone llaves!
   */

  const descModalBody = document.getElementById('descModalBody');

  const logoutBtn = document.getElementById('logoutBtn');
  const userGreeting = document.getElementById('userGreeting');

  const adminControlsPanel = document.getElementById('adminControlsPanel');
  const toolboxPanel = document.getElementById('toolboxPanel');
  const thActions = document.getElementById('thActions');

  const importProfileBtn = document.getElementById('importProfileBtn');
  const fetchExternalBtn = document.getElementById('fetchExternalBtn');

  let currentToken = localStorage.getItem('token');
  let currentRole = localStorage.getItem('role');
  let currentUsername = localStorage.getItem('username');

  // Load appropriate view based on token
  if (!currentToken) {
    window.location.href = 'login.html';
    return;
  } else {
    onLoginSuccess();
  }

  logoutBtn.addEventListener('click', forceLogout);

  function forceLogout() {
    localStorage.clear();
    currentToken = null;
    currentRole = null;
    currentUsername = null;
    window.location.href = 'login.html';
  }

  function onLoginSuccess() {
    userGreeting.innerHTML = `Hola, ${currentUsername} (${currentRole})`;
    logoutBtn.classList.remove('d-none');

    if (currentRole === 'empleado') {
      adminControlsPanel.classList.add('d-none');
    } else {
      adminControlsPanel.classList.remove('d-none');
    }
    // Toolbox always visible when logged in
    toolboxPanel.classList.remove('d-none');
    loadAllShoes();
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentToken}`
    };
  }

  // Bind UI Events
  searchBtn.addEventListener('click', () => {
    const modelo = searchInput.value.trim();
    if (modelo) searchShoes(modelo);
    else loadAllShoes();
  });

  saveShoeBtn.addEventListener('click', async () => {
    const formData = new FormData(addShoeForm);
    const shoe = {};
    formData.forEach((value, key) => {
      if (key === 'oculto') shoe[key] = value === 'true';
      else if (['talla', 'precio', 'stock', 'proveedor_id'].includes(key)) shoe[key] = Number(value);
      else shoe[key] = value;
    });
    if (!('oculto' in shoe)) shoe.oculto = false;
    try {
      const res = await fetch('/api/zapatos', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(shoe),
      });
      if (res.ok) {
        const modalEl = document.getElementById('addShoeModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        addShoeForm.reset();
        loadAllShoes();
      } else if (res.status === 401 || res.status === 403) forceLogout();
      else alert('Error guardando zapato');
    } catch (err) { console.error('Error adding shoe', err); }
  });

  // A08 Handler
  if(importProfileBtn) {
    importProfileBtn.addEventListener('click', async () => {
      const data = document.getElementById('profileDataInput').value;
      try {
        const res = await fetch('/api/profile/import', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ encodedProfile: data })
        });
        const result = await res.json();
        alert('Respuesta: ' + JSON.stringify(result));
      } catch (err) { alert('Error: ' + err); }
    });
  }

  // A10 Handler
  if(fetchExternalBtn) {
    fetchExternalBtn.addEventListener('click', async () => {
      const url = document.getElementById('externalUrlInput').value;
      const resContainer = document.getElementById('externalInfoResult');
      resContainer.innerHTML = 'Cargando...';
      try {
        const res = await fetch('/api/zapatos/external-info', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ url })
        });
        const text = await res.text();
        resContainer.innerHTML = `<code>${text.replace(/</g, "&lt;")}</code>`;
      } catch (err) { resContainer.innerHTML = 'Error: ' + err; }
    });
  }

  async function loadAllShoes() {
    try {
      const res = await fetch('/api/zapatos', { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) return forceLogout();
      const shoes = await res.json();
      renderShoes(shoes);
    } catch (err) { console.error('Error loading shoes', err); }
  }

  async function searchShoes(modelo) {
    try {
      const res = await fetch(`/api/zapatos/buscar?modelo=${encodeURIComponent(modelo)}`, { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) return forceLogout();
      const shoes = await res.json();
      renderShoes(shoes);
    } catch (err) { console.error('Error searching shoes', err); }
  }

  function renderShoes(shoes) {
    shoesTableBody.innerHTML = '';
    shoes.forEach((shoe) => {
      const tr = document.createElement('tr');

      const idTd = document.createElement('td'); idTd.innerHTML = shoe.id; tr.appendChild(idTd);
      const modeloTd = document.createElement('td'); modeloTd.innerHTML = shoe.modelo; tr.appendChild(modeloTd);
      const marcaTd = document.createElement('td'); marcaTd.innerHTML = shoe.marca; tr.appendChild(marcaTd);
      const precioTd = document.createElement('td'); precioTd.innerHTML = shoe.precio; tr.appendChild(precioTd);

      const descTd = document.createElement('td');
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn btn-sm btn-info';
      viewBtn.innerHTML = 'Ver Descripción';
      viewBtn.addEventListener('click', () => {
        descModalBody.innerHTML = shoe.descripcion;
        const descModal = new bootstrap.Modal(document.getElementById('descModal'));
        descModal.show();
      });
      descTd.appendChild(viewBtn);
      
      tr.appendChild(descTd);

      // Actions Column
      const actionsTd = document.createElement('td');
      if (currentRole === 'admin') {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-warning me-2';
        editBtn.innerHTML = 'Editar Precio';
        editBtn.addEventListener('click', async () => {
          const newPrice = prompt('Nuevo precio:', shoe.precio);
          if (newPrice !== null) {
            try {
              const res = await fetch(`/api/zapatos/${shoe.id}/precio`, {
                method: 'PUT', headers: authHeaders(), body: JSON.stringify({ precio: Number(newPrice) })
              });
              if (res.ok) loadAllShoes();
              else if (res.status === 401 || res.status === 403) forceLogout();
              else alert('Error updating');
            } catch (err) { console.error('Error updating price', err); }
          }
        });
        actionsTd.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.innerHTML = 'Eliminar';
        delBtn.addEventListener('click', async () => {
          if (confirm('¿Seguro que deseas eliminar este zapato?')) {
            try {
              const res = await fetch(`/api/zapatos/${shoe.id}`, { method: 'DELETE', headers: authHeaders() });
              if (res.ok) loadAllShoes();
              else if (res.status === 401 || res.status === 403) forceLogout();
              else alert('Error deleting');
            } catch (err) { console.error('Error deleting shoe', err); }
          }
        });
        actionsTd.appendChild(delBtn);
      } // Employees can also see actions but no buttons appended
      
      tr.appendChild(actionsTd);
      shoesTableBody.appendChild(tr);
    });
  }
});
