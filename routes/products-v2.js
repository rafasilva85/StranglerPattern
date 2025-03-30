const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Enhanced version of the products API (v2)
// Improvements:
// 1. Better error handling
// 2. Data validation
// 3. Caching for GET requests (simulated)
// 4. Additional features like product filtering and sorting

// Simulated cache
const cache = {
  allProducts: {
    data: null,
    timestamp: null,
    ttl: 60000 // 1 minute cache TTL
  },
  productById: {}
};

// Helper to check if cache is valid
const isCacheValid = (cacheEntry) => {
  return cacheEntry && 
         cacheEntry.data && 
         cacheEntry.timestamp && 
         (Date.now() - cacheEntry.timestamp < cacheEntry.ttl);
};

// GET all products with filtering and sorting
router.get('/', (req, res) => {
  // Check cache first
  if (isCacheValid(cache.allProducts)) {
    console.log('Serving products from cache');
    return res.json({
      version: 'v2',
      data: cache.allProducts.data,
      fromCache: true
    });
  }

  // Process query parameters for filtering and sorting
  const { minPrice, maxPrice, sort } = req.query;
  
  let query = 'SELECT * FROM products';
  const params = [];
  
  // Apply filters if provided
  if (minPrice !== undefined || maxPrice !== undefined) {
    query += ' WHERE';
    
    if (minPrice !== undefined) {
      query += ' price >= ?';
      params.push(parseFloat(minPrice));
    }
    
    if (maxPrice !== undefined) {
      if (minPrice !== undefined) query += ' AND';
      query += ' price <= ?';
      params.push(parseFloat(maxPrice));
    }
  }
  
  // Apply sorting if provided
  if (sort === 'price_asc') {
    query += ' ORDER BY price ASC';
  } else if (sort === 'price_desc') {
    query += ' ORDER BY price DESC';
  } else if (sort === 'name') {
    query += ' ORDER BY name ASC';
  } else if (sort === 'newest') {
    query += ' ORDER BY created_at DESC';
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).json({ 
        error: 'Failed to fetch products',
        details: err.message
      });
    }
    
    // Update cache
    cache.allProducts.data = rows;
    cache.allProducts.timestamp = Date.now();
    
    res.json({
      version: 'v2',
      data: rows,
      filters: { minPrice, maxPrice },
      sort: sort || 'default'
    });
  });
});

// GET a single product by ID
router.get('/:id', (req, res) => {
  const id = req.params.id;
  
  // Check cache first
  if (cache.productById[id] && isCacheValid(cache.productById[id])) {
    console.log(`Serving product ${id} from cache`);
    return res.json({
      version: 'v2',
      data: cache.productById[id].data,
      fromCache: true
    });
  }
  
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching product:', err);
      return res.status(500).json({ 
        error: 'Failed to fetch product',
        details: err.message
      });
    }
    
    if (!row) {
      return res.status(404).json({ 
        error: 'Product not found',
        message: `No product exists with ID ${id}`
      });
    }
    
    // Update cache
    if (!cache.productById[id]) {
      cache.productById[id] = { ttl: 60000 }; // 1 minute cache TTL
    }
    cache.productById[id].data = row;
    cache.productById[id].timestamp = Date.now();
    
    res.json({
      version: 'v2',
      data: row
    });
  });
});

// POST a new product with enhanced validation
router.post('/', (req, res) => {
  const { name, price, description } = req.body;
  
  // Enhanced validation
  const errors = [];
  
  if (!name) errors.push('Name is required');
  else if (name.length < 3) errors.push('Name must be at least 3 characters long');
  
  if (!price) errors.push('Price is required');
  else if (isNaN(price) || price <= 0) errors.push('Price must be a positive number');
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors
    });
  }

  db.run(
    'INSERT INTO products (name, price, description) VALUES (?, ?, ?)',
    [name, price, description || ''],
    function(err) {
      if (err) {
        console.error('Error creating product:', err);
        return res.status(500).json({ 
          error: 'Failed to create product',
          details: err.message
        });
      }
      
      // Invalidate cache
      cache.allProducts.timestamp = null;
      
      db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          console.error('Error fetching created product:', err);
          return res.status(500).json({ 
            error: 'Product created but failed to retrieve it',
            details: err.message
          });
        }
        
        // Update cache for this product
        if (!cache.productById[this.lastID]) {
          cache.productById[this.lastID] = { ttl: 60000 };
        }
        cache.productById[this.lastID].data = row;
        cache.productById[this.lastID].timestamp = Date.now();
        
        res.status(201).json({
          version: 'v2',
          data: row,
          message: 'Product created successfully'
        });
      });
    }
  );
});

// PUT (update) a product with enhanced validation
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { name, price, description } = req.body;
  
  // Enhanced validation
  const errors = [];
  
  if (!name) errors.push('Name is required');
  else if (name.length < 3) errors.push('Name must be at least 3 characters long');
  
  if (!price) errors.push('Price is required');
  else if (isNaN(price) || price <= 0) errors.push('Price must be a positive number');
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors
    });
  }

  db.run(
    'UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?',
    [name, price, description || '', id],
    function(err) {
      if (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ 
          error: 'Failed to update product',
          details: err.message
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ 
          error: 'Product not found',
          message: `No product exists with ID ${id}`
        });
      }
      
      // Invalidate caches
      cache.allProducts.timestamp = null;
      if (cache.productById[id]) {
        cache.productById[id].timestamp = null;
      }
      
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('Error fetching updated product:', err);
          return res.status(500).json({ 
            error: 'Product updated but failed to retrieve it',
            details: err.message
          });
        }
        
        // Update cache for this product
        if (!cache.productById[id]) {
          cache.productById[id] = { ttl: 60000 };
        }
        cache.productById[id].data = row;
        cache.productById[id].timestamp = Date.now();
        
        res.json({
          version: 'v2',
          data: row,
          message: 'Product updated successfully'
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
      return res.status(500).json({ 
        error: 'Failed to delete product',
        details: err.message
      });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ 
        error: 'Product not found',
        message: `No product exists with ID ${id}`
      });
    }
    
    // Invalidate caches
    cache.allProducts.timestamp = null;
    if (cache.productById[id]) {
      delete cache.productById[id];
    }
    
    res.json({
      version: 'v2',
      message: `Product with ID ${id} deleted successfully`
    });
  });
});

module.exports = router;
