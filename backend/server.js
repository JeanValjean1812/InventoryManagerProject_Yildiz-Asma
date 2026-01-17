const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Inventory API is running');
});

let db = null;
const dbPath = path.join(__dirname, 'inventory.db');

async function initDB() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const file = fs.readFileSync(dbPath);
    db = new SQL.Database(file);
    console.log('Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('Created new database');
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      price REAL NOT NULL
    )
  `);
  
  saveDB();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

app.get('/api/items', (req, res) => {
  try {
    const search = req.query.search || '';
    let results;
    
    if (search) {
      const stmt = db.prepare('SELECT * FROM items WHERE name LIKE ?');
      stmt.bind(['%' + search + '%']);
      results = [];
      while (stmt.step()) results.push(stmt.getAsObject());
      stmt.free();
    } else {
      results = [];
      const stmt = db.prepare('SELECT * FROM items');
      while (stmt.step()) results.push(stmt.getAsObject());
      stmt.free();
    }
    
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const { name, quantity, price } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (price < 0 || quantity < 0) {
      return res.status(400).json({ success: false, error: 'No negative numbers allowed' });
    }
    
    db.run('INSERT INTO items (name, quantity, price) VALUES (?, ?, ?)', 
      [name.trim(), quantity || 0, price || 0]);
    
    const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    saveDB();
    
    res.json({ success: true, data: { id, name: name.trim(), quantity: quantity || 0, price: price || 0 }});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, quantity, price } = req.body;
    
    const check = db.prepare('SELECT * FROM items WHERE id = ?');
    check.bind([id]);
    if (!check.step()) {
      check.free();
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    const oldItem = check.getAsObject();
    check.free();
    
    const newName = name !== undefined ? name : oldItem.name;
    const newQty = quantity !== undefined ? quantity : oldItem.quantity;
    const newPrice = price !== undefined ? price : oldItem.price;
    
    if (newQty < 0 || newPrice < 0) {
      return res.status(400).json({ success: false, error: 'No negative numbers' });
    }
    
    db.run('UPDATE items SET name = ?, quantity = ?, price = ? WHERE id = ?',
      [newName, newQty, newPrice, id]);
    saveDB();
    
    res.json({ success: true, data: { id, name: newName, quantity: newQty, price: newPrice }});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    db.run('DELETE FROM items WHERE id = ?', [id]);
    saveDB();
    
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const result = db.exec('SELECT COUNT(*) as total, COALESCE(SUM(quantity * price), 0) as value FROM items');
    const total = result[0]?.values[0][0] || 0;
    const value = result[0]?.values[0][1] || 0;
    
    res.json({ success: true, data: { totalItems: total, totalValue: value }});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
  });
});
