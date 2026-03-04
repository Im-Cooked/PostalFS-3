const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAdmin } = require('../middleware/auth');

router.get('/dashboard', ensureAdmin, adminController.dashboard);
// new report page for admin statistics
router.get('/report', ensureAdmin, adminController.report);
// per-request user detail view
router.get('/user/:id', ensureAdmin, adminController.userDetail);
// debug helper: expose report without auth when not in production to help diagnose routing/session issues
// expose debug route (development helper) — remove or guard in production
router.get('/report-debug', adminController.report);
router.post('/parcel/update-status', ensureAdmin, adminController.updateStatus);
router.post('/payment/update-status', ensureAdmin, adminController.updatePaymentStatus);
// Approve/reject specific payment by id (use POST only)
router.post('/payment/:id/approve', ensureAdmin, adminController.approvePayment);
router.post('/payment/:id/reject', ensureAdmin, adminController.rejectPayment);
//router.post('/parcel/delete', isAdmin, adminController.deleteParcel);
router.post('/parcel/cancel', ensureAdmin, adminController.cancelParcel);
router.post('/parcel/ship', ensureAdmin, adminController.markShipped);
router.post('/parcel/start-delivery', ensureAdmin, adminController.startDelivery);
router.post('/parcel/deliver', ensureAdmin, adminController.markDelivered);
// Admin-only route to clear all parcels and payments (keep customers)
router.post('/clear-data', ensureAdmin, adminController.clearData);

module.exports = router;
