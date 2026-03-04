// Middleware ตรวจสอบเพื่อให้มั่นใจว่ามี session
const ensureAuth = (req, res, next) => {
  if (req.session && req.session.customer) return next();
  res.redirect('/login');
};

// Middleware ตรวจสอบให้แน่ใจว่าเป็น customer เท่านั้น (ไม่ใช่ admin)
const ensureCustomer = (req, res, next) => {
  if (req.session && req.session.customer && req.session.customer.role !== 'admin') {
    return next();
  }
  // ถ้าเป็น admin ให้ไป admin dashboard
  if (req.session && req.session.customer && req.session.customer.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/login');
};

// Middleware ตรวจสอบให้แน่ใจว่าเป็น admin เท่านั้น
const ensureAdmin = (req, res, next) => {
  if (req.session && req.session.customer && req.session.customer.role === 'admin') {
    return next();
  }
  // If authenticated but not admin, show access denied
  if (req.session && req.session.customer) {
    return res.redirect('/access-denied');
  }
  // otherwise ask to login
  return res.redirect('/login');
};

module.exports = { ensureAuth, ensureCustomer, ensureAdmin };
