/* ============================================================
   UTILIDADES DE SANITIZACIÓN
============================================================ */

/**
 * Elimina etiquetas HTML y caracteres peligrosos de un string.
 * Úsala en TODOS los campos de texto libre.
 */
function sanitizeText(str) {
  return String(str)
    .trim()
    .replace(/[<>"'`]/g, '')          // quita caracteres HTML peligrosos
    .replace(/javascript:/gi, '')      // bloquea proto-URLs JS
    .replace(/on\w+\s*=/gi, '')        // bloquea atributos de evento (onclick=, etc.)
    .slice(0, 500);                    // límite de longitud
}

/**
 * Valida y limpia un número de celular.
 * Solo permite dígitos, espacios, + y guiones. Máx 15 dígitos (estándar E.164).
 */
function sanitizeCelular(str) {
  const limpio = String(str).trim().replace(/[^\d+\s\-]/g, '');
  const soloDigitos = limpio.replace(/\D/g, '');
  if (soloDigitos.length < 7 || soloDigitos.length > 15) return null; // inválido
  return limpio;
}

/**
 * Valida formato básico de correo electrónico.
 */
function validarCorreo(str) {
  if (!str) return true; // es opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}


/* ============================================================
   PANEL DE CONSULTA — consulta.js
============================================================ */
(function () {

  const PRODUCTOS_CATALOGO = [
    { id: 'vigas-teka',        nombre: 'Vigas de Teka',       categoria: 'Madera' },
    { id: 'duelas-madera',     nombre: 'Duelas de Madera',    categoria: 'Madera' },
    { id: 'pellets-madera',    nombre: 'Pellets de Madera',   categoria: 'Biomasa' },
    { id: 'pellets-plasticos', nombre: 'Pellets Plásticos',   categoria: 'Industrial' },
    { id: 'morteros-bondex',   nombre: 'Morteros Bondex',     categoria: 'Construcción' },
    { id: 'saman-madera',      nombre: 'Samán de Madera',     categoria: 'Madera' }
  ];

  let seleccionados = [];

  const overlay    = document.getElementById('consultaOverlay');
  const drawer     = document.getElementById('consultaDrawer');
  const btnCerrar  = document.getElementById('consultaCerrar');
  const lista      = document.getElementById('consultaLista');
  const listaVacia = document.getElementById('consultaVacia');
  const opciones   = document.getElementById('consultaOpciones');
  const btnWA      = document.getElementById('consultaBtnWA');
  const errorMsg   = document.getElementById('consultaError');

  function abrirDrawer(productoId) {
    if (productoId && !seleccionados.includes(productoId)) {
      seleccionados.push(productoId);
    }
    renderLista();
    renderOpciones();
    overlay.classList.add('abierto');
    drawer.classList.add('abierto');
    document.body.style.overflow = 'hidden';
  }

  function cerrarDrawer() {
    overlay.classList.remove('abierto');
    drawer.classList.remove('abierto');
    document.body.style.overflow = '';
  }

  function agregarProducto(id) {
    if (!seleccionados.includes(id)) {
      seleccionados.push(id);
      renderLista();
      renderOpciones();
    }
  }

  function quitarProducto(id) {
    seleccionados = seleccionados.filter(s => s !== id);
    renderLista();
    renderOpciones();
  }

  function renderLista() {
    lista.innerHTML = '';
    listaVacia.style.display = seleccionados.length === 0 ? 'block' : 'none';
    seleccionados.forEach((id, idx) => {
      const prod = PRODUCTOS_CATALOGO.find(p => p.id === id);
      if (!prod) return;
      const item = document.createElement('div');
      item.className = 'consulta-item';
      // Usamos textContent en lugar de innerHTML para evitar XSS en los datos del catálogo
      const numEl     = document.createElement('div');
      numEl.className = 'consulta-item__num';
      numEl.textContent = idx + 1;

      const nomEl     = document.createElement('div');
      nomEl.className = 'consulta-item__nombre';
      nomEl.textContent = prod.nombre;   // textContent = seguro

      const quitarBtn = document.createElement('button');
      quitarBtn.className = 'consulta-item__quitar';
      quitarBtn.dataset.id = id;
      quitarBtn.title = 'Quitar';
      quitarBtn.textContent = '✕';
      quitarBtn.addEventListener('click', () => quitarProducto(id));

      item.appendChild(numEl);
      item.appendChild(nomEl);
      item.appendChild(quitarBtn);
      lista.appendChild(item);
    });
  }

  function renderOpciones() {
    opciones.innerHTML = '';
    PRODUCTOS_CATALOGO.forEach(prod => {
      const agregado = seleccionados.includes(prod.id);
      const div = document.createElement('div');
      div.className = 'consulta-opcion' + (agregado ? ' agregado' : '');

      const infoDiv = document.createElement('div');

      const nomDiv = document.createElement('div');
      nomDiv.className = 'consulta-opcion__nombre';
      nomDiv.textContent = prod.nombre;   // textContent = seguro

      const badgeDiv = document.createElement('div');
      badgeDiv.className = 'consulta-opcion__badge';
      badgeDiv.textContent = prod.categoria;

      infoDiv.appendChild(nomDiv);
      infoDiv.appendChild(badgeDiv);

      const addBtn = document.createElement('button');
      addBtn.className = 'consulta-opcion__add';
      addBtn.disabled = agregado;
      addBtn.dataset.id = prod.id;
      addBtn.textContent = agregado ? '✓' : '+';

      if (!agregado) {
        addBtn.addEventListener('click', () => agregarProducto(prod.id));
      }

      div.appendChild(infoDiv);
      div.appendChild(addBtn);
      opciones.appendChild(div);
    });
  }

  /* ----------------------------------------------------------
     ENVÍO CON SANITIZACIÓN COMPLETA
  ---------------------------------------------------------- */
  btnWA.addEventListener('click', async function () {

    // 1. Leer valores crudos
    const nombreRaw  = document.getElementById('c-nombre').value;
    const celularRaw = document.getElementById('c-celular').value;
    const correoRaw  = document.getElementById('c-correo').value;
    const mensajeRaw = document.getElementById('c-mensaje').value;

    // 2. Sanitizar
    const nombre  = sanitizeText(nombreRaw);
    const celular = sanitizeCelular(celularRaw);   // null si es inválido
    const correo  = sanitizeText(correoRaw);
    const mensaje = sanitizeText(mensajeRaw);

    // 3. Validaciones
    if (!nombre || nombre.length < 2) {
      errorMsg.textContent = 'Por favor ingresa tu nombre completo.';
      errorMsg.classList.add('visible');
      document.getElementById('c-nombre').focus();
      return;
    }

    if (!celular) {
      errorMsg.textContent = 'El número de celular no es válido (mínimo 7 dígitos).';
      errorMsg.classList.add('visible');
      document.getElementById('c-celular').focus();
      return;
    }

    if (correo && !validarCorreo(correo)) {
      errorMsg.textContent = 'El correo electrónico no tiene un formato válido.';
      errorMsg.classList.add('visible');
      document.getElementById('c-correo').focus();
      return;
    }

    if (seleccionados.length === 0) {
      errorMsg.textContent = 'Selecciona al menos un producto.';
      errorMsg.classList.add('visible');
      return;
    }

    errorMsg.classList.remove('visible');

    // 4. Construir lista de productos (solo IDs del catálogo conocido — nunca entrada del usuario)
    const nombresProductos = seleccionados.map(id => {
      const p = PRODUCTOS_CATALOGO.find(x => x.id === id);
      return p ? `${p.nombre} (${p.categoria})` : null;
    }).filter(Boolean);  // elimina cualquier id que no esté en el catálogo

    // 5. Enviar al backend
    // IMPORTANTE: el backend debe leer el número destino SOLO desde las variables de entorno (.env).
    // El campo "celular" aquí es el contacto del CLIENTE, no el destinatario del mensaje de WhatsApp.
    btnWA.disabled    = true;
    btnWA.textContent = 'Enviando...';

    try {
      const resp = await fetch('https://web-constecuador.onrender.com/api/consulta', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,            // nombre del cliente (sanitizado)
          celular,           // contacto del cliente (sanitizado) — NO es el destino WA
          correo,            // correo del cliente (sanitizado)
          mensaje,           // mensaje adicional (sanitizado)
          productos: nombresProductos  // solo productos del catálogo interno
        })
      });

      const data = await resp.json();

      if (data.ok) {
        // Usar textContent para evitar XSK al mostrar datos del usuario de vuelta
        const bodyEl = drawer.querySelector('.consulta-body');
        bodyEl.innerHTML = '';

        const confirmDiv = document.createElement('div');
        confirmDiv.style.cssText = 'text-align:center; padding: 60px 24px;';

        const icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px; margin-bottom:16px;';
        icon.textContent = '✅';

        const title = document.createElement('h3');
        title.style.cssText = 'color:#0D2744; font-size:18px; margin-bottom:10px;';
        title.textContent = '¡Consulta enviada!';

        const desc = document.createElement('p');
        desc.style.cssText = 'color:#7a8394; font-size:13px; line-height:1.7;';
        desc.textContent = `Recibimos tu solicitud. Nos comunicaremos contigo al número ${celular} a la brevedad.`;

        confirmDiv.appendChild(icon);
        confirmDiv.appendChild(title);
        confirmDiv.appendChild(desc);
        bodyEl.appendChild(confirmDiv);

        seleccionados = [];
        setTimeout(cerrarDrawer, 3500);

      } else {
        throw new Error(data.error || 'Error desconocido');
      }

    } catch (err) {
      errorMsg.textContent = 'Hubo un error al enviar. Intenta de nuevo.';
      errorMsg.classList.add('visible');
      console.error(err);
    } finally {
      btnWA.disabled = false;
      btnWA.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Enviar Consulta por WhatsApp
      `;
    }
  });

  btnCerrar.addEventListener('click', cerrarDrawer);
  overlay.addEventListener('click', cerrarDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarDrawer(); });

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.pg-btn');
    if (!btn) return;
    // Validar que el productoId sea uno del catálogo antes de abrir
    const idValido = PRODUCTOS_CATALOGO.some(p => p.id === btn.dataset.productoId);
    if (idValido) abrirDrawer(btn.dataset.productoId);
  });

  renderOpciones();

})();