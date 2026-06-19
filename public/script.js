/* ============================================================
   HERO ANIMATION
   Dependencia: GSAP 3 (sin plugins adicionales)
   Uso: incluir después de gsap.min.js en el HTML
============================================================ */

(function () {

  /* ----------------------------------------------------------
     1. ESTADOS INICIALES
  ---------------------------------------------------------- */
  const cards = document.querySelectorAll('.card');

  // Cada card: guarda su rotación de reposo y la lanza desde arriba
  cards.forEach(card => {
    const rot = parseFloat(card.dataset.rot) || 0;
    card.dataset.restRot = rot;
    gsap.set(card, { y: -700, rotation: rot + 22, opacity: 0, scale: 0.75 });
  });

  gsap.set('#titleTop .word > span', { y: '110%' });
  gsap.set('#titleBig .letter',      { y: 70, opacity: 0 });
  gsap.set('#subline',               { opacity: 0, y: 16 });


  /* ----------------------------------------------------------
     2. TIMELINE DE ENTRADA
  ---------------------------------------------------------- */
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl
    // Título pequeño sube desde abajo (clip)
    .to('#titleTop .word > span', {
      y: '0%',
      duration: 0.85,
      stagger: 0.08
    }, 0.2)

    // Letras del título grande caen con rebote
    .to('#titleBig .letter', {
      y: 0,
      opacity: 1,
      duration: 0.9,
      stagger: 0.045,
      ease: 'back.out(1.7)'
    }, 0.45)

    // Cards caen desde arriba con stagger desde el centro
    .to(cards, {
      y: 0,
      opacity: 1,
      scale: 1,
      rotation: (i, el) => parseFloat(el.dataset.restRot) || 0,
      duration: 1.1,
      stagger: { each: 0.08, from: 'center' },
      ease: 'back.out(1.4)'
    }, 0.7)

    // Sublinea aparece al final
    .to('#subline', {
      opacity: 1,
      y: 0,
      duration: 0.8
    }, 1.5);


  /* ----------------------------------------------------------
     3. FLOTACIÓN CONTINUA DE CARDS
  ---------------------------------------------------------- */
  cards.forEach((card, i) => {
    const rot = parseFloat(card.dataset.restRot) || 0;
    gsap.to(card, {
      y: `+=${7 + (i % 3) * 4}`,
      rotation: rot + (i % 2 === 0 ? 1.5 : -1.5),
      duration: 3 + (i % 4) * 0.45,
      delay: 1.8 + i * 0.1,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  });


  /* ----------------------------------------------------------
     4. PARALLAX CON EL MOUSE
  ---------------------------------------------------------- */
  const hero = document.getElementById('hero');
  let mx = 0, my = 0, tx = 0, ty = 0;

  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    my = ((e.clientY - r.top)  / r.height - 0.5) * 2;
  });

  hero.addEventListener('mouseleave', () => { mx = 0; my = 0; });

  function parallaxLoop() {
    tx += (mx - tx) * 0.05;
    ty += (my - ty) * 0.05;
    cards.forEach(card => {
      const d = parseFloat(card.dataset.depth) || 8;
      card.style.translate = `${tx * d}px ${ty * d * 0.4}px`;
    });
    requestAnimationFrame(parallaxLoop);
  }
  parallaxLoop();


  /* ----------------------------------------------------------
     5. HOVER 3D EN CADA CARD
  ---------------------------------------------------------- */
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      gsap.to(card, {
        rotateX: -py * 14,
        rotateY:  px * 14,
        scale: 1.1,
        duration: 0.4,
        ease: 'power2.out',
        transformPerspective: 700,
        overwrite: 'auto'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.8,
        ease: 'elastic.out(1, 0.6)',
        overwrite: 'auto'
      });
    });
  });


  /* ----------------------------------------------------------
     6. HOVER EN "big results" → letras suben/bajan
  ---------------------------------------------------------- */
  const bigWrap = document.getElementById('titleBigWrap');

  bigWrap.addEventListener('mouseenter', () => {
    gsap.to('#titleBig .letter', {
      y: -7,
      duration: 0.5,
      stagger: 0.03,
      ease: 'back.out(1.6)'
    });
  });

  bigWrap.addEventListener('mouseleave', () => {
    gsap.to('#titleBig .letter', {
      y: 0,
      duration: 0.6,
      stagger: 0.03,
      ease: 'elastic.out(1, 0.6)'
    });
  });

})();

/**************************************************************************************/

/* ============================================================
   GALERÍA DE SERVICIOS — CONSTECUADOR
   Canvas 2D puro, sin dependencias externas
============================================================ */
(function () {

  /* ----------------------------------------------------------
     CONFIGURACIÓN
  ---------------------------------------------------------- */
  const SLIDE_COUNT = 5;
  const SPACING     = 40;   // unidades de scroll entre paneles

  /* Paleta de paneles — colores que evocan construcción */
  const PRODUCTOS = [
    { color: '#c8d8e8', accent: '#1E86D9' }, // Residencial  — azul claro
    { color: '#b0bec5', accent: '#546e7a' }, // Obra civil   — gris acero
    { color: '#cfd8dc', accent: '#1E86D9' }, // Comercial    — azul gris
    { color: '#d7ccc8', accent: '#795548' }, // Remodelación — arena
    { color: '#b2dfdb', accent: '#00796b' }  // Consultoría  — verde menta
  ];

  /* ----------------------------------------------------------
     REFERENCIAS DOM
  ---------------------------------------------------------- */
  const section  = document.getElementById('product-gallery');
  const canvas   = document.getElementById('product-canvas');
  const ctx      = canvas.getContext('2d');
  const progress = document.getElementById('p-progress');
  const nextHint = document.getElementById('p-next-hint');

  /* ----------------------------------------------------------
     RESIZE
  ---------------------------------------------------------- */
  let W, H;
  function resize() {
    W = section.clientWidth;
    H = section.clientHeight;
    canvas.width  = W;
    canvas.height = H;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ----------------------------------------------------------
     ESTADO
  ---------------------------------------------------------- */
  let scroll    = 0;
  let target    = 0;
  let snapTimer = null;
  let atEnd     = false;

  /* ----------------------------------------------------------
     SNAP AL PANEL MÁS CERCANO
  ---------------------------------------------------------- */
  function snapToNearest() {
    let idx = Math.max(0, Math.min(SLIDE_COUNT - 1, Math.round(target / SPACING)));
    target = idx * SPACING;
    atEnd  = idx === SLIDE_COUNT - 1;
    nextHint.style.opacity = atEnd ? '1' : '0';
    progress.style.opacity = atEnd ? '0' : '1';
  }

  /* ----------------------------------------------------------
     ACTUALIZAR UI (slides + dots)
  ---------------------------------------------------------- */
  function updateUI() {
    const idx = Math.max(0, Math.min(SLIDE_COUNT - 1, Math.round(scroll / SPACING)));

    for (let i = 0; i < SLIDE_COUNT; i++) {
      document.getElementById('p-slide-' + i)
        .classList.toggle('active', i === idx);
    }
    document.querySelectorAll('.p-dot')
      .forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  /* ----------------------------------------------------------
     EVENTOS DE SCROLL (wheel)
  ---------------------------------------------------------- */
  window.addEventListener('wheel', function (e) {
    const rect   = section.getBoundingClientRect();
    const inView = rect.top <= 0 && rect.bottom >= window.innerHeight / 2;
    if (!inView) return;

    // Si estamos en el último panel y el usuario sigue haciendo scroll abajo → liberar
    if (atEnd && e.deltaY > 0) return;

    e.preventDefault();
    target = Math.max(0, Math.min((SLIDE_COUNT - 1) * SPACING, target + e.deltaY * 0.08));
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(snapToNearest, 200);
  }, { passive: false });

  /* ----------------------------------------------------------
     EVENTOS TÁCTILES
  ---------------------------------------------------------- */
  let touchStart = 0;
  section.addEventListener('touchstart', e => { touchStart = e.touches[0].clientX; });
  section.addEventListener('touchmove', function (e) {
    if (atEnd) return;
    e.preventDefault();
    const diff = touchStart - e.touches[0].clientX;
    target = Math.max(0, Math.min((SLIDE_COUNT - 1) * SPACING, target + diff * 0.5));
    touchStart = e.touches[0].clientX;
    if (snapTimer) clearTimeout(snapTimer);
  }, { passive: false });
  section.addEventListener('touchend', snapToNearest);

  /* ----------------------------------------------------------
     DIBUJAR FRAME
  ---------------------------------------------------------- */
  function draw() {
    /* Fondo */
    ctx.fillStyle = '#f4f6f9';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < SLIDE_COUNT; i++) {
      /* Posición horizontal del panel según scroll */
      const px   = W * 0.63 + (i * SPACING - scroll) * (W / SPACING) * 1.1;
      const dist = Math.abs(px - W * 0.63) / W;
      const alpha = Math.max(0, 1 - dist * 1.5);
      const scale = 0.5 + alpha * 0.5;

      const pw = W * 0.26 * scale;
      const ph = H * 0.60 * scale;
      const py = H * 0.20 + (H * 0.60 - ph) / 2;

      const { color, accent } = PRODUCTOS[i];

      /* Sombra */
      ctx.save();
      ctx.globalAlpha = 0.08 * alpha;
      ctx.fillStyle   = '#000';
      ctx.fillRect(px - pw / 2 + 9, py + 9, pw, ph);
      ctx.restore();

      /* Panel de color */
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = color;
      ctx.fillRect(px - pw / 2, py, pw, ph);

      /* Gradiente de luz sobre el panel */
      const grad = ctx.createLinearGradient(px - pw / 2, py, px + pw / 2, py + ph);
      grad.addColorStop(0, 'rgba(255,255,255,0.18)');
      grad.addColorStop(1, 'rgba(0,0,0,0.06)');
      ctx.fillStyle = grad;
      ctx.fillRect(px - pw / 2, py, pw, ph);

      /* Borde con color de acento */
      ctx.strokeStyle = accent;
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(px - pw / 2, py, pw, ph);

      /* Línea superior decorativa */
      ctx.strokeStyle = '#1E86D9';
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.moveTo(px - pw / 2, py);
      ctx.lineTo(px - pw / 2 + pw * 0.35, py);
      ctx.stroke();

      /* Líneas horizontales de sala */
      ctx.strokeStyle = '#d0d6e0';
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(px - pw * 0.95, py - 14);
      ctx.lineTo(px + pw * 0.95, py - 14);
      ctx.moveTo(px - pw * 0.95, py + ph + 14);
      ctx.lineTo(px + pw * 0.95, py + ph + 14);
      ctx.stroke();

      /* Número del panel (centrado) */
      ctx.fillStyle   = accent;
      ctx.globalAlpha = alpha * 0.5;
      ctx.font        = `bold ${Math.max(11, pw * 0.09)}px Verdana`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0' + (i + 1), px, py + ph / 2);

      ctx.restore();
    }

    /* Niebla lateral para dar profundidad */
    const fog = ctx.createLinearGradient(0, 0, W, 0);
    fog.addColorStop(0,    'rgba(244,246,249,0.97)');
    fog.addColorStop(0.20, 'rgba(244,246,249,0)');
    fog.addColorStop(0.80, 'rgba(244,246,249,0)');
    fog.addColorStop(1,    'rgba(244,246,249,0.97)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
  }

  /* ----------------------------------------------------------
     LOOP PRINCIPAL
  ---------------------------------------------------------- */
  function loop() {
    scroll += (target - scroll) * 0.07;
    draw();
    updateUI();
    requestAnimationFrame(loop);
  }

  /* ----------------------------------------------------------
     ARRANQUE
  ---------------------------------------------------------- */
  loop();
  setTimeout(snapToNearest, 100);
  setTimeout(() => document.getElementById('p-slide-0').classList.add('active'), 150);

})();


/**************************************************************************************/

/* ============================================================
   HERO ANIMATION
   Dependencia: GSAP 3
============================================================ */

(function () {

  /* ----------------------------------------------------------
     1. ESTADOS INICIALES
  ---------------------------------------------------------- */
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    const rot = parseFloat(card.dataset.rot) || 0;
    card.dataset.restRot = rot;
    gsap.set(card, { y: -700, rotation: rot + 22, opacity: 0, scale: 0.75 });
  });

  gsap.set('#titleTop .word > span', { y: '110%' });
  gsap.set('#titleBig .letter',      { y: 70, opacity: 0 });

  /* ----------------------------------------------------------
     2. TIMELINE DE ENTRADA
  ---------------------------------------------------------- */
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl
    .to('#titleTop .word > span', {
      y: '0%',
      duration: 0.85,
      stagger: 0.08
    }, 0.2)

    .to('#titleBig .letter', {
      y: 0,
      opacity: 1,
      duration: 0.9,
      stagger: 0.045,
      ease: 'back.out(1.7)'
    }, 0.45)

    .to(cards, {
      y: 0,
      opacity: 1,
      scale: 1,
      rotation: (i, el) => parseFloat(el.dataset.restRot) || 0,
      duration: 1.1,
      stagger: { each: 0.08, from: 'center' },
      ease: 'back.out(1.4)'
    }, 0.7);

  /* ----------------------------------------------------------
     3. FLOTACIÓN CONTINUA DE CARDS
  ---------------------------------------------------------- */
  cards.forEach((card, i) => {
    const rot = parseFloat(card.dataset.restRot) || 0;
    gsap.to(card, {
      y: `+=${7 + (i % 3) * 4}`,
      rotation: rot + (i % 2 === 0 ? 1.5 : -1.5),
      duration: 3 + (i % 4) * 0.45,
      delay: 1.8 + i * 0.1,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  });

  /* ----------------------------------------------------------
     4. PARALLAX CON EL MOUSE
  ---------------------------------------------------------- */
  const hero = document.getElementById('hero');
  let mx = 0, my = 0, tx = 0, ty = 0;

  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    my = ((e.clientY - r.top)  / r.height - 0.5) * 2;
  });

  hero.addEventListener('mouseleave', () => { mx = 0; my = 0; });

  function parallaxLoop() {
    tx += (mx - tx) * 0.05;
    ty += (my - ty) * 0.05;
    cards.forEach(card => {
      const d = parseFloat(card.dataset.depth) || 8;
      card.style.translate = `${tx * d}px ${ty * d * 0.4}px`;
    });
    requestAnimationFrame(parallaxLoop);
  }
  parallaxLoop();

  /* ----------------------------------------------------------
     5. HOVER 3D EN CADA CARD
  ---------------------------------------------------------- */
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      gsap.to(card, {
        rotateX: -py * 14,
        rotateY:  px * 14,
        scale: 1.1,
        duration: 0.4,
        ease: 'power2.out',
        transformPerspective: 700,
        overwrite: 'auto'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.8,
        ease: 'elastic.out(1, 0.6)',
        overwrite: 'auto'
      });
    });
  });

  /* ----------------------------------------------------------
     6. HOVER EN título grande → letras suben/bajan
  ---------------------------------------------------------- */
  const bigWrap = document.getElementById('titleBigWrap');

  bigWrap.addEventListener('mouseenter', () => {
    gsap.to('#titleBig .letter', {
      y: -7,
      duration: 0.5,
      stagger: 0.03,
      ease: 'back.out(1.6)'
    });
  });

  bigWrap.addEventListener('mouseleave', () => {
    gsap.to('#titleBig .letter', {
      y: 0,
      duration: 0.6,
      stagger: 0.03,
      ease: 'elastic.out(1, 0.6)'
    });
  });

})();


/**************************************************************************************/

/* ==========================================================================
   PRODUCTOS — animación de entrada con scroll
   Dependencia: ninguna (vanilla JS puro)
   Pegar en script.js o incluir como <script src="productos.js"></script>
========================================================================== */

(function () {

  var cards = document.querySelectorAll('.pg-card');
  if (!cards.length) return;

  /* Estado inicial: cards invisibles y bajadas */
  cards.forEach(function (card) {
    card.style.opacity    = '0';
    card.style.transform  = 'translateY(32px)';
    card.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
  });

  /* Reveal con IntersectionObserver */
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var card  = entry.target;
      var index = Array.from(cards).indexOf(card);
      setTimeout(function () {
        card.style.opacity   = '1';
        card.style.transform = 'translateY(0)';
      }, index * 80); /* stagger de 80ms entre cards */
      observer.unobserve(card);
    });
  }, { threshold: 0.12 });

  cards.forEach(function (card) {
    observer.observe(card);
  });

})();



/***** Efecto de deslizar *****/
document.querySelector('.btnExplorar').addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector('#product-gallery').scrollIntoView({ behavior: 'smooth' });
});



/***** Bloquear F12 y teclas (fácil de evadir) *****/
document.addEventListener('keydown', function(e) {
    if (
        (e.ctrlKey && e.key.toLowerCase() === 'u') ||
        (e.key === 'F12') ||
        (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase()))
    ) {
        e.preventDefault();
        return false;
    }
});