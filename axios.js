// Description: Postal Management System - Frontend Client
// requires: npm install express ejs axios body-parser express-session

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const QRCode = require('qrcode');
const app = express();

// Base URL for the API (backend server on port 3000)
const base_url = "http://localhost:3000";

// Set the template engine
app.set("views", path.join(__dirname, "/views"));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files
app.use(express.static(__dirname + '/public'));

// Session configuration
app.use(session({
  secret: 'replace-with-secure-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 }
}));

// Expose session to views
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.user = req.session ? req.session.customer : null;
  res.locals.currentPath = req.path;
  next();
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.customer) {
    return res.redirect('/login');
  }
  next();
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.customer || req.session.customer.role !== 'admin') {
    return res.redirect('/access-denied');
  }
  next();
};

// ==================== HOME ROUTE ====================
app.get("/", (req, res) => {
  if (!req.session || !req.session.customer) {
    return res.redirect('/login');
  }
  if (req.session.customer.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/parcels/dashboard');
});

// ==================== AUTH ROUTES ====================
app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  try {
    const data = {
      customer_name: req.body.customer_name,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone,
      address: req.body.address
    };
    const response = await axios.post(base_url + '/api/auth/register', data);
    if (response.data.success) {
      req.session.customer = {
        id: response.data.customer_id,
        customer_name: response.data.customer_name,
        email: response.data.email,
        role: response.data.role
      };
      res.redirect("/parcels/dashboard");
    }
  } catch (err) {
    console.error(err);
    const errorMsg = err.response?.data?.error || 'Registration failed';
    res.render("register", { error: errorMsg });
  }
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  try {
    const data = { email: req.body.email, password: req.body.password };
    const response = await axios.post(base_url + '/api/auth/login', data);
    if (response.data.success) {
      req.session.customer = response.data.customer;
      if (response.data.customer.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
      res.redirect("/parcels/dashboard");
    }
  } catch (err) {
    console.error(err);
    res.render("login", { error: 'Invalid credentials' });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ==================== DASHBOARD ROUTES ====================
app.get("/dashboard", requireAuth, (req, res) => {
  if (req.session.customer.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/parcels/dashboard');
});

// ==================== PARCEL ROUTES ====================
app.get("/parcels/dashboard", requireAuth, async (req, res) => {
  try {
    const response = await axios.get(base_url + '/api/parcels/customer/' + req.session.customer.id);
    res.render("dashboard", { parcels: response.data });
  } catch (err) {
    console.error(err);
    res.render("dashboard", { parcels: [] });
  }
});

app.get("/parcels/create", requireAuth, (req, res) => {
  res.render("create-parcel", { error: null });
});

app.post("/parcels/create", requireAuth, async (req, res) => {
  try {
    const data = {
      sender_id: req.session.customer.id,
      receiver_name: req.body.receiver_name,
      receiver_phone: req.body.receiver_phone,
      house_no: req.body.house_no,
      moo: req.body.moo,
      soi: req.body.soi,
      road: req.body.road,
      subdistrict: req.body.subdistrict,
      district: req.body.district,
      province: req.body.province,
      postal_code: req.body.postal_code,
      weight: req.body.weight
    };
    await axios.post(base_url + '/api/parcels', data);
    res.redirect("/parcels/dashboard");
  } catch (err) {
    console.error(err);
    const errorMsg = err.response?.data?.error || 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน';
    res.render("create-parcel", { error: errorMsg });
  }
});

app.get("/parcels/tracking/:id", requireAuth, async (req, res) => {
  try {
    const parcelId = req.params.id;
    const [parcelResponse, trackingResponse, paymentResponse] = await Promise.all([
      axios.get(base_url + '/api/parcels/' + parcelId),
      axios.get(base_url + '/api/tracking/' + parcelId),
      axios.get(base_url + '/api/payments/parcel/' + parcelId)
    ]);
    res.render("tracking", { 
      parcel: parcelResponse.data, 
      tracking: trackingResponse.data,
      payment: paymentResponse.data,
      userRole: req.session.customer.role
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading tracking information');
  }
});

// Compatibility route: Pay page (GET)
app.get("/parcels/:id/pay", requireAuth, (req, res) => {
  res.redirect('/parcels/payment/' + req.params.id);
});

app.get("/parcels/payment/:id", requireAuth, async (req, res) => {
  try {
    const response = await axios.get(base_url + '/api/parcels/' + req.params.id);
    const parcel = response.data;

    const methods = [
      { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
      { id: 'wallet', name: 'Mobile Wallet', icon: '📱' },
      { id: 'card', name: 'Credit Card', icon: '💳' },
      { id: 'online', name: 'Online Payment', icon: '💵' },
      { id: 'COD', name: 'Cash on Delivery', icon: '🚚' }
    ];

    try {
      const methodsWithQR = await Promise.all(
        methods.map((m) =>
          QRCode.toDataURL(`PAY-${parcel.parcel_id}-${m.id}-${Math.random().toString(36).slice(2)}`).then((qr) => ({
            ...m,
            qrCode: qr
          }))
        )
      );
      res.render("payment", { parcel, error: undefined, methods: methodsWithQR });
    } catch (qrErr) {
      console.error(qrErr);
      res.render("payment", { parcel, error: 'Failed to generate QR codes', methods });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Compatibility route: Pay page (POST)
app.post("/parcels/:id/pay", requireAuth, async (req, res) => {
  try {
    const parcelId = req.params.id;
    const parcelResponse = await axios.get(base_url + '/api/parcels/' + parcelId);
    const data = {
      parcel_id: parcelId,
      amount: req.body.amount || parcelResponse.data.shipping_cost,
      payment_method: req.body.payment_method
    };
    await axios.post(base_url + '/api/payments', data);
    res.redirect('/parcels/payments');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post("/parcels/payment/:id", requireAuth, async (req, res) => {
  try {
    const parcelResponse = await axios.get(base_url + '/api/parcels/' + req.params.id);
    const data = {
      parcel_id: req.params.id,
      amount: parcelResponse.data.shipping_cost,
      payment_method: req.body.payment_method
    };
    await axios.post(base_url + '/api/payments', data);
    res.redirect("/parcels/payments");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Compatibility route: Cancel parcel (customer)
app.post("/parcels/:id/cancel", requireAuth, async (req, res) => {
  try {
    await axios.post(base_url + '/api/admin/parcels/' + req.params.id + '/status', { status: 'Cancelled' });
    res.redirect('/parcels/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get("/parcels/payments", requireAuth, async (req, res) => {
  try {
    const response = await axios.get(base_url + '/api/payments/customer/' + req.session.customer.id);
    res.render("payments", { payments: response.data });
  } catch (err) {
    console.error(err);
    res.render("payments", { payments: [] });
  }
});

app.get("/parcels/update/:id", requireAuth, async (req, res) => {
  try {
    const response = await axios.get(base_url + '/api/parcels/' + req.params.id);
    res.render("update", { parcel: response.data });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post("/parcels/update/:id", requireAuth, async (req, res) => {
  try {
    const data = {
      receiver_name: req.body.receiver_name,
      receiver_phone: req.body.receiver_phone,
      receiver_address: req.body.receiver_address,
      status: req.body.status
    };
    await axios.put(base_url + '/api/parcels/' + req.params.id, data);
    res.redirect("/parcels/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get("/parcels/delete/:id", requireAuth, async (req, res) => {
  try {
    await axios.delete(base_url + '/api/parcels/' + req.params.id);
    res.redirect("/parcels/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Compatibility route: View parcel details (used by dashboard/admin templates)
// Renders tracking.ejs
// NOTE: must come after /parcels/create, /parcels/payment, etc.
app.get("/parcels/:id", requireAuth, async (req, res) => {
  try {
    const parcelId = req.params.id;
    const [parcelResponse, trackingResponse, paymentResponse] = await Promise.all([
      axios.get(base_url + '/api/parcels/' + parcelId),
      axios.get(base_url + '/api/tracking/' + parcelId),
      axios.get(base_url + '/api/payments/parcel/' + parcelId)
    ]);

    res.render("tracking", {
      parcel: parcelResponse.data,
      tracking: trackingResponse.data,
      payment: paymentResponse.data,
      userRole: req.session.customer.role
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading parcel details');
  }
});

// ==================== ADMIN ROUTES ====================
app.get("/admin/dashboard", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parcelsResponse = await axios.get(base_url + '/api/admin/parcels');
    const paymentsResponse = await axios.get(base_url + '/api/admin/payments');
    res.render("admin-dashboard", { 
      parcels: parcelsResponse.data, 
      payments: paymentsResponse.data 
    });
  } catch (err) {
    console.error(err);
    res.render("admin-dashboard", { parcels: [], payments: [] });
  }
});

// Admin parcel actions (used by buttons on admin dashboard)
app.post('/admin/parcel/cancel', requireAuth, requireAdmin, async (req, res) => {
  try {
    const parcelId = req.body.parcel_id;
    await axios.post(base_url + '/api/admin/parcels/' + parcelId + '/status', { status: 'Cancelled' });
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post('/admin/parcel/ship', requireAuth, requireAdmin, async (req, res) => {
  try {
    const parcelId = req.body.parcel_id;
    await axios.post(base_url + '/api/admin/parcels/' + parcelId + '/status', { status: 'Shipped' });
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post('/admin/parcel/start-delivery', requireAuth, requireAdmin, async (req, res) => {
  try {
    const parcelId = req.body.parcel_id;
    await axios.post(base_url + '/api/admin/parcels/' + parcelId + '/status', { status: 'Out for Delivery' });
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post('/admin/parcel/deliver', requireAuth, requireAdmin, async (req, res) => {
  try {
    const parcelId = req.body.parcel_id;
    await axios.post(base_url + '/api/admin/parcels/' + parcelId + '/status', { status: 'Delivered' });
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Admin payment actions (used by approve/reject buttons)
app.post('/admin/payment/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    await axios.post(base_url + '/api/admin/payments/' + req.params.id + '/approve');
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post('/admin/payment/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    await axios.post(base_url + '/api/admin/payments/' + req.params.id + '/reject');
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// Clear all parcel/payment data (button uses fetch)
app.post('/admin/clear-data', requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await axios.post(base_url + '/api/admin/clear-data');
    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

app.get("/admin/report", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(base_url + '/api/admin/report');
    res.render("report", { stats: response.data });
  } catch (err) {
    console.error(err);
    res.render("report", { stats: {} });
  }
});

app.get("/admin/user/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const customerResponse = await axios.get(base_url + '/api/customers/' + req.params.id);
    const parcelsResponse = await axios.get(base_url + '/api/parcels/customer/' + req.params.id);
    res.render("user-detail", { 
      customer: customerResponse.data, 
      parcels: parcelsResponse.data 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get("/admin/update-parcel/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(base_url + '/api/parcels/' + req.params.id);
    res.render("update", { parcel: response.data });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post("/admin/update-parcel/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = {
      receiver_name: req.body.receiver_name,
      receiver_phone: req.body.receiver_phone,
      receiver_address: req.body.receiver_address,
      status: req.body.status
    };
    await axios.put(base_url + '/api/parcels/' + req.params.id, data);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get("/admin/add-tracking/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(base_url + '/api/parcels/' + req.params.id);
    res.render("add-tracking", { parcel: response.data });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post("/admin/add-tracking/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = {
      parcel_id: req.params.id,
      location: req.body.location,
      status: req.body.status,
      notes: req.body.notes
    };
    await axios.post(base_url + '/api/tracking', data);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get("/admin/delete-parcel/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await axios.delete(base_url + '/api/parcels/' + req.params.id);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get("/admin/update-customer/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(base_url + '/api/customers/' + req.params.id);
    res.render("update-customer", { customer: response.data });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.post("/admin/update-customer/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = {
      customer_name: req.body.customer_name,
      phone: req.body.phone,
      address: req.body.address
    };
    await axios.put(base_url + '/api/customers/' + req.params.id, data);
    res.redirect("/admin/user/" + req.params.id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// ==================== ERROR ROUTES ====================
app.get('/access-denied', (req, res) => {
  res.status(403).render('access-denied', { message: null });
});

// Start the frontend server
const FRONTEND_PORT = 5500;
app.listen(FRONTEND_PORT, () => {
  console.log(`Postal Frontend Client running on http://localhost:${FRONTEND_PORT}`);
});
