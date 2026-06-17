let secciones = [];
let meta = {};
let bcvRate = null;

// === Category icons (photos from Unsplash, fallback SVG) ===
const CAT_IMG_URLS = {
    'Tortas': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=150&h=150&q=80',
    'Mini Cakes': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=150&h=150&q=80',
    'Galletas': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=150&h=150&q=80',
    'Alfajores': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=150&h=150&q=80',
    'Bombones': 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=150&h=150&q=80',
    'Brookies': 'https://images.unsplash.com/photo-1587139223877-04cb899fa3e8?auto=format&fit=crop&w=150&h=150&q=80',
    'Ponquesitos': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=150&h=150&q=80',
    'Quesillo': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=150&h=150&q=80',
    'Trufas': 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=150&h=150&q=80',
    'Marquesas': 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=150&h=150&q=80',
    'Porciones de torta': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=150&h=150&q=80',
};

const CAT_SVG = {
    'Tortas': '<svg viewBox="0 0 28 28"><path d="M5 18h18l-3-8H8l-3 8zM8 10h12l-2-5H10l-2 5z"/><path d="M5 18v3a1 1 0 001 1h16a1 1 0 001-1v-3"/><path d="M12 10V7M16 10V7" stroke-width="1.4"/></svg>',
    'Mini Cakes': '<svg viewBox="0 0 28 28"><path d="M8 16h12l-2-8H10l-2 8z"/><path d="M10 8V5a1 1 0 011-1h6a1 1 0 011 1v3"/><path d="M7 16v3a1 1 0 001 1h12a1 1 0 001-1v-3"/></svg>',
    'Galletas': '<svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="9"/><circle cx="11" cy="11" r="1.5" fill="var(--accent)" opacity="0.3"/><circle cx="17" cy="13" r="1.2" fill="var(--accent)" opacity="0.3"/><circle cx="13" cy="17" r="1" fill="var(--accent)" opacity="0.3"/></svg>',
    'Alfajores': '<svg viewBox="0 0 28 28"><circle cx="14" cy="9" r="5"/><circle cx="14" cy="14" r="2"/><circle cx="14" cy="19" r="5"/></svg>',
    'Bombones': '<svg viewBox="0 0 28 28"><circle cx="10" cy="14" r="5.5"/><circle cx="18" cy="14" r="5.5"/><path d="M14 8.5v11" stroke-width="1.2" opacity="0.4"/></svg>',
    'Brookies': '<svg viewBox="0 0 28 28"><rect x="5" y="5" width="18" height="18" rx="3"/><path d="M9 11h10M9 14h7M9 17h8" stroke-width="1.2" opacity="0.3"/></svg>',
    'Ponquesitos': '<svg viewBox="0 0 28 28"><path d="M9 18l1-8h8l1 8"/><path d="M9 18v2a1 1 0 001 1h8a1 1 0 001-1v-2"/><path d="M11 10l1-3h4l1 3"/></svg>',
    'Quesillo': '<svg viewBox="0 0 28 28"><path d="M6 15l2 6h12l2-6"/><path d="M6 15l1-4h14l1 4"/><path d="M8 11V9a1 1 0 011-1h10a1 1 0 011 1v2"/><path d="M14 4v4" stroke-width="1.2"/></svg>',
    'Trufas': '<svg viewBox="0 0 28 28"><circle cx="14" cy="16" r="7"/><path d="M14 9c3 0 5 2 5 5s-2 5-5 5"/><path d="M14 9c-3 0-5 2-5 5s2 5 5 5" opacity="0.5"/></svg>',
    'Marquesas': '<svg viewBox="0 0 28 28"><path d="M6 18l3 2h10l3-2"/><path d="M6 18l1-8h14l1 8"/><path d="M9 10l-1-3a1 1 0 011-1h8a1 1 0 011 1l-1 3"/></svg>',
    'Porciones de torta': '<svg viewBox="0 0 28 28"><path d="M6 20h16l-2-6H8l-2 6z"/><path d="M8 14l2-7h8l2 7"/><path d="M14 7V4" stroke-width="1.4"/></svg>',
};

function catIconHtml(name) {
    var cover = meta[name] && meta[name].cover;
    if (cover) {
        var src = 'assets/images/Catal/' + encodeURIComponent(name) + '/' + encodeURIComponent(cover);
        return '<img class="cat-icon-img" src="' + src + '" alt="" loading="lazy">';
    }
    var url = CAT_IMG_URLS[name];
    if (url) return '<img class="cat-icon-img" src="' + url + '" alt="" loading="lazy">';
    return CAT_SVG[name] || CAT_SVG['Tortas'];
}

function getCatKey(nombre, sub) { return sub ? nombre + '||' + sub : nombre; }

function getCatSrc(secNombre, subNombre, img) {
    const imgData = JSON.parse(localStorage.getItem('dm_cat_img_data') || '{}');
    const key = getCatKey(secNombre, subNombre);
    if (imgData[key]?.[img]) return imgData[key][img];
    const path = subNombre ? secNombre + '/' + subNombre : secNombre;
    return 'assets/images/Catal/' + path + '/' + encodeURIComponent(img);
}

// === BCV ===
function fetchBCV() {
    return fetch('/api/bcv')
        .then(r => r.json())
        .then(data => {
            bcvRate = parseFloat(data.tasa);
            document.querySelectorAll('.product-price').forEach(el => {
                const usd = parseFloat(el.dataset.usd);
                if (usd && bcvRate) {
                    el.nextElementSibling.textContent = 'Bs. ' + (usd * bcvRate).toFixed(2);
                }
            });
        })
        .catch(() => { bcvRate = null; });
}

// === PRODUCT CARD ===
var _blobCache = {};

function loadBlobImg(imgEl, realSrc) {
    if (_blobCache[realSrc]) {
        imgEl.src = _blobCache[realSrc];
        return;
    }
    fetch(realSrc)
        .then(function (r) { return r.blob(); })
        .then(function (blob) {
            var url = URL.createObjectURL(blob);
            _blobCache[realSrc] = url;
            imgEl.src = url;
        })
        .catch(function () { imgEl.style.display = 'none'; });
}

function loadGridBlobs(container) {
    var imgs = container.querySelectorAll('.img-wrap img[data-src]');
    var i = 0;
    function next() {
        if (i >= imgs.length) return;
        var el = imgs[i++];
        loadBlobImg(el, el.getAttribute('data-src'));
    }
    // stagger loading
    for (var j = 0; j < 4 && j < imgs.length; j++) next();
    // load rest as 1x1 completes
    var check = setInterval(function () {
        if (i >= imgs.length) { clearInterval(check); return; }
        next();
    }, 120);
}

function buildProductCard(img, secNombre, subNombre, precioUSD, idx) {
    const src = getCatSrc(secNombre, subNombre, img);
    const name = 'Producto ' + (idx + 1);
    const priceHtml = precioUSD
        ? '<span class="product-price" data-usd="' + precioUSD + '">$' + parseFloat(precioUSD).toFixed(2) + '</span>'
        : '<span class="product-price" data-usd=""></span>';
    const bcvHtml = (precioUSD && bcvRate)
        ? '<span class="product-bcv">Bs. ' + (precioUSD * bcvRate).toFixed(2) + '</span>'
        : '<span class="product-bcv"></span>';
    var delay = Math.min(idx * 0.045, 0.4);
    var waMsg = 'Hola, quisiera cotizar: ' + name + ' - ' + (subNombre || secNombre) + ' (Dulce Mora) - Catálogo: ' + location.href.replace(/\?.*/, '').replace(/#.*/, '');
    return '<div class="product-card" style="animation-delay:' + delay + 's">' +
        '<div class="img-wrap"><div class="img-overlay"></div><img data-src="' + src + '" data-real-src="' + src + '" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" oncontextmenu="return false"></div>' +
        '<div class="product-info">' +
        '<span class="product-name">' + name + '</span>' +
        priceHtml +
        bcvHtml +
        '</div>' +
        '<a class="product-wa" href="https://wa.me/584142052925?text=' + encodeURIComponent(waMsg) + '" target="_blank" rel="noopener">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
        ' Pedir ahora</a>' +
        '</div>';
}

function renderProductGrid(imgs, secNombre, subNombre, precioUSD) {
    const uploads = JSON.parse(localStorage.getItem('dm_catalogo_uploads') || '{}');
    const uk = getCatKey(secNombre, subNombre);
    const allImgs = [...imgs, ...(uploads[uk] || [])];
    if (!allImgs.length) return '<p style="padding:1rem;color:var(--text2);font-size:0.8rem">Próximamente</p>';
    return '<div class="product-grid">' +
        allImgs.map((img, i) => buildProductCard(img, secNombre, subNombre, precioUSD, i)).join('') +
        '</div>';
}

// === BUILD EXPANDED CONTENT (tabs + product grid) ===
function buildExpandedHTML(sec) {
    console.log('[buildExpandedHTML]', sec.nombre, 'subs:', (sec.subcategorias || []).length, 'hasSubs:', (sec.subcategorias || []).length > 0);
    const m = meta[sec.nombre] || {};
    const subs = sec.subcategorias || [];
    const hasSubs = subs.length > 0;
    const hidden = m.hidden || [];
    const baseImgs = (sec.imagenes || []).filter(f => !hidden.includes(f));
    const catPrice = m.precio ? parseFloat(m.precio) : null;
    let headHtml = '<div class="cat-exp-top">' +
        '<div class="cat-exp-icon-wrap">' + catIconHtml(sec.nombre) + '</div>' +
        '<div class="cat-exp-title-wrap">' +
        '<span class="cat-exp-title">' + sec.nombre + '</span>' +
        (m.descripcion ? '<span class="cat-exp-desc">' + m.descripcion + '</span>' : '') +
        '</div>' +
        '<button class="cat-exp-close" id="catExpClose">&times;</button>' +
        '</div>';
    if (catPrice) headHtml += '<p class="sec-precio">Desde <strong>$' + catPrice.toFixed(2) + '</strong></p>';

    let bodyHtml = '';

    if (!hasSubs) {
        bodyHtml = renderProductGrid(baseImgs, sec.nombre, '', catPrice);
    } else {
        const subMeta = m.subs || {};

        if (baseImgs.length) {
            bodyHtml += renderProductGrid(baseImgs, sec.nombre, '', catPrice);
        }

        const tabsHtml = subs.map((sub, i) => {
            const sm = subMeta[sub.nombre] || {};
            const subPrice = sm.precio ? parseFloat(sm.precio) : catPrice;
            const sHidden = sm.hidden || [];
            const sBase = (sub.imagenes || []).filter(f => !sHidden.includes(f));
            const panelContent = (sm.descripcion ? '<p class="sec-desc">' + sm.descripcion + '</p>' : '') +
                (subPrice ? '<p class="sec-precio">Desde <strong>$' + subPrice.toFixed(2) + '</strong></p>' : '') +
                renderProductGrid(sBase, sec.nombre, sub.nombre, subPrice);
            return '<div class="tab-panel' + (i === 0 ? ' activo' : '') + '" data-panel="' + i + '">' +
                panelContent + '</div>';
        }).join('');

        bodyHtml += '<div class="tabs-menu">' +
            subs.map((sub, i) =>
                '<div class="tab-item' + (i === 0 ? ' activo' : '') + '" data-tab="' + i + '">' +
                sub.nombre + '</div>'
            ).join('') +
            '</div>' +
            '<div class="tabs-contenido">' + tabsHtml + '</div>';
    }

    return {
        head: headHtml,
        body: bodyHtml
    };
}

// === RENDER CATEGORY GRID ===
function renderCatalogo() {
    const cont = document.getElementById('catalogo-contenedor');
    if (!cont) return;

    console.log('[renderCatalogo] secciones:', secciones.map(s => s.nombre + (s.subcategorias ? ' (subs:' + s.subcategorias.length + ')' : '')));
    cont.innerHTML = '<div class="cat-grid" id="cat-grid">' +
        secciones.map(function (sec, i) {
            var subs = sec.subcategorias || [];
            var totalImgs = (sec.imagenes || []).length +
                (subs.length ? subs.reduce(function (a, s) { return a + (s.imagenes || []).length; }, 0) : 0);
            return '<div class="cat-grid-card" data-cat="' + sec.nombre + '" data-idx="' + i + '">' +
                '<div class="cat-grid-icon-wrap">' + catIconHtml(sec.nombre) + '</div>' +
                '<div class="cat-grid-name">' + sec.nombre + '</div>' +
                (totalImgs ? '<div class="cat-grid-count">' + totalImgs + ' productos</div>' : '') +
                '</div>';
        }).join('') +
        '</div>';

    $('.cat-grid-card').on('click', function () {
        var $this = $(this);
        var idx = parseInt($this.data('idx'));
        var $grid = $('#cat-grid');

        if ($grid.hasClass('sidebar-mode')) {
            if (!$this.hasClass('active')) {
                $grid.find('.cat-grid-card.active').removeClass('active');
                $this.addClass('active');
                switchCategoryContent(idx, $grid);
            }
            return;
        }

        $('.cat-grid-expanded').remove();
        $('.cat-grid-card').removeClass('active');
        $this.addClass('active');
        enterSidebarMode($grid, idx);
    });
}

function enterSidebarMode($grid, activeIdx) {
    var $cards = $grid.find('.cat-grid-card');
    var $sidebar = $('<div class="cat-sidebar"></div>');
    var $content = $('<div class="cat-main-content"></div>');

    $cards.each(function (i) {
        var $c = $(this);
        var name = $c.data('cat');
        var iconHtml = $c.find('.cat-grid-icon-wrap').html();
        var $item = $('<div class="cat-sidebar-item' + (i === activeIdx ? ' active' : '') + '" data-idx="' + i + '">' +
            '<div class="cat-sidebar-icon">' + iconHtml + '</div>' +
            '<div class="cat-sidebar-name">' + name + '</div>' +
            '</div>');
        if (i !== activeIdx) $item.css('transition-delay', Math.min((i * 0.035), 0.35) + 's');
        $item.on('click', function () {
            var idx = parseInt($(this).data('idx'));
            if ($(this).hasClass('active')) return;
            var $prev = $sidebar.find('.cat-sidebar-item.active');
            $prev.removeClass('active');
            $(this).addClass('active');
            $grid.find('.cat-grid-card.active').removeClass('active');
            $grid.find('.cat-grid-card[data-idx="' + idx + '"]').addClass('active');
            switchCategoryContent(idx, $grid);
        });
        $sidebar.append($item);
    });

    $grid.addClass('sidebar-mode').append($sidebar).append($content);

    $cards.slideUp(350, function () {
        $sidebar.addClass('visible');
        var sec = secciones[activeIdx];
        if (sec) {
            var html = buildExpandedHTML(sec);
            $content.html(html.head + html.body);
            bindTabEvents($content, $grid);
            loadGridBlobs($content[0]);
            $content.addClass('visible');
            scrollToContent($grid);
        }
    });
}

function bindTabEvents($content, $grid) {
    console.log('[bindTabEvents] tabs found:', $content.find('.tab-item').length, 'close:', $content.find('.cat-exp-close').length);
    $content.find('.tab-item').off('click').on('click', function () {
        var idx = $(this).index();
        console.log('[TAB CLICK] tab:', $(this).text(), 'idx:', idx);
        var $parent = $(this).closest('.cat-main-content');
        console.log('[TAB CLICK] panels count:', $parent.find('.tab-panel').length);
        $parent.find('.tab-item').removeClass('activo');
        $(this).addClass('activo');
        $parent.find('.tab-panel').removeClass('activo');
        $parent.find('.tab-panel').eq(idx).addClass('activo');
        console.log('[TAB CLICK] panel now has activo:', $parent.find('.tab-panel').eq(idx).hasClass('activo'));
    });

    $content.find('.cat-exp-close').off('click').on('click', function () {
        resetToGrid($grid);
    });
}

function switchCategoryContent(idx, $grid) {
    var sec = secciones[idx];
    if (!sec) return;
    var $content = $grid.find('.cat-main-content');
    $content.removeClass('visible');
    setTimeout(function () {
        var html = buildExpandedHTML(sec);
        $content.html(html.head + html.body);
        bindTabEvents($content, $grid);
        loadGridBlobs($content[0]);
        $content.addClass('visible');
        scrollToContent($grid);
    }, 200);
}

function scrollToContent($grid) {
    setTimeout(function () {
        var top = $grid.find('.cat-main-content').offset().top - 80;
        window.scrollTo({ top: top, behavior: 'smooth' });
    }, 250);
}

function resetToGrid($grid) {
    var $content = $grid.find('.cat-main-content');
    var $sidebar = $grid.find('.cat-sidebar');

    $content.removeClass('visible');
    $sidebar.removeClass('visible');

    setTimeout(function () {
        $grid.removeClass('sidebar-mode');
        $sidebar.remove();
        $content.remove();
        $grid.find('.cat-grid-card').removeClass('active').stop(true, true).slideDown(300);
    }, 350);
}

// === SMOOTH SCROLL ===
document.addEventListener('click', e => {
    const link = e.target.closest('[data-scroll]');
    if (!link) return;
    e.preventDefault();
    const target = document.getElementById(link.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('top-nav')?.classList.remove('open');
});

// === MOBILE MENU ===
document.getElementById('menu-btn')?.addEventListener('click', () => {
    document.getElementById('top-nav')?.classList.toggle('open');
});

// === WHATSAPP ===
document.getElementById('whatsapp-btn')?.addEventListener('click', () => {
    window.open('https://wa.me/584142052925', '_blank');
});

// === LIGHTBOX ===
let lightboxIdx = 0;
let lightboxImgs = [];

function openLightbox(imgs, idx) {
    lightboxImgs = imgs;
    lightboxIdx = idx;
    const lb = document.getElementById('lightbox');
    const imgEl = lb.querySelector('.lb-img');
    imgEl.src = imgs[idx];
    lb.querySelector('.lb-counter').textContent = (idx + 1) + ' / ' + imgs.length;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

function navLightbox(dir) {
    const next = lightboxIdx + dir;
    if (next < 0 || next >= lightboxImgs.length) return;
    openLightbox(lightboxImgs, next);
}

function cotizarWhatsApp() {
    var url = lightboxImgs[lightboxIdx];
    var parts = url.replace(/^.*\/Catal\//, '').replace(/\.\w+$/, '').split('/');
    var desc = parts.length > 1 ? parts.slice(0, -1).join(' - ') : parts[0];
    var msg = 'Hola, quisiera cotizar un producto de Dulce Mora (' + desc + '). Catálogo: ' + location.href.replace(/\?.*/, '').replace(/#.*/, '');
    window.open('https://wa.me/584142052925?text=' + encodeURIComponent(msg), '_blank');
}

document.addEventListener('click', e => {
    const wrap = e.target.closest('.img-wrap');
    if (wrap) {
        console.log('[CLICK] img-wrap found');
        const grid = wrap.closest('.product-grid');
        if (grid) {
            var imgEl = wrap.querySelector('img');
            if (imgEl) {
                var realSrc = imgEl.getAttribute('data-real-src');
                if (!realSrc) return;
                var allImgs = [...grid.querySelectorAll('img')].map(function (i) { return i.getAttribute('data-real-src') || i.src; });
                var idx = allImgs.indexOf(realSrc);
                if (idx >= 0) { openLightbox(allImgs, idx); return; }
            }
        }
    }
    const lb = document.getElementById('lightbox');
    if (e.target === lb || e.target.closest('.lb-close')) closeLightbox();
    if (e.target.closest('.lb-prev')) navLightbox(-1);
    if (e.target.closest('.lb-next')) navLightbox(1);
    if (e.target.closest('.lb-wa')) cotizarWhatsApp();
});

document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    if (!lb?.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
});

// === INIT ===
const lbHTML = `
<div class="lightbox" id="lightbox">
    <button class="lb-close lb-btn">&times;</button>
    <button class="lb-prev lb-btn">&#10094;</button>
    <button class="lb-next lb-btn">&#10095;</button>
    <div class="lb-content"><img class="lb-img" alt=""></div>
    <div class="lb-counter"></div>
    <button class="lb-btn lb-wa" title="Cotizar por WhatsApp">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    </button>
</div>`;
document.body.insertAdjacentHTML('beforeend', lbHTML);

Promise.all([
    fetch('assets/catalogo.json').then(r => r.json()),
    Promise.resolve().then(() => {
        try { return JSON.parse(localStorage.getItem('dm_catalogo_secciones')) || {}; } catch { return {}; }
    }),
    fetch('/api/bcv').then(r => r.json()).then(d => { bcvRate = parseFloat(d.tasa); }).catch(() => { bcvRate = null; }),
    fetch('assets/catalogo_meta.json').then(r => r.json()).catch(() => ({}))
]).then(([data, localMeta, _, fileMeta]) => {
    const metadata = { ...fileMeta, ...localMeta };

    secciones = data;
    // limpiar hidden obsoletos
    secciones.forEach(s => {
        if (metadata[s.nombre]) delete metadata[s.nombre].hidden;
        (s.subcategorias||[]).forEach(sub => {
            const sm = metadata[s.nombre]?.subs?.[sub.nombre];
            if (sm) delete sm.hidden;
        });
    });
    meta = metadata;
    renderCatalogo();
}).catch(err => {
    console.error('[INIT] Error:', err);
    document.getElementById('catalogo-contenedor').innerHTML =
        '<p style="text-align:center;padding:2rem;color:var(--text2)">Error al cargar el catálogo</p>';
});

document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'IMG') { e.preventDefault(); }
});
