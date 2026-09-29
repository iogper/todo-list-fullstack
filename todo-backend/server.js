const express = require('express');
const pool = require('./db');

const app = express();
const PORT = 3000;

const cors = require('cors');
const jwt = require('jsonwebtoken');


app.use(cors());
app.use(express.json()); // allows Express to undertasnad JSON sent in requests


const bcrypt = require('bcrypt');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided '});
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        console.log('Decoded userId:', decoded.userId);

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token'});
    }
}





app.post('/register', async (req,res) => {
    try {
        const { username , password } = req.body;

        if( !username || !password ) {
            return res.status(400).json( { error: 'Username and password are required '});
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [username, passwordHash]
        );

        res.status(201).json(result.rows[0]);
    } catch(err) {
        if(err.code === '23505') { // 23505 this is Postgres's error code for a unique constraint violation
            return res.status(409).json( { error: 'Username already taken '});
        }
        console.error(err);
        res.status(500).json({ error: 'Something went wrong '});
    }
})

app.post('/login', async (req, res) => {

    try {
        const { username, password } = req.body;
        
        if( !username || !password ) {
            return res.status(400).json({ error: 'Username and password are required '});
        }

        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if(result.rows.length === 0) {
            return res.status(401).json( { error: 'Invalid username or password'});

        }

        const user = result.rows[0];

        // compare the plain password the user typed against the stored hash

        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if(!passwordMatches) {
            return res.status(401).json({ error: 'Invalid user name or password'});
        }

        // for now, just confirm success, we'll add tokens next

        const token = jwt.sign(
            { 
                userId: user.id, username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h'}
        );

        res.json({ message: 'Login successful', token})

        // res.json({ message: 'Login successful', userId: user.id});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong '});
    }

});


// GET all todos

app.get('/todos', requireAuth, async (req,res) => {

    try{
        const result = await pool.query('SELECT * FROM todos WHERE user_id = $1 ORDER BY id',
        [req.userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});



// POST a new todo

app.post('/todos', requireAuth, async (req, res) => {
    try {
        const { title } = req.body;
        const result = await pool.query(
            'INSERT INTO todos (title, completed, user_id) VALUES ($1, false, $2) RETURNING *',
            [title, req.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// PUT (update) a todo

app.put('/todos/:id', requireAuth, async(req,res) => {
    
    try{
        const id = parseInt(req.params.id);
        const { title, completed } = req.body;

        const result = await pool.query(
            `UPDATE todos
            SET title = COALESCE ($1, title),
            completed = COALESCE ($2, completed)
            WHERE id = $3 AND user_id = $4
            RETURNING *
            `,
            [title, completed, id, req.userId]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({ error: 'Todos not found'});
        }

        res.json(result.rows[0]);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong'});
    }
});


app.delete('/todos/:id', requireAuth, async(req,res) => {
    
    try{

        const id = parseInt(req.params.id);
        const result = await pool.query('DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId


        ]);

        if(result.rows.length === 0) {
            return res.status(404).json({ error: 'Todos not found '});
        }

        res.status(204).send();
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong'});
    }
});


app.listen(PORT , () => {
    console.log(`Server runnig on http://localhost:${PORT}`);
});

