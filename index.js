const express = require('express');
const bodyParser = require('body-parser');
const { initDatabase } = require('./db');
const productsV1Router = require('./routes/products-v1');
const productsV2Router = require('./routes/products-v2');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from public directory

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Strangler Pattern Implementation
// --------------------------------
// This is where we implement the Strangler Pattern.
// We have two versions of our API:
// 1. V1: The original implementation
// 2. V2: The new implementation with improvements
//
// The Strangler Pattern allows us to gradually migrate from V1 to V2
// by routing specific endpoints to the new implementation while keeping
// the rest on the old implementation.

// Feature flag to control which endpoints use V2
const FEATURES_USING_V2 = {
  getAllProducts: true,  // GET /api/products
  getProductById: false, // GET /api/products/:id
  createProduct: false,  // POST /api/products
  updateProduct: false,  // PUT /api/products/:id
  deleteProduct: false   // DELETE /api/products/:id
};

// Strangler facade that routes requests to either V1 or V2
app.use('/api/products', (req, res, next) => {
  // Determine which version to use based on the request
  let useV2 = false;
  
  if (req.method === 'GET' && !req.params.id) {
    // GET /api/products (list all)
    useV2 = FEATURES_USING_V2.getAllProducts;
  } else if (req.method === 'GET' && req.params.id) {
    // GET /api/products/:id (get one)
    useV2 = FEATURES_USING_V2.getProductById;
  } else if (req.method === 'POST') {
    // POST /api/products (create)
    useV2 = FEATURES_USING_V2.createProduct;
  } else if (req.method === 'PUT') {
    // PUT /api/products/:id (update)
    useV2 = FEATURES_USING_V2.updateProduct;
  } else if (req.method === 'DELETE') {
    // DELETE /api/products/:id (delete)
    useV2 = FEATURES_USING_V2.deleteProduct;
  }
  
  // Route to the appropriate version
  if (useV2) {
    console.log('Using V2 implementation');
    return productsV2Router(req, res, next);
  } else {
    console.log('Using V1 implementation');
    return productsV1Router(req, res, next);
  }
});

// Direct access to specific API versions (for testing/comparison)
app.use('/api/v1/products', productsV1Router);
app.use('/api/v2/products', productsV2Router);

// Home route - redirect to the interactive demo
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Strangler Pattern Demo:');
      console.log('- V1 API: Original implementation');
      console.log('- V2 API: Enhanced implementation with caching, validation, filtering, and sorting');
      console.log('- Currently migrating: GET /api/products (list all products)');
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Export for testing
module.exports = app;
