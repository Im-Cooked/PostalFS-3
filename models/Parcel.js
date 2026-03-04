const db = require('../Database/Database');

const Parcel = {
  create: (data, cb) => {
    const sql = `INSERT INTO Parcels (tracking_number, sender_id, receiver_name, receiver_phone, receiver_address, weight, size, shipping_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [data.tracking_number, data.sender_id, data.receiver_name, data.receiver_phone, data.receiver_address, data.weight, data.size, data.shipping_cost, data.status || 'Created'], function (err) {
      cb(err, this && this.lastID);
    });
  },
  findById: (id, cb) => {
    db.get(`SELECT * FROM Parcels WHERE parcel_id = ?`, [id], cb);
  },
  findBySender: (sender_id, cb) => {
    db.all(`SELECT * FROM Parcels WHERE sender_id = ? ORDER BY created_at DESC`, [sender_id], cb);
  },
  findByTrackingNumber: (tn, cb) => {
    db.get(`SELECT * FROM Parcels WHERE tracking_number = ?`, [tn], cb);
  }
};

module.exports = Parcel;
