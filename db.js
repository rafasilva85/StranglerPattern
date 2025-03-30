const sqlite3 = require('sqlite3').verbose();

// Create a new database or open an existing one
const db = new sqlite3.Database('./products.db');

// Initialize the database with a products table
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create products table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating products table:', err);
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  });
};

module.exports = {
  db,
  initDatabase
};
