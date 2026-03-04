const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/register', authController.showRegister);
router.post('/register', authController.handleRegister);

router.get('/login', authController.showLogin);
router.post('/login', authController.handleLogin);

router.get('/logout', authController.logout);

module.exports = router;
