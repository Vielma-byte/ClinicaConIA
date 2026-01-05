const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const verifyToken = require('../middlewares/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas de casos
router.use(verifyToken);

// Rutas
router.post('/', caseController.createCase);
router.get('/', caseController.getCases); // Obtener lista filtrada
router.get('/:id', caseController.getCaseById);
router.delete('/:id', caseController.deleteCase); // Nueva ruta para eliminar
router.get('/:id/comentarios', caseController.getCaseComments);
router.post('/:id/comentarios', caseController.addComment);
router.patch('/:id/cerrar', caseController.closeCase);
router.patch('/:id', caseController.updateCase); // Actualización genérica (ej. diagnóstico)

module.exports = router;
