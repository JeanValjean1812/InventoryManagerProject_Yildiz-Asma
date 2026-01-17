import React, { useState, useEffect } from 'react';
import './App.css';

const API = 'http://localhost:5000/api';

function App() {
  const [items, setItems] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    loadItems();
    loadStats();
  }, []);

  async function loadItems(searchTerm = '') {
    try {
      const url = searchTerm ? `${API}/items?search=${searchTerm}` : `${API}/items`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (err) {
      setError('Cant connect to server');
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(`${API}/stats`);
      const data = await res.json();
      if (data.success) {
        setTotalValue(data.data.totalValue);
      }
    } catch (err) {
      console.log('Error loading stats');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Please enter item name');
      return;
    }
    if (quantity < 0 || price < 0) {
      setError('No negative numbers!');
      return;
    }

    try {
      if (editId) {
        const res = await fetch(`${API}/items/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: name.trim(), 
            quantity: parseInt(quantity) || 0, 
            price: parseFloat(price) || 0 
          })
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error);
          return;
        }
        setEditId(null);
      } else {
        const res = await fetch(`${API}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: name.trim(), 
            quantity: parseInt(quantity) || 0, 
            price: parseFloat(price) || 0 
          })
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error);
          return;
        }
      }
      
      setName('');
      setQuantity('');
      setPrice('');
      loadItems(search);
      loadStats();
    } catch (err) {
      setError('Something went wrong');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this item?')) return;
    
    try {
      await fetch(`${API}/items/${id}`, { method: 'DELETE' });
      loadItems(search);
      loadStats();
    } catch (err) {
      setError('Couldnt delete');
    }
  }

  function handleEdit(item) {
    setEditId(item.id);
    setName(item.name);
    setQuantity(item.quantity.toString());
    setPrice(item.price.toString());
  }

  function cancelEdit() {
    setEditId(null);
    setName('');
    setQuantity('');
    setPrice('');
  }

  async function changeQuantity(item, change) {
    const newQty = item.quantity + change;
    if (newQty < 0) return;
    
    try {
      await fetch(`${API}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      });
      loadItems(search);
      loadStats();
    } catch (err) {
      setError('Failed to update');
    }
  }

  function handleSearch(e) {
    const term = e.target.value;
    setSearch(term);
    loadItems(term);
  }

  return (
    <div className="app">
      <h1>📦 My Inventory</h1>
      
      <div className="stats">
        Total Value: ${totalValue.toFixed(2)}
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <h2>{editId ? 'Edit Item' : 'Add Item'}</h2>
        <input
          type="text"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="0"
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          min="0"
          step="0.01"
        />
        <button type="submit">{editId ? 'Update' : 'Add'}</button>
        {editId && <button type="button" onClick={cancelEdit}>Cancel</button>}
      </form>

      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={handleSearch}
        className="search"
      />

      <div className="items">
        {items.length === 0 ? (
          <p>No items yet. Add some!</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="item">
              <div className="item-info">
                <strong>{item.name}</strong>
                <span>${item.price.toFixed(2)} each</span>
              </div>
              <div className="item-qty">
                <button onClick={() => changeQuantity(item, -1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => changeQuantity(item, 1)}>+</button>
              </div>
              <div className="item-total">
                Total: ${(item.quantity * item.price).toFixed(2)}
              </div>
              <div className="item-actions">
                <button onClick={() => handleEdit(item)}>Edit</button>
                <button onClick={() => handleDelete(item.id)} className="delete">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
