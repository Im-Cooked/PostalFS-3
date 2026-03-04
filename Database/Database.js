const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'postal.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('Failed to open DB', err);
  console.log('Connected to SQLite database at', dbPath);
});

// Enable foreign keys
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  // Initialize schema if needed
  const schemaSql = `
-- Schema for Postal Delivery System
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Customers (
  customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  role TEXT DEFAULT 'customer'
);

CREATE TABLE IF NOT EXISTS Parcels (
  parcel_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_number TEXT NOT NULL UNIQUE,
  sender_id INTEGER NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT,
  receiver_address TEXT,
  weight REAL DEFAULT 0,
  size TEXT,
  shipping_cost REAL DEFAULT 0,
  status TEXT DEFAULT 'Created',
  created_at TEXT DEFAULT (datetime('now')),
  delivered_at TEXT,
  FOREIGN KEY (sender_id) REFERENCES Customers(customer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_date TEXT DEFAULT (datetime('now')),
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Online Payment',
  payment_status TEXT DEFAULT 'Pending',
  parcel_id INTEGER UNIQUE,
  FOREIGN KEY (parcel_id) REFERENCES Parcels(parcel_id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS payments_after_update
AFTER UPDATE ON Payments
FOR EACH ROW
WHEN NEW.payment_status = 'Paid'
BEGIN
  UPDATE Parcels SET status = 'Ready to Ship' WHERE parcel_id = NEW.parcel_id AND status IN ('Pending', 'Paid');
END;

CREATE TABLE IF NOT EXISTS Tracking (
  tracking_id INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id INTEGER NOT NULL,
  update_time TEXT DEFAULT (datetime('now')),
  location TEXT,
  description TEXT,
  FOREIGN KEY (parcel_id) REFERENCES Parcels(parcel_id) ON DELETE CASCADE
);
`;

  db.exec(schemaSql, (e) => {
    if (e) return console.error('Failed to initialize schema', e);
    console.log('Database schema ensured');
    // Seed admin account after schema is ready
    const seedAdmin = require('./seed');
    seedAdmin();
  });
});

module.exports = db;
