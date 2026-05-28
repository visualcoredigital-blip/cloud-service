// src/functions/contact-pdf/handler.js
const PDFDocument = require('pdfkit');
const { Storage } = require('@google-cloud/storage');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Inicialización de Storage
const storage = new Storage();

// Reutilización de conexión a MongoDB Atlas usando la variable global de tu entorno
const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);

async function handleContactPdf(payload) {
    try {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 [CONTACT_PDF] Ejecutando lógica de la función...');

        const params = payload || {};
        const exportId = params.exportId || `export-${Date.now()}`;
        const bucketName = process.env.BUCKET_NAME || 'contact-pdf-exports';

        const dateSuffix = new Date().toISOString().split('T')[0]; 
        const uniqueId = crypto.randomBytes(4).toString('hex');

        // Nombre final del archivo único
        const fileName = `contact-pdf-exports/contacts-${exportId}-${dateSuffix}-${uniqueId}.pdf`;

        // Conexión y consulta a Base de Datos (VisualCoreDB)
        await client.connect();
        const db = client.db('VisualCoreDB');
        const contacts = await db.collection('contacts').find({}).toArray();

        console.log(`🔍 Contactos obtenidos de BD Atlas: ${contacts.length}`);

        if (contacts.length === 0) {
            console.log('⚠️ No se encontraron contactos en la base de datos. Finalizando.');
            return { success: false, message: 'Sin contactos para exportar.' };
        }

        const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}.pdf`);

        // Estructura y diseño del PDF con PDFKit
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const writeStream = fs.createWriteStream(tempFilePath);

        doc.pipe(writeStream);
        doc.fontSize(18).text('Listado de Contactos', { align: 'center' });
        doc.moveDown(2);

        // Encabezados de tabla estáticos
        let currentY = doc.y;
        doc.fontSize(12)
           .text('Nombre', 50, currentY)
           .text('Email', 180, currentY)
           .text('Teléfono', 350, currentY)
           .text('Estado', 470, currentY);

        doc.moveDown(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);

        // Iteración de datos con control seguro de desborde de hoja
        contacts.forEach(contact => {
            if (doc.y > 750) { 
                doc.addPage();
            }

            const telefono = contact.telefono?.formateado || contact.telefono || '';
            currentY = doc.y;

            doc.fontSize(10)
               .text(contact.nombre || 'N/A', 50, currentY, { width: 120 })
               .text(contact.email || 'N/A', 180, currentY, { width: 150 })
               .text(telefono || 'N/A', 350, currentY, { width: 100 })
               .text(contact.estado || 'N/A', 470, currentY, { width: 80 });
               
            doc.moveDown(1.5); 
        });

        doc.end();

        // Control de término del stream
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        console.log(`💾 Archivo temporal guardado localmente en: ${tempFilePath}`);

        // Subir a Google Cloud Storage
        // Nota: Si estás probando sin internet o sin credencial, esto arrojará error de GCP,
        // pero valida que todo tu código anterior (Mongo + PDFKit) corre impecable.
        console.log(`📤 Subiendo archivo a Bucket de Storage: "${bucketName}"...`);
        await storage.bucket(bucketName).upload(tempFilePath, {
            destination: fileName,
            metadata: { contentType: 'application/pdf' }
        });

        // Limpieza del archivo del disco local
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        
        console.log(`✅ Archivo exportado con éxito: ${fileName}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return {
            success: true,
            message: `Reporte generado con éxito en Storage: ${fileName}`
        };

    } catch (error) {
        console.error('❌ Error crítico en ejecución del PDF handler:', error.message);
        throw error; // Se lo lanza al index.js para que responda un HTTP 500
    }
}

module.exports = { handleContactPdf };