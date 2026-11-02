(() => {
  const categories = window.CATALOGUE || [];
  const app = document.getElementById('app');
  const viewer = document.querySelector('.viewer');
  const viewerImg = viewer.querySelector('.viewer__img');
  const viewerCaption = viewer.querySelector('.viewer__caption');
  let current = { variants: [], index: 0 };

  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const plural = (n) => `${pad(n)} variante${n > 1 ? 's' : ''}`;

  function srcset(image) {
    // Une source plus étroite que la largeur demandée n'est pas agrandie par le script.
    return image.largeurs.map((w) => `${image.src}-${w}.webp ${Math.min(w, image.largeurSource || w)}w`).join(', ');
  }
  function largest(image) {
    return `${image.src}-${image.largeurs.at(-1)}.webp`;
  }

  function renderHome() {
    document.body.classList.add('home');
    document.title = 'Catalogue — bymood.';
    const bands = categories.map((cat, i) => {
      const cover = cat.couverture;
      const img = cover
        ? `<img class="band__img" src="${largest(cover)}" srcset="${srcset(cover)}" sizes="(max-width: 1100px) 100vw, 1040px" alt="" ${i > 1 ? 'loading="lazy"' : ''} decoding="async">`
        : '';
      return `
        <li class="band${cover ? '' : ' band--empty'}">
          <a class="band__link" href="#/${cat.slug}">
            ${img}
            <span class="band__index">${pad(i + 1)}</span>
            <span class="band__count">${cat.variantes.length ? plural(cat.variantes.length) : 'Bientôt'}</span>
            <span class="band__title"><span>${esc(cat.titre)}</span></span>
          </a>
        </li>`;
    }).join('');

    app.innerHTML = `
      <section class="intro">
        <div class="intro__copy page-enter">
          <h1>Inspirations</h1>
          <p>Choisissez un univers pour découvrir ses différentes variantes de style.</p>
        </div>
        <div class="intro__drawing"><div class="intro__stage"></div></div>
      </section>
      <ul class="bands page-enter">${bands}</ul>`;
    mountDrawing(app.querySelector('.intro'));
  }

  // Axonométrie du site : tracée une seule fois par visite, affichée finie aux retours suivants.
  let drawing = null;
  function mountDrawing(intro) {
    if (!drawing) {
      drawing = document.getElementById('axo-template').content.firstElementChild.cloneNode(true);
      drawing.addEventListener('animationend', (event) => {
        if (event.target.closest('.axo-guides')) drawing.classList.add('is-drawn');
      });
    }
    intro.querySelector('.intro__stage').append(drawing);
    followPointer(intro, drawing);
  }

  // Légère parallaxe des niveaux selon la souris, comme sur bymood.fr (souris et grand écran uniquement).
  function followPointer(intro, svg) {
    const active = matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) and (min-width: 1024px)');
    let frame = 0;
    const set = (mx, my) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        svg.style.setProperty('--mx', mx.toFixed(3));
        svg.style.setProperty('--my', my.toFixed(3));
      });
    };
    intro.addEventListener('pointermove', (event) => {
      if (!active.matches) return;
      const box = intro.getBoundingClientRect();
      set(Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width - 0.5) * 2)),
        Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height - 0.5) * 2)));
    });
    intro.addEventListener('pointerleave', () => set(0, 0));
  }

  function renderCategory(cat) {
    document.body.classList.remove('home');
    document.title = `${cat.titre} — Catalogue bymood.`;
    const position = categories.indexOf(cat);
    const next = categories[(position + 1) % categories.length];
    current = { variants: cat.variantes, index: 0 };

    const grid = cat.variantes.length
      ? `<div class="grid">${cat.variantes.map((v, i) => `
          <figure class="variant">
            <button class="variant__btn" type="button" data-index="${i}" aria-label="Agrandir la variante ${pad(i + 1)}">
              <img src="${v.src}-800.webp" srcset="${srcset(v)}" sizes="(max-width: 767px) 100vw, 33vw"
                width="800" height="${Math.round(800 / v.ratio)}" alt="${esc(v.legende)}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async">
            </button>
            <figcaption><span class="label">Variante ${pad(i + 1)}</span>${v.legende ? `<span>${esc(v.legende)}</span>` : ''}</figcaption>
          </figure>`).join('')}</div>`
      : `<p class="empty">Les variantes de cet univers arrivent bientôt.<br>
          <small>Déposer les photos dans <code>photos/${cat.slug}/</code> puis lancer <code>npm run images</code>.</small></p>`;

    app.innerHTML = `
      <article class="category page-enter">
        <a class="back" href="#/"><span aria-hidden="true">←</span> Tous les univers</a>
        <header class="category__head">
          <h1>${esc(cat.titre)}</h1>
          <p>${esc(cat.accroche || '')}</p>
          <span class="label">${pad(position + 1)} — ${cat.variantes.length ? plural(cat.variantes.length) : 'à venir'}</span>
        </header>
        ${grid}
        ${next !== cat ? `<nav class="nextcat" aria-label="Univers suivant">
          <span class="label">Univers suivant</span>
          <a href="#/${next.slug}">${esc(next.titre)} <span aria-hidden="true">→</span></a>
        </nav>` : ''}
      </article>`;
  }

  function route() {
    if (viewer.open) viewer.close();
    const slug = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const cat = categories.find((c) => c.slug === slug);
    if (cat) renderCategory(cat);
    else renderHome();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  // Visionneuse
  function show(index) {
    const { variants } = current;
    current.index = (index + variants.length) % variants.length;
    const v = variants[current.index];
    viewerImg.src = largest(v);
    viewerImg.alt = v.legende;
    viewerCaption.innerHTML = `<span class="label">Variante ${pad(current.index + 1)} / ${pad(variants.length)}</span>${esc(v.legende)}`;
    const single = variants.length < 2;
    viewer.querySelector('.viewer__prev').hidden = single;
    viewer.querySelector('.viewer__next').hidden = single;
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('.variant__btn');
    if (!button) return;
    show(Number(button.dataset.index));
    viewer.showModal();
  });
  viewer.querySelector('.viewer__close').addEventListener('click', () => viewer.close());
  viewer.querySelector('.viewer__prev').addEventListener('click', () => show(current.index - 1));
  viewer.querySelector('.viewer__next').addEventListener('click', () => show(current.index + 1));
  viewer.addEventListener('click', (event) => {
    if (event.target === viewer || event.target.classList.contains('viewer__figure')) viewer.close();
  });
  viewer.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current.index - 1);
    if (event.key === 'ArrowRight') show(current.index + 1);
  });

  // Balayage sur tablette et téléphone
  let touchX = null;
  viewer.addEventListener('touchstart', (event) => { touchX = event.touches[0].clientX; }, { passive: true });
  viewer.addEventListener('touchend', (event) => {
    if (touchX === null) return;
    const delta = event.changedTouches[0].clientX - touchX;
    if (Math.abs(delta) > 50 && current.variants.length > 1) show(current.index + (delta < 0 ? 1 : -1));
    touchX = null;
  });

  window.addEventListener('hashchange', route);
  route();
})();
