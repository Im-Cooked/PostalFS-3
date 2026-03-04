const db = require('./Database');
const bcrypt = require('bcrypt');

async function seedAdmin() {
  try {
    // Migration: Drop old trigger if it exists to allow recreation with new logic
    db.run(`DROP TRIGGER IF EXISTS payments_after_update`, (err) => {
      if (err && !err.message.includes('no such trigger')) {
        console.log('Note: Could not drop old trigger:', err.message);
      }
    });
    
    // Migration: Recreate trigger with improved logic (no longer overwrites Shipped/Delivered)
    db.run(`
      CREATE TRIGGER IF NOT EXISTS payments_after_update
      AFTER UPDATE ON Payments
      FOR EACH ROW
      WHEN NEW.payment_status = 'Paid'
      BEGIN
        UPDATE Parcels SET status = 'Ready to Ship' WHERE parcel_id = NEW.parcel_id AND status IN ('Pending', 'Paid');
      END
    `, (err) => {
      if (err) {
        console.log('Note: Could not create/update trigger (might already exist):', err.message);
      }
    });
    
    // Migration: Add role column if it doesn't exist
    db.run(`ALTER TABLE Customers ADD COLUMN role TEXT DEFAULT 'customer'`, (err) => {
      if (err && err.message.includes('duplicate column')) {
        // Column already exists, that's fine
      } else if (err) {
        console.log('Note: Could not add role column (might already exist):', err.message);
      }
    });
    
    // Migration: Add delivered_at column to Parcels if it doesn't exist
    db.run(`ALTER TABLE Parcels ADD COLUMN delivered_at TEXT`, (err) => {
      if (err && err.message.includes('duplicate column')) {
        // Column already exists, that's fine
      } else if (err) {
        console.log('Note: Could not alter table (might already have role column):', err.message);
      }
      
      // Check if admin already exists after migrations
      db.get(`SELECT * FROM Customers WHERE email = 'admin@gmail.com'`, async (err, row) => {
        if (err) {
          console.error('Error checking admin:', err);
          return;
        }
        
        if (row) {
          console.log('✓ Admin account already exists at admin@gmail.com');
          return;
        }
        
        // Create admin account
        const password = '958813229';
        const hash = await bcrypt.hash(password, 10);
        
        db.run(
          `INSERT INTO Customers (customer_name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)`,
          ['Administrator', 'admin@gmail.com', hash, '0000000000', 'Admin Office', 'admin'],
          function(err) {
            if (err) {
              console.error('Error creating admin:', err);
            } else {
              console.log('✓ Admin account created');
              console.log('  Email: admin@gmail.com');
              console.log('  Password: 958813229');
            }
          }
        );
      });
    });
  } catch (err) {
    console.error('Seed error:', err);
  }
}

module.exports = seedAdmin;
