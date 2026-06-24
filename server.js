require('dotenv').config({ path: './config.env' });

const express = require('express');
const fetch   = require('node-fetch');
const { Resend } = require('resend');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;


const WA_TOKEN     = process.env.WA_TOKEN;
const WA_PHONE_ID  = process.env.WA_PHONE_ID;
const WA_MI_NUMERO = process.env.WA_NUMERO;   // destino fijo — NUNCA viene del cliente

/* ====================================
   VERIFICACIÓN AL ARRANCAR
   Si falta alguna variable crítica, se avisa en los logs de Render
==================================== */
console.log('=================================');
console.log('CONSTECUADOR — iniciando servidor');
console.log('WA_TOKEN cargado   :', WA_TOKEN     ? `${WA_TOKEN.slice(0, 10)}...` : '❌ NO ENCONTRADO');
console.log('WA_PHONE_ID cargado:', WA_PHONE_ID  || '❌ NO ENCONTRADO');
console.log('WA_NUMERO cargado  :', WA_MI_NUMERO || '❌ NO ENCONTRADO');
console.log('=================================');

/* ====================================
   MIDDLEWARES
==================================== */
app.use(cors({
  origin: ['https://constecuador.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const resend = new Resend(process.env.RESEND_API_KEY);

/* ====================================
   UTILIDADES DE SANITIZACIÓN (backend)
   Aunque el frontend ya sanitiza, el backend
   siempre debe validar de forma independiente.
==================================== */
function sanitizeText(str, maxLen = 500) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/[<>"'`]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, maxLen);
}

function sanitizeCelular(str) {
  if (!str) return null;
  const limpio     = String(str).trim().replace(/[^\d+\s\-]/g, '');
  const soloDigitos = limpio.replace(/\D/g, '');
  if (soloDigitos.length < 7 || soloDigitos.length > 15) return null;
  return limpio;
}

function validarCorreo(str) {
  if (!str) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/* ====================================
   HELPER — enviar mensaje WhatsApp
   SIEMPRE envía a WA_MI_NUMERO (del .env)
   El celular del cliente solo se muestra en el
   cuerpo del texto, nunca como destinatario.
==================================== */
async function enviarWhatsApp(texto) {
  const payload = {
    messaging_product: 'whatsapp',
    to:   WA_MI_NUMERO,          // ← destino fijo desde .env
    type: 'text',
    text: { body: texto }
  };

  const response = await fetch(
    `https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  // Log completo para depuración en Render
  console.log('─── META API ────────────────────');
  console.log('STATUS :', response.status);
  console.log('BODY   :', JSON.stringify(data, null, 2));
  console.log('─────────────────────────────────');

  if (!response.ok) {
    // Códigos de error comunes de Meta:
    // 131030 → número destino no está en lista de prueba
    // 190    → token inválido o expirado
    // 100    → WA_PHONE_ID incorrecto
    const code = data?.error?.code;
    const msg  = data?.error?.message || 'Error desconocido de Meta';
    throw new Error(`[Meta ${code}] ${msg}`);
  }

  return data;
}

/* ====================================
   RUTA: TEST WHATSAPP
   GET /test-wa — para probar desde el navegador
   Ej: https://web-constecuador.onrender.com/test-wa
==================================== */
app.get('/test-wa', async (req, res) => {
  try {
    const data = await enviarWhatsApp('✅ Mensaje de prueba desde CONSTECUADOR');
    res.json({ ok: true, meta: data });
  } catch (error) {
    console.error('ERROR /test-wa:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/* ====================================
   RUTA: CONSULTA DE PRODUCTOS
   POST /api/consulta — desde el drawer del sitio web
==================================== */
app.post('/api/consulta', async (req, res) => {
  try {
    // 1. Leer y sanitizar entradas
    const nombre   = sanitizeText(req.body.nombre,   100);
    const celular  = sanitizeCelular(req.body.celular);
    const correo   = sanitizeText(req.body.correo,   200);
    const mensaje  = sanitizeText(req.body.mensaje,  500);
    const productos = Array.isArray(req.body.productos)
      ? req.body.productos
          .filter(p => typeof p === 'string')          // solo strings
          .map(p => sanitizeText(p, 100))              // sanitizar cada uno
          .slice(0, 10)                                // máximo 10 productos
      : [];

    // 2. Validaciones
    if (!nombre || nombre.length < 2) {
      return res.status(400).json({ ok: false, error: 'Nombre inválido o muy corto.' });
    }
    if (!celular) {
      return res.status(400).json({ ok: false, error: 'Número de celular inválido.' });
    }
    if (correo && !validarCorreo(correo)) {
      return res.status(400).json({ ok: false, error: 'Correo electrónico inválido.' });
    }
    if (productos.length === 0) {
      return res.status(400).json({ ok: false, error: 'Selecciona al menos un producto.' });
    }

    // 3. Armar el mensaje (el celular aquí es INFORMATIVO, no el destino)
    const listaProductos = productos.map(p => `• ${p}`).join('\n');

    const texto =
`📥 NUEVA CONSULTA WEB — CONSTECUADOR

👤 Cliente : ${nombre}
📱 Celular : ${celular}
${correo  ? `📧 Correo  : ${correo}\n` : ''}
🛒 Productos consultados:
${listaProductos}
${mensaje ? `\n💬 Mensaje:\n${mensaje}` : ''}`;

    // 4. Enviar WhatsApp a TU número (WA_NUMERO del .env)
    await enviarWhatsApp(texto);

    console.log(`✅ Consulta enviada OK — cliente: ${nombre} (${celular})`);
    return res.json({ ok: true, message: 'Consulta enviada correctamente' });

  } catch (error) {
    console.error('ERROR /api/consulta:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/* ====================================
   RUTA: FORMULARIO DE CONTACTO
   POST /enviar — desde el formulario de contacto del sitio
==================================== */
app.post('/enviar', async (req, res) => {
  try {
    console.log('BODY /enviar:', req.body);

    // Sanitizar entradas
    const nombre   = sanitizeText(req.body.nombre,   100);
    const apellido = sanitizeText(req.body.apellido, 100);
    const correo   = sanitizeText(req.body.correo,   200);
    const mensaje  = sanitizeText(req.body.mensaje,  1000);
    const latitud  = parseFloat(req.body.latitud)  || null;
    const longitud = parseFloat(req.body.longitud) || null;

    if (!nombre || !correo || !mensaje) {
      return res.status(400).json({ ok: false, error: 'Nombre, correo y mensaje son obligatorios.' });
    }
    if (!validarCorreo(correo)) {
      return res.status(400).json({ ok: false, error: 'Correo electrónico inválido.' });
    }

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
          <p><strong>Nombre:</strong>   ${nombre   || 'No especificado'}</p>
          <p><strong>Apellido:</strong> ${apellido || 'No especificado'}</p>
          <p><strong>Correo:</strong>   ${correo   || 'No especificado'}</p>
          <p><strong>Mensaje:</strong></p>
          <div style="background:#f5f5f5;padding:15px;border-radius:8px;">
            ${mensaje || 'Sin mensaje'}
          </div>
          <hr>
          <h3>📍 Ubicación del visitante</h3>
          <p><strong>Latitud:</strong>  ${latitud  || 'No disponible'}</p>
          <p><strong>Longitud:</strong> ${longitud || 'No disponible'}</p>
          ${mapsLink ? `
          <p>
            <a href="${mapsLink}" target="_blank"
               style="background:#1E86D9;color:white;text-decoration:none;
                      padding:10px 20px;border-radius:6px;display:inline-block;">
              Ver ubicación en Google Maps
            </a>
          </p>` : ''}
        </div>
      `
    });

    console.log('✅ Correo enviado OK:', resultado);
    return res.json({ ok: true, resultado });

  } catch (error) {
    console.error('ERROR /enviar:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/* ====================================
   ARRANQUE
==================================== */
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Test WA: http://localhost:${PORT}/test-wa`);
  console.log('=================================');
});