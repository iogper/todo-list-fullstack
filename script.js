const API_URL = 'https://todo-backend-904t.onrender.com';

const authSection = document.getElementById('authSection');
const todoSection = document.getElementById('todoSection');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');

const todoList = document.getElementById('todoList');
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');

// ------------------- AUTH ---------------------

function showTodoSection () {
    authSection.style.display = 'none';
    todoSection.style.display = 'block';
    loadTodos();
}

function showAuthSection () {
    authSection.style.display = 'block';
    todoSection.style.display = 'none';
}

if(localStorage.getItem('token')) {
    showTodoSection();
} else {
    showAuthSection();
}

registerBtn.addEventListener('click', async () => {
    authError.textContent='';

    const username = authUsername.value.trim();
    const password = authPassword.value.trim();

    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify( { username, password } )
    });
    
    const data = await res.json();

    if(!res.ok) {
        authError.textContent = data.error;
        return;
    }

    authError.textContent = 'Registered! Now click Login.';
});

loginBtn.addEventListener('click', async () => {
    authError.textContent = '';

  const username = authUsername.value.trim();
    const password = authPassword.value.trim();

    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify( { username, password } )
    });
    
    const data = await res.json();

    if(!res.ok) {
        authError.textContent = data.error;
        return;
    }
    
    localStorage.setItem('token', data.token);
    showTodoSection();
});
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        showAuthSection();

});

function authHeaders() {

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

async function loadTodos() {
    const res = await fetch(`${API_URL}/todos`, { headers: authHeaders()});

    if(res.status === 401) {
        localStorage.removeItem('token');
        showAuthSection();
        return;
    }

    const todos = await res.json();
    todoList.innerHTML = '';

    todos.forEach(todo => {
        const li = document.createElement('li');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id, checkbox.checked));
        
        const span = document.createElement('span');
        span.textContent = todo.title;
        if(todo.completed) span.style.textDecoration = 'line-through';
        span.addEventListener('click', () => {
            startEditing(todo, span);
        })

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click' , () => deleteTodo(todo.id));

        li.append(checkbox, span, delBtn);
        todoList.appendChild(li);
    });
}

function startEditing(todo, span) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = todo.title;
    input.addEventListener('blur', () => saveEdit(todo.id, input.value));
    input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') input.blur();
    });
    span.replaceWith(input);
    input.focus();
}


async function saveEdit(id, newTitle) {
    const trimmed = newTitle.trim();
    if(!trimmed) return loadTodos();
    await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify( { title: trimmed } )
    });
    loadTodos();
}

async function deleteTodo(id) {
    await fetch(`${API_URL}/todos/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    loadTodos();
}

async function toggleTodo(id,completed) {
    await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ completed } )
    });
    loadTodos();
}


addBtn.addEventListener('click', async () => {
    const title = todoInput.value.trim();
    if(!title) return;
    await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title } )
    });
    todoInput.value = '';
    loadTodos();
})

todoInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') addBtn.click();
});