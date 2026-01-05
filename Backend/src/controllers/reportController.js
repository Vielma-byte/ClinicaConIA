const PDFDocument = require('pdfkit');
const { db } = require('../config/firebase');

const generateReport = async (req, res) => {
    try {
        const { id } = req.params;
        const casoRef = db.collection('casos').doc(id);
        const doc = await casoRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Caso no encontrado' });
        }

        const caso = doc.data();

        // Crear el documento PDF
        const docPDF = new PDFDocument();

        // Configurar headers para descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_${caso.pacienteNSS}.pdf`);

        docPDF.pipe(res);

        // --- DISEÑO DEL PDF ---

        // Encabezado
        docPDF.fontSize(20).text('Reporte Médico de Radiodiagnóstico', { align: 'center' });
        docPDF.moveDown();
        docPDF.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'right' });
        docPDF.moveDown();

        // Información del Paciente
        docPDF.rect(50, 130, 500, 85).stroke();
        docPDF.fontSize(14).text('Información del Paciente', 60, 140);
        docPDF.fontSize(10).text(`Nombre: ${caso.pacienteNombreCompleto}`, 60, 160);
        docPDF.text(`NSS: ${caso.pacienteNSS}`, 60, 175);
        docPDF.text(`Motivo de Consulta: ${caso.motivoConsulta}`, 60, 190);

        // Información del Médico
        docPDF.moveDown(4);
        docPDF.fontSize(14).text('Médico Especialista', 60, 240);
        docPDF.fontSize(10).text(`Dr. ${caso.medicoEspecialistaNombre}`, 60, 260);

        // Diagnóstico
        docPDF.moveDown(2);
        docPDF.fontSize(14).text('Diagnóstico / Hallazgos', 60, 300);
        docPDF.moveDown(0.5);
        docPDF.fontSize(11).text(caso.diagnostico || 'Sin diagnóstico registrado.', {
            align: 'justify',
            width: 480
        });

        // Pie de página
        docPDF.moveDown(4);
        docPDF.fontSize(10).text('_________________________', { align: 'center' });
        docPDF.text(`Firma: Dr. ${caso.medicoEspecialistaNombre}`, { align: 'center' });

        docPDF.end();

    } catch (error) {
        console.error('Error al generar PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error al generar el reporte PDF' });
        }
    }
};

module.exports = { generateReport };
