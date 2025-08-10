### Terminal ubuntu
1. abrir terminal ubuntu ctrl + alt + t
2. iniciar en mysql
`mysql -u root -p;`
3. esto te pedira la contrasena que en la computadora puse 
`password`
4. crear base de datos (donde dice 'app_crud' sera el nombre de la base de datos)
`CREATE DATABASE app_crud;`
5. usar la base de datos
`USE app_crud;`
6. crear una tabla (ejemplo 'users')
`CREATE TABLE users (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(100) NOT NULL,
email VARCHAR(150) NOT NULL UNIQUE,
age INT
);`
7. insertar datos a la tabla
`INSERT INTO users (name, email, age) VALUES ('Juan', 'juan@example.com', 30);`
8. salir de mysq escribiendo en la terminal de ubuntu
`EXIT;`
---
### Visual studio code
1. abrir visual y crear la carpeta donde vayas a trabaja (en este caso seria 'base_datos_crud')
2. crea la estructura de carpetas 
```js
base_datos_crud/
server.js
db.js
.env
    public/
    index.html
    script.js
    style.css
```
- **instalar dependecias**
```bash
npm install express mysql2 dotenv cors
```
```bash
npm install -D nodemon 
```
revisar en `package.json` y `package-lock.json` que se hayan instalado las dependencias, te tienen que aparecer reflejadas de esta manera
`{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.1",
    "express": "^5.1.0",
    "mysql2": "^3.14.3"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}`
3. en el archivo `.env` escribir
```js
DB_HOST=localhost
DB_USER=cruduser
DB_PASS=tu_contraseña_segura
DB_NAME=app_crud
PORT=3000
```
No subas .env a repos públicos. Aquí guardamos credenciales de forma simple para desarrollo. (no se que funcion hace, asi que tengo que buscar y comentar aca)
4. conexion a mysql - `db.js` — módulo que crea un pool de conexiones usando `mysql2/promise`
```js 
// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// pool de conexiones para reusar conexiones y mejor rendimiento
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.BD_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimint: 0
});

module.exports = pool;
```
usar `promise` permite usar `async/await`. El pool gestiona múltiples conexiones.(investigar tambien)
5. API REST (server.js)
`server.js` — servidor Express que expone los endpoints CRUD y sirve archivos estáticos desde `public/`
```js
// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db'); //nuestro pool de mysql
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

//Middlewares
app.use(cors()); //permitir peticiones desde front (si lo abrimos desde otro origen)
app.use(express.json()); //parsea JSON en body
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public'))); // sirve index.html y assets


// --- rutas API CRUD para 'users' ---


// 1) obtener lista de usuarios (GET)
app.get('/api/users', async (req, res) =>{
    try {
        const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en la base de datos'});
    }
});

// 2) obtener un usuario por id
app.get('/api/users/id', async (req, res) =>{
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en la base de datos'});
    }
});

// 3) crear usuario (POST)
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, age } = req.body;
        //validacion basica
        if (!name || !email) return res.status(400).json({ message: 'name y email son obligatorios'});

        const [result] = await pool.query(
            'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
            [name, email,age || null]
        );
        // result.insertId tiene el id del nuevo registro
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        // manejo simple de error de duplicado (email UNIQUE)
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email ya existe' });
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

// 4) actualizar usuario (PUT)
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email, age } = req.body;
        const { id } = req.params;
        const [result] = await pool.query(
           'UPDATE users SET name = ?, email = ?, age = ? WHERE id = ?', [name, email, age || null, id] 
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado'});
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email ya exixte' });
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

// 5) borrar usuario (DELETE)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(400).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Usuario eliminado'});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

// iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```
cada ruta usa `pool.query` con `?` para parámetros — prepared statements (evitan inyección SQL). Las rutas devuelven JSON con los datos.
6. Frontend básico (HTML + Bootstrap + JS)
Crea `public/index.html`
```js
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRUD MySQL</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css"> <!-- bootstrap -->
    <link rel="stylesheet" href="./style.css">
</head>
<body class="bg-light">
    <div class="container py-5">
        <h1 class="mb-4">CRUD Usuarios (MySQL)</h1>

        <!-- formulario (create / edit) -->
        <div class="card mb-4">
            <div class="card-body">
                <form id="userForm">
                    <input type="hidden" id="userId" value="">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <input id="name" class="form-control" placeholder="Nombre" required>
                        </div>
                        <div class="col-md-5">
                            <input id="email" class="form-control" placeholder="Email" required>
                        </div>
                        <div class="col-md-2">
                            <input id="age" class="form-control" placeholder="Edad" type="number" min="0">
                        </div>
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-primary" id="submitBtn">Crear</button>
                        <button type="button" class="btn btn-secondary" id="resetBtn">Limpiar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- tabla de usuarios -->
         <div class="card">
            <div class="card-body">
                <table class="table table-hover" id="usersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Edad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="usersBody"></tbody> <!-- filas dinamicas -->
                </table>
            </div>
         </div>

    </div>

    <script src="./script.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script> <!-- bootstrap js -->

</body>
</html>
```
7. estilizar css por el momento solo tiografia
```css
body { font-family: inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial ;}
```
8.  lógica que consume la API - `public/script.js`
```js
const API_BASE = '/api/users'; //la API está en el mismo host (servida por express)


// elemntos del DOM
const userForm = document.getElementById('userForm');
const usersBody = document.getElementById('usersBody')
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');

async function fetchUsers() {
    try {
        const res = await fetch(API_BASE);
        const data = await res.json();
        renderUsers(data);
    } catch (err) {
        console.error('Error al obtener usuarios', err);
    }
}

// renderiza la tabla
function renderUsers(users) {
    usersBody.innerHTML = '';
    if (!users || users.length === 0) {
        usersBody.innerHTML = '<tr><td colspan="5" class="text-center">Sin usuarios</td></tr>';
        return;

    }
    for (const u of users) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.id}</td>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${u.age ?? ''}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${u.id})">Editar</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id}">Borrar</button>
            </td>
        `;
        usersBody.appendChild(tr);
    }
}

// escapar texto para evitar XSS basico
function escapeHtml(str) {
    if (!str) return '';
    return str.replaceAll('&', '&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

// manejar submit (crear o actualizar)
userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const ageVal = document.getElementById('age').value;
    const age = ageVal ? Number(ageVal) : null;

    const body = {name, email, age};

    try {
        if (id) { //actualizar
            const res = await fetch(`${API_BASE}/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.message || 'Error al actualizar');
            }
        } else { //crear
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.message || 'Error al crear');
            }
        }
        clearForm();
        fetchUsers();
    } catch (err) {
        console.error(err);
        alert('Error en la peticion');
    }
});

// rellenar formulario para editar
async function editUser (id) {
    try {
        const res = await fetch(`${API_BASE}/${id}`);
        if (!res.ok) {
            alert('No se puede obtener el usuario');
            return;
        }
        const user = await res.json();
        document.getElementById('userId').value = user.id;
        document.getElementById('name').value = user.name;
        document.getElementById('email').value = user.email;
        document.getElementById('age').value = user.age ?? '';
        submitBtn.textContent = 'Actualizar';
    } catch (err) {
        console.error(err);
    }
}

// borrar con confirm
async function deleteUser(id) {
    if (!confirm('¿Seguro que deseas borrar este usuario?')) return;
    try {
        const res = await fetch(`${API_BASE}/${id}`, {method: 'DELETE'});
        if (!res.ok) {
            const err = await res.json();
            alert(err.message || 'Error al borrar');
        } else {
            fetchUsers();
        }
    } catch (err) {
        console.error(err);
    }
}

//limpiar formulario
function clearForm() {
    document.getElementById('userId').value = '';
    userForm.reset();
    submitBtn.textContent = 'Crear';
}

// boton limpiar
resetBtn.addEventListener('click', () => clearForm());

// cargar lista al inicio 
fetchUsers();

```
 - El front hace `fetch` a los endpoints (`/api/users`) y procesa JSON.

 - `editUser` carga datos del servidor y rellena el formulario para actualización.

 - `escapeHtml` evita inserciones de HTML en la tabla (XSS básico).

 - En producción valida y sanitiza más (server + client).
9. Ejecutar la app localmente
En la carpeta : base_datos_crud