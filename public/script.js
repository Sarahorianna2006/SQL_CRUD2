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

