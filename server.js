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

// ruta para main.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/main.html');
});

// servir estaticos
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
        const { name, email, age, addres, gender, phone } = req.body;
        //validacion basica
        if (!name || !email) return res.status(400).json({ message: 'name y email son obligatorios'});

        const [result] = await pool.query(
            'INSERT INTO users (name, email, age, addres, gender, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, age, addres, gender, phone || null]
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
        const { name, email, age, addres, gender, phone } = req.body;
        const { id } = req.params;
        const [result] = await pool.query(
           'UPDATE users SET name = ?, email = ?, age = ?, addres = ?, gender = ?, phone = ? WHERE id = ?', [name, email, age, addres, gender, phone || null, id] 
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