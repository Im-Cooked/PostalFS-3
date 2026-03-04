const bcrypt = require('bcrypt');
const Customer = require('../models/Customer');

const authController = {
  showRegister: (req, res) => res.render('register'),
  handleRegister: async (req, res) => {
    const { customer_name, email, password, phone, address } = req.body;
    Customer.findByEmail(email, async (err, row) => {
      if (err) return res.render('register', { error: 'DB error' });
      if (row) return res.render('register', { error: 'Email already used' });
      const hash = await bcrypt.hash(password, 10);
      Customer.create({ customer_name, email, password: hash, phone, address, role: 'customer' }, (err2, id) => {
        if (err2) return res.render('register', { error: 'Failed to create' });
        req.session.customer = { id, customer_name, email, role: 'customer' };
        res.redirect('/parcels/dashboard');
      });
    });
  },
  showLogin: (req, res) => res.render('login'),
  handleLogin: (req, res) => {
    const { email, password } = req.body;
    Customer.findByEmail(email, async (err, user) => {
      if (err || !user) return res.render('login', { error: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.render('login', { error: 'Invalid credentials' });
      req.session.customer = { 
        id: user.customer_id, 
        customer_name: user.customer_name, 
        email: user.email,
        role: user.role 
      };
      // Redirect to admin dashboard if role is admin
      if (user.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
      res.redirect('/parcels/dashboard');
    });
  },
  logout: (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  }
};

module.exports = authController;
