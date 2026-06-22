/* ============================================================
   PANEL DE CONSULTA — consulta.js
   Envía al servidor (server.js) que llama a la API de Meta
============================================================ */
(function () {

  /* ----------------------------------------------------------
     CATÁLOGO — debe coincidir con data-producto-id del HTML
  ---------------------------------------------------------- */
  const PRODUCTOS_CATALOGO = [
  { id: 'vigas-teka',        nombre: 'Vigas de Teka',       categoria: 'Madera' },
  { id: 'duelas-madera',     nombre: 'Duelas de Madera',    categoria: 'Madera' },
  { id: 'pellets-madera',    nombre: 'Pellets de Madera',   categoria: 'Biomasa' },
  { id: 'pellets-plasticos', nombre: 'Pellets Plásticos',   categoria: 'Industrial' },
  { id: 'morteros-bondex',   nombre: 'Morteros Bondex',     categoria: 'Construcción' },
  { id: 'saman-madera',      nombre: 'Samán de Madera',     categoria: 'Madera' }  // ← nuevo
];

  /* ----------------------------------------------------------
     ESTADO
  ---------------------------------------------------------- */
  let seleccionados = [];

  /* ----------------------------------------------------------
     REFERENCIAS DOM
  ---------------------------------------------------------- */
  const overlay    = document.getElementById('consultaOverlay');
  const drawer     = document.getElementById('consultaDrawer');
  const btnCerrar  = document.getElementById('consultaCerrar');
  const lista      = document.getElementById('consultaLista');
  const listaVacia = document.getElementById('consultaVacia');
  const opciones   = document.getElementById('consultaOpciones');
  const btnWA      = document.getElementById('consultaBtnWA');
  const errorMsg   = document.getElementById('consultaError');

  /* ----------------------------------------------------------
     ABRIR / CERRAR
  ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
     AGREGAR / QUITAR
  ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
     RENDER LISTA
  ---------------------------------------------------------- */
  function renderLista() {
    lista.innerHTML = '';
    listaVacia.style.display = seleccionados.length === 0 ? 'block' : 'none';

    seleccionados.forEach((id, idx) => {
      const prod = PRODUCTOS_CATALOGO.find(p => p.id === id);
      if (!prod) return;
      const item = document.createElement('div');
      item.className = 'consulta-item';
      item.innerHTML = `
        <div class="consulta-item__num">${idx + 1}</div>
        <div class="consulta-item__nombre">${prod.nombre}</div>
        <button class="consulta-item__quitar" data-id="${id}" title="Quitar">✕</button>
      `;
      lista.appendChild(item);
    });

    lista.querySelectorAll('.consulta-item__quitar').forEach(btn => {
      btn.addEventListener('click', () => quitarProducto(btn.dataset.id));
    });
  }

  /* ----------------------------------------------------------
     RENDER OPCIONES
  ---------------------------------------------------------- */
  function renderOpciones() {
    opciones.innerHTML = '';
    PRODUCTOS_CATALOGO.forEach(prod => {
      const agregado = seleccionados.includes(prod.id);
      const div = document.createElement('div');
      div.className = 'consulta-opcion' + (agregado ? ' agregado' : '');
      div.innerHTML = `
        <div>
          <div class="consulta-opcion__nombre">${prod.nombre}</div>
          <div class="consulta-opcion__badge">${prod.categoria}</div>
        </div>
        <button class="consulta-opcion__add" ${agregado ? 'disabled' : ''} data-id="${prod.id}">
          ${agregado ? '✓' : '+'}
        </button>
      `;
      if (!agregado) {
        div.querySelector('.consulta-opcion__add')
           .addEventListener('click', () => agregarProducto(prod.id));
      }
      opciones.appendChild(div);
    });
  }

  /* ----------------------------------------------------------
     ENVIAR — llama a /api/consulta en server.js
  ---------------------------------------------------------- */
  btnWA.addEventListener('click', async function () {
    const nombre  = document.getElementById('c-nombre').value.trim();
    const celular = document.getElementById('c-celular').value.trim();
    const correo  = document.getElementById('c-correo').value.trim();
    const mensaje = document.getElementById('c-mensaje').value.trim();

    // Validación
    if (!nombre || !celular) {
      errorMsg.classList.add('visible');
      document.getElementById('c-nombre').focus();
      return;
    }
    if (seleccionados.length === 0) {
      errorMsg.textContent = 'Selecciona al menos un producto.';
      errorMsg.classList.add('visible');
      return;
    }
    errorMsg.classList.remove('visible');

    // Nombres de los productos seleccionados
    const nombresProductos = seleccionados.map(id => {
      const p = PRODUCTOS_CATALOGO.find(x => x.id === id);
      return p ? `${p.nombre} (${p.categoria})` : id;
    });

    // Estado del botón mientras envía
    btnWA.disabled    = true;
    btnWA.textContent = 'Enviando...';

    try {
      const resp = await fetch('https://web-constecuador.onrender.com/api/consulta', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, celular, correo, mensaje, productos: nombresProductos })
      });

      const data = await resp.json();

      if (data.ok) {
        // Éxito — mostrar confirmación
        drawer.querySelector('.consulta-body').innerHTML = `
          <div style="text-align:center; padding: 60px 24px;">
            <div style="font-size:48px; margin-bottom:16px;">✅</div>
            <h3 style="color:#0D2744; font-size:18px; margin-bottom:10px;">¡Consulta enviada!</h3>
            <p style="color:#7a8394; font-size:13px; line-height:1.7;">
              Recibimos tu solicitud. Nos comunicaremos contigo<br>
              al número <strong>${celular}</strong> a la brevedad.
            </p>
          </div>
        `;
        // Resetear estado interno
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
      btnWA.disabled    = false;
      btnWA.innerHTML   = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Enviar Consulta por WhatsApp
      `;
    }
  });

  /* ----------------------------------------------------------
     CERRAR
  ---------------------------------------------------------- */
  btnCerrar.addEventListener('click', cerrarDrawer);
  overlay.addEventListener('click', cerrarDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarDrawer(); });

  /* ----------------------------------------------------------
     CONECTAR BOTONES DEL HTML
  ---------------------------------------------------------- */
    /* ----------------------------------------------------------
     CONECTAR BOTONES DEL HTML
  ---------------------------------------------------------- */
  document.addEventListener('click', function (e) {
      const btn = e.target.closest('.pg-btn');
      if (!btn) return;
      abrirDrawer(btn.dataset.productoId);
    });

    /* Inicializar opciones */
    renderOpciones();

  })();  // ← aquí cierra el IIFE


// ✅ ESTO va FUERA del IIFE — borra el bloque antiguo "const form" y pon esto:
document.addEventListener("DOMContentLoaded", () => {

    const btnCerrar = document.getElementById("cerrarModal");
    if (btnCerrar) {
        btnCerrar.addEventListener("click", () => {
            document.getElementById("modalExito").classList.remove("active");
        });
    }

    const formulario = document.getElementById("formContacto");
    if (!formulario) return;

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = formulario.querySelector("button[type='submit']");
        btn.disabled = true;
        btn.textContent = "Enviando...";

        const nombre   = document.getElementById("nombre").value;
        const apellido = document.getElementById("apellido").value;
        const correo   = document.getElementById("correo").value;
        const mensaje  = document.getElementById("mensaje").value;

        let latitud = null, longitud = null;
        try {
            const pos = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
            );
            latitud  = pos.coords.latitude;
            longitud = pos.coords.longitude;
        } catch {
            console.log("Usuario no permitió ubicación");
        }

        const datos = { nombre, apellido, correo, mensaje, latitud, longitud };

        try {
            const response = await fetch("https://web-constecuador.onrender.com/enviar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });

            const resultado = await response.json();

            if (resultado.ok) {
                document.getElementById("modalExito").classList.add("active");
                formulario.reset();
                btn.disabled = false;
                btn.textContent = "✓ Mensaje enviado";
                btn.style.background = "linear-gradient(135deg, #25D366, #128C7E)";
                btn.style.color = "#fff";
                setTimeout(() => {
                    btn.textContent = "Enviar Mensaje";
                    btn.style.background = "";
                    btn.style.color = "";
                }, 4000);
            } else {
                btn.disabled = false;
                btn.textContent = "Error, intenta de nuevo";
                setTimeout(() => { btn.textContent = "Enviar Mensaje"; }, 3000);
            }

        } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.textContent = "Error de conexión";
            setTimeout(() => { btn.textContent = "Enviar Mensaje"; }, 3000);
        }
    });

});




/********************************************************************************************************/ 
const form = document.getElementById("formContacto");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = form.querySelector("button[type='submit']");
    
    // ← Mostrar carga
    btn.disabled = true;
    btn.textContent = "Enviando...";

    const nombre = document.getElementById("nombre").value;
    const apellido = document.getElementById("apellido").value;
    const correo = document.getElementById("correo").value;
    const mensaje = document.getElementById("mensaje").value;

    let latitud = null;
    let longitud = null;

    try {
        const posicion = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });
        latitud = posicion.coords.latitude;
        longitud = posicion.coords.longitude;
    } catch {
        console.log("Usuario no permitió ubicación");
    }

    try {
        const respuesta = await fetch("https://web-constecuador.onrender.com/enviar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, apellido, correo, mensaje, latitud, longitud })
        });

        const data = await respuesta.json();

        if (data.ok) {
            form.reset();
            btn.textContent = "✓ Mensaje enviado";
            btn.style.background = "linear-gradient(135deg, #25D366, #128C7E)";
            btn.style.color = "#fff";
            
            // ← Resetear botón después de 4 segundos
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = "Enviar Mensaje";
                btn.style.background = "";
                btn.style.color = "";
            }, 4000);
        } else {
            btn.disabled = false;
            btn.textContent = "Error, intenta de nuevo";
            btn.style.background = "linear-gradient(135deg, #e53e3e, #c53030)";
            btn.style.color = "#fff";
            setTimeout(() => {
                btn.textContent = "Enviar Mensaje";
                btn.style.background = "";
                btn.style.color = "";
            }, 3000);
        }

    } catch (err) {
        btn.disabled = false;
        btn.textContent = "Error de conexión";
        btn.style.background = "linear-gradient(135deg, #e53e3e, #c53030)";
        btn.style.color = "#fff";
        setTimeout(() => {
            btn.textContent = "Enviar Mensaje";
            btn.style.background = "";
            btn.style.color = "";
        }, 3000);
        console.error(err);
    }
});