CREATE TABLE IF NOT EXISTS inventario_calzado (
    id SERIAL PRIMARY KEY,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    talla NUMERIC(3,1) NOT NULL,
    color VARCHAR(30),
    precio DECIMAL(10,2) NOT NULL,
    stock INTEGER NOT NULL,
    proveedor_id INTEGER,
    fecha_ingreso DATE,
    descripcion TEXT,
    oculto BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL
);

INSERT INTO usuarios (username, password, role) VALUES
('admin', 'admin123', 'admin'),
('empleado', 'emp123', 'empleado');

INSERT INTO inventario_calzado (modelo, marca, talla, color, precio, stock, proveedor_id, fecha_ingreso, descripcion, oculto) VALUES
('AirRunner', 'Nike', 42.5, 'White', 120.00, 15, 1, '2023-05-10', 'Running shoes with breathable mesh.', false),
('Classic Leather', 'Reebok', 40, 'Black', 85.50, 8, 2, '2023-06-01', 'Timeless leather sneakers.', false),
('Urban Slip', 'Adidas', 38, 'Grey', 70.00, 20, 3, '2023-07-15', 'Casual slip-on shoes for daily wear.', false),
('Mountain Climber', 'Salomon', 44, 'Brown', 150.00, 5, 4, '2023-08-20', 'Durable hiking boots with ankle support.', false),
('Beach Flip', 'Havaianas', 39, 'Blue', 25.00, 30, 5, '2023-09-05', 'Comfortable flip-flops for the beach.', false),
('Elegant Heels', 'Jimmy Choo', 38.5, 'Red', 350.00, 2, 6, '2023-10-12', 'High-heeled shoes for formal occasions.', false),
('Kids Runner', 'Puma', 30, 'Pink', 45.00, 12, 7, '2023-11-03', 'Lightweight running shoes for kids.', false),
('Winter Boots', 'Timberland', 43, 'Dark Green', 200.00, 7, 8, '2023-12-01', 'Insulated boots for cold weather.', false),
('Luxury Loafers', 'Gucci', 42, 'Black', 500.00, 1, 9, '2024-01-20', 'Premium leather loafers with gold accents.', true),
('Sporty Sneakers', 'New Balance', 41, 'White', 95.00, 10, 10, '2024-02-14', 'Versatile sneakers for gym and daily use.', false);
