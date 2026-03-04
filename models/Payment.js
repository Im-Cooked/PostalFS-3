const db = require('../Database/Database');

const Payment = {
  create: (data, cb) => {
    const sql = `INSERT INTO Payments (amount, payment_method, payment_status, parcel_id) VALUES (?, ?, ?, ?)`;
    db.run(sql, [data.amount, data.payment_method, data.payment_status || 'Pending', data.parcel_id], function (err) {
      cb(err, this && this.lastID);
    });
  },
  findByParcel: (parcel_id, cb) => {
    db.get(`SELECT * FROM Payments WHERE parcel_id = ?`, [parcel_id], cb);
  }
};

module.exports = Payment;
