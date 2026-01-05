const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.post('/:id/generate', reportController.generateReport);

module.exports = router;
