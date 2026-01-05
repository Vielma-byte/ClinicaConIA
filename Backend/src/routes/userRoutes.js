const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Rutas
router.post('/register', userController.registerUser);
router.get('/doctors', userController.getDoctors);
router.get('/:uid', userController.getUserById);

module.exports = router;
