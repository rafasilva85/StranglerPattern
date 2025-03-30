# Strangler Pattern Demo

This project demonstrates the Strangler Pattern, a technique for gradually migrating from a legacy system to a new system by incrementally replacing specific functions of the legacy system with new implementations.

## What is the Strangler Pattern?

The Strangler Pattern (or Strangler Fig Pattern) was introduced by Martin Fowler and is named after the strangler fig vines that grow around trees in rainforests. These vines gradually envelop the tree until they become self-supporting structures, eventually replacing the original tree.

In software development, this pattern involves:

1. Creating a new system alongside the old one
2. Gradually routing specific functionality from the old system to the new system
3. Eventually completely replacing the old system with the new one

## Project Structure

This demo implements a simple product management API with two versions:

- **V1 (Legacy)**: Basic CRUD operations with minimal features
- **V2 (New)**: Enhanced implementation with improved error handling, validation, caching, and additional features

The Strangler Pattern is implemented through a facade that routes requests to either V1 or V2 based on feature flags.

```
simple-demo/
├── db.js                 # Database setup and initialization
├── index.js              # Main application with Strangler Pattern implementation
├── package.json          # Project dependencies
└── routes/
    ├── products-v1.js    # V1 (legacy) implementation
    └── products-v2.js    # V2 (new) implementation
```

## Key Components

### 1. Feature Flags

In `index.js`, we use feature flags to control which endpoints are routed to the new implementation:

```javascript
const FEATURES_USING_V2 = {
  getAllProducts: true,  // GET /api/products
  getProductById: false, // GET /api/products/:id
  createProduct: false,  // POST /api/products
  updateProduct: false,  // PUT /api/products/:id
  deleteProduct: false   // DELETE /api/products/:id
};
```

### 2. Routing Facade

The routing facade determines which implementation to use based on the request and feature flags:

```javascript
app.use('/api/products', (req, res, next) => {
  // Determine which version to use based on the request
  let useV2 = false;
  
  if (req.method === 'GET' && !req.params.id) {
    useV2 = FEATURES_USING_V2.getAllProducts;
  } else if (req.method === 'GET' && req.params.id) {
    useV2 = FEATURES_USING_V2.getProductById;
  }
  // ... other conditions
  
  // Route to the appropriate version
  if (useV2) {
    return productsV2Router(req, res, next);
  } else {
    return productsV1Router(req, res, next);
  }
});
```

### 3. V1 vs V2 Implementation

- **V1 (Legacy)**: Basic CRUD operations with minimal error handling
- **V2 (New)**: Enhanced implementation with:
  - Better error handling with detailed messages
  - Enhanced data validation
  - Caching for GET requests
  - Filtering and sorting capabilities

## Running the Demo

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. Access the API at `http://localhost:3000`

## Demonstrating the Strangler Pattern

1. Initially, only the `GET /api/products` endpoint uses the V2 implementation
2. You can compare the behavior of V1 vs V2 by using:
   - `/api/products` - Uses V1 or V2 based on feature flags
   - `/api/v1/products` - Always uses V1
   - `/api/v2/products` - Always uses V2

3. To simulate the gradual migration:
   - Modify the feature flags in `index.js` to enable V2 for more endpoints
   - Restart the server to see the changes

## Benefits of the Strangler Pattern

1. **Reduced Risk**: Migrate functionality incrementally rather than all at once
2. **Continuous Delivery**: Keep delivering value while migrating
3. **Easier Testing**: Compare old and new implementations side by side
4. **Reversibility**: Easily roll back to the old implementation if issues arise
5. **Manageable Complexity**: Break a large migration into smaller, manageable pieces

## Teaching Points

When teaching the Strangler Pattern, emphasize:

1. **Incremental Migration**: The importance of migrating one piece at a time
2. **Feature Flags**: How they control which implementation is used
3. **Facade Pattern**: How it routes requests to the appropriate implementation
4. **Parallel Running**: How both implementations can coexist during migration
5. **Testing Strategy**: How to verify the new implementation works correctly

## Real-World Applications

In real-world scenarios, the Strangler Pattern is useful for:

- Migrating from monoliths to microservices
- Replacing legacy systems with modern implementations
- Rewriting critical components with improved architecture
- Transitioning between different frameworks or technologies
