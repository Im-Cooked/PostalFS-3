const db = require('../Database/Database');

const Customer = {
  create: (data, cb) => {
    const role = data.role || 'customer';
    const sql = `INSERT INTO Customers (customer_name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [data.customer_name, data.email, data.password, data.phone, data.address, role], function (err) {
      cb(err, this && this.lastID);
    });
  },
  findByEmail: (email, cb) => {
    const sql = `SELECT * FROM Customers WHERE email = ?`;
    db.get(sql, [email], cb);
  },
  findById: (id, cb) => {
    db.get(`SELECT * FROM Customers WHERE customer_id = ?`, [id], cb);
  }
};

module.exports = Customer;
