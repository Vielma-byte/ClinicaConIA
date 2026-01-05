const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// Rutas
router.post('/', patientController.createOrUpdatePatient);
router.get('/search', patientController.searchPatients);
router.get('/:nss', patientController.getPatientByNss);
router.delete('/:nss', patientController.deletePatient);

module.exports = router;
