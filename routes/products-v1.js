const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET all products
router.get('/', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    res.json({
      version: 'v1',
      data: rows
    });
  });
});

// GET a single product by ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching product:', err);
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({
      version: 'v1',
      data: row
    });
  });
});

// POST a new product
router.post('/', (req, res) => {
  const { name, price, description } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  db.run(
    'INSERT INTO products (name, price, description) VALUES (?, ?, ?)',
    [name, price, description],
    function(err) {
      if (err) {
        console.error('Error creating product:', err);
        return res.status(500).json({ error: 'Failed to create product' });
      }
      
      db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          console.error('Error fetching created product:', err);
          return res.status(500).json({ error: 'Product created but failed to retrieve it' });
        }
        res.status(201).json({
          version: 'v1',
          data: row
        });
      });
    }
  );
});

// PUT (update) a product
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { name, price, description } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  db.run(
    'UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?',
    [name, price, description, id],
    function(err) {
      if (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ error: 'Failed to update product' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('Error fetching updated product:', err);
          return res.status(500).json({ error: 'Product updated but failed to retrieve it' });
        }
        res.json({
          version: 'v1',
          data: row
        });
      });
    }
  );
});

// DELETE a product
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting product:', err);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({
      version: 'v1',
      message: `Product with ID ${id} deleted successfully`
    });
  });
});

module.exports = router;
