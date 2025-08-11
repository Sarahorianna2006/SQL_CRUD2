### Terminal ubuntu
1. abrir terminal ubuntu ctrl + alt + t
2. iniciar en mysql
`mysql -u root -p;`
3. esto te pedira la contrasena que en la computadora puse 
`password`
4. crear base de datos (donde dice 'app_crud' sera el nombre de la base de datos)
`CREATE DATABASE base_datos_crud;`
5. usar la base de datos
`USE base_datos_crud;`
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
DB_PASS=19808513Js*
DB_NAME=base_datos_crud
PORT=3000
```
en `DB_USER` va tu usuario de sql y en `DB_PASS` va tu cotrasena de sql y en `DB_NAME` va el nombre de la base de datos
4. conexion a mysql - `db.js` — módulo que crea un pool de conexiones usando `mysql2/promise`
```js 
// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// pool de conexiones para reusar conexiones y mejor rendimiento
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;

```
usar `promise` permite usar `async/await`. El pool gestiona múltiples conexiones.
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
app.get('/api/users/:id', async (req, res) =>{
    try {
        const {id} = req.params;
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        } 
       
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
const API_URL = '/api/users';

// cargar usuarios al iniciar
document.addEventListener("DOMContentLoaded", loadUsers);

async function loadUsers() {
    try {
        const res = await fetch(API_URL);
        const users = await res.json();
        renderUsers(users);
    } catch (err) {
        console.error("Error cargando usuarios", err);
    }
}

// renderizar usuarios en la tabla
function renderUsers(users) {
    const tbody = document.getElementById("usersBody");
    tbody.innerHTML = "";

    users.forEach(user => {        
        tbody.innerHTML += `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.age}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editUser(${user.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Eliminar</button>
                </td>
            </tr>
        `;
    });    
}

// crear o actualizar usuario
document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("userId").value;
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const age = document.getElementById("age").value.trim();

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/${id}` : API_URL;

    try {
        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, age })
        });
        resetForm();
        loadUsers();
    } catch (err) {
        console.error("Error guardando usuario:", err);
    }
});

// editar usuario
async function editUser(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const user = await res.json();

        document.getElementById("userId").value = user.id;
        document.getElementById("name").value = user.name;
        document.getElementById("email").value = user.email;
        document.getElementById("age").value = user.age;

        document.getElementById("submitBtn").textContent = "Actualizar";
    } catch (err) {
        console.error("Error obteniendo usuario:", err);
    }
}


// eliminar usuario
async function deleteUser(id) {
    if (!confirm("¿Seguro que quieres eliminar este usuario?")) return;
    try {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        loadUsers();
    } catch (err) {
        console.error("Error eliminando usuario:", err);
    }
}

// resetear formulario
document.getElementById("resetBtn").addEventListener("click", resetForm);
function resetForm() {
    document.getElementById("userId").value = "";
    document.getElementById("userForm").reset();
    document.getElementById("submitBtn").textContent = "Crear";
}
```
 - El front hace `fetch` a los endpoints (`/api/users`) y procesa JSON.

 - `editUser` carga datos del servidor y rellena el formulario para actualización.

 - `escapeHtml` evita inserciones de HTML en la tabla (XSS básico).

 - En producción valida y sanitiza más (server + client).
9. Ejecutar la app localmente
En la carpeta : base_datos_crud
iniciar servidor
`node server.js` o `npx nodemon server.js` (yo trabaje con `node server.js)
---
## Cambios para agregar mas campos (como addres, gender y phone)
### Terminal ubuntu
1. agregar/alterar a la tabla (si la tabla ya estaba con algun contenido como en este caso, seria alterar la tabla para agregarle mas contenido a la tabla)
-  asegurate de estar con el MySQL activo, hazlo con el comando
`mysql -u root -p` en el cual te pedira la clave que tengas.
luego para ver las bases de datos con `SHOW DATABASES;` y luego para seleccionar la base de datos que ya creaste (en este caso 'base_datos_crud') `USE base_datos_crud;` luego para ver el contenido de la base de datos (seria ver las tablas que estan en `base_datos_crud`) `SHOW TABLES;` y te aparecera la tabla que creamos anteriormente (users) y para poder ver el contenido de la tabla es `SELECT * FROM users;` 
- ya despues que estemos ubicados en la tabla que vamos a agregar contenido es
`ALTER TABLE users
ADD direccion VARCHAR(255),
ADD genero VARCHAR(20),
ADD telefono VARCHAR(20);`
y listo, puedes ejecutar `SELECT * FROM users;` y te debera aparecer la tabla con los campos viejos y los nuevo que agregaste.
---
### Visual Studio Code
1. (**server.js**) Ajustar el backend (API)
En tu controlador o rutas, tienes que asegurarte de que estos campos:
- Se reciban desde el `req.body` cuando creas o editas un usuario.
- Se devuelvan en las consultas (`SELECT`)
`server.js` ordene y agregue esta parte
```js
//Middlewares
app.use(cors()); //permitir peticiones desde front (si lo abrimos desde otro origen)
app.use(express.json()); //parsea JSON en body
app.use(express.urlencoded({extended: true}));

// ruta para main.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/main.html');
});

// servir estaticos
app.use(express.static(path.join(__dirname, 'public'))); // sirve index.html y assets
``` 
para poder ejecutar `http://localhost:3000/` (este es el link que me aparece cuando ejecuto en la terminal de visual studio `node server.js`) y asi que redireccionara a main.html y me pudiera iniciar el sistema.

- seguimos en `server.js` agregue y ordene esta parte
```js
// 3) crear usuario (POST)
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, age, addres, gender, phone } = req.body;
        //validacion basica
        if (!name || !email) return res.status(400).json({ message: 'name y email son obligatorios'});

        const [result] = await pool.query(
            'INSERT INTO users (name, email, age, addres, gender, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, age, addres, gender, phone || null]
        );
```
(aca cambie para agregarle addres, gender y phone)
- seguimos en `server.js` agregue y ordene esta parte
```js
// 4) actualizar usuario (PUT)
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email, age, addres, gender, phone } = req.body;
        const { id } = req.params;
        const [result] = await pool.query(
           'UPDATE users SET name = ?, email = ?, age = ?, addres = ?, gender = ?, phone = ? WHERE id = ?', [name, email, age, addres, gender, phone || null, id] 
        );
```
(aca cambie para agregarle addres, gender y phone)
2. (**main.html**) Cambiar el frontend (formulario HTML + script.js)
En el formulario de `main.html` agregue
```html
                        <div class="col-md-5">
                            <input id="addres" class="form-control" placeholder="Direccion" required>
                        </div>
                        <div class="col-md-5">
                            <input id="gender" class="form-control" placeholder="Genero" required>
                        </div>
                        <div class="col-md-5">
                            <input id="phone" class="form-control" placeholder="Telefono" required>
                        </div>
```
(esto seria mas campo en el formulario 'frontend')
- seguimos en `main.html` y agregue y ordene
```html
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Edad</th>
                            <th>Direccion</th>
                            <th>Genero</th>
                            <th>Telefono</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="userTableBody"></tbody> <!-- filas dinamicas -->
```
(agregue en `<thead>` direccion, genero y telefono)(cambie el id de `tbody` por `userTableBody`)
- asi deberia quedar el `main.html` completo
```html
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

                        <div class="col-md-5">
                            <input id="addres" class="form-control" placeholder="Direccion" required>
                        </div>
                        <div class="col-md-5">
                            <input id="gender" class="form-control" placeholder="Genero" required>
                        </div>
                        <div class="col-md-5">
                            <input id="phone" class="form-control" placeholder="Telefono" required>
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
                            <th>Direccion</th>
                            <th>Genero</th>
                            <th>Telefono</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="userTableBody"></tbody> <!-- filas dinamicas -->
                </table>
            </div>
         </div>
    </div>

    <script src="./script.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script> <!-- bootstrap js -->

</body>
</html>
```
3. (**script.js**) aca ordene y agregue
```js
// renderizar usuarios en la tabla
function renderUsers(users) {
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = '';

    users.forEach(user => {        
        tbody.innerHTML += `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.age}</td>
                <td>${user.addres}</td>
                <td>${user.gender}</td>
                <td>${user.phone}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editUser(${user.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Eliminar</button>
                </td>
            </tr>
        `;
    });    
}
```
(en `const tbody = document.getElementById("userTableBody");` cambie `"usersTable"` por `"userTableBody"`  y agregue en `tr` los campos nuevos `<td>${user.addres}</td>`, `<td>${user.gender}</td>` y `<td>${user.phone}</td>`)
- seguimos en `script.js` aca agregue y ordene
```js
// crear o actualizar usuario
document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("userId").value;
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const age = document.getElementById("age").value.trim();
    const addres = document.getElementById("addres").value.trim();
    const gender = document.getElementById("gender").value.trim();
    const phone = document.getElementById("phone").value.trim();

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/${id}` : API_URL;

    try {
        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, age, addres, gender,phone })
        });
        resetForm();
        loadUsers();
    } catch (err) {
        console.error("Error guardando usuario:", err);
    }
});
```
(aca solo agregue `const addres = document.getElementById("addres").value.trim();`, `const gender = document.getElementById("gender").value.trim();`, y `const phone = document.getElementById("phone").value.trim();`) (aca solo cambie y agregue `body: JSON.stringify({ name, email, age, addres, gender,phone })` que es para agregar `addres`, `gender` y `phone`)
- seguimos en `script.js` aca agregue y organice
```js
// editar usuario
async function editUser(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const user = await res.json();

        document.getElementById("userId").value = user.id;
        document.getElementById("name").value = user.name;
        document.getElementById("email").value = user.email;
        document.getElementById("age").value = user.age;
        document.getElementById("addres").value = user.addres;
        document.getElementById("gender").value = user.gender;
        document.getElementById("phone").value = user.phone;

        document.getElementById("submitBtn").textContent = "Actualizar";
    } catch (err) {
        console.error("Error obteniendo usuario:", err);
    }
}
```
(aca solo agregue `document.getElementById("addres").value = user.addres;`, `document.getElementById("gender").value = user.gender;` y `document.getElementById("phone").value = user.phone;`)
---
### Terminal ubuntu
- salir de mysql y ejecutar
  `mysqldump -u root -p base_datos_crud > base_datos_crud.sql` (en `root` va el usuario que tengas en mysql y en `base_datos_crud` va el nombre de la base de datos. Tener cuidadoen si colocar al final del nombre de la base de datos `.sql`, ya con eso me pide la contraseña de mysql. Luego ya te debe aparecer en archivos en la carpeta principal, esa es mi base de datos.)
