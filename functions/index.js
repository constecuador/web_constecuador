require('dotenv').config({ path: './config.env' });

const functions = require('firebase-functions');
const express   = require('express');
const fetch     = require('node-fetch');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const WA_TOKEN     = process.env.WA_TOKEN;
const WA_PHONE_ID  = process.env.WA_PHONE_ID;
const WA_MI_NUMERO = process.env.WA_NUMERO;

/* ==== TEST WHATSAPP ==== */
app.get('/test-wa', async (req, res) => {
    try {
        const payload = {
            messaging_product: 'whatsapp',
            to:   WA_MI_NUMERO,
            type: 'text',
            text: { body: '✅ Mensaje de prueba desde CONSTECUADOR' }
        };
        const response = await fetch(
            `https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization:  `Bearer ${WA_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/* ==== FORMULARIO WEB ==== */
app.post('/api/consulta', async (req, res) => {
    try {
        const { nombre, celular, correo, mensaje, productos } = req.body;

        if (!nombre || !celular) {
            return res.status(400).json({ ok: false, message: 'Nombre y celular son obligatorios' });
        }

        let listaProductos = '';
        if (Array.isArray(productos) && productos.length > 0) {
            listaProductos = productos.map(p => `• ${p}`).join('\n');
        }

        const texto =
`📥 NUEVA CONSULTA WEB

👤 Cliente:
${nombre}

📱 Celular:
${celular}

${correo ? `📧 Correo:\n${correo}\n\n` : ''}🛒 Productos:
${listaProductos || 'No especificados'}

${mensaje ? `💬 Mensaje:\n${mensaje}` : ''}`;

        const payload = {
            messaging_product: 'whatsapp',
            to:   WA_MI_NUMERO,
            type: 'text',
            text: { body: texto }
        };

        const response = await fetch(
            `https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization:  `Bearer ${WA_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({ ok: false, error: data });
        }

        return res.json({ ok: true, message: 'Consulta enviada correctamente' });

    } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
    }
});

/* ==== CORREO RESEND ==== */
app.post('/enviar', async (req, res) => {
    try {
        const { nombre, apellido, correo, mensaje, latitud, longitud } = req.body;

        const mapsLink = latitud && longitud
            ? `https://www.google.com/maps?q=${latitud},${longitud}`
            : null;

        const resultado = await resend.emails.send({
            from:    'onboarding@resend.dev',
            to:      process.env.TO_EMAIL,
            subject: '📩 Nuevo contacto CONSTECUADOR',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
                    <h2 style="color:#0F5495">📩 Nuevo mensaje desde CONSTECUADOR</h2>
                    <hr>
                    <p><strong>Nombre:</strong> ${nombre || 'No especificado'}</p>
                    <p><strong>Apellido:</strong> ${apellido || 'No especificado'}</p>
                    <p><strong>Correo:</strong> ${correo || 'No especificado'}</p>
                    <p><strong>Mensaje:</strong></p>
                    <div style="background:#f5f5f5;padding:15px;border-radius:8px">
                        ${mensaje || 'Sin mensaje'}
                    </div>
                    <hr>
                    <h3>📍 Ubicación del visitante</h3>
                    <p><strong>Latitud:</strong> ${latitud || 'No disponible'}</p>
                    <p><strong>Longitud:</strong> ${longitud || 'No disponible'}</p>
                    ${mapsLink ? `<p><a href="${mapsLink}" target="_blank" style="background:#1E86D9;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;display:inline-block;">Ver ubicación en Google Maps</a></p>` : ''}
                </div>
            `
        });

        res.json({ ok: true, resultado });

    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// 🔑 Reemplaza el app.listen()
exports.api = functions.https.onRequest(app);