const Parcel = require('../models/Parcel');
const Payment = require('../models/Payment');

// Simple shipping cost calculation example
function calculateShippingCost(weight) {
  const base = 30; // base fee
  const perKg = 20; // per kg
  return base + perKg * Math.max(0, weight);
}

// Automatic size calculation based on weight
function calculateSize(weight) {
  const w = parseFloat(weight);
  
  // Validate weight range
  if (isNaN(w) || w <= 0 || w > 100) {
    throw new Error("Weight must be between 0.1 and 100 kg");
  }

  // Size determination based on weight
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

const parcelController = {
  showCreate: (req, res) => res.render('create-parcel'),
  createParcel: (req, res) => {
    const sender_id = req.session.customer.id;
    const {
      receiver_name,
      receiver_phone,
      // split address fields
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
    
    // ==========================================
    // RECEIVER ADDRESS VALIDATION (Backend)
    // ==========================================
    if (!house_no || !subdistrict || !district || !province) {
      return res.render('create-parcel', { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }

    // build full address string
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
    
    // ==========================================
    // STRICT WEIGHT VALIDATION (Backend)
    // ==========================================
    
    // Parse weight as a number
    const w = Number(weight);
    
    // Check if weight is a valid number
    if (isNaN(w) || weight === '' || weight === undefined) {
      return res.render('create-parcel', { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }
    
    // Check if weight is greater than 0
    if (w <= 0) {
      return res.render('create-parcel', { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }
    
    // Check if weight exceeds maximum (100 kg)
    if (w > 100) {
      return res.render('create-parcel', { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }
    
    // Round weight to 1 decimal place for consistency
    const finalWeight = Math.round(w * 10) / 10;
    
    try {
      // Validate and calculate size automatically
      const size = calculateSize(finalWeight);
      
      const shipping_cost = calculateShippingCost(finalWeight);
      const tracking_number = generateTrackingNumber();
      
      Parcel.create({ 
        tracking_number, 
        sender_id, 
        receiver_name, 
        receiver_phone, 
        receiver_address: fullAddress, 
        weight: finalWeight,  // Use rounded weight
        size,  // Use calculated size, NOT from frontend
        shipping_cost, 
        status: 'Pending' 
      }, (err, parcel_id) => {
        if (err) {
          return res.render('create-parcel', { error: 'Failed to create parcel: ' + err.message });
        }
        // payment will be created when customer actually pays
        res.redirect('/parcels/' + parcel_id);
      });
    } catch (err) {
      return res.render('create-parcel', { error: err.message });
    }
  },
  dashboard: (req, res) => {
    const sender_id = req.session.customer.id;
    const message = req.query.msg;
    Parcel.findBySender(sender_id, (err, rows) => {
      if (err) return res.render('dashboard', { error: 'DB error', parcels: [], message });
      res.render('dashboard', { parcels: rows, message });
    });
  },
  viewParcel: (req, res) => {
    const id = req.params.id;
    const userRole = req.session.customer.role;
    Parcel.findById(id, (err, parcel) => {
      if (err || !parcel) return res.render('dashboard', { error: 'Parcel not found' });
      Payment.findByParcel(parcel.parcel_id, (err2, payment) => {
        res.render('tracking', { parcel, payment, userRole });
      });
    });
  },
  updateStatus: (req, res) => {
    const { parcel_id, status } = req.body;
    const db = require('../Database/Database');
    db.run('UPDATE Parcels SET status = ? WHERE parcel_id = ?', [status, parcel_id], function (err) {
      if (err) return res.json({ error: 'Failed to update status' });
      res.json({ success: true, message: 'Status updated' });
    });
  },

  // customer cancels own parcel
  cancelParcel: (req, res) => {
    const parcelId = req.params.id;
    const userId = req.session.customer.id;
    Parcel.findById(parcelId, (err, parcel) => {
      if (err || !parcel || parcel.sender_id !== userId) {
        return res.redirect('/parcels/dashboard');
      }
      if (parcel.status !== 'Pending' && parcel.status !== 'Paid') {
        return res.redirect('/parcels/dashboard');
      }
      const db = require('../Database/Database');
      // if already paid, cancel payment row too
      if (parcel.status === 'Paid') {
        db.run('UPDATE Payments SET payment_status = ? WHERE parcel_id = ?', ['Cancelled', parcelId]);
      }
      db.run('UPDATE Parcels SET status = ? WHERE parcel_id = ?', ['Cancelled', parcelId], err2 => {
        res.redirect('/parcels/dashboard?msg=Parcel+cancelled');
      });
    });
  },
  payments: (req, res) => {
    const sender_id = req.session.customer.id;
    const db = require('../Database/Database');
    
    // Get all payments for parcels sent by this customer
    db.all(`
      SELECT p.payment_id, p.payment_status, p.payment_date,
             pl.tracking_number, pl.receiver_name, pl.status AS parcel_status, pl.shipping_cost
      FROM Payments p
      JOIN Parcels pl ON p.parcel_id = pl.parcel_id
      WHERE pl.sender_id = ?
      ORDER BY p.payment_date DESC
    `, [sender_id], (err, payments) => {
      if (err) return res.render('payments', { error: 'DB error', payments: [] });
      res.render('payments', { payments: payments || [], error: undefined });
    });
  }
};

module.exports = { parcelController, calculateShippingCost, calculateSize };
