require('dotenv').config({ path: './config.env' });

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { Resend } = require('resend');

//Esto se quita
console.log("=================================");
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY);
console.log("TO_EMAIL:", process.env.TO_EMAIL);
console.log("=================================");

const resend = new Resend(process.env.RESEND_API_KEY);

const app  = express();
const PORT = process.env.PORT || 3000;

const WA_TOKEN     = process.env.WA_TOKEN;
const WA_PHONE_ID  = process.env.WA_PHONE_ID;
const WA_MI_NUMERO = process.env.WA_NUMERO;

/* ====================================
   MIDDLEWARES
==================================== */
app.use(express.static(__dirname));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ====================================
   RUTA PRINCIPAL
==================================== */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ====================================
   TEST WHATSAPP
   Visita http://localhost:3000/test-wa para probar
==================================== */
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
        console.log(data);
        res.json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

/* ====================================
   FORMULARIO WEB
==================================== */
app.post('/api/consulta', async (req, res) => {
    try {
        const { nombre, celular, correo, mensaje, productos } = req.body;

        if (!nombre || !celular) {
            return res.status(400).json({
                ok: false,
                message: 'Nombre y celular son obligatorios'
            });
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
            console.error(data);
            return res.status(500).json({ ok: false, error: data });
        }

        console.log('WhatsApp enviado OK');
        return res.json({ ok: true, message: 'Consulta enviada correctamente' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, error: error.message });
    }
});


/* ====================================
   ENVIAR CORREO CON RESEND
==================================== */
app.post("/enviar", async (req, res) => {

    try {

        console.log("BODY RECIBIDO:");
        console.log(req.body);

        const {
            nombre,
            apellido,
            correo,
            mensaje,
            latitud,
            longitud
        } = req.body;

        const mapsLink =
            latitud && longitud
                ? `https://www.google.com/maps?q=${latitud},${longitud}`
                : null;

        const resultado = await resend.emails.send({

            from: "onboarding@resend.dev",

            to: process.env.TO_EMAIL,

            subject: "📩 Nuevo contacto CONSTECUADOR",

            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">

                    <h2 style="color:#0F5495">
                        📩 Nuevo mensaje desde CONSTECUADOR
                    </h2>

                    <hr>

                    <p>
                        <strong>Nombre:</strong>
                        ${nombre || "No especificado"}
                    </p>

                    <p>
                        <strong>Apellido:</strong>
                        ${apellido || "No especificado"}
                    </p>

                    <p>
                        <strong>Correo:</strong>
                        ${correo || "No especificado"}
                    </p>

                    <p>
                        <strong>Mensaje:</strong>
                    </p>

                    <div style="
                        background:#f5f5f5;
                        padding:15px;
                        border-radius:8px;
                    ">
                        ${mensaje || "Sin mensaje"}
                    </div>

                    <hr>

                    <h3>📍 Ubicación del visitante</h3>

                    <p>
                        <strong>Latitud:</strong>
                        ${latitud || "No disponible"}
                    </p>

                    <p>
                        <strong>Longitud:</strong>
                        ${longitud || "No disponible"}
                    </p>

                    ${
                        mapsLink
                        ?
                        `
                        <p>
                            <a
                                href="${mapsLink}"
                                target="_blank"
                                style="
                                    background:#1E86D9;
                                    color:white;
                                    text-decoration:none;
                                    padding:10px 20px;
                                    border-radius:6px;
                                    display:inline-block;
                                "
                            >
                                Ver ubicación en Google Maps
                            </a>
                        </p>
                        `
                        :
                        ""
                    }

                </div>
            `
        });

        console.log("=================================");
        console.log("CORREO ENVIADO");
        console.log(resultado);
        console.log("=================================");

        res.json({
            ok: true,
            resultado
        });

    } catch (error) {

        console.log("=================================");
        console.log("ERROR RESEND");
        console.log(error);
        console.log("=================================");

        res.status(500).json({
            ok: false,
            error: error.message,
            detalle: error
        });
    }
});

/* ====================================
   ARRANQUE
==================================== */
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`Servidor iniciado`);
    console.log(`http://localhost:${PORT}`);
    console.log('=================================');
});