// Description: Postal Management System - Backend REST API
// requires: npm install express body-parser bcrypt
// This is the backend API server that returns JSON data

const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const Customer = require('./models/Customer');
const Parcel = require('./models/Parcel');
const Payment = require('./models/Payment');
const db = require('./Database/Database');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Helper functions
function calculateShippingCost(weight) {
  const base = 30;
  const perKg = 20;
  return base + perKg * Math.max(0, weight);
}

function calculateSize(weight) {
  const w = parseFloat(weight);
  if (isNaN(w) || w <= 0 || w > 100) {
    throw new Error("Weight must be between 0.1 and 100 kg");
  }
  if (w <= 1) return "S";
  if (w <= 5) return "M";
  if (w <= 15) return "L";
  if (w <= 30) return "XL";
  if (w <= 60) return "XXL";
  return "XXXL";
}

function generateTrackingNumber() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 9000 + 1000).toString();
  return `PD-${now}-${rand}`;
}

// ==================== ROOT ROUTE ====================
app.get('/', (req, res) => {
  res.json({ message: 'Postal Management System API', version: '1.0.0' });
});

// ==================== AUTH API ROUTES ====================
// Register new customer
app.post('/api/auth/register', async (req, res) => {
  const { customer_name, email, password, phone, address } = req.body;
  Customer.findByEmail(email, async (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (row) return res.status(400).json({ error: 'Email already used' });
    const hash = await bcrypt.hash(password, 10);
    Customer.create({ customer_name, email, password: hash, phone, address, role: 'customer' }, (err2, id) => {
      if (err2) return res.status(500).json({ error: 'Failed to create user' });
      res.json({ success: true, customer_id: id, customer_name, email, role: 'customer' });
    });
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  Customer.findByEmail(email, async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({
      success: true,
      customer: {
        id: user.customer_id,
        customer_name: user.customer_name,
        email: user.email,
        role: user.role
      }
    });
  });
});

// ==================== CUSTOMER API ROUTES ====================
// Get customer by ID
app.get('/api/customers/:id', (req, res) => {
  Customer.findById(req.params.id, (err, customer) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  });
});

// Update customer
app.put('/api/customers/:id', (req, res) => {
  const { customer_name, phone, address } = req.body;
  db.run(
    'UPDATE Customers SET customer_name = ?, phone = ?, address = ? WHERE customer_id = ?',
    [customer_name, phone, address, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    }
  );
});

// ==================== PARCEL API ROUTES ====================
// Get all parcels for a customer
app.get('/api/parcels/customer/:id', (req, res) => {
  Parcel.findBySender(req.params.id, (err, parcels) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(parcels || []);
  });
});

// Get parcel by ID
app.get('/api/parcels/:id', (req, res) => {
  Parcel.findById(req.params.id, (err, parcel) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });
    res.json(parcel);
  });
});

// Create new parcel
app.post('/api/parcels', (req, res) => {
  const {
    sender_id,
    receiver_name,
    receiver_phone,
    house_no,
    moo,
    soi,
    road,
    subdistrict,
    district,
    province,
    postal_code,
    weight
  } = req.body;

  if (!house_no || !subdistrict || !district || !province) {
    return res.status(400).json({ error: 'Required address fields missing' });
  }

  const parts = [];
  parts.push(house_no);
  if (moo) parts.push('หมู่ ' + moo);
  if (soi) parts.push('ซอย ' + soi);
  if (road) parts.push('ถนน ' + road);
  parts.push('ตำบล' + subdistrict);
  parts.push('อำเภอ' + district);
  parts.push('จังหวัด' + province);
  if (postal_code) parts.push(postal_code);
  const fullAddress = parts.join(' ').replace(/\s+/g, ' ').trim();

  const w = Number(weight);
  if (isNaN(w) || w <= 0 || w > 100) {
    return res.status(400).json({ error: 'Invalid weight' });
  }

  const finalWeight = Math.round(w * 10) / 10;
  
  try {
    const size = calculateSize(finalWeight);
    const shipping_cost = calculateShippingCost(finalWeight);
    const tracking_number = generateTrackingNumber();

    Parcel.create({
      tracking_number,
      sender_id,
      receiver_name,
      receiver_phone,
      receiver_address: fullAddress,
      weight: finalWeight,
      size,
      shipping_cost,
      status: 'Created'
    }, (err, parcel_id) => {
      if (err) return res.status(500).json({ error: 'Failed to create parcel' });
      res.json({ success: true, parcel_id, tracking_number });
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update parcel
app.put('/api/parcels/:id', (req, res) => {
  const { receiver_name, receiver_phone, receiver_address, status } = req.body;
  db.run(
    'UPDATE Parcels SET receiver_name = ?, receiver_phone = ?, receiver_address = ?, status = ? WHERE parcel_id = ?',
    [receiver_name, receiver_phone, receiver_address, status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true });
    }
  );
});

// Delete parcel
app.delete('/api/parcels/:id', (req, res) => {
  db.run('DELETE FROM Parcels WHERE parcel_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

// ==================== PAYMENT API ROUTES ====================
// Get payments for a parcel
app.get('/api/payments/parcel/:id', (req, res) => {
  db.get('SELECT * FROM Payments WHERE parcel_id = ?', [req.params.id], (err, payment) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(payment || null);
  });
});

// Get all payments for a customer
app.get('/api/payments/customer/:id', (req, res) => {
  db.all(`
    SELECT p.*, par.tracking_number, par.receiver_name,
           par.status AS parcel_status,
           par.shipping_cost
    FROM Payments p
    JOIN Parcels par ON p.parcel_id = par.parcel_id
    WHERE par.sender_id = ?
    ORDER BY p.payment_date DESC
  `, [req.params.id], (err, payments) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(payments || []);
  });
});

// Create payment
app.post('/api/payments', (req, res) => {
  const { parcel_id, amount, payment_method } = req.body;
  Payment.create({
    parcel_id,
    amount,
    payment_method,
    payment_status: 'Paid'
  }, (err, payment_id) => {
    if (err) return res.status(500).json({ error: 'Failed to create payment' });
    res.json({ success: true, payment_id });
  });
});

// ==================== ADMIN API ROUTES ====================
// Get all parcels (admin)
app.get('/api/admin/parcels', (req, res) => {
  db.all(`
    SELECT pl.*, c.customer_name
    FROM Parcels pl
    JOIN Customers c ON pl.sender_id = c.customer_id
    ORDER BY pl.created_at DESC
  `, (err, parcels) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(parcels || []);
  });
});

// Get all payments (admin)
app.get('/api/admin/payments', (req, res) => {
  db.all(`
    SELECT p.*, par.tracking_number
    FROM Payments p
    JOIN Parcels par ON p.parcel_id = par.parcel_id
    ORDER BY p.payment_date DESC
  `, (err, payments) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(payments || []);
  });
});

// Admin: update parcel status only (used by admin dashboard action buttons)
app.post('/api/admin/parcels/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status' });
  const deliveredAt = status === 'Delivered' ? new Date().toISOString() : null;

  db.run(
    `UPDATE Parcels
     SET status = ?,
         delivered_at = CASE
           WHEN ? = 'Delivered' THEN COALESCE(delivered_at, ?)
           ELSE delivered_at
         END
     WHERE parcel_id = ?`,
    [status, status, deliveredAt, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!this.changes) return res.status(404).json({ error: 'Parcel not found' });
      res.json({ success: true });
    }
  );
});

// Admin: approve/reject a payment (used by admin dashboard payment buttons)
app.post('/api/admin/payments/:id/approve', (req, res) => {
  db.get('SELECT parcel_id FROM Payments WHERE payment_id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Payment not found' });

    db.run(
      "UPDATE Payments SET payment_status = 'Paid' WHERE payment_id = ?",
      [req.params.id],
      function (err2) {
        if (err2) return res.status(500).json({ error: 'Database error' });
        // Ensure parcel becomes ready to ship if applicable
        db.run(
          "UPDATE Parcels SET status = 'Ready to Ship' WHERE parcel_id = ? AND status IN ('Pending','Paid')",
          [row.parcel_id],
          () => res.json({ success: true })
        );
      }
    );
  });
});

app.post('/api/admin/payments/:id/reject', (req, res) => {
  db.run(
    "UPDATE Payments SET payment_status = 'Cancelled' WHERE payment_id = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!this.changes) return res.status(404).json({ error: 'Payment not found' });
      res.json({ success: true });
    }
  );
});

// Admin: clear all parcel/payment/tracking data (keeps customers)
app.post('/api/admin/clear-data', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM Tracking', (err0) => {
      if (err0) return res.status(500).json({ error: 'Database error' });
      db.run('DELETE FROM Payments', (err1) => {
        if (err1) return res.status(500).json({ error: 'Database error' });
        db.run('DELETE FROM Parcels', (err2) => {
          if (err2) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true });
        });
      });
    });
  });
});

// Get report data (admin)
app.get('/api/admin/report', (req, res) => {
  const stats = {
    revenueByMethod: [],
    codOutstanding: [],
    trackLocations: [],
    topCustomers: [],
    latestParcels: [],
    statusBreakdown: []
  };
  
  db.serialize(() => {
    // Total revenue from paid payments
    db.get("SELECT SUM(amount) AS totalRevenuePaid FROM Payments WHERE payment_status='Paid'", (err0, r0) => {
      stats.totalRevenuePaid = (r0 && r0.totalRevenuePaid) || 0;
      
      // Total parcels
      db.get('SELECT COUNT(*) AS parcelCount FROM Parcels', (err1, r1) => {
        stats.totalParcels = (r1 && r1.parcelCount) || 0;
        
        // Success rate
        db.get(
          "SELECT SUM(CASE WHEN status IN ('Delivered','Shipped') THEN 1 ELSE 0 END) AS successCount, COUNT(*) AS totalCount FROM Parcels",
          (err3, r3) => {
            stats.successCount = (r3 && r3.successCount) || 0;
            stats.totalCount = (r3 && r3.totalCount) || 1;
            stats.successRate = (stats.successCount / stats.totalCount);
            
            // Revenue by payment method
            db.all(
              "SELECT payment_method, SUM(amount) as total FROM Payments WHERE payment_status='Paid' GROUP BY payment_method",
              (err4, r4) => {
                stats.revenueByMethod = r4 || [];
                
                // COD Outstanding
                db.all(
                  `SELECT p.payment_id, p.amount, par.status, p.payment_status 
                   FROM Payments p 
                   JOIN Parcels par ON p.parcel_id = par.parcel_id 
                   WHERE p.payment_method='COD' AND p.payment_status='Unpaid' 
                   AND par.status IN ('Shipped', 'Delivered')`,
                  (err5, r5) => {
                    stats.codOutstanding = r5 || [];
                    
                    // Overdue parcels (ready/pending > 7 days)
                    db.get(
                      "SELECT COUNT(*) as overdueCount FROM Parcels WHERE status IN ('Created', 'Ready') AND julianday('now') - julianday(created_at) > 7",
                      (err6, r6) => {
                        stats.overdueCount = (r6 && r6.overdueCount) || 0;
                        
                        // Track locations
                        db.all(
                          "SELECT location, COUNT(*) as count FROM Tracking GROUP BY location ORDER BY count DESC LIMIT 10",
                          (err7, r7) => {
                            stats.trackLocations = r7 || [];
                            
                            // Top customers
                            db.all(
                              `SELECT c.customer_id, c.customer_name, COUNT(p.parcel_id) as sentCount 
                               FROM Customers c 
                               JOIN Parcels p ON c.customer_id = p.sender_id 
                               GROUP BY c.customer_id 
                               ORDER BY sentCount DESC LIMIT 10`,
                              (err8, r8) => {
                                stats.topCustomers = r8 || [];
                                
                                // Latest parcels
                                db.all(
                                  `SELECT p.parcel_id, c.customer_name as sender_name, p.receiver_name, p.created_at 
                                   FROM Parcels p 
                                   JOIN Customers c ON p.sender_id = c.customer_id 
                                   ORDER BY p.created_at DESC LIMIT 10`,
                                  (err9, r9) => {
                                    stats.latestParcels = r9 || [];
                                    
                                    // Status breakdown
                                    db.all(
                                      "SELECT status, COUNT(*) as count FROM Parcels GROUP BY status",
                                      (err10, r10) => {
                                        stats.statusBreakdown = r10 || [];
                                        
                                        // Total customers
                                        db.get("SELECT COUNT(*) as totalCustomers FROM Customers", (err11, r11) => {
                                          stats.totalCustomers = (r11 && r11.totalCustomers) || 0;
                                          
                                          // Average shipping cost
                                          db.get("SELECT AVG(shipping_cost) as avgCost FROM Parcels", (err12, r12) => {
                                            stats.avgShippingCost = (r12 && r12.avgCost) || 0;
                                            
                                            res.json(stats);
                                          });
                                        });
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});

// Get tracking history
app.get('/api/tracking/:parcel_id', (req, res) => {
  db.all(
    'SELECT * FROM Tracking WHERE parcel_id = ? ORDER BY timestamp DESC',
    [req.params.parcel_id],
    (err, tracking) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(tracking || []);
    }
  );
});

// Add tracking update
app.post('/api/tracking', (req, res) => {
  const { parcel_id, location, status, notes } = req.body;
  db.run(
    'INSERT INTO Tracking (parcel_id, location, status, notes) VALUES (?, ?, ?, ?)',
    [parcel_id, location, status, notes],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ success: true, tracking_id: this.lastID });
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Postal API Server running on http://localhost:${PORT}`);
});

module.exports = app;
