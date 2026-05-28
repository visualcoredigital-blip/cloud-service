// src/index.js
const express = require('express');
const app = express();

// 1. IMPORTACIÓN DE HANDLERS
// Cada vez que crees una función nueva, solo la importas aquí arriba.
const { handleContactPdf } = require('./functions/contact-pdf/handler');
// const { handleSendEmail } = require('./functions/send-email/handler'); <-- Ejemplo futuro

// 2. DICCIONARIO DE FUNCIONES (Mapeador Dinámico)
const functionsRegistry = {
    'DOWNLOAD_PDF': handleContactPdf, // <-- Nombre actualizado a DOWNLOAD_PDF
    // 'SEND_EMAIL_BREVO': handleSendEmail, 
};

app.use(express.json());

app.post('/', async (req, res) => {
    try {
        const body = req.body;
        if (!body) return res.status(400).send('Bad Request: Body vacío');

        let payload;
        let action;

        // -------------------------------------------------------------
        // FLUJO A: Pruebas Locales (Tu formato limpio en Postman)
        // -------------------------------------------------------------
        if (body.exportId || body.action) {
            payload = body;
            // Si en Postman no mandas action, por defecto asumimos CONTACT_PDF para tu comodidad actual
            action = body.action || 'CONTACT_PDF'; 
        } 
        // -------------------------------------------------------------
        // FLUJO B: Producción (El sobre oficial de Google Cloud Pub/Sub)
        // -------------------------------------------------------------
        else if (body.message && body.message.data) {
            const base64Data = body.message.data;
            const decodedString = Buffer.from(base64Data, 'base64').toString('utf-8');
            payload = JSON.parse(decodedString);

            // En la nube, leeremos el atributo 'action' enviado por Spring Boot
            const attributes = body.message.attributes || {};
            action = attributes.action || payload.action || 'DOWNLOAD_PDF';
        }

        // 3. ENRUTAMIENTO DINÁMICO
        // Busca la función en el diccionario usando el string de 'action'
        const targetFunction = functionsRegistry[action];

        if (typeof targetFunction === 'function') {
            // Ejecuta la función correspondiente pasándole sus datos aislados
            const result = await targetFunction(payload);
            return res.status(200).send(result.message);
        } else {
            console.warn(`⚠️ No se encontró ninguna función registrada para la acción: "${action}"`);
            return res.status(404).send(`Error: Action "${action}" not found.`);
        }

    } catch (error) {
        console.error('❌ Error crítico en el enrutador central:', error.message);
        return res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ Servidor Cloud Local corriendo en el puerto ${PORT}`);
    console.log(`📋 Funciones activas listas para probar: [ ${Object.keys(functionsRegistry).join(', ')} ]`);
});