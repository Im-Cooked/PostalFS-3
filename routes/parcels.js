const express = require('express');
const router = express.Router();
const { parcelController } = require('../controllers/parcelController');
const paymentController = require('../controllers/paymentController');
const { ensureAuth, ensureCustomer } = require('../middleware/auth');

router.get('/dashboard', ensureAuth, parcelController.dashboard);
router.get('/create', ensureCustomer, parcelController.showCreate);
router.post('/create', ensureCustomer, parcelController.createParcel);
router.get('/payments', ensureCustomer, parcelController.payments);
router.get('/:id/pay', ensureCustomer, paymentController.showPayment);
router.post('/:id/pay', ensureCustomer, paymentController.payParcel);
router.post('/:id/cancel', ensureCustomer, parcelController.cancelParcel);
router.get('/:id', ensureAuth, parcelController.viewParcel);

module.exports = router;
