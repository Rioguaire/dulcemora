console.log('admin.js loaded');
const $ = id => { const el = document.getElementById(id); if (!el) console.warn('Element not found:', id); return el; };
const $$ = s => document.querySelectorAll(s);
const toast = () => $('toast');
const showToast = msg => { const t = toast(); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); };
const today = () => { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const now = () => Date.now();
const ls = (k, v) => { if (v !== undefined) { localStorage.setItem('dm_'+k, JSON.stringify(v)); return v; } try { return JSON.parse(localStorage.getItem('dm_'+k)) || []; } catch { return []; } };
const tasa = () => parseFloat($('tasa-bcv').value) || 0;
const bs = (usd) => { const t = tasa(); return t ? (usd * t).toFixed(2) : '—'; };
const usa = (n) => n.toFixed(2);
const usaUni = (n) => n.toFixed(n < 0.01 ? 4 : n < 1 ? 3 : 2);
const redondear = (n) => n.toFixed(n < 0.01 ? 4 : n < 1 ? 3 : 2);
const tasaFecha = (fecha) => { const r = JSON.parse(localStorage.getItem('dm_tasas')||'{}'); return r[fecha] || tasa(); };
const setTasaFecha = (f, v) => { const r = JSON.parse(localStorage.getItem('dm_tasas')||'{}'); r[f] = v; localStorage.setItem('dm_tasas', JSON.stringify(r)); };
const sn = n => n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'producto';

$$('.tab-btn').forEach(b => b.addEventListener('click', () => {
    $$('.tab-btn').forEach(x => x.classList.remove('active'));
    $$('.tab-content').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    $(b.dataset.tab).classList.add('active');
    renderAll();
}));

$('tasa-bcv').addEventListener('input', renderAll);

function actualizarTasa(valor) {
    $('tasa-bcv').value = valor;
    const nota = $('tasa-nota');
    if (nota) { nota.style.display = 'flex'; $('tasa-nota-valor').value = valor.toFixed(2); }
    setTasaFecha(today(), valor);
    renderAll();
}

$('tasa-bcv').addEventListener('change', () => {
    const v = parseFloat($('tasa-bcv').value);
    if (v > 0) {
        const nota = $('tasa-nota');
        if (nota) { nota.style.display = 'flex'; $('tasa-nota-valor').value = v.toFixed(2); }
        setTasaFecha(today(), v);
    }
});

async function fetchTasaBCV() {
    let tasa = null;
    const fet = (url, opt) => fetch(url, { ...opt, signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined }).catch(() => {});
    // Intento 1: proxy local (dev-server) — scrapea dolartracker.com sin CORS
    try {
        const r = await fet('/api/bcv');
        if (r && r.ok) { const d = await r.json(); if (d.ok && d.tasa > 0) tasa = d.tasa; }
    } catch {}
    if (tasa) return tasa;
    // Intento 2: dolarapi.com
    try {
        const r = await fet('https://ve.dolarapi.com/v1/dolares');
        if (r && r.ok) { const d = await r.json(); const bcv = Array.isArray(d) && d.find(x => x.fuente === 'oficial'); if (bcv?.promedio > 0) tasa = bcv.promedio; }
    } catch {}
    return tasa || null;
}

const tasaEUR = () => parseFloat($('tasa-eur')?.value) || 0;

function actualizarTasaEUR(valor) {
    if (!$('tasa-eur')) return;
    $('tasa-eur').value = valor;
    localStorage.setItem('dm_tasa_eur', JSON.stringify(valor));
    renderAll();
}

async function fetchTasaEUR() {
    let tasa = null;
    const fet = (url, opt) => fetch(url, { ...opt, signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined }).catch(() => {});
    try {
        const r = await fet('https://ve.dolarapi.com/v1/euros');
        if (r && r.ok) { const d = await r.json(); const bcv = Array.isArray(d) && d.find(x => x.fuente === 'oficial'); if (bcv?.promedio > 0) tasa = bcv.promedio; }
    } catch {}
    return tasa || null;
}

// Restaurar EUR guardado
const eurGuardado = localStorage.getItem('dm_tasa_eur');
if (eurGuardado && $('tasa-eur')) {
    try { $('tasa-eur').value = JSON.parse(eurGuardado); } catch(e) { $('tasa-eur').value = eurGuardado; }
}

$('tasa-eur')?.addEventListener('input', renderAll);

$('tasa-eur')?.addEventListener('change', () => {
    const v = parseFloat($('tasa-eur').value);
    if (v > 0) localStorage.setItem('dm_tasa_eur', JSON.stringify(v));
});

$('btn-bcv-auto').addEventListener('click', async () => {
    const btn = $('btn-bcv-auto');
    btn.textContent = 'Consultando...';
    btn.disabled = true;
    const [usd, eur] = await Promise.all([fetchTasaBCV(), fetchTasaEUR()]);
    if (usd) actualizarTasa(usd);
    if (eur) actualizarTasaEUR(eur);
    const parts = [];
    if (usd) parts.push('Bs ' + usd.toFixed(2) + ' / $');
    if (eur) parts.push('Bs ' + eur.toFixed(2) + ' / €');
    if (parts.length) showToast('Tasas: ' + parts.join(' · '));
    else showToast('No se pudieron obtener las tasas. Ingresalas manualmente.');
    btn.textContent = 'Consultar';
    btn.disabled = false;
});

$('btn-exportar').addEventListener('click', () => {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('dm_')) {
            backup[key] = localStorage.getItem(key);
        }
    }
    backup['dm_tasa'] = JSON.stringify($('tasa-bcv').value);
    const blob = new Blob([JSON.stringify(backup, null, 4)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'respaldo_dulcemora_' + today() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Respaldo exportado');
});

$('btn-cargar').addEventListener('click', () => $('file-respaldo').click());

$('file-respaldo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            let count = 0;
            if (Array.isArray(data)) {
                showToast('Este archivo no es un respaldo general. Usá Importar en Almacén o Recetas.');
                return;
            }
            Object.keys(data).forEach(key => {
                if (key.startsWith('dm_')) {
                    localStorage.setItem(key, data[key]);
                    count++;
                }
            });
            if (data['dm_tasa']) {
                try { $('tasa-bcv').value = JSON.parse(data['dm_tasa']); } catch(e) { $('tasa-bcv').value = data['dm_tasa']; }
            }
            showToast('Respaldo cargado: ' + count + ' datos restaurados');
            renderAll();
        } catch (err) {
            console.error('Error al cargar respaldo:', err);
            showToast('Error: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

let catSecciones = [];
let catMeta = {};

function loadCatSecciones() {
    catMeta = JSON.parse(localStorage.getItem('dm_catalogo_secciones')) || {};
    if (catSecciones.length) { renderCatSecciones(); return; }
    return fetch('assets/catalogo.json').then(r => r.json()).then(data => {
        catSecciones = data;
        renderCatSecciones();
    }).catch(() => {});
}

const catKey = (nombre, sub) => sub ? nombre+'||'+sub : nombre;
const secEsc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function getCatSrc(secNombre, subNombre, img) {
    const imgData = getCatImgData();
    const key = catKey(secNombre, subNombre);
    if (imgData[key]?.[img]) return imgData[key][img];
    const path = subNombre ? secNombre+'/'+subNombre : secNombre;
    return 'assets/images/Catal/'+path+'/'+encodeURIComponent(img);
}

function getCatOrdered(imgs, meta, uploads) {
    const hidden = (meta.hidden || []);
    const up = uploads || [];
    const baseVisible = imgs.filter(f => !hidden.includes(f));
    const sortOrder = meta.sortOrder || [];
    const allDefault = [...baseVisible, ...up];
    if (sortOrder.length) {
        const ordered = sortOrder.filter(f => allDefault.includes(f));
        const remaining = allDefault.filter(f => !sortOrder.includes(f));
        return [...ordered, ...remaining];
    }
    return allDefault;
}

function renderCatContent(imgs, meta, up, key, oname, prefix) {
    const allImgs = getCatOrdered(imgs, meta, up);
    const uploadId = 'cat-up-'+prefix;
    return '<div class="cat-section-imgs">'+
        allImgs.map((img, iidx) => {
            const src = getCatSrc(oname, meta.subName, img);
            const isBase = !up.includes(img);
            const common = 'data-prefix="'+prefix+'" data-file="'+img.replace(/"/g,'&quot;')+'" data-base="'+isBase+'" data-key="'+key.replace(/"/g,'&quot;')+'"';
            const moveL = iidx > 0 ? '<button class="cat-move-btn" '+common+' data-dir="-1">&#9664;</button>' : '';
            const moveR = iidx < allImgs.length-1 ? '<button class="cat-move-btn" '+common+' data-dir="1">&#9654;</button>' : '';
            const isCover = meta.cover === img;
        return '<div class="cat-section-thumb'+(isCover?' cat-thumb-cover':'')+'" '+common+'>'+
            '<button class="cat-thumb-del" '+common+'>&times;</button>'+
            '<img src="'+src+'" loading="lazy" onerror="this.closest(\'.cat-section-thumb\').classList.add(\'cat-img-broken\')">'+
            moveL+moveR+
            '<button class="cat-mover-btn" '+common+' title="Mover a otra categoría">↗</button>'+
            '<button class="cat-cover-btn" '+common+' title="Usar como foto de referencia">'+(isCover?'★':'☆')+'</button></div>';
        }).join('')+
        '</div>'+
        '<div class="cat-section-body">'+
        '<button class="cat-edit-toggle" data-prefix="'+prefix+'" onclick="this.nextElementSibling.classList.toggle(\'open\');this.classList.toggle(\'active\')">⚙ Editar sección</button>'+
        '<div class="cat-edit-panel">'+
        '<div style="flex:1;min-width:0;display:flex;gap:0.3rem;align-items:center">'+
        '<input class="cat-sec-desc" data-prefix="'+prefix+'" data-key="'+key.replace(/"/g,'&quot;')+'" value="'+secEsc(meta.descripcion||'')+'" placeholder="Descripción..." style="flex:1">'+
        '</div>'+
        '<div style="width:90px;flex-shrink:0"><input type="number" class="cat-sec-price" data-prefix="'+prefix+'" data-key="'+key.replace(/"/g,'&quot;')+'" step="0.01" min="0" value="'+(meta.precio||'')+'" placeholder="$ Precio"></div>'+
        '<div style="width:170px;flex-shrink:0"><input type="file" class="cat-upload-input" id="'+uploadId+'" data-key="'+key.replace(/"/g,'&quot;')+'" accept="image/*"></div>'+
        '<button class="btn btn-sm btn-success cat-accept-btn" data-prefix="'+prefix+'" data-key="'+key.replace(/"/g,'&quot;')+'" type="button">Aceptar</button>'+
        '</div></div>';
}

let catTabActiva = '';

function renderCatSecciones() {
    const cont = $('cat-secciones');
    if (!cont) return;
    if (!catSecciones.length) {
        cont.innerHTML = '<p class="empty-msg">No hay secciones.</p>';
        return;
    }
    const uploads = getCatUploads();

    // Validate/set active tab
    if (!catTabActiva || !catSecciones.some(s => s.nombre === catTabActiva)) {
        catTabActiva = catSecciones[0].nombre;
    }

    // Tab buttons
    let html = '<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap">' +
        '<button class="btn btn-sm btn-outline" id="btn-gestionar-cat" type="button">⚙ Gestionar categorías</button>' +
        '</div>';
    html += '<div class="cat-tabs">';
    catSecciones.forEach(sec => {
        const meta = catMeta[sec.nombre] || {};
        const subs = sec.subcategorias || [];
        const up = uploads[catKey(sec.nombre)] || [];
        const total = (sec.imagenes||[]).length + up.length +
            subs.reduce((a,s) => a + s.imagenes.length + (uploads[catKey(sec.nombre, s.nombre)]||[]).length, 0);
        html += '<button class="cat-tab-btn' + (sec.nombre === catTabActiva ? ' active' : '') + '" data-cat="' + sec.nombre.replace(/"/g,'&quot;') + '">' +
            sec.nombre + '<span class="cat-tab-count">' + total + '</span></button>';
    });
    html += '</div>';

    // Active tab content
    const sec = catSecciones.find(s => s.nombre === catTabActiva);
    if (sec) {
        const meta = catMeta[sec.nombre] || {};
        const subs = sec.subcategorias || [];
        const hasSubs = subs.length > 0;
        const up = uploads[catKey(sec.nombre)] || [];

        html += '<div class="cat-tab-panel active">';
        if (!hasSubs) {
            html += renderCatContent(sec.imagenes||[], meta, up, catKey(sec.nombre), sec.nombre, 's');
        } else {
            html += '<div class="cat-section-body cat-body-subs">'+
                '<button class="cat-edit-toggle" data-prefix="s" onclick="this.nextElementSibling.classList.toggle(\'open\');this.classList.toggle(\'active\')">⚙ Editar sección</button>'+
                '<div class="cat-edit-panel">'+
                '<div style="flex:1;min-width:0;display:flex;gap:0.3rem;align-items:center">'+
                '<input class="cat-sec-desc" data-prefix="s" data-key="'+sec.nombre.replace(/"/g,'&quot;')+'" value="'+secEsc(meta.descripcion||'')+'" placeholder="Descripción..." style="flex:1">'+
                '</div>'+
                '<div style="width:90px;flex-shrink:0"><input type="number" class="cat-sec-price" data-prefix="s" data-key="'+sec.nombre.replace(/"/g,'&quot;')+'" step="0.01" min="0" value="'+(meta.precio||'')+'" placeholder="$ Precio"></div>'+
                '<div style="width:170px;flex-shrink:0"><input type="file" class="cat-upload-input" id="cat-up-s" data-key="'+sec.nombre.replace(/"/g,'&quot;')+'" accept="image/*"></div>'+
                '<button class="btn btn-sm btn-success cat-accept-btn" data-prefix="s" data-key="'+sec.nombre.replace(/"/g,'&quot;')+'" type="button">Aceptar</button>'+
                '</div></div>';
            if (sec.imagenes && sec.imagenes.length) {
                html += '<div class="cat-sub-header">Imágenes generales</div>';
                html += renderCatContent(sec.imagenes, meta, up, catKey(sec.nombre), sec.nombre, 's');
            }
            const subMeta = meta.subs || {};
            subs.forEach((sub, si) => {
                const sm = subMeta[sub.nombre] || {};
                const sup = uploads[catKey(sec.nombre, sub.nombre)] || [];
                const pref = 's'+si;
                html += '<div class="cat-subsection">'+
                    '<div class="cat-sub-header">'+sub.nombre+' <span class="cat-tab-count">'+((sub.imagenes||[]).length+sup.length)+' imágenes</span></div>'+
                    renderCatContent(sub.imagenes||[], { ...sm, subName: sub.nombre }, sup, catKey(sec.nombre, sub.nombre), sec.nombre, pref)+
                    '</div>';
            });
        }
        html += '</div>';
    }
    cont.innerHTML = html;
}

function saveCatSeccion(prefix, key) {
    const desc = (document.querySelector('.cat-sec-desc[data-prefix="'+prefix+'"]')?.value || '').trim();
    const precio = parseFloat(document.querySelector('.cat-sec-price[data-prefix="'+prefix+'"]')?.value) || 0;
    const parts = key.split('||');
    const secName = parts[0];
    const subName = parts[1];
    let meta = catMeta[secName] || {};
    if (subName) {
        const subs = meta.subs || {};
        subs[subName] = { ...(subs[subName]||{}), descripcion: desc, precio: precio };
        meta = { ...meta, subs };
    } else {
        meta = { ...meta, descripcion: desc, precio: precio };
    }
    catMeta[secName] = meta;
    localStorage.setItem('dm_catalogo_secciones', JSON.stringify(catMeta));
}

document.addEventListener('change', function(e) {
    const inp = e.target.closest('.cat-sec-desc, .cat-sec-price');
    if (inp) saveCatSeccion(inp.dataset.prefix, inp.dataset.key);
    const up = e.target.closest('.cat-upload-input');
    if (up) uploadCatImage(up.dataset.key);
});

function getCatUploads() { try { return JSON.parse(localStorage.getItem('dm_catalogo_uploads')) || {}; } catch { return {}; } }
function getCatImgData() { try { return JSON.parse(localStorage.getItem('dm_cat_img_data')) || {}; } catch { return {}; } }

function uploadCatImage(key) {
    const parts = key.split('||');
    const secName = parts[0];
    const subName = parts[1];
    const sec = catSecciones.find(s => s.nombre === secName);
    if (!sec) return;
    const input = document.querySelector('.cat-upload-input[data-key="'+key.replace(/"/g,'&quot;')+'"]');
    const file = input?.files?.[0];
    if (!file) { showToast('Seleccioná una imagen primero'); return; }
    if (!file.type.startsWith('image/')) { showToast('El archivo debe ser una imagen'); return; }
    const fd = new FormData();
    fd.append('imagen', file);
    fd.append('categoria', secName);
    if (subName) fd.append('subcategoria', subName);
    showToast('Subiendo imagen...');
    fetch('/api/subir_imagen', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(d => {
            if (!d.ok) { showToast('❌ ' + (d.error || 'Error al subir')); return; }
            const filename = d.filename;
            const uploads = getCatUploads();
            if (!uploads[key]) uploads[key] = [];
            uploads[key].push(filename);
            localStorage.setItem('dm_catalogo_uploads', JSON.stringify(uploads));
            showToast('✅ Imagen subida como WebP');
            renderCatSecciones();
        })
        .catch(e => showToast('❌ Error de conexión: ' + e.message));
}

function guardarCatalogoServidor() {
    const meta = JSON.parse(localStorage.getItem('dm_catalogo_secciones') || '{}');
    if (Object.keys(meta).length === 0) {
        showToast('No hay cambios para guardar');
        return;
    }
    fetch('/api/guardar_meta_catalogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta })
    }).then(r => r.json()).then(d => {
        if (d.ok) showToast('✅ ' + d.mensaje);
        else showToast('❌ Error: ' + (d.error || 'desconocido'));
    }).catch(e => {
        showToast('❌ Error de conexión: ' + e.message);
    });
}

function catMoverModal(key, filename, isBase) {
    const parts = key.split('||');
    const secOrigen = parts[0];
    const subOrigen = parts[1] || '';
    const modal = document.getElementById('cat-mover-modal');
    const selCat = document.getElementById('cat-mover-select-cat');
    const selSub = document.getElementById('cat-mover-select-sub');
    document.getElementById('cat-mover-file-label').textContent = 'Imagen: ' + filename + ' (desde ' + secOrigen + (subOrigen ? ' → ' + subOrigen : '') + ')';
    modal.dataset.origenKey = key;
    modal.dataset.filename = filename;
    modal.dataset.isBase = isBase;
    selCat.innerHTML = catSecciones.filter(s => s.nombre !== secOrigen || (subOrigen && true)).map(s =>
        '<option value="' + secEsc(s.nombre) + '">' + secEsc(s.nombre) + '</option>'
    ).join('');
    // If source has subcategory, allow moving to same category different sub
    if (subOrigen) {
        const srcSec = catSecciones.find(s => s.nombre === secOrigen);
        if (srcSec) {
            selCat.innerHTML += '<option value="' + secEsc(secOrigen) + '" selected>' + secEsc(secOrigen) + ' (misma)</option>';
        }
    }
    fillMoverSubs(selCat.value);
    modal.style.display = 'flex';
}

function fillMoverSubs(catName) {
    const selSub = document.getElementById('cat-mover-select-sub');
    const sec = catSecciones.find(s => s.nombre === catName);
    const subs = sec?.subcategorias || [];
    selSub.innerHTML = '<option value="">(sin subcategoría)</option>' +
        subs.map(s => '<option value="' + secEsc(s.nombre) + '">' + secEsc(s.nombre) + '</option>').join('');
    selSub.style.display = subs.length ? 'block' : 'none';
}

function execMoverImagen() {
    const modal = document.getElementById('cat-mover-modal');
    const origenParts = modal.dataset.origenKey.split('||');
    const secOrigen = origenParts[0];
    const subOrigen = origenParts[1] || '';
    const filename = modal.dataset.filename;
    const isBase = modal.dataset.isBase;
    const catDest = document.getElementById('cat-mover-select-cat').value;
    const subDest = document.getElementById('cat-mover-select-sub').value;
    if (!catDest) { showToast('Seleccioná una categoría destino'); return; }
    if (catDest === secOrigen && subDest === subOrigen) { showToast('La imagen ya está en esa categoría'); return; }
    showToast('Moviendo imagen...');
    fetch('/api/mover_imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origen: { categoria: secOrigen, subcategoria: subOrigen }, destino: { categoria: catDest, subcategoria: subDest }, filename: filename })
    }).then(r => r.json()).then(d => {
        if (!d.ok) { showToast('❌ ' + (d.error || 'Error al mover')); return; }
        const keyDest = catDest + (subDest ? '||' + subDest : '');
        const keyOrigen = modal.dataset.origenKey;
        if (isBase === 'false') {
            // uploaded image: update localStorage uploads
            const uploads = getCatUploads();
            if (uploads[keyOrigen]) {
                uploads[keyOrigen] = uploads[keyOrigen].filter(f => f !== filename);
                if (!uploads[keyOrigen].length) delete uploads[keyOrigen];
            }
            if (!uploads[keyDest]) uploads[keyDest] = [];
            uploads[keyDest].push(filename);
            localStorage.setItem('dm_catalogo_uploads', JSON.stringify(uploads));
            // remove from cat_img_data if present
            const imgData = getCatImgData();
            if (imgData[keyOrigen]?.[filename]) {
                delete imgData[keyOrigen][filename];
                if (!Object.keys(imgData[keyOrigen]).length) delete imgData[keyOrigen];
                localStorage.setItem('dm_cat_img_data', JSON.stringify(imgData));
            }
        } else {
            // base image: hide from source in meta
            const meta = catMeta[secOrigen] || {};
            if (subOrigen) {
                const subs = meta.subs || {};
                const sm = subs[subOrigen] || {};
                const hidden = sm.hidden || [];
                if (!hidden.includes(filename)) hidden.push(filename);
                catMeta[secOrigen] = { ...meta, subs: { ...subs, [subOrigen]: { ...sm, hidden } } };
            } else {
                const hidden = meta.hidden || [];
                if (!hidden.includes(filename)) hidden.push(filename);
                catMeta[secOrigen] = { ...meta, hidden };
            }
            localStorage.setItem('dm_catalogo_secciones', JSON.stringify(catMeta));
        }
        modal.style.display = 'none';
        showToast('✅ Imagen movida a ' + catDest + (subDest ? ' → ' + subDest : ''));
        renderCatSecciones();
    }).catch(e => { showToast('❌ Error de conexión: ' + e.message); });
}

// Boton guardar al servidor
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-guardar-servidor');
    if (btn) btn.addEventListener('click', guardarCatalogoServidor);
});

function catMoveImg(prefix, file, dir) {
    const thumbs = [...document.querySelectorAll('.cat-section-thumb[data-prefix="'+prefix+'"]')];
    const files = thumbs.map(t => t.dataset.file);
    const idx = files.indexOf(file);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= files.length) return;
    [files[idx], files[target]] = [files[target], files[idx]];
    const key = thumbs[0].dataset.key;
    const parts = key.split('||');
    const secName = parts[0];
    const subName = parts[1];
    const meta = catMeta[secName] || {};
    if (subName) {
        const subs = meta.subs || {};
        const sm = subs[subName] || {};
        catMeta[secName] = { ...meta, subs: { ...subs, [subName]: { ...sm, sortOrder: files } } };
    } else {
        catMeta[secName] = { ...meta, sortOrder: files };
    }
    localStorage.setItem('dm_catalogo_secciones', JSON.stringify(catMeta));
    renderCatSecciones();
}

let catLbKey = '';
let catLbFiles = [];
let catLbIdx = 0;

function abrirCatLightbox(prefix, file) {
    const thumbs = [...document.querySelectorAll('.cat-section-thumb[data-prefix="'+prefix+'"]')];
    catLbFiles = thumbs.map(t => t.dataset.file);
    catLbKey = thumbs[0]?.dataset.key || '';
    catLbIdx = catLbFiles.indexOf(file);
    if (catLbIdx === -1) catLbIdx = 0;
    mostrarCatLbImg();
    $('cat-lightbox').style.display = 'flex';
}

function cerrarCatLightbox() { $('cat-lightbox').style.display = 'none'; }

function mostrarCatLbImg() {
    if (!catLbFiles.length) { cerrarCatLightbox(); return; }
    const file = catLbFiles[catLbIdx];
    const parts = catLbKey.split('||');
    const src = getCatSrc(parts[0], parts[1], file);
    $('cat-lightbox-img').src = src;
    $('cat-lightbox-name').textContent = (catLbIdx+1)+'/'+catLbFiles.length+' - '+file;
    const delBtn = $('cat-lightbox-del');
    const up = getCatUploads()[catLbKey] || [];
    delBtn.dataset.file = file;
    delBtn.dataset.key = catLbKey;
    delBtn.dataset.base = (!up.includes(file)).toString();
}

const lbClose = $('cat-lightbox-close'); if (lbClose) lbClose.addEventListener('click', cerrarCatLightbox);
const lbBg = $('cat-lightbox-bg'); if (lbBg) lbBg.addEventListener('click', cerrarCatLightbox);
const lbNext = $('cat-lightbox-next'); if (lbNext) lbNext.addEventListener('click', () => { if (catLbIdx < catLbFiles.length-1) { catLbIdx++; mostrarCatLbImg(); } });
const lbPrev = $('cat-lightbox-prev'); if (lbPrev) lbPrev.addEventListener('click', () => { if (catLbIdx > 0) { catLbIdx--; mostrarCatLbImg(); } });
const lbDel = $('cat-lightbox-del'); if (lbDel) lbDel.addEventListener('click', function() {
    if (confirm('¿Eliminar esta imagen?')) {
        removeCatImage(this.dataset.key, this.dataset.file, this.dataset.base);
        cerrarCatLightbox();
    }
});
document.addEventListener('keydown', function(e) {
    const lb = $('cat-lightbox');
    if (lb.style.display === 'none') return;
    if (e.key === 'Escape') cerrarCatLightbox();
    else if (e.key === 'ArrowRight' && catLbIdx < catLbFiles.length-1) { catLbIdx++; mostrarCatLbImg(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' && catLbIdx > 0) { catLbIdx--; mostrarCatLbImg(); e.preventDefault(); }
});

function removeCatImage(key, filename, isBase) {
    if (!confirm('¿Eliminar esta imagen del catálogo?')) return;
    const parts = key.split('||');
    const secName = parts[0];
    const subName = parts[1];
    if (isBase === 'true') {
        const meta = catMeta[secName] || {};
        if (subName) {
            const subs = meta.subs || {};
            const sm = subs[subName] || {};
            const hidden = sm.hidden || [];
            if (!hidden.includes(filename)) hidden.push(filename);
            catMeta[secName] = { ...meta, subs: { ...subs, [subName]: { ...sm, hidden } } };
        } else {
            const hidden = meta.hidden || [];
            if (!hidden.includes(filename)) hidden.push(filename);
            catMeta[secName] = { ...meta, hidden };
        }
        localStorage.setItem('dm_catalogo_secciones', JSON.stringify(catMeta));
    } else {
        const uploads = getCatUploads();
        if (uploads[key]) {
            uploads[key] = uploads[key].filter(f => f !== filename);
            if (!uploads[key].length) delete uploads[key];
            localStorage.setItem('dm_catalogo_uploads', JSON.stringify(uploads));
        }
        const imgData = getCatImgData();
        if (imgData[key]?.[filename]) {
            delete imgData[key][filename];
            if (!Object.keys(imgData[key]).length) delete imgData[key];
            localStorage.setItem('dm_cat_img_data', JSON.stringify(imgData));
        }
    }
    showToast('Imagen eliminada');
    renderCatSecciones();
}

// === CATEGORY MANAGER ===
let catMgrData = [];

function openCatMgr() {
    catMgrData = JSON.parse(JSON.stringify(catSecciones));
    renderCatMgr();
    document.getElementById('cat-mgr-modal').style.display = 'flex';
}

function renderCatMgr() {
    const body = document.getElementById('cat-mgr-body');
    if (!catMgrData.length) {
        body.innerHTML = '<p style="color:var(--text2);font-size:0.85rem">No hay categorías.</p>';
        return;
    }
    body.innerHTML = catMgrData.map((sec, si) =>
        '<div class="cat-mgr-item">' +
        '<div class="cat-mgr-item-header">' +
        '<span style="font-size:0.75rem;color:var(--text3);flex-shrink:0">' + (si + 1) + '.</span>' +
        '<input class="cat-mgr-input-cat" data-idx="' + si + '" value="' + secEsc(sec.nombre) + '" placeholder="Nombre de categoría">' +
        '<button class="cat-mgr-btn cat-mgr-btn-add-sub" data-idx="' + si + '">+ Sub</button>' +
        '<button class="cat-mgr-btn cat-mgr-btn-del" data-idx="' + si + '">✕</button>' +
        '</div>' +
        '<div class="cat-mgr-subs">' +
        (sec.subcategorias || []).map((sub, ssi) =>
            '<div class="cat-mgr-sub-item">' +
            '<input class="cat-mgr-input-sub" data-idx="' + si + '" data-sub-idx="' + ssi + '" value="' + secEsc(sub.nombre) + '" placeholder="Subcategoría">' +
            '<button class="cat-mgr-btn cat-mgr-btn-del" data-idx="' + si + '" data-sub-idx="' + ssi + '">✕</button>' +
            '</div>'
        ).join('') +
        '</div>' +
        '</div>'
    ).join('');
    const addBtn = document.createElement('div');
    addBtn.style.marginTop = '0.5rem';
    addBtn.innerHTML = '<button class="cat-mgr-btn-add" id="cat-mgr-add-cat">➕ Añadir categoría</button>';
    body.appendChild(addBtn);
    body.querySelectorAll('.cat-mgr-btn-add-sub').forEach(el => {
        el.addEventListener('click', function () {
            const idx = parseInt(this.dataset.idx);
            const sec = catMgrData[idx];
            if (!sec.subcategorias) sec.subcategorias = [];
            sec.subcategorias.push({ nombre: 'Nueva subcategoría', imagenes: [] });
            renderCatMgr();
        });
    });
    body.querySelectorAll('.cat-mgr-btn-del').forEach(el => {
        el.addEventListener('click', function () {
            const idx = parseInt(this.dataset.idx);
            const subIdx = this.dataset.subIdx;
            if (subIdx !== undefined) {
                const sec = catMgrData[idx];
                if (sec.subcategorias) sec.subcategorias.splice(parseInt(subIdx), 1);
            } else {
                if (confirm('¿Eliminar la categoría "' + catMgrData[idx].nombre + '" y mover sus imágenes a backup?')) {
                    catMgrData.splice(idx, 1);
                }
            }
            renderCatMgr();
        });
    });
    document.getElementById('cat-mgr-add-cat')?.addEventListener('click', function () {
        catMgrData.push({ nombre: 'Nueva categoría', imagenes: [] });
        renderCatMgr();
    });
}

function saveCatMgr() {
    const catInputs = document.querySelectorAll('.cat-mgr-input-cat');
    catInputs.forEach(inp => {
        const idx = parseInt(inp.dataset.idx);
        if (catMgrData[idx]) catMgrData[idx].nombre = inp.value.trim() || catMgrData[idx].nombre;
    });
    const subInputs = document.querySelectorAll('.cat-mgr-input-sub');
    subInputs.forEach(inp => {
        const idx = parseInt(inp.dataset.idx);
        const subIdx = parseInt(inp.dataset.subIdx);
        const sec = catMgrData[idx];
        if (sec && sec.subcategorias && sec.subcategorias[subIdx]) {
            sec.subcategorias[subIdx].nombre = inp.value.trim() || sec.subcategorias[subIdx].nombre;
        }
    });
    catMgrData.forEach(sec => {
        if (!sec.imagenes) sec.imagenes = [];
        (sec.subcategorias || []).forEach(sub => {
            if (!sub.imagenes) sub.imagenes = [];
        });
    });
    const renameMap = {};
    catSecciones.forEach(oldSec => {
        const match = catMgrData.find(s => s.nombre === oldSec.nombre);
        if (!match) return; // deleted
        const newName = match.nombre;
        if (oldSec.nombre !== newName) {
            renameMap[oldSec.nombre] = newName;
        }
        if (oldSec.subcategorias && match.subcategorias) {
            oldSec.subcategorias.forEach(oldSub => {
                const subMatch = match.subcategorias.find(s => s.nombre === oldSub.nombre);
                if (!subMatch) return;
                if (oldSub.nombre !== subMatch.nombre) {
                    renameMap[oldSec.nombre + '/' + oldSub.nombre] = newName + '/' + subMatch.nombre;
                }
            });
        }
    });
    showToast('Guardando categorías...');
    fetch('/api/guardar_catalogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogo: catMgrData, rename_map: renameMap })
    }).then(r => r.json()).then(d => {
        if (!d.ok) { showToast('❌ ' + (d.error || 'Error')); return; }
        document.getElementById('cat-mgr-modal').style.display = 'none';
        return fetch('assets/catalogo.json').then(r => r.json()).then(data => {
            catSecciones = data;
            renderCatSecciones();
            showToast('✅ ' + d.mensaje);
        });
    }).catch(e => showToast('❌ Error de conexión: ' + e.message));
}

document.addEventListener('click', function(e) {
    const tabBtn = e.target.closest('.cat-tab-btn');
    if (tabBtn) {
        catTabActiva = tabBtn.dataset.cat;
        renderCatSecciones();
        return;
    }
    const btn = e.target.closest('.cat-thumb-del');
    if (btn) {
        removeCatImage(btn.dataset.key, btn.dataset.file, btn.dataset.base);
        return;
    }
    const thumb = e.target.closest('.cat-section-thumb[data-prefix]');
    if (thumb && !e.target.closest('.cat-thumb-del, .cat-move-btn, .cat-mover-btn')) {
        abrirCatLightbox(thumb.dataset.prefix, thumb.dataset.file);
        return;
    }
    const mv = e.target.closest('.cat-move-btn');
    if (mv) {
        catMoveImg(mv.dataset.prefix, mv.dataset.file, parseInt(mv.dataset.dir));
        return;
    }
    const mvCat = e.target.closest('.cat-mover-btn');
    if (mvCat) {
        catMoverModal(mvCat.dataset.key, mvCat.dataset.file, mvCat.dataset.base);
        return;
    }
    const gestionarBtn = e.target.closest('#btn-gestionar-cat');
    if (gestionarBtn) {
        e.preventDefault();
        openCatMgr();
        return;
    }
    const coverBtn = e.target.closest('.cat-cover-btn');
    if (coverBtn) {
        const key = coverBtn.dataset.key;
        const file = coverBtn.dataset.file;
        const parts = key.split('||');
        const secName = parts[0];
        const subName = parts[1];
        let meta = catMeta[secName] || {};
        let wasSet = false;
        if (subName) {
            const subs = meta.subs || {};
            const subMeta = subs[subName] || {};
            wasSet = subMeta.cover === file;
            if (wasSet) delete subMeta.cover;
            else subMeta.cover = file;
            subs[subName] = subMeta;
            meta = { ...meta, subs };
        } else {
            wasSet = meta.cover === file;
            if (wasSet) delete meta.cover;
            else meta.cover = file;
        }
        catMeta[secName] = meta;
        localStorage.setItem('dm_catalogo_secciones', JSON.stringify(catMeta));
        renderCatSecciones();
        showToast(wasSet ? '⭐ Foto de referencia quitada' : '⭐ Foto de referencia asignada');
        return;
    }
    const acc = e.target.closest('.cat-accept-btn');
    if (acc) {
        saveCatSeccion(acc.dataset.prefix, acc.dataset.key);
        showToast('Cambios guardados');
    }
});

// Cat manager modal events
document.getElementById('cat-mgr-bg')?.addEventListener('click', () => { document.getElementById('cat-mgr-modal').style.display = 'none'; });
document.getElementById('cat-mgr-close')?.addEventListener('click', () => { document.getElementById('cat-mgr-modal').style.display = 'none'; });
document.getElementById('cat-mgr-cancel')?.addEventListener('click', () => { document.getElementById('cat-mgr-modal').style.display = 'none'; });
document.getElementById('cat-mgr-save')?.addEventListener('click', saveCatMgr);

// Mover modal events
document.getElementById('cat-mover-bg')?.addEventListener('click', () => { document.getElementById('cat-mover-modal').style.display = 'none'; });
document.getElementById('cat-mover-close')?.addEventListener('click', () => { document.getElementById('cat-mover-modal').style.display = 'none'; });
document.getElementById('cat-mover-cancel')?.addEventListener('click', () => { document.getElementById('cat-mover-modal').style.display = 'none'; });
document.getElementById('cat-mover-confirm')?.addEventListener('click', execMoverImagen);
document.getElementById('cat-mover-select-cat')?.addEventListener('change', function() { fillMoverSubs(this.value); });

$('alm-unidad').addEventListener('change', () => { $('alm-unidad-label').textContent = $('alm-unidad').value; calcUnitario(); });
$('alm-costo').addEventListener('input', calcUnitario);
$('alm-cantidad').addEventListener('input', calcUnitario);
$('alm-moneda').addEventListener('change', calcUnitario);
function calcUnitario() {
    const c = parseFloat($('alm-costo').value) || 0;
    const q = parseFloat($('alm-cantidad').value) || 0;
    const moneda = $('alm-moneda').value;
    if (!q) { $('alm-unitario').value = '—'; return; }
    if (moneda === 'Bs') {
        const tc = tasa();
        if (tc) {
            const usd = c / tc;
            $('alm-unitario').value = 'Bs '+usaUni(c/q)+'/$'+usaUni(usd/q)+' / '+$('alm-unidad').value;
        } else {
            $('alm-unitario').value = 'Bs '+usaUni(c/q)+' / '+$('alm-unidad').value+' (definí tasa)';
        }
    } else {
        $('alm-unitario').value = '$' + usaUni(c / q) + ' / ' + $('alm-unidad').value;
    }
}
function renderAlmacen() {
    let all = ls('almacen');
    const tb = $('alm-tbody');
    if (!all.length) {
        initDB();
        all = ls('almacen');
        if (!all.length) { tb.innerHTML = '<tr><td colspan="6" class="empty-msg">Sin insumos registrados.</td></tr>'; cargarInsumosRecetas(); return; }
    }
    const q = ($('alm-buscar')?.value || '').toLowerCase().trim();
    const d = q ? all.map((i,idx) => ({ ...i, _idx: idx })).filter(i => i.nombre.toLowerCase().includes(q)) : all.map((i,idx) => ({ ...i, _idx: idx }));
    const t = d.reduce((s,i) => s + i.costo, 0);
    $('alm-stats').innerHTML = '<div class="stat-item"><div class="stat-num">'+d.length+'</div><div class="stat-label">Insumos</div></div><div class="stat-item"><div class="stat-num">$'+usa(t)+'</div><div class="stat-label">Total invertido</div></div><div class="stat-item"><div class="stat-num">Bs '+bs(t).replace('.',',')+'</div><div class="stat-label">En bolívares</div></div>';
    tb.innerHTML = d.map((i) => {
        const idx = i._idx;
        const uni = i.cantidad ? '$'+usaUni(i.costo/i.cantidad)+'/'+i.unidad : '—';
        const costoLabel = '$'+usa(i.costo);
        return '<tr data-idx="'+idx+'"><td>'+i.nombre+'</td><td>'+i.unidad+'</td><td>'+uni+'</td><td>'+i.cantidad+'</td><td>'+costoLabel+'</td><td class="actions"><button class="btn btn-sm btn-outline" onclick="inlineEditAlmacen('+idx+')">Editar</button><button class="btn btn-sm btn-danger" onclick="rmAlmacen('+idx+')">X</button></td></tr>';
    }).join('');
    cargarInsumosRecetas();
}
function saveAlmacen(d) { ls('almacen', d); renderAlmacen(); recalcCostosRecetas(); }
function recalcCostosRecetas() {
    const d = ls('almacen');
    const r = ls('recetas');
    if (!d.length || !r.length) return;
    let changed = false;
    r.forEach(rec => {
        if (!rec.ingredientes) return;
        rec.ingredientes.forEach(ing => {
            const ins = d.find(i => i.nombre === ing.nombre);
            if (!ins || !ins.cantidad) return;
            const n = (recNorm||{})[ins.unidad] || { f: 1, u: ins.unidad };
            const pu = (ins.costo / ins.cantidad) / n.f;
            const newCosto = pu * ing.cantidad;
            if (Math.abs(ing.costo - newCosto) > 0.0001) {
                ing.costo = newCosto;
                changed = true;
            }
        });
    });
    if (changed) {
        ls('recetas', r);
        recargarRecetasGuardadas();
        recalcProd();
    }
}
function rmAlmacen(i) { if (confirm('¿Eliminar este insumo?')) { const d = ls('almacen'); d.splice(i,1); saveAlmacen(d); } }
function inlineEditAlmacen(idx) {
    const d = ls('almacen');
    const item = d[idx];
    if (!item) return;
    const tb = $('alm-tbody');
    const tr = tb.querySelector('tr[data-idx="'+idx+'"]');
    if (!tr) return;
    const opts = ['kg','g','l','ml','unidad','docena','paquete','m'];
    const m = item.moneda === 'Bs' ? 'Bs' : 'USD';
    const costoVal = item.moneda === 'Bs' && item.costoOriginal ? item.costoOriginal : item.costo;
    tr.innerHTML =
        '<td><input type="text" class="ie-nombre" value="'+item.nombre.replace(/"/g,'&quot;')+'" style="width:100%"></td>'+
        '<td><select class="ie-unidad">'+opts.map(o => '<option value="'+o+'"'+(item.unidad===o?' selected':'')+'>'+o+'</option>').join('')+'</select></td>'+
        '<td style="font-size:0.72rem;color:var(--text2)">$'+usaUni(item.costo/item.cantidad)+'/'+item.unidad+'</td>'+
        '<td><input type="number" class="ie-cantidad" value="'+item.cantidad+'" step="0.01" min="0" style="width:80px"></td>'+
        '<td><div style="display:flex;gap:0.2rem"><select class="ie-moneda" style="width:55px;padding:0.25rem;font-size:0.65rem">'+
            '<option value="USD"'+(m==='USD'?' selected':'')+'>$</option>'+
            '<option value="Bs"'+(m==='Bs'?' selected':'')+'>Bs</option>'+
        '</select><input type="number" class="ie-costo" value="'+costoVal+'" step="0.01" min="0" style="width:70px"></div></td>'+
        '<td class="actions"><button class="btn btn-sm btn-success" onclick="saveInlineAlmacen('+idx+')">Guardar</button><button class="btn btn-sm btn-outline" onclick="renderAlmacen()">Cancelar</button></td>';
}
function saveInlineAlmacen(idx) {
    const d = ls('almacen');
    const tr = $('alm-tbody').querySelector('tr[data-idx="'+idx+'"]');
    if (!tr) return;
    const nombre = tr.querySelector('.ie-nombre')?.value?.trim();
    const unidad = tr.querySelector('.ie-unidad')?.value;
    const cantidad = parseFloat(tr.querySelector('.ie-cantidad')?.value);
    const moneda = tr.querySelector('.ie-moneda')?.value || 'USD';
    let costo = parseFloat(tr.querySelector('.ie-costo')?.value);
    if (!nombre || isNaN(cantidad) || isNaN(costo) || cantidad <= 0) {
        showToast('Completa todos los campos');
        return;
    }
    let costoOriginal = null;
    if (moneda === 'Bs') {
        const tc = tasa();
        if (!tc) { showToast('Definí la tasa BCV primero'); return; }
        costoOriginal = costo;
        costo = costo / tc;
    }
    d[idx] = { nombre, unidad, costo, costoOriginal, cantidad, moneda };
    saveAlmacen(d);
    showToast('Insumo actualizado');
}
$('alm-cancel').addEventListener('click', () => { $('form-almacen').reset(); });
$('alm-buscar').addEventListener('input', () => renderAlmacen());
$('form-almacen').addEventListener('submit', e => {
    e.preventDefault();
    const d = ls('almacen');
    const moneda = $('alm-moneda').value;
    let costo = parseFloat($('alm-costo').value);
    const cantidad = parseFloat($('alm-cantidad').value);
    if (isNaN(costo) || isNaN(cantidad) || cantidad <= 0) { showToast('Completa todos los campos'); return; }
    let costoOriginal = null;
    if (moneda === 'Bs') {
        const tc = tasa();
        if (!tc) { showToast('Definí la tasa BCV primero'); return; }
        costoOriginal = costo;
        costo = costo / tc;
    }
    const item = { nombre: $('alm-nombre').value.trim(), unidad: $('alm-unidad').value, costo, costoOriginal, cantidad, moneda };
    d.push(item);
    saveAlmacen(d);
    $('form-almacen').reset();
    showToast('Insumo guardado');
});

$('alm-export').addEventListener('click', () => {
    const d = ls('almacen');
    if (!d.length) { showToast('No hay insumos'); return; }
    const blob = new Blob([JSON.stringify(d, null, 4)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'almacen_dulcemora_' + today() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(d.length + ' insumos exportados');
});

$('alm-import-btn').addEventListener('click', () => $('alm-import-file').click());

$('alm-import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (!Array.isArray(data)) { showToast('Archivo inválido'); return; }
            ls('almacen', data);
            renderAlmacen();
            cargarInsumosRecetas();
            showToast(data.length + ' insumos importados');
        } catch (err) {
            showToast('Error: archivo inválido');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

let receta = [];
const recNorm = { kg: { f: 1000, u: 'g' }, l: { f: 1000, u: 'ml' } };

function cargarInsumosRecetas() {
    const d = ls('almacen');
    const sug = $('rec-sug');
    if (sug) sug.innerHTML = '';
}

function posSug() {
    const input = $('rec-buscar');
    const sug = $('rec-sug');
    if (!input || !sug) return;
    const r = input.getBoundingClientRect();
    sug.style.left = r.left + 'px';
    sug.style.top = r.bottom + 'px';
    sug.style.width = r.width + 'px';
}

$('rec-buscar').addEventListener('input', function() {
    const q = this.value.toLowerCase().trim();
    const sug = $('rec-sug');
    const d = ls('almacen');
    if (!q || !d.length) { sug.style.display = 'none'; return; }
    const filtered = d.map((i, idx) => ({ ...i, idx })).filter(i => i.nombre.toLowerCase().includes(q));
    sug.innerHTML = filtered.map(i => {
        const n = recNorm[i.unidad] || { f: 1, u: i.unidad };
        const pu = i.cantidad ? (i.costo / i.cantidad) / n.f : 0;
        return '<div class="rec-sug-item" data-idx="'+i.idx+'"><span>'+i.nombre+'</span><span class="sug-price">$'+usaUni(pu)+'/'+n.u+'</span></div>';
    }).join('');
    posSug();
    sug.style.display = filtered.length ? 'block' : 'none';
});

$('rec-buscar').addEventListener('focus', function() {
    if ($('rec-sug').children.length) { posSug(); $('rec-sug').style.display = 'block'; }
});

window.addEventListener('scroll', function() {
    if ($('rec-sug').style.display === 'block') posSug();
}, true);

$('rec-sug').addEventListener('click', function(e) {
    const item = e.target.closest('.rec-sug-item');
    if (!item) return;
    const idx = parseInt(item.dataset.idx);
    const d = ls('almacen');
    if (idx >= 0 && idx < d.length) {
        $('rec-buscar').value = d[idx].nombre;
        $('rec-insumo-idx').value = idx;
        this.style.display = 'none';
        const n = recNorm[d[idx].unidad] || { f: 1, u: d[idx].unidad };
        $('rec-unidad-label').textContent = n.u;
    }
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('#rec-buscar') && !e.target.closest('#rec-sug')) {
        const sug = $('rec-sug');
        if (sug) sug.style.display = 'none';
    }
});

function renderReceta() {
    const l = $('rec-lista');
    const t = receta.reduce((s,r) => s + r.costo, 0);
    if (!receta.length) { l.innerHTML = '<p class="empty-msg">Agregá ingredientes desde arriba.</p>'; } else {
        l.innerHTML = receta.map((r,i) => {
            if (r._edit) {
                return '<div class="calc-row edit-mode" data-idx="'+i+'">'+
                    '<span>'+r.nombre+'</span>'+
                    '<span class="edit-qty-wrap"><input type="number" class="rec-edit-qty" value="'+r.cantidad+'" step="0.01" min="0"></span>'+
                    '<span class="rec-edit-cost">$'+usa(r.costo)+'</span>'+
                    '<span class="calc-actions"><button class="btn btn-sm btn-success rec-edit-save" data-idx="'+i+'">✓</button>'+
                    '<button class="btn btn-sm btn-outline rec-edit-cancel" data-idx="'+i+'">✗</button></span></div>';
            }
            return '<div class="calc-row" data-idx="'+i+'">'+
                '<span>'+r.nombre+'</span><span>'+r.cantidad+' '+r.unidad+'</span><span>$'+usa(r.costo)+'</span>'+
                '<span class="calc-actions"><button class="btn btn-sm btn-outline rec-edit-btn" data-idx="'+i+'">Editar</button>'+
                '<button class="btn btn-sm btn-danger" onclick="rmReceta('+i+')">X</button></span></div>';
        }).join('');
    }
    $('rec-total').innerHTML = 'Total: $'+usa(t)+' <span class="bs">— Bs '+bs(t).replace('.',',')+'</span>';
}

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.rec-edit-btn');
    if (btn) {
        const idx = parseInt(btn.dataset.idx);
        receta[idx]._edit = true;
        renderReceta();
        return;
    }
    const saveBtn = e.target.closest('.rec-edit-save');
    if (saveBtn) {
        const idx = parseInt(saveBtn.dataset.idx);
        const row = saveBtn.closest('.calc-row');
        const qty = parseFloat(row.querySelector('.rec-edit-qty').value);
        if (!qty || qty <= 0) { showToast('Cantidad inválida'); return; }
        const r = receta[idx];
        r.costo = (r.costo / r.cantidad) * qty;
        r.cantidad = qty;
        delete r._edit;
        renderReceta();
        return;
    }
    const cancelBtn = e.target.closest('.rec-edit-cancel');
    if (cancelBtn) {
        const idx = parseInt(cancelBtn.dataset.idx);
        delete receta[idx]._edit;
        renderReceta();
    }
});

function rmReceta(i) { receta.splice(i,1); renderReceta(); }

function recargarRecetasGuardadas() {
    const r = ls('recetas');
    const sel = $('rec-cargar');
    sel.innerHTML = '<option value="">Cargar receta...</option>' + r.map((re, i) => '<option value="'+i+'">'+re.nombre+'</option>').join('');
    cargarProdRecetas();
}

$('form-receta').addEventListener('submit', e => {
    e.preventDefault();
    const idx = parseInt($('rec-insumo-idx').value);
    const cant = parseFloat($('rec-cantidad').value);
    if (isNaN(idx) || idx < 0) { showToast('Seleccioná un insumo'); return; }
    if (!cant || cant <= 0) { showToast('Ingresá una cantidad'); return; }
    const d = ls('almacen');
    if (idx >= d.length) { showToast('Insumo no encontrado'); return; }
    const ins = d[idx];
    const n = recNorm[ins.unidad] || { f: 1, u: ins.unidad };
    const pu = ins.cantidad ? (ins.costo / ins.cantidad) / n.f : 0;
    const exist = receta.findIndex(r => r.nombre === ins.nombre && r.unidad === n.u);
    if (exist >= 0) {
        receta[exist].cantidad += cant;
        receta[exist].costo += pu * cant;
    } else {
        receta.push({ nombre: ins.nombre, unidad: n.u, cantidad: cant, costo: pu * cant });
    }
    renderReceta();
    $('rec-cantidad').value = '';
    $('rec-buscar').value = '';
    $('rec-insumo-idx').value = '';
});

$('rec-limpiar').addEventListener('click', () => { if (receta.length && confirm('¿Limpiar receta?')) { receta = []; renderReceta(); } });
$('rec-guardar').addEventListener('click', () => {
    const nombre = $('rec-nombre').value.trim();
    if (!nombre) { showToast('Escribí un nombre para la receta'); return; }
    if (!receta.length) { showToast('Agregá ingredientes primero'); return; }
    const r = ls('recetas');
    const exist = r.findIndex(x => x.nombre.toLowerCase() === nombre.toLowerCase());
    const data = { nombre, ingredientes: JSON.parse(JSON.stringify(receta)).map(r => { delete r._edit; return r; }) };
    if (exist >= 0) {
        if (!confirm('Ya existe "'+nombre+'". ¿Reemplazarla?')) return;
        r[exist] = data;
    } else {
        r.push(data);
    }
    ls('recetas', r);
    recargarRecetasGuardadas();
    showToast('Receta guardada');
});
$('rec-cargar').addEventListener('change', () => {
    const sel = $('rec-cargar');
    const idx = parseInt(sel.value);
    if (isNaN(idx)) return;
    const r = ls('recetas');
    if (idx < 0 || idx >= r.length) return;
    if (receta.length && !confirm('¿Cargar receta? Se perderán los ingredientes actuales.')) { sel.value = ''; return; }
    receta = JSON.parse(JSON.stringify(r[idx].ingredientes)).map(r => { delete r._edit; return r; });
    $('rec-nombre').value = r[idx].nombre;
    renderReceta();
    sel.value = '';
    showToast('Receta cargada');
});

$('rec-export').addEventListener('click', () => {
    const r = ls('recetas');
    if (!r.length) { showToast('No hay recetas guardadas'); return; }
    const blob = new Blob([JSON.stringify(r, null, 4)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'recetas_dulcemora_' + today() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(r.length + ' recetas exportadas');
});

$('rec-import-btn').addEventListener('click', () => $('rec-import-file').click());

$('rec-import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (!Array.isArray(data)) { showToast('Archivo inválido'); return; }
            const existentes = ls('recetas');
            const todas = [...existentes, ...data];
            ls('recetas', todas);
            recargarRecetasGuardadas();
            showToast(data.length + ' recetas importadas');
        } catch (err) {
            showToast('Error: archivo inválido');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

/* ===== PRODUCTION CALCULATOR ===== */
let prodItems = [];

function cargarProdRecetas() {
    const r = ls('recetas');
    const sel = $('prod-receta');
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar...</option>' + r.map((re, i) => '<option value="'+i+'">'+re.nombre+'</option>').join('');
}

function renderProd() {
    const lista = $('prod-lista');
    const detalle = $('prod-detalle');
    const totalEl = $('prod-total');
    if (!prodItems.length) {
        lista.innerHTML = '<p class="empty-msg" style="margin:0">Agregá recetas para calcular.</p>';
        detalle.innerHTML = '';
        totalEl.innerHTML = '';
        return;
    }
    lista.innerHTML = prodItems.map((p, i) =>
        '<div class="calc-row" style="grid-template-columns:1fr 60px 80px 100px;margin-bottom:0.25rem">'+
            '<span>'+p.nombre+'</span>'+
            '<span>×'+p.cantidad+'</span>'+
            '<span>$'+usa(p.subtotal)+'</span>'+
            '<span class="calc-actions"><button class="btn btn-sm btn-outline prod-rec-edit" data-idx="'+i+'">Editar</button>'+
            '<button class="btn btn-sm btn-danger" onclick="prodRm('+i+')">X</button></span></div>'
    ).join('');

    // Merge ingredients across all selected recipes
    const merged = {};
    const r = ls('recetas');
    prodItems.forEach(p => {
        const rec = r[p.recetaIdx];
        if (!rec) return;
        rec.ingredientes.forEach(ing => {
            const key = ing.nombre + '|' + ing.unidad;
            if (!merged[key]) merged[key] = { nombre: ing.nombre, unidad: ing.unidad, cantidad: 0, costo: 0 };
            merged[key].cantidad += ing.cantidad * p.cantidad;
            merged[key].costo += ing.costo * p.cantidad;
        });
    });

    const total = Object.values(merged).reduce((s, ing) => s + ing.costo, 0);
    detalle.innerHTML = Object.values(merged).map(ing =>
        '<div class="calc-row" style="grid-template-columns:1fr 100px 100px;margin-bottom:0.15rem;font-size:0.78rem">'+
            '<span>'+ing.nombre+'</span>'+
            '<span>'+redondear(ing.cantidad)+' '+ing.unidad+'</span>'+
            '<span>$'+usa(ing.costo)+'</span></div>'
    ).join('');
    totalEl.innerHTML = 'Total producción: $'+usa(total)+' <span class="bs">— Bs '+bs(total).replace('.',',')+'</span>';
}

function prodRm(i) { prodItems.splice(i,1); recalcProd(); }
function prodCalcSubtotal(recetaIdx, cantidad) {
    const r = ls('recetas');
    const rec = r[recetaIdx];
    if (!rec) return 0;
    return rec.ingredientes.reduce((s, ing) => s + ing.costo * cantidad, 0);
}
function recalcProd() {
    prodItems.forEach(p => p.subtotal = prodCalcSubtotal(p.recetaIdx, p.cantidad));
    renderProd();
}

$('prod-agregar').addEventListener('click', () => {
    const recetaIdx = parseInt($('prod-receta').value);
    const cantidad = parseInt($('prod-cantidad').value);
    if (isNaN(recetaIdx) || recetaIdx < 0) { showToast('Seleccioná una receta'); return; }
    if (!cantidad || cantidad < 1) { showToast('Cantidad inválida'); return; }
    const r = ls('recetas');
    if (recetaIdx >= r.length) { showToast('Receta no encontrada'); return; }
    const subtotal = prodCalcSubtotal(recetaIdx, cantidad);
    prodItems.push({ recetaIdx, nombre: r[recetaIdx].nombre, cantidad, subtotal });
    recalcProd();
    $('prod-receta').value = '';
    $('prod-cantidad').value = '1';
});

$('prod-limpiar').addEventListener('click', () => { if (prodItems.length && confirm('¿Limpiar todos los items?')) { prodItems = []; renderProd(); } });

document.addEventListener('click', function(e) {
    const editBtn = e.target.closest('.prod-rec-edit');
    if (!editBtn) return;
    const idx = parseInt(editBtn.dataset.idx);
    const item = prodItems[idx];
    if (!item) return;
    const newQty = prompt('Nueva cantidad para "'+item.nombre+'":', item.cantidad);
    if (newQty === null) return;
    const qty = parseInt(newQty);
    if (!qty || qty < 1) { showToast('Cantidad inválida'); return; }
    item.cantidad = qty;
    recalcProd();
});

function renderPedidos() {
    const d = ls('pedidos');
    const tb = $('ped-tbody');
    const t = d.reduce((s,p) => s + p.total, 0);
    const a = d.reduce((s,p) => s + (p.abono||0), 0);
    const r = t - a;
    const pn = d.filter(p => p.estado !== 'cancelado' && (p.abono||0) < p.total).length;
    const pe = d.filter(p => p.entregado).length;
    const ppe = d.filter(p => !p.entregado && p.estado !== 'cancelado').length;
    $('ped-stats').innerHTML =
        '<div class="stat-item"><div class="stat-num">'+d.length+'</div><div class="stat-label">Total pedidos</div></div>' +
        '<div class="stat-item"><div class="stat-num">'+pn+'</div><div class="stat-label">Pendiente pago</div></div>' +
        '<div class="stat-item"><div class="stat-num">'+ppe+'</div><div class="stat-label">Pendiente entregar</div></div>' +
        '<div class="stat-item"><div class="stat-num">'+pe+'</div><div class="stat-label">Entregados</div></div>' +
        '<div class="stat-item"><div class="stat-num">$'+usa(t)+'</div><div class="stat-label">Total $ (suma de todos)</div></div>' +
        '<div class="stat-item"><div class="stat-num">$'+usa(a)+'</div><div class="stat-label">Abonado $ (pagado)</div></div>' +
        '<div class="stat-item"><div class="stat-num" style="color:'+(r>0?'var(--green)':'var(--text2)')+'">$'+usa(r)+'</div><div class="stat-label">Por cobrar $ (saldo)</div></div>';
    if (!d.length) { tb.innerHTML = '<tr><td colspan="10" class="empty-msg">Sin pedidos registrados.</td></tr>'; return; }

    const q = ($('ped-buscar')||{}).value || '';
    const filtrados = d.filter(p =>
        !q || p.cliente.toLowerCase().includes(q.toLowerCase()) || p.producto.toLowerCase().includes(q.toLowerCase())
    );
    // Split: pendientes (no entregados, no cancelados) primero, luego el resto
    const pendientes = filtrados.filter(p => !p.entregado && p.estado !== 'cancelado');
    const resto = filtrados.filter(p => p.entregado || p.estado === 'cancelado');
    pendientes.sort((a, b) => (a.fecha||'').localeCompare(b.fecha||'')); // más urgente primero
    resto.sort((a, b) => (b.fecha||'').localeCompare(a.fecha||'')); // más reciente primero
    const indices = [...pendientes, ...resto].map(p => d.indexOf(p));
    const bg = { pendiente:'badge-pendiente', pagado:'badge-completado', cancelado:'badge-cancelado' };
    function estBadge(p) {
        const e = (p.abono||0) >= p.total ? 'pagado' : p.estado;
        return '<span class="badge '+(bg[e]||'')+'">'+e+'</span>';
    }
    tb.innerHTML = indices.map(i => {
        const p = d[i];
        const restante = p.total - (p.abono||0);
        const filaClass = p.entregado ? ' class="ped-fila-entregado"' : '';
        return '<tr'+filaClass+'>' +
            '<td>'+p.cliente+'</td>' +
            '<td>'+p.producto+'</td>' +
            '<td>$'+usa(p.total)+'</td>' +
            '<td>'+(p.abono ? '$'+usa(p.abono) : '')+'</td>' +
            '<td style="font-weight:'+(restante>0?'500':'400')+';color:'+(restante>0?'var(--accent)':'var(--text2)')+'">'+(restante>0?'$'+usa(restante):'—')+'</td>' +
            '<td>'+estBadge(p)+'</td>' +
            '<td style="text-align:center"><input type="checkbox" class="ped-chk-entrega" data-idx="'+i+'"'+(p.entregado?' checked':'')+' title="Marcar entregado"></td>' +
            '<td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.72rem;color:var(--text2)" title="'+(p.notas||'')+'">'+(p.notas||'')+'</td>' +
            '<td>'+(p.fecha ? p.fecha.split('-').reverse().join('/') : '')+'</td>' +
            '<td class="actions"><button class="btn btn-sm btn-outline" onclick="editPedido('+i+')">Editar</button><button class="btn btn-sm btn-danger" onclick="rmPedido('+i+')">X</button></td>' +
            '</tr>';
    }).join('');
    document.querySelectorAll('.ped-chk-entrega').forEach(cb => {
        cb.addEventListener('change', function() {
            const d = ls('pedidos');
            const idx = parseInt(this.dataset.idx);
            if (d[idx]) { d[idx].entregado = this.checked; ls('pedidos', d); renderPedidos(); }
        });
    });
}
function savePedidos(d) { ls('pedidos', d); renderPedidos(); }
function rmPedido(i) { if (confirm('¿Eliminar pedido?')) { const d = ls('pedidos'); d.splice(i,1); savePedidos(d); } }
function editPedido(i) {
    const d = ls('pedidos'); const p = d[i];
    $('ped-cliente').value = p.cliente; $('ped-producto').value = p.producto;
    $('ped-total').value = p.total;
    $('ped-total-bs').value = p.total_bs || 0;
    $('ped-estado').value = p.estado === 'pagado' ? 'pendiente' : p.estado; $('ped-fecha').value = p.fecha || '';
    $('ped-abono').value = p.abono || 0;
    $('ped-entregado').checked = !!p.entregado;
    $('ped-notas').value = p.notas || '';
    $('ped-metodo').value = p.metodo_pago || '';
    $('ped-edit-id').value = i; $('ped-cancel').classList.remove('hidden');
    $('ped-submit').textContent = 'Actualizar';
    calcPendiente();
    $('form-pedido').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function calcPendiente() {
    const t = parseFloat($('ped-total').value) || 0;
    const a = parseFloat($('ped-abono').value) || 0;
    $('ped-pendiente').value = '$' + usa(t - a);
}
$('ped-cancel').addEventListener('click', () => { $('form-pedido').reset(); $('ped-edit-id').value = ''; $('ped-cancel').classList.add('hidden'); $('ped-submit').textContent = 'Guardar'; $('ped-fecha').value = today(); $('ped-entregado').checked = false; $('ped-abono').value = 0; $('ped-notas').value = ''; $('ped-metodo').value = ''; $('ped-total-bs').value = 0; calcPendiente(); });
$('ped-total').addEventListener('input', calcPendiente);
$('ped-abono').addEventListener('input', calcPendiente);
$('ped-total-bs').addEventListener('input', () => {
    const bs = parseFloat($('ped-total-bs').value) || 0;
    const t = tasa();
    if (bs > 0 && t > 0) $('ped-total').value = (bs / t).toFixed(2);
    calcPendiente();
});
$('ped-buscar').addEventListener('input', renderPedidos);

$('form-pedido').addEventListener('submit', e => {
    e.preventDefault();
    const d = ls('pedidos'); const idx = $('ped-edit-id').value;
    const totalUSD = parseFloat($('ped-total').value) || 0;
    const totalBs = parseFloat($('ped-total-bs').value) || 0;
    const abono = parseFloat($('ped-abono').value) || 0;
    const item = {
        cliente: $('ped-cliente').value.trim() || 'Desconocido',
        producto: $('ped-producto').value.trim(),
        total: totalUSD,
        total_bs: totalBs,
        abono: abono,
        estado: abono >= totalUSD ? 'pagado' : $('ped-estado').value,
        metodo_pago: $('ped-metodo').value,
        entregado: $('ped-entregado').checked,
        notas: $('ped-notas').value.trim(),
        fecha: $('ped-fecha').value || today()
    };
    if (idx !== '') d[parseInt(idx)] = item; else d.push(item);
    savePedidos(d); $('form-pedido').reset(); $('ped-edit-id').value = ''; $('ped-cancel').classList.add('hidden'); $('ped-submit').textContent = 'Guardar'; $('ped-fecha').value = today(); $('ped-entregado').checked = false; $('ped-abono').value = 0; $('ped-notas').value = ''; $('ped-metodo').value = ''; $('ped-total-bs').value = 0; calcPendiente();
    showToast(idx !== '' ? 'Pedido actualizado' : 'Pedido guardado');
});
$('ped-import').addEventListener('click', () => {
    if (!confirm('Esto reemplazará todos los pedidos actuales con los datos del Excel. ¿Continuar?')) return;
    fetch('/pedidos_import.json').then(r => r.json()).then(data => {
        ls('pedidos', data);
        renderPedidos();
        showToast(data.length + ' pedidos importados');
    }).catch(() => showToast('Error al importar'));
});

$('ped-export').addEventListener('click', () => {
    const d = ls('pedidos');
    if (!d.length) { showToast('No hay pedidos'); return; }
    const h = 'Cliente,Producto,Total USD,Total Bs,Abono USD,Restante USD,Estado,Método Pago,Entregado,Notas,Fecha';
    const r = d.map(p => {
        const restante = p.total - (p.abono||0);
        return '"'+(p.cliente||'')+'","'+(p.producto||'')+'",'+(p.total||0)+','+(p.total_bs||0)+','+(p.abono||0)+','+restante+',"'+p.estado+'","'+(p.metodo_pago||'')+'","'+(p.entregado?'Sí':'No')+'","'+(p.notas||'')+'","'+(p.fecha||'')+'"';
    }).join('\n');
    const csv = '\uFEFF' + h + '\n' + r;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'})); a.download = 'pedidos_'+today()+'.csv'; a.click();
    showToast('CSV exportado');
});

const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const meses = { 'ene':1,'feb':2,'mar':3,'abr':4,'may':5,'jun':6,'jul':7,'ago':8,'sep':9,'oct':10,'nov':11,'dic':12 };
function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    return diasSemana[fecha.getDay()] + ' ' + d.toString().padStart(2,'0') + '/' + m.toString().padStart(2,'0') + '/' + y;
}
function sortSemana(a, b) {
    const [_, da, ma] = a.match(/Sem (\d+)-(\w+)/) || [];
    const [__, db, mb] = b.match(/Sem (\d+)-(\w+)/) || [];
    return (meses[ma] || 0) * 100 + parseInt(da) - ((meses[mb] || 0) * 100 + parseInt(db));
}
function calcSemana(fechaStr) {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const diaSem = fecha.getDay();
    const diff = diaSem === 0 ? -6 : 1 - diaSem;
    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() + diff);
    const mesesInv = {1:'ene',2:'feb',3:'mar',4:'abr',5:'may',6:'jun',7:'jul',8:'ago',9:'sep',10:'oct',11:'nov',12:'dic'};
    return 'Sem ' + lunes.getDate() + '-' + mesesInv[lunes.getMonth() + 1];
}

let gasSemanaActiva = 'todas';
let gasDiaActivo = null;
let gasCatActiva = 'todas';
let gasSortBy = 'fecha_desc';
let ultimaFechaGasto = today();
let ultimaMonedaGasto = 'Bs';
let gasCatExpand = null;

function renderGastos() {
    const d = ls('gastos');
    const tr = tasa();
    let reparados = 0;
    d.forEach(g => {
        if (g.moneda === 'Bs' && g.montoOriginal > 0 && Math.abs(g.monto - g.montoOriginal) < 0.001 && tr > 0) {
            g.monto = g.montoOriginal / tr;
            reparados++;
        }
        if (!g.semana && g.fecha) {
            g.semana = calcSemana(g.fecha);
            reparados++;
        }
    });
    if (reparados) { ls('gastos', d); }
    const semanas = [...new Set(d.map(g => g.semana).filter(Boolean))].sort(sortSemana);

    if (gasSemanaActiva !== '_sinsem' && (gasSemanaActiva === 'todas' || !semanas.includes(gasSemanaActiva))) {
        gasSemanaActiva = semanas.length ? semanas[semanas.length - 1] : 'todas';
        gasDiaActivo = null;
    }

    const filtrados = d.filter(g => {
        if (gasSemanaActiva !== 'todas') {
            if (gasSemanaActiva === '_sinsem' && g.semana) return false;
            if (gasSemanaActiva !== '_sinsem' && g.semana !== gasSemanaActiva) return false;
        }
        if (gasDiaActivo !== null && g.fecha !== gasDiaActivo) return false;
        if (gasCatActiva !== 'todas' && g.categoria !== gasCatActiva) return false;
        return true;
    });

    const tGral = d.reduce((s, g) => s + g.monto, 0);
    const catGral = {};
    d.forEach(g => { catGral[g.categoria] = (catGral[g.categoria]||0) + g.monto; });

    const t = filtrados.reduce((s, g) => s + g.monto, 0);
    const cat = {};
    filtrados.forEach(g => { cat[g.categoria] = (cat[g.categoria]||0) + g.monto; });

    let statHtml = '';
    const tasaDia = gasDiaActivo ? tasaFecha(gasDiaActivo) : tasa();
    if (gasDiaActivo || (gasSemanaActiva !== 'todas')) {
        const label = gasDiaActivo ? formatearFecha(gasDiaActivo) : gasSemanaActiva;
        statHtml += '<div class="stat-item"><div class="stat-num">'+filtrados.length+'</div><div class="stat-label">'+label+'</div></div>';
        statHtml += '<div class="stat-item"><div class="stat-num">$'+usa(t)+'</div><div class="stat-label">Total USD</div></div>';
        statHtml += '<div class="stat-item"><div class="stat-num">Bs '+bs(t).replace('.',',')+'</div><div class="stat-label">En bolívares</div></div>';
        statHtml += '<div class="stat-item"><div class="stat-num" style="font-size:0.85rem">'+tasaDia.toFixed(2)+'</div><div class="stat-label">Tasa BCV</div></div>';
    }
    if (!gasDiaActivo) {
        statHtml += '<div class="stat-item" style="opacity:0.6"><div class="stat-num" style="font-size:0.9rem">$'+usa(tGral)+'</div><div class="stat-label">Total general</div></div>';
    }
    $('gas-stats').innerHTML = statHtml;

    const cats = ['Inversión','Hogar','Esparcimiento'];
    const colores = {'Inversión':'var(--accent)','Hogar':'var(--green)','Esparcimiento':'#e67e22'};
    $('gas-cat-breakdown').innerHTML =
        cats.map(c =>
            '<span class="gas-cat-item"><span class="gas-summary-dot" style="background:'+colores[c]+'"></span>'+c+' <span class="gas-cat-monto" style="color:'+colores[c]+'">$'+usa(cat[c]||0)+'</span></span>'
        ).join('');

    let sideHtml = '';
    semanas.forEach(sem => {
        const semGastos = d.filter(g => g.semana === sem);
        const semTotal = semGastos.reduce((s,g) => s + g.monto, 0);
        const dias = [...new Set(semGastos.map(g => g.fecha).filter(Boolean))].sort();
        const activa = gasSemanaActiva === sem;
        sideHtml += '<div class="gas-week"><div class="gas-week-header'+(activa?' active':'')+'" data-sem="'+sem+'"><span>'+sem+'</span><span class="week-total">$'+usa(semTotal)+'</span></div>';
        if (activa) {
            sideHtml += '<div class="gas-week-days">';
            dias.forEach(dia => {
                const diaGastos = semGastos.filter(g => g.fecha === dia);
                const total = diaGastos.reduce((s,g) => s + g.monto, 0);
                const cats = [...new Set(diaGastos.map(g => g.categoria))];
                const act = gasDiaActivo === dia ? ' active' : '';
                sideHtml += '<button class="gas-day'+act+'" data-fecha="'+dia+'">' +
                    '<span class="day-top"><span class="day-name">'+formatearFecha(dia)+'</span><span class="day-amount">$'+usa(total)+'</span></span></button>';
            });
            const sinFecha = semGastos.filter(g => !g.fecha);
            if (sinFecha.length) {
                const totSf = sinFecha.reduce((s,g) => s + g.monto, 0);
                sideHtml += '<button class="gas-day" data-fecha=""><span class="day-top"><span class="day-name">(sin fecha)</span><span class="day-amount">$'+usa(totSf)+'</span></span></button>';
            }
            sideHtml += '</div>';
        }
        sideHtml += '</div>';
    });
    const sinSem = d.filter(g => !g.semana);
    if (sinSem.length) {
        const totS = sinSem.reduce((s,g) => s + g.monto, 0);
        sideHtml += '<div class="gas-week"><div class="gas-week-header'+(gasSemanaActiva==='_sinsem'?' active':'')+'" data-sem="_sinsem"><span>Sin semana</span><span class="week-total">$'+usa(totS)+'</span></div>';
        if (gasSemanaActiva === '_sinsem') {
            sideHtml += '<div class="gas-week-days">';
            const sinF = sinSem.filter(g => !g.fecha);
            const conF = [...new Set(sinSem.filter(g => g.fecha).map(g => g.fecha))].sort();
            conF.forEach(dia => {
                const gs = sinSem.filter(g => g.fecha === dia);
                const total = gs.reduce((s,g) => s + g.monto, 0);
                const cats = [...new Set(gs.map(g => g.categoria))];
                sideHtml += '<button class="gas-day" data-fecha="'+dia+'"><span class="day-top"><span class="day-name">'+formatearFecha(dia)+'</span><span class="day-amount">$'+usa(total)+'</span></span></button>';
            });
            if (sinF.length) {
                const totSf = sinF.reduce((s,g) => s + g.monto, 0);
                sideHtml += '<button class="gas-day" data-fecha=""><span class="day-top"><span class="day-name">(sin fecha)</span><span class="day-amount">$'+usa(totSf)+'</span></span></button>';
            }
            sideHtml += '</div>';
        }
        sideHtml += '</div>';
    }
    $('gas-sidebar').innerHTML = sideHtml;

    $('gas-sidebar').querySelectorAll('.gas-week-header').forEach(h => {
        h.addEventListener('click', () => {
            gasSemanaActiva = h.dataset.sem;
            gasDiaActivo = null;
            renderGastos();
        });
    });

    $('gas-sidebar').querySelectorAll('.gas-day').forEach(btn => {
        btn.addEventListener('click', () => {
            gasDiaActivo = btn.dataset.fecha || null;
            renderGastos();
        });
    });

    const gp = d.reduce((s,g) => s + g.monto, 0);
    const sum = document.getElementById('gas-summary');
    if (sum) {
        sum.innerHTML = '<div class="gas-summary-header">Resumen general</div>' +
            '<div class="gas-summary-item gas-summary-total"><span class="gas-summary-left">Total</span><span class="gas-summary-right" style="font-size:0.82rem">$'+usa(gp)+'</span></div>' +
            cats.map(c => {
                const v = catGral[c] || 0;
                const exp = gasCatExpand === c;
                const gastosCat = exp ? filtrados.filter(g => g.categoria === c) : [];
                return '<div class="gas-summary-item gas-summary-cat'+(exp?' gas-summary-cat-open':'')+'" data-gas-expand="'+c+'"><span class="gas-summary-left"><span class="gas-summary-dot" style="background:'+colores[c]+'"></span>'+c+'</span><span class="gas-summary-right" style="color:'+colores[c]+'">$'+usa(v)+'</span></div>' +
                    (exp ? gastosCat.map(g => {
                        const tf = g.fecha ? tasaFecha(g.fecha) : tasa();
                        return '<div class="gas-summary-detalle"><span class="gsd-desc">'+g.descripcion+'</span><span class="gsd-fecha">'+(g.fecha||'')+'</span><span class="gsd-monto">$'+usa(g.monto)+'</span></div>';
                    }).join('') : '');
            }).join('');
    }

    const tb = $('gas-tbody');
    if (!filtrados.length) {
        tb.innerHTML = '<tr><td colspan="8" class="empty-msg">Sin resultados.</td></tr>';
        return;
    }
    const cmp = (a, b) => {
        if (gasSortBy === 'fecha_desc') return (b.fecha||'').localeCompare(a.fecha||'');
        if (gasSortBy === 'fecha_asc') return (a.fecha||'').localeCompare(b.fecha||'');
        if (gasSortBy === 'monto_desc') return b.monto - a.monto;
        return a.monto - b.monto;
    };
    const sorted = [...filtrados].sort(cmp);
    const tableRows = sorted.reduce((html, g) => {
        const tf = g.fecha ? tasaFecha(g.fecha) : tasa();
        const montoLabel = '$'+usa(g.monto);
        const idx = d.indexOf(g);
        const ivaLabel = g.iva ? '$'+usa(g.iva) : '—';
        const ivaBsLabel = g.iva ? 'Bs '+(g.iva*tf).toFixed(2).replace('.',',') : '—';
        return html + '<tr><td>'+g.descripcion+'</td><td>'+montoLabel+'</td><td>Bs '+(g.monto*tf).toFixed(2).replace('.',',')+'</td><td>'+ivaLabel+'</td><td>'+ivaBsLabel+'</td><td>'+g.categoria+'</td><td>'+(g.fecha ? formatearFecha(g.fecha) : '')+'</td><td class="actions"><button class="btn btn-sm btn-outline" onclick="editGasto('+idx+')">Editar</button><button class="btn btn-sm btn-danger" onclick="rmGasto('+idx+')">X</button></td></tr>';
    }, '');
    tb.innerHTML = tableRows;
}
function saveGastos(d) { ls('gastos', d); renderGastos(); }

document.addEventListener('click', function(e) {
    const btn = e.target.closest('#gas-cat-filtros .cat-btn');
    if (btn) {
        document.querySelectorAll('#gas-cat-filtros .cat-btn').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        gasCatActiva = btn.dataset.gasCat;
        renderGastos();
    }
});
$('gas-sort').addEventListener('change', function() {
    gasSortBy = this.value;
    renderGastos();
});
document.addEventListener('click', function(e) {
    const item = e.target.closest('.gas-summary-cat');
    if (item) {
        const cat = item.dataset.gasExpand;
        gasCatExpand = gasCatExpand === cat ? null : cat;
        renderGastos();
    }
});

$('gas-export').addEventListener('click', () => {
    const d = ls('gastos');
    if (!d.length) { showToast('No hay gastos'); return; }
    const semanas = [...new Set(d.map(g => g.semana).filter(Boolean))].sort(sortSemana);
    const categorias = [...new Set(d.map(g => g.categoria))];
    let csv = '\uFEFF';
    csv += 'Resumen de Gastos - Dulce Mora\n\n';
    csv += 'Categoria;' + semanas.join(';') + ';TOTAL\n';
    categorias.forEach(cat => {
        const vals = semanas.map(sem => {
            const t = d.filter(g => g.categoria === cat && g.semana === sem).reduce((s,g) => s + g.monto, 0);
            return t ? '$' + usa(t) : '';
        });
        const total = d.filter(g => g.categoria === cat).reduce((s,g) => s + g.monto, 0);
        csv += cat + ';' + vals.join(';') + ';$' + usa(total) + '\n';
    });
    csv += 'TOTAL;' + semanas.map(sem => {
        const t = d.filter(g => g.semana === sem).reduce((s,g) => s + g.monto, 0);
        return '$' + usa(t);
    }).join(';') + ';$' + usa(d.reduce((s,g) => s + g.monto, 0)) + '\n';
    csv += '\n\n--- DETALLE ---\n\n';
    csv += 'Descripcion;Categoria;Monto USD;IVA USD;Fecha;Semana\n';
    d.forEach(g => {
        csv += '"' + g.descripcion + '";' + g.categoria + ';' + g.monto + ';' + (g.iva||0) + ';' + (g.fecha || '') + ';' + (g.semana || '') + '\n';
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'gastos_dulcemora_' + today() + '.csv';
    a.click();
    showToast('CSV exportado — abrirlo con Excel');
});
function rmGasto(i) { if (confirm('¿Eliminar gasto?')) { const d = ls('gastos'); d.splice(i,1); saveGastos(d); } }
async function fetchTasaHistorica(fecha) {
    if (!fecha) return null;
    try {
        const r = await fetch('https://tasa-bcv-api-production.up.railway.app/v1/rates/' + fecha, { signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined });
        if (!r.ok) return null;
        const d = await r.json();
        if (d && d.usd > 0) return d.usd;
        return null;
    } catch { return null; }
}

async function actualizarNotaTasa(fecha) {
    const nota = $('tasa-nota');
    const valorEl = $('tasa-nota-valor');
    if (!nota || !valorEl) return;
    if (!fecha) { nota.style.display = 'none'; return; }
    const tasas = JSON.parse(localStorage.getItem('dm_tasas')||'{}');
    let tf = tasas[fecha];
    valorEl.placeholder = 'Consultando...';
    if (!tf) {
        const apiRate = await fetchTasaHistorica(fecha);
        if (apiRate) {
            tf = apiRate;
            setTasaFecha(fecha, apiRate);
        }
    }
    nota.style.display = 'flex';
    valorEl.value = tf ? tf.toFixed(2) : '';
    valorEl.placeholder = tf ? '' : 'Ingresar tasa...';
}

$('gas-fecha').addEventListener('change', function() { actualizarNotaTasa(this.value); });

$('tasa-nota-valor').addEventListener('change', function() {
    const fecha = $('gas-fecha').value;
    if (!fecha) return;
    const v = parseFloat(this.value);
    if (v > 0) setTasaFecha(fecha, v);
});

function editGasto(i) {
    const d = ls('gastos'); const g = d[i];
    $('gas-descripcion').value = g.descripcion;
    $('gas-monto').value = g.montoOriginal || g.monto;
    setMoneda(g.moneda || 'USD');
    $('gas-categoria').value = g.categoria; $('gas-fecha').value = g.fecha || '';
    $('gas-iva').checked = g.iva && g.iva > 0;
    $('gas-edit-id').value = i; $('gas-cancel').classList.remove('hidden');
    $('gas-submit').textContent = 'Actualizar';
    $('form-gasto').scrollIntoView({ behavior: 'smooth', block: 'start' });
    actualizarPreviewIVA();
    actualizarNotaTasa(g.fecha);
}
$('gas-cancel').addEventListener('click', () => { $('form-gasto').reset(); $('gas-edit-id').value = ''; $('gas-cancel').classList.add('hidden'); $('gas-submit').textContent = 'Guardar'; $('gas-fecha').value = ultimaFechaGasto || today(); setMoneda(ultimaMonedaGasto || 'Bs'); $('gas-iva').checked = false; actualizarPreviewIVA(); actualizarNotaTasa($('gas-fecha').value); });
function calcularIVA(monto, checked, moneda, tasa) {
    const aUsd = (v) => moneda === 'Bs' && tasa > 0 ? v / tasa : v;
    const ivaOrig = checked ? monto * 0.16 : 0;
    const totalOrig = checked ? monto * 1.16 : monto;
    return {
        iva: aUsd(ivaOrig),
        ivaOriginal: ivaOrig,
        montoTotal: aUsd(totalOrig)
    };
}

function actualizarPreviewIVA() {
    const monto = parseFloat($('gas-monto').value) || 0;
    const checked = $('gas-iva').checked;
    const moneda = getMoneda();
    const tasaInput = parseFloat($('tasa-nota-valor').value);
    const fecha = $('gas-fecha').value;
    const tasa = tasaInput > 0 ? tasaInput : (fecha ? tasaFecha(fecha) : tasa());
    const info = $('gas-iva-info');
    const montoEl = $('gas-iva-monto');
    if (checked && monto > 0) {
        const res = calcularIVA(monto, checked, moneda, tasa);
        const ivaMostrar = moneda === 'Bs' ? res.ivaOriginal : res.iva;
        const label = moneda === 'Bs' ? 'Bs ' : '$ ';
        montoEl.textContent = label + ivaMostrar.toFixed(2).replace('.',',');
        info.style.display = 'inline';
    } else {
        info.style.display = 'none';
    }
}

function getMoneda() { return ($('gas-moneda').querySelector('.curr-btn.active')||{}).dataset.curr || 'USD'; }
function setMoneda(v) {
    $('gas-moneda').querySelectorAll('.curr-btn').forEach(b => b.classList.toggle('active', b.dataset.curr === v));
    actualizarPreviewIVA();
}

$('gas-iva').addEventListener('change', actualizarPreviewIVA);
$('gas-monto').addEventListener('input', actualizarPreviewIVA);
$('gas-moneda').addEventListener('click', e => {
    const btn = e.target.closest('.curr-btn');
    if (btn) { setMoneda(btn.dataset.curr); }
});

$('form-gasto').addEventListener('submit', e => {
    e.preventDefault();
    const d = ls('gastos'); const idx = $('gas-edit-id').value;
    const montoIngresado = parseFloat($('gas-monto').value);
    const moneda = getMoneda();
    const fecha = $('gas-fecha').value || today();
    const tasaInput = parseFloat($('tasa-nota-valor').value);
    const tasaFechaVal = tasaInput > 0 ? tasaInput : tasaFecha(fecha);
    const tieneIva = $('gas-iva').checked;
    if (moneda === 'Bs' && !tasaFechaVal) { showToast('Define la tasa BCV para esa fecha primero'); return; }
    const ivaCalc = calcularIVA(montoIngresado, tieneIva, moneda, tasaFechaVal);
    const item = {
        descripcion: $('gas-descripcion').value.trim(),
        monto: ivaCalc.montoTotal,
        montoOriginal: montoIngresado,
        iva: ivaCalc.iva,
        ivaOriginal: ivaCalc.ivaOriginal,
        moneda: moneda,
        categoria: $('gas-categoria').value,
        fecha: fecha
    };
    const sem = calcSemana(item.fecha);
    if (sem) item.semana = sem;
    if (idx !== '') d[parseInt(idx)] = item; else d.push(item);
    if (idx === '') { gasSemanaActiva = item.semana; gasDiaActivo = item.fecha; }
    if (tasaFechaVal > 0) setTasaFecha(item.fecha, tasaFechaVal);
    ultimaFechaGasto = fecha;
    ultimaMonedaGasto = moneda;
    saveGastos(d); $('form-gasto').reset(); $('gas-edit-id').value = ''; $('gas-cancel').classList.add('hidden'); $('gas-submit').textContent = 'Guardar'; $('gas-fecha').value = ultimaFechaGasto; setMoneda(ultimaMonedaGasto);
    $('gas-iva').checked = false; actualizarPreviewIVA();
    actualizarNotaTasa(fecha);
    showToast(idx !== '' ? 'Gasto actualizado' : 'Gasto guardado');
});

function initDB() {
    const insumos = ls('almacen');
    if (!insumos.length) {
        const defaults = [
            { nombre: 'Harina', unidad: 'g', costo: 2.40, cantidad: 1000 },
            { nombre: 'Huevos', unidad: 'unidad', costo: 4.00, cantidad: 15 },
            { nombre: 'Azúcar', unidad: 'g', costo: 2.40, cantidad: 1000 },
            { nombre: 'Chantilly', unidad: 'ml', costo: 7.00, cantidad: 1000 },
            { nombre: 'Agua', unidad: 'ml', costo: 1.00, cantidad: 1000 },
            { nombre: 'Cacao', unidad: 'g', costo: 24.00, cantidad: 1000 },
            { nombre: 'Arequipe', unidad: 'g', costo: 5.00, cantidad: 1000 },
            { nombre: 'Chocolate', unidad: 'g', costo: 6.00, cantidad: 1000 },
            { nombre: 'Polvo para hornear', unidad: 'g', costo: 7.00, cantidad: 1000 },
            { nombre: 'Aceite', unidad: 'ml', costo: 4.00, cantidad: 1000 },
            { nombre: 'Margarina', unidad: 'g', costo: 7.00, cantidad: 1000 },
            { nombre: 'Bicarbonato', unidad: 'g', costo: 8.00, cantidad: 1000 },
            { nombre: 'Sal', unidad: 'g', costo: 2.00, cantidad: 1000 },
            { nombre: 'Leche', unidad: 'g', costo: 12.00, cantidad: 800 },
            { nombre: 'Vainilla', unidad: 'ml', costo: 3.00, cantidad: 250 },
            { nombre: 'Leche condensada', unidad: 'g', costo: 2.50, cantidad: 400 },
            { nombre: 'Queso crema', unidad: 'g', costo: 13.00, cantidad: 500 },
            { nombre: 'Café', unidad: 'g', costo: 8.00, cantidad: 1000 },
            { nombre: 'Vinagre', unidad: 'ml', costo: 3.00, cantidad: 1000 },
            { nombre: 'Papel encerado', unidad: 'm', costo: 12.00, cantidad: 75 },
            { nombre: 'Discos base nro 10', unidad: 'unidad', costo: 0.46, cantidad: 1 },
            { nombre: 'Discos base nro 8', unidad: 'unidad', costo: 0.30, cantidad: 1 },
            { nombre: 'Envase de anime', unidad: 'unidad', costo: 0.06, cantidad: 1 },
            { nombre: 'Sticker', unidad: 'unidad', costo: 0.80, cantidad: 1 },
            { nombre: 'Bolsa de entrega', unidad: 'unidad', costo: 0.02, cantidad: 1 },
            { nombre: 'Vela', unidad: 'unidad', costo: 0.50, cantidad: 1 },
            { nombre: 'Leche Liquida', unidad: 'ml', costo: 3.00, cantidad: 1000 },
            { nombre: 'Jarabe', unidad: 'ml', costo: 5.00, cantidad: 1000 },
            { nombre: 'Crema de leche', unidad: 'g', costo: 2.50, cantidad: 170 },
            { nombre: 'Fresas', unidad: 'g', costo: 10.00, cantidad: 1000 },
            { nombre: 'Colorante', unidad: 'ml', costo: 4.00, cantidad: 18 },
            { nombre: 'Caja', unidad: 'unidad', costo: 1.30, cantidad: 1 },
            { nombre: 'Cucharitas', unidad: 'unidad', costo: 0.06, cantidad: 1 },
            { nombre: 'Impresion', unidad: 'unidad', costo: 0.51, cantidad: 1 }
        ];
        ls('almacen', defaults);
    }
    if (!ls('pedidos').length) ls('pedidos', []);
    else {
        const ped = ls('pedidos');
        let dirty = false;
        ped.forEach(p => {
            if ((p.abono||0) >= p.total && p.estado !== 'pagado') { p.estado = 'pagado'; dirty = true; }
        });
        if (dirty) ls('pedidos', ped);
    }
    if (!ls('gastos').length) {
        ls('gastos', [
            {descripcion:'Recarga Movistar',monto:3.53,categoria:'Hogar',fecha:'2026-04-27',semana:'Sem 27-abr'},
            {descripcion:'Recarga Agua',monto:0.62,categoria:'Hogar',fecha:'2026-04-27',semana:'Sem 27-abr'},
            {descripcion:'Gasto Hogar 2',monto:13.50,categoria:'Hogar',fecha:'2026-04-27',semana:'Sem 27-abr'},
            {descripcion:'Inversi\u00f3n 1',monto:107.89,categoria:'Inversi\u00f3n',fecha:'2026-04-27',semana:'Sem 27-abr'},
            {descripcion:'Inversi\u00f3n 2',monto:71.06,categoria:'Inversi\u00f3n',fecha:'2026-04-27',semana:'Sem 27-abr'},
            {descripcion:'Salida',monto:6.23,categoria:'Esparcimiento',fecha:'2026-04-27',semana:'Sem 27-abr'},
            {descripcion:'Mercado/Servicios',monto:33.09,categoria:'Hogar',fecha:'2026-04-28',semana:'Sem 27-abr'},
            {descripcion:'Cafe',monto:6.20,categoria:'Esparcimiento',fecha:'2026-04-28',semana:'Sem 27-abr'},
            {descripcion:'Cocada',monto:6.20,categoria:'Esparcimiento',fecha:'2026-04-28',semana:'Sem 27-abr'},
            {descripcion:'Carniceria',monto:7.49,categoria:'Hogar',fecha:'2026-04-30',semana:'Sem 27-abr'},
            {descripcion:'Carniceria',monto:7.49,categoria:'Inversi\u00f3n',fecha:'2026-04-30',semana:'Sem 27-abr'},
            {descripcion:'Comida Fuera',monto:11.04,categoria:'Esparcimiento',fecha:'2026-04-30',semana:'Sem 27-abr'},
            {descripcion:'Kefir',monto:13.28,categoria:'Hogar',fecha:'2026-05-04',semana:'Sem 4-may'},
            {descripcion:'Varios (jabon, Pega, paletas)',monto:5.72,categoria:'Hogar',fecha:'2026-05-04',semana:'Sem 4-may'},
            {descripcion:'Fresas',monto:2.04,categoria:'Inversi\u00f3n',fecha:'2026-05-04',semana:'Sem 4-may'},
            {descripcion:'Comida Fuera',monto:9.80,categoria:'Esparcimiento',fecha:'2026-05-04',semana:'Sem 4-may'},
            {descripcion:'Mercado/Servicios',monto:8.47,categoria:'Hogar',fecha:'2026-05-05',semana:'Sem 4-may'},
            {descripcion:'Tobby',monto:27.36,categoria:'Hogar',fecha:'2026-05-06',semana:'Sem 4-may'},
            {descripcion:'Agua',monto:0.51,categoria:'Hogar',fecha:'2026-05-06',semana:'Sem 4-may'},
            {descripcion:'Alquiler',monto:100.00,categoria:'Hogar',fecha:'2026-05-06',semana:'Sem 4-may'},
            {descripcion:'Huevos',monto:4.05,categoria:'Inversi\u00f3n',fecha:'2026-05-06',semana:'Sem 4-may'},
            {descripcion:'Papeleria',monto:11.55,categoria:'Inversi\u00f3n',fecha:'2026-05-06',semana:'Sem 4-may'},
            {descripcion:'Jamon',monto:6.19,categoria:'Hogar',fecha:'2026-05-07',semana:'Sem 4-may'},
            {descripcion:'Huevos',monto:7.08,categoria:'Inversi\u00f3n',fecha:'2026-05-07',semana:'Sem 4-may'},
            {descripcion:'Cajas',monto:179.14,categoria:'Inversi\u00f3n',fecha:'2026-05-07',semana:'Sem 4-may'},
            {descripcion:'Todo baratico',monto:12.48,categoria:'Inversi\u00f3n',fecha:'2026-05-07',semana:'Sem 4-may'},
            {descripcion:'Comida Fuera',monto:12.28,categoria:'Esparcimiento',fecha:'2026-05-07',semana:'Sem 4-may'},
            {descripcion:'4b',monto:10.04,categoria:'Esparcimiento',fecha:'2026-05-08',semana:'Sem 4-may'},
            {descripcion:'Galletas',monto:6.15,categoria:'Inversi\u00f3n',fecha:'2026-05-09',semana:'Sem 4-may'},
            {descripcion:'fresas',monto:5.10,categoria:'Inversi\u00f3n',fecha:'2026-05-09',semana:'Sem 4-may'},
            {descripcion:'leche condensada',monto:4.90,categoria:'Inversi\u00f3n',fecha:'2026-05-09',semana:'Sem 4-may'},
            {descripcion:'flores',monto:14.29,categoria:'Inversi\u00f3n',fecha:'2026-05-09',semana:'Sem 4-may'},
            {descripcion:'cachapas',monto:10.18,categoria:'Esparcimiento',fecha:'2026-05-09',semana:'Sem 4-may'},
            {descripcion:'Gasolina',monto:5.49,categoria:'Inversi\u00f3n',fecha:'2026-05-10',semana:'Sem 4-may'},
            {descripcion:'Dia de las madres',monto:30.00,categoria:'Esparcimiento',fecha:'2026-05-10',semana:'Sem 4-may'},
            {descripcion:'Panini',monto:10.02,categoria:'Esparcimiento',fecha:'2026-05-11',semana:'Sem 11-may'},
            {descripcion:'Legion',monto:53.87,categoria:'Esparcimiento',fecha:'2026-05-12',semana:'Sem 11-may'},
            {descripcion:'Multa',monto:30.48,categoria:'Esparcimiento',fecha:'2026-05-12',semana:'Sem 11-may'},
            {descripcion:'Chaqueta',monto:33.62,categoria:'Esparcimiento',fecha:'2026-05-12',semana:'Sem 11-may'},
            {descripcion:'Pastilla',monto:15.73,categoria:'Hogar',fecha:'2026-05-13',semana:'Sem 11-may'},
            {descripcion:'Talco y cotufas',monto:9.83,categoria:'Hogar',fecha:'2026-05-13',semana:'Sem 11-may'},
            {descripcion:'panini',monto:9.95,categoria:'Esparcimiento',fecha:'2026-05-13',semana:'Sem 11-may'},
            {descripcion:'chantilly y cacao',monto:54.82,categoria:'Inversi\u00f3n',fecha:'2026-05-14',semana:'Sem 11-may'},
            {descripcion:'tortas',monto:5.29,categoria:'Esparcimiento',fecha:'2026-05-14',semana:'Sem 11-may'},
            {descripcion:'Cafe',monto:6.01,categoria:'Esparcimiento',fecha:'2026-05-14',semana:'Sem 11-may'},
            {descripcion:'shawarma',monto:26.20,categoria:'Esparcimiento',fecha:'2026-05-17',semana:'Sem 11-may'},
            {descripcion:'sopas',monto:13.59,categoria:'Esparcimiento',fecha:'2026-05-17',semana:'Sem 11-may'},
            {descripcion:'torta aracelis + refresco',monto:17.45,categoria:'Esparcimiento',fecha:'2026-05-18',semana:'Sem 18-may'},
            {descripcion:'General tortas',monto:164.19,categoria:'Inversi\u00f3n',fecha:'2026-05-19',semana:'Sem 18-may'},
            {descripcion:'Varios chinos corona',monto:30.19,categoria:'Hogar',fecha:'2026-05-20',semana:'Sem 18-may'},
            {descripcion:'Unicasa',monto:36.58,categoria:'Hogar',fecha:'2026-05-20',semana:'Sem 18-may'},
            {descripcion:'Coronas',monto:37.18,categoria:'Inversi\u00f3n',fecha:'2026-05-20',semana:'Sem 18-may'},
            {descripcion:'Cartulinas + estacionamiento',monto:18.16,categoria:'Inversi\u00f3n',fecha:'2026-05-20',semana:'Sem 18-may'},
            {descripcion:'comida',monto:51.23,categoria:'Esparcimiento',fecha:'2026-05-20',semana:'Sem 18-may'},
            {descripcion:'recargas',monto:2.27,categoria:'Hogar',fecha:'2026-05-21',semana:'Sem 18-may'},
            {descripcion:'envases marquesa',monto:5.84,categoria:'Inversi\u00f3n',fecha:'2026-05-21',semana:'Sem 18-may'},
            {descripcion:'galletas',monto:18.16,categoria:'Inversi\u00f3n',fecha:'2026-05-21',semana:'Sem 18-may'},
            {descripcion:'grageas',monto:12.13,categoria:'Inversi\u00f3n',fecha:'2026-05-21',semana:'Sem 18-may'},
            {descripcion:'cintas palitos',monto:5.30,categoria:'Inversi\u00f3n',fecha:'2026-05-21',semana:'Sem 18-may'},
            {descripcion:'arequipe',monto:25.38,categoria:'Inversi\u00f3n',fecha:'2026-05-21',semana:'Sem 18-may'},
            {descripcion:'chica',monto:6.82,categoria:'Esparcimiento',fecha:'2026-05-21',semana:'Sem 18-may'},
            {descripcion:'sushi',monto:26.73,categoria:'Esparcimiento',fecha:'2026-05-21',semana:'Sem 18-may'}
        ]);
        const tasasIni = JSON.parse(localStorage.getItem('dm_tasas')||'{}');
        const tasasDiarias = {
            '2026-04-27':481.6,'2026-04-28':483.5,'2026-04-29':486.2,'2026-04-30':487.12,
            '2026-05-01':490.0,'2026-05-02':489.55,'2026-05-03':490.0,
            '2026-05-04':489.55,'2026-05-05':490.0,'2026-05-06':493.38,'2026-05-07':496.83,
            '2026-05-08':498.0,'2026-05-09':500.84,'2026-05-10':500.84,
            '2026-05-11':504.91,'2026-05-12':508.6,'2026-05-13':508.6,'2026-05-14':510.78,
            '2026-05-15':515.18,'2026-05-16':515.18,'2026-05-17':515.18,
            '2026-05-18':517.85,'2026-05-19':517.96,'2026-05-20':523.17,'2026-05-21':528.0,'2026-05-22':528.0,'2026-05-23':530.0
        };
        Object.keys(tasasDiarias).forEach(d => { if (!tasasIni[d]) tasasIni[d] = tasasDiarias[d]; });
        localStorage.setItem('dm_tasas', JSON.stringify(tasasIni));
    }
}
function renderAll() { loadCatSecciones(); renderAlmacen(); renderPedidos(); renderGastos(); renderReceta(); cargarProdRecetas(); renderProd(); }

function cargarUltimaTasa() {
    const tasas = JSON.parse(localStorage.getItem('dm_tasas')||'{}');
    const fechas = Object.keys(tasas).sort();
    const hoy = today();
    const ultima = tasas[hoy] || fechas.length && tasas[fechas[fechas.length-1]] || 0;
    if (ultima > 0) {
        $('tasa-bcv').value = ultima;
        const nota = $('tasa-nota');
        if (nota) { nota.style.display = 'flex'; $('tasa-nota-valor').value = ultima.toFixed(2); }
    }
}

function migrarPedidos() {
    const pedidos = ls('pedidos');
    let dirty = false;
    pedidos.forEach(p => {
        if (!p.cliente || p.cliente.trim() === '') { p.cliente = 'Desconocido'; dirty = true; }
        if (p.estado === 'completado' || p.estado === 'pago' || p.estado === 'Pagado') { p.estado = 'pagado'; dirty = true; }
        if (p.estado === 'Pendiente') { p.estado = 'pendiente'; dirty = true; }
        if (p.entregado === undefined) { p.entregado = false; dirty = true; }
        if (p.abono === undefined) { p.abono = 0; dirty = true; }
        if (p.notas === undefined) { p.notas = ''; dirty = true; }
        if (p.metodo_pago === undefined) { p.metodo_pago = ''; dirty = true; }
        if (p.total_bs === undefined) { p.total_bs = 0; dirty = true; }
    });
    if (dirty) ls('pedidos', pedidos);
}

function migrarTasas() {
    const tasasExistentes = JSON.parse(localStorage.getItem('dm_tasas')||'{}');
    const tieneViejas = Object.keys(tasasExistentes).some(k => k.startsWith('Sem '));
    if (tieneViejas || !tasasExistentes['2026-04-27']) {
        const tasasDiarias = {
            '2026-04-27':481.6,'2026-04-28':483.5,'2026-04-29':486.2,'2026-04-30':487.12,
            '2026-05-01':490.0,'2026-05-02':489.55,'2026-05-03':490.0,
            '2026-05-04':489.55,'2026-05-05':490.0,'2026-05-06':493.38,'2026-05-07':496.83,
            '2026-05-08':498.0,'2026-05-09':500.84,'2026-05-10':500.84,
            '2026-05-11':504.91,'2026-05-12':508.6,'2026-05-13':508.6,'2026-05-14':510.78,
            '2026-05-15':515.18,'2026-05-16':515.18,'2026-05-17':515.18,
            '2026-05-18':517.85,'2026-05-19':517.96,'2026-05-20':523.17,'2026-05-21':528.0,'2026-05-22':528.0,'2026-05-23':530.0
        };
        Object.keys(tasasDiarias).forEach(d => { if (!tasasExistentes[d]) tasasExistentes[d] = tasasDiarias[d]; });
        localStorage.setItem('dm_tasas', JSON.stringify(tasasExistentes));
    }
}

console.log('Iniciando admin...');
console.log('ped-fecha elem:', $('ped-fecha'));
console.log('gas-fecha elem:', $('gas-fecha'));
$('ped-fecha').value = today();
$('gas-fecha').value = ultimaFechaGasto;
setMoneda(ultimaMonedaGasto);
actualizarNotaTasa(ultimaFechaGasto);
initDB();
console.log('initDB done. almacen:', ls('almacen').length, 'pedidos:', ls('pedidos').length, 'gastos:', ls('gastos').length);
migrarPedidos();
migrarTasas();
cargarUltimaTasa();
calcUnitario();
recargarRecetasGuardadas();
console.log('Llamando renderAll...');
try {
    renderAll();
    console.log('renderAll completado');
} catch(e) {
    console.error('Error en renderAll:', e);
}
setTimeout(async () => {
    const tasa = await fetchTasaBCV();
    if (tasa) actualizarTasa(tasa);
}, 1500);

(async function initCatalogo() {
    try {
        const r = await fetch('assets/catalogo.json');
        catSecciones = await r.json();
        renderCatSecciones();
        console.log('initCatalogo completado');
    } catch (e) {
        console.error('Error cargando catalogo.json', e);
    }
})();

// === PHOTOROOM — COMPOSICIÓN CON FONDO + SOMBRAS ===
// ===== FACTURA → GASTOS =====
const facInput = $('fac-input');
const facProcesar = $('fac-procesar');
const facStatus = $('fac-status');
const facModal = $('fac-modal');
const facModalBg = $('fac-modal-bg');
const facModalClose = $('fac-modal-close');
const facModalCancel = $('fac-modal-cancel');
const facModalConfirm = $('fac-modal-confirm');
const facEditItems = $('fac-edit-items');
const facAddItem = $('fac-add-item');
const facMoneda = $('fac-moneda');
const facTasaValor = $('fac-tasa-valor');
const facEditIva = $('fac-edit-iva');
const facEditFecha = $('fac-edit-fecha');

const CATS = ['Inversión', 'Hogar', 'Esparcimiento'];

let facCurrency = 'Bs';
let facRawOcrText = '';
const FAC_HEADER_MAP = { USD: 'Total $', Bs: 'Total Bs' };

function roundTo(n, d) { const f = Math.pow(10, d); return Math.round(n * f) / f; }

function renderFacEditItems(items) {
    if (!items || !items.length) items = [{ cantidad: 1, descripcion: '', precio_unit: 0, total: 0, categoria: 'Inversión' }];
    const currLabel = FAC_HEADER_MAP[facCurrency] || 'Total $';
    const headerRow = facEditItems.closest('.table-wrap')?.querySelector('thead th:nth-child(4)');
    if (headerRow) headerRow.textContent = currLabel;
    facEditItems.innerHTML = items.map((it, i) => {
        const catOpts = CATS.map(c => '<option value="' + c + '"' + (it.categoria === c ? ' selected' : '') + '>' + c + '</option>').join('');
        const badgeExento = it.exento ? '<span class="fac-exento-badge">(E)</span>' : '';
        return '<tr data-idx="' + i + '">' +
            '<td><input type="number" class="fac-item-cant" value="' + (it.cantidad || 1) + '" step="0.01" min="0" style="width:100%;padding:0.25rem 0.3rem;font-size:0.75rem"></td>' +
            '<td style="display:flex;align-items:center;gap:0.3rem">' +
            '<input type="text" class="fac-item-desc" value="' + (it.descripcion || '').replace(/"/g, '&quot;') + '" style="flex:1;padding:0.25rem 0.3rem;font-size:0.75rem">' +
            badgeExento + '</td>' +
            '<td><input type="number" class="fac-item-pu" value="' + (it.precio_unit || 0) + '" step="0.01" min="0" style="width:100%;padding:0.25rem 0.3rem;font-size:0.75rem"></td>' +
            '<td><input type="number" class="fac-item-total" value="' + (it.total || 0) + '" step="0.01" min="0" style="width:100%;padding:0.25rem 0.3rem;font-size:0.75rem;font-weight:500;color:var(--gold)" readonly></td>' +
            '<td><select class="fac-item-cat" style="width:100%;padding:0.25rem 0.3rem;font-size:0.7rem">' + catOpts + '</select></td>' +
            '<td><button class="btn btn-sm btn-danger fac-item-del" style="padding:0.2rem 0.4rem;font-size:0.65rem">X</button></td>' +
            '</tr>';
    }).join('');
}

function recolectarItemsFactura() {
    const rows = facEditItems.querySelectorAll('tr');
    const items = [];
    rows.forEach(row => {
        const cant = parseFloat(row.querySelector('.fac-item-cant')?.value) || 0;
        const desc = (row.querySelector('.fac-item-desc')?.value || '').trim();
        const pu = parseFloat(row.querySelector('.fac-item-pu')?.value) || 0;
        const cat = row.querySelector('.fac-item-cat')?.value || 'Inversión';
        const exento = !!row.querySelector('.fac-exento-badge');
        if (!desc) return;
        items.push({ cantidad: cant, descripcion: desc, precio_unit: pu, total: roundTo(cant * pu, 2), categoria: cat, exento });
    });
    return items;
}

function actualizarTasaFactura() {
    const fecha = facEditFecha?.value || today();
    const tasas = JSON.parse(localStorage.getItem('dm_tasas') || '{}');
    const tasa = tasas[fecha] || $('tasa-bcv')?.value || 0;
    if (facTasaValor) {
        if (tasa) facTasaValor.value = tasa;
        else facTasaValor.value = '';
    }
}

if (facEditItems) {
    facEditItems.addEventListener('input', function(e) {
        const row = e.target.closest('tr');
        if (!row) return;
        const cant = parseFloat(row.querySelector('.fac-item-cant')?.value) || 0;
        const pu = parseFloat(row.querySelector('.fac-item-pu')?.value) || 0;
        const totalInput = row.querySelector('.fac-item-total');
        if (totalInput) totalInput.value = roundTo(cant * pu, 2);
    });

    facEditItems.addEventListener('click', function(e) {
        const delBtn = e.target.closest('.fac-item-del');
        if (!delBtn) return;
        const row = delBtn.closest('tr');
        if (row && facEditItems.querySelectorAll('tr').length > 1) {
            row.remove();
        } else {
            showToast('Debe haber al menos un item');
        }
    });
}

if (facAddItem) {
    facAddItem.addEventListener('click', function() {
        const items = recolectarItemsFactura();
        items.push({ cantidad: 1, descripcion: '', precio_unit: 0, total: 0, categoria: 'Inversión' });
        renderFacEditItems(items);
    });
}

// Currency toggle
if (facMoneda) {
    facMoneda.addEventListener('click', function(e) {
        const btn = e.target.closest('.curr-btn');
        if (!btn || btn.classList.contains('active')) return;
        facMoneda.querySelectorAll('.curr-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        facCurrency = btn.dataset.curr;
        // Re-render items with new header
        const orig = recolectarItemsFactura();
        renderFacEditItems(orig.length ? orig : null);
        // Show/hide tasa row based on currency
        if (facTasaValor) {
            const tasaNota = facTasaValor.closest('.tasa-nota');
            if (tasaNota) tasaNota.style.display = facCurrency === 'Bs' ? 'flex' : 'none';
        }
    });
}
// IVA checkbox — al tildar recalcula totales sumando 16%
if (facEditIva) {
    facEditIva.addEventListener('change', function() {
        const items = recolectarItemsFactura();
        items.forEach(it => {
            const row = facEditItems.querySelector('tr[data-idx="' + items.indexOf(it) + '"]');
            if (!row) return;
            const totalInput = row.querySelector('.fac-item-total');
            const base = it.precio_unit * it.cantidad;
            totalInput.value = roundTo(this.checked ? base * 1.16 : base, 2);
        });
    });
}
// Tasa auto-load on date change
if (facEditFecha) {
    facEditFecha.addEventListener('change', actualizarTasaFactura);
}

/** Normalize a Venezuelan price string to a JS float.
 *  Handles: 1.196,32 → 1196.32, 005.81 → 5.81, 5,443.08 → 5443.08 */
function parseVzlaPrice(s) {
    s = s.trim();
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    const maxIdx = Math.max(lastDot, lastComma);
    if (maxIdx < 0) return parseFloat(s);
    const after = s.substring(maxIdx + 1);
    const isDecimalSep = /^\d{2}$/.test(after);
    if (!isDecimalSep) return parseFloat(s);
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        // Comma is decimal separator — Venezuelan standard
        return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    } else {
        // Dot is decimal separator — OCR variant
        let t = s.replace(/,/g, '');
        const parts = t.split('.');
        if (parts.length > 2) {
            // Multiple dots: last is decimal, rest are thousand separators
            const dec = parts.pop();
            t = parts.join('') + '.' + dec;
        }
        return parseFloat(t);
    }
}

function parseFacturaText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result = { proveedor: '', numero_factura: '', rif: '', fecha: '', items: [] };
    console.log('[parseFactura] Total lines:', lines.length);

    // ========== HEADER ==========
    for (const line of lines) {
        console.log('[parseFactura] Line:', line);
        const upper = line.toUpperCase();
        // RIF
        if (!result.rif) {
            const m = line.match(/(?:RIF\s*)?([JPGVE]-\d{6,10}-?\d)/i);
            if (m) result.rif = m[1];
        }
        // FACTURA numero
        if (!result.numero_factura) {
            const m = line.match(/FACTURA\s*:?\s*([A-Z0-9\-]+)/i);
            if (m) result.numero_factura = m[1];
        }
        // Fecha
        if (!result.fecha) {
            const m = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            if (m) {
                const d = m[1], mo = m[2], y = m[3];
                result.fecha = y.length === 2 ? '20' + y + '-' + mo.padStart(2, '0') + '-' + d.padStart(2, '0') : y + '-' + mo.padStart(2, '0') + '-' + d.padStart(2, '0');
            }
        }
    }

    // Proveedor: first line with RIF that looks like a business name
    // Usually right after RIF line
    for (let i = 0; i < lines.length; i++) {
        if (/RIF/i.test(lines[i])) {
            // Take next non-empty line as business name
            if (i + 1 < lines.length && lines[i + 1].trim()) {
                result.proveedor = lines[i + 1].replace(/^[\s,]+/, '').trim();
                // Clean up OCR artifacts
                result.proveedor = result.proveedor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.,\-&]/g, '').trim();
                // Only use if it looks like a business name (>3 chars, not all numbers)
                if (result.proveedor.length > 3 && !/^\d+$/.test(result.proveedor)) break;
                result.proveedor = '';
            }
        }
    }

    // ========== ITEMS ==========
    const summaryWords = /\b(SUBTTL|SUBTOTAL|EXENTO|EXCENTO|ENENTO|BI\b|IVA\b|TOTAL\b|PAGO|VUELTO|EFECTIVO|DESCUENTO|CONTADO|RECIBIDO|CANCELADO|CHEQUE|TARJETA|CREDITO|FORMA\s*PAGO|TASA|BIOPAGO|REF)/i;

    // Track indices near summary lines to exclude from standalone-price matching
    const summaryIndices = new Set();
    for (let i = 0; i < lines.length; i++) {
        const upper = lines[i].toUpperCase();
        if (summaryWords.test(upper) || /IVA/.test(upper)) {
            summaryIndices.add(i);
            if (i > 0) summaryIndices.add(i - 1);
            if (i < lines.length - 1) summaryIndices.add(i + 1);
        }
    }

    // --- Format A: description and Bs price on same line (original) ---
    const bsPrice = /Bs[\s\-]*([\d\.\,]+)/i;
    for (const line of lines) {
        const upper = line.toUpperCase().trim();
        if (summaryWords.test(upper)) { console.log('[parseFactura]   -> summary, skip'); continue; }
        if (/IVA/.test(upper)) { console.log('[parseFactura]   -> IVA line, skip'); continue; }
        const m = line.match(bsPrice);
        if (!m) { console.log('[parseFactura]   -> no bsPrice match'); continue; }
        const desc = line.substring(0, m.index).trim();
        if (!desc) continue;
        console.log('[parseFactura]   -> ITEM match (inline): desc="%s" price=%s', desc, m[1]);
        const precioStr = m[1];
        const precio = parseVzlaPrice(precioStr);
        if (isNaN(precio) || precio <= 0 || precio >= 500000) continue;
        let descClean = desc.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.\,\/\(\)]/g, '').trim();
        descClean = descClean.replace(/^\d+x\s*/i, '').trim();
        descClean = descClean.replace(/^\d+-\d+\s*/i, '').trim();
        descClean = descClean.replace(/\s+Un\.?$/i, '').trim();
        const hasRealWord = descClean.split(/\s+/).some(w => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(w));
        if (!hasRealWord || descClean.length < 6) { console.log('[parseFactura]   -> noise/short, skip'); continue; }
        const esExento = /\(E\)?/.test(upper) || /E\)/.test(upper) || /\bE\b/.test(upper) || /EXCENTO/.test(upper);
        result.items.push({
            descripcion: descClean, cantidad: 1, precio_unit: precio, total: precio,
            categoria: 'Inversión', exento: esExento,
        });
    }

    // --- Format B: description and price on separate lines ---
    // Collect description candidates (text-only lines with real words, not summary)
    const descCandidates = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();
        if (summaryWords.test(upper) || /IVA/.test(upper) || /^[\d\.\,\-]+$/.test(line)) continue;
        if (summaryIndices.has(i)) continue;
        // Skip quantity×price lines (e.g. "0.12xBs 10.090.63")
        if (/[\d,]+xBs/i.test(line)) continue;
        // Skip code-like lines: all caps/digits/hyphens, no spaces, 4+ chars
        if (/^[A-Z0-9\-\.\/]{4,}$/i.test(line) && !/\s/.test(line)) continue;
        // Must contain at least one real word (3+ consecutive letters)
        if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(line)) {
            descCandidates.push({ index: i, text: line });
        }
    }
    // Find standalone price lines and match with nearest description
    // Strategy: look forward up to 3 lines first, then backward up to 3
    const usedDescIndices = new Set();
    const priceLineRegex = /^(?:Bs|8s|Ss|B5)[\s\-]*([\d\.\,]+)$/i;
    for (let i = 0; i < lines.length; i++) {
        if (summaryIndices.has(i)) continue;
        const line = lines[i];
        const m = line.match(priceLineRegex);
        if (!m) continue;
        const precio = parseVzlaPrice(m[1]);
        if (isNaN(precio) || precio <= 0 || precio >= 500000) continue;

        // Forward search (next 3 lines)
        let bestDesc = '', bestIdx = -1;
        for (let d = 1; d <= 3; d++) {
            const idx = i + d;
            const dc = descCandidates.find(c => c.index === idx && !usedDescIndices.has(c.index));
            if (dc) { bestDesc = dc.text; bestIdx = dc.index; break; }
        }
        // Backward search (previous 3 lines) if nothing forward
        if (!bestDesc) {
            for (let d = 1; d <= 3; d++) {
                const idx = i - d;
                const dc = descCandidates.find(c => c.index === idx && !usedDescIndices.has(c.index));
                if (dc) { bestDesc = dc.text; bestIdx = dc.index; break; }
            }
        }
        if (!bestDesc) continue;
        usedDescIndices.add(bestIdx);

        let descClean = bestDesc.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.\,\/\(\)]/g, '').trim();
        descClean = descClean.replace(/\s+Un\.?$/i, '').trim();
        const hasRealWord = descClean.split(/\s+/).some(w => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(w));
        if (!hasRealWord || descClean.length < 3) continue;

        const esExento = /\(E\)?|EXENTO|EXCENTO|\bE\b/.test(bestDesc.toUpperCase());
        // Look for nearby xBs line to extract quantity and unit price
        let cantidad = 1, precioUnit = precio;
        const xBsRegex = /([\d\.\,]+)\s*x\s*Bs[\s\-]*([\d\.\,]+)/i;
        for (let d = 1; d <= 4; d++) {
            const idxF = i + d, idxB = i - d;
            let xMatch = null;
            if (idxF < lines.length) xMatch = lines[idxF].match(xBsRegex);
            if (!xMatch && idxB >= 0) xMatch = lines[idxB].match(xBsRegex);
            if (xMatch) {
                const qty = parseFloat(xMatch[1].replace(/,/g, ''));
                const unit = parseVzlaPrice(xMatch[2]);
                if (!isNaN(qty) && !isNaN(unit) && qty > 0 && unit > 0) {
                    cantidad = qty; precioUnit = unit;
                }
                break;
            }
        }
        console.log('[parseFactura]   -> ITEM match (separate): desc="%s" price=%s qty=%s', descClean, m[1], cantidad);
        result.items.push({
            descripcion: descClean, cantidad, precio_unit: precioUnit, total: precio,
            categoria: 'Inversión', exento: esExento,
        });
    }

    // ========== TOTALS ==========
    let subtotal = 0, iva = 0, total = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();
        const allMatches = [...line.matchAll(/Bs[\s\-]*([\d\.\,]+)/ig)];
        if (!allMatches.length) continue;
        const last = allMatches[allMatches.length - 1];
        const val = parseVzlaPrice(last[1]);
        if (isNaN(val)) continue;

        if (/SUBTTL|SUBTOTAL/.test(upper)) subtotal = val;
        else if (/IVA\b/.test(upper) && !/SUBTTL/.test(upper)) iva = val;
        else if (/TOTAL\b/.test(upper)) total = val;
    }
    // Fallback: scan lines near summary keywords for standalone Bs prices
    if (!subtotal) {
        for (let i = 0; i < lines.length; i++) {
            if (/EXENTO/.test(lines[i].toUpperCase())) {
                for (let j = i; j < lines.length && j <= i + 2; j++) {
                    const m = lines[j].match(/^(?:Bs|8s|Ss|B5)[\s\-]*([\d\.\,]+)$/i);
                    if (m) { subtotal += parseVzlaPrice(m[1]) || 0; break; }
                }
            }
            if (/SUBTTL|SUBTOTAL/.test(lines[i].toUpperCase())) {
                for (let j = i + 1; j < lines.length && j <= i + 2; j++) {
                    const m = lines[j].match(/^(?:Bs|8s|Ss|B5)[\s\-]*([\d\.\,]+)$/i);
                    if (m) {
                        // If next line also has Bs and contains IVA, add both
                        const s = parseVzlaPrice(m[1]) || 0;
                        subtotal += s;
                        break;
                    }
                }
            }
        }
    }
    if (!iva) {
        for (let i = 0; i < lines.length; i++) {
            if (/IVA/.test(lines[i].toUpperCase())) {
                for (let j = i; j < lines.length && j <= i + 2; j++) {
                    const m = lines[j].match(/^(?:Bs|8s|Ss|B5)[\s\-]*([\d\.\,]+)$/i);
                    if (m && j > i) { iva = parseVzlaPrice(m[1]) || 0; break; }
                }
            }
        }
    }
    if (!total) {
        for (let i = 0; i < lines.length; i++) {
            if (/TOTAL/.test(lines[i].toUpperCase())) {
                for (let j = i + 1; j < lines.length && j <= i + 2; j++) {
                    const m = lines[j].match(/^(?:Bs|8s|Ss|B5)[\s\-]*([\d\.\,]+)$/i);
                    if (m) { total = parseVzlaPrice(m[1]) || 0; break; }
                }
            }
        }
    }
    result.subtotal = subtotal;
    result.iva = iva;
    result.total = total || subtotal + iva;
    result._fuente = 'ocr';
    return result;
}

if (facProcesar) {
    facProcesar.addEventListener('click', async function() {
        const file = facInput?.files?.[0];
        if (!file) { facStatus.textContent = 'Seleccioná una imagen o PDF de factura primero.'; return; }

        facProcesar.disabled = true;
        facProcesar.textContent = 'Procesando...';
        facStatus.textContent = 'Extrayendo datos con OCR...';

        try {
            let factura;

            // Backend (PaddleOCR)
            try {
                facStatus.textContent = 'Procesando con servidor PaddleOCR...';
                const resp = await fetch('/api/procesar_factura', {
                    method: 'POST',
                    headers: { 'Content-Type': file.type || 'application/octet-stream' },
                    body: file,
                });
                const data = await resp.json();
                console.log('Respuesta del servidor:', JSON.stringify(data).slice(0, 500));
                if (data.ok && data.factura?._texto_ocr) {
                    facRawOcrText = data.factura._texto_ocr;
                    facStatus.textContent = 'OCR completado. Parseando items...';
                    factura = parseFacturaText(facRawOcrText);
                    if (!factura.items || factura.items.length < 1) {
                        console.log('parseFacturaText no encontró items. Texto OCR:\n' + facRawOcrText);
                        facStatus.textContent = 'OCR extrajo texto pero no se detectaron items. Revisá el raw text.';
                        facProcesar.disabled = false;
                        facProcesar.textContent = 'Procesar Factura';
                        return;
                    }
                    facStatus.textContent = 'Datos extraídos: ' + factura.items.length + ' item(s). Revisá y asigná categorías.';
                } else if (data.ok && data.factura?._fuente === 'simulada') {
                    console.warn('Backend devolvió simulación', data.factura);
                } else {
                    console.warn('Backend falló:', data.error || data);
                }
            } catch (e) {
                console.warn('Backend no disponible:', e.message);
            }

            if (!factura) {
                facStatus.textContent = 'No se pudo extraer datos de la factura. Intentá con una imagen más clara.';
                facProcesar.disabled = false;
                facProcesar.textContent = 'Procesar Factura';
                return;
            }

            $('fac-edit-numero').value = factura.numero_factura || '';
            $('fac-edit-proveedor').value = factura.proveedor || '';
            $('fac-edit-rif').value = factura.rif || '';
            $('fac-edit-fecha').value = factura.fecha || today();
            facCurrency = 'Bs';
            facMoneda.querySelectorAll('.curr-btn').forEach(b => b.classList.toggle('active', b.dataset.curr === 'Bs'));
            const tasaNota = facTasaValor?.closest('.tasa-nota');
            if (tasaNota) tasaNota.style.display = 'flex';
            actualizarTasaFactura();
            const rawEl = $('fac-raw-ocr');
            if (rawEl) rawEl.value = facRawOcrText;
            renderFacEditItems(factura.items || []);
            facModal.style.display = 'flex';
        } catch (e) {
            facStatus.textContent = 'Error de conexión: ' + e.message;
        } finally {
            facProcesar.disabled = false;
            facProcesar.textContent = 'Procesar Factura';
        }
    });
}

if (facInput) {
    facInput.addEventListener('change', function() {
        if (this.files?.[0]) facStatus.textContent = 'Archivo listo: ' + this.files[0].name;
    });
}

function cerrarModalFactura() {
    facModal.style.display = 'none';
    $('fac-edit-numero').value = '';
    $('fac-edit-proveedor').value = '';
    $('fac-edit-rif').value = '';
    $('fac-edit-fecha').value = '';
    facEditItems.innerHTML = '';
    if (facEditIva) facEditIva.checked = false;
    facRawOcrText = '';
}

if (facModalClose) facModalClose.addEventListener('click', cerrarModalFactura);
if (facModalBg) facModalBg.addEventListener('click', cerrarModalFactura);
if (facModalCancel) facModalCancel.addEventListener('click', cerrarModalFactura);

if (facModalConfirm) {
    facModalConfirm.addEventListener('click', function() {
        const items = recolectarItemsFactura();
        if (!items.length) { showToast('Agregá al menos un item con descripción'); return; }

        const fecha = $('fac-edit-fecha').value || today();
        const numFac = $('fac-edit-numero').value.trim();
        const prov = $('fac-edit-proveedor').value.trim();
        const moneda = facCurrency;
        const tasa = parseFloat(facTasaValor?.value) || 0;
        const incluyeIva = facEditIva?.checked || false;

        const gastos = ls('gastos');
        let count = 0;
        items.forEach(it => {
            const esExento = it.exento || false;
            const montoOriginal = it.total;
            const montoUSD = moneda === 'Bs' && tasa > 0 ? roundTo(it.total / tasa, 2) : (moneda === 'USD' ? it.total : 0);
            const ivaTotal = (incluyeIva && !esExento) ? roundTo(montoOriginal - (moneda === 'Bs' ? roundTo(it.total / 1.16, 2) : montoOriginal / 1.16), 2) : 0;
            const ivaUSD = moneda === 'Bs' && tasa > 0 ? roundTo(ivaTotal / tasa, 2) : (moneda === 'USD' ? ivaTotal : 0);
            const montoFinal = moneda === 'Bs' ? montoUSD : montoOriginal;
            const ivaFinal = moneda === 'Bs' ? ivaUSD : ivaTotal;

            gastos.push({
                descripcion: (numFac ? numFac + ' - ' : '') + it.descripcion + (esExento ? ' (E)' : ''),
                monto: montoFinal,
                montoBs: moneda === 'Bs' ? it.total : 0,
                iva: roundTo(ivaFinal, 2),
                ivaOriginal: ivaTotal,
                moneda: 'USD',
                categoria: it.categoria,
                fecha: fecha,
                semana: calcSemana(fecha),
                tasa: tasa,
                _origen_factura: numFac || true,
                _proveedor: prov || '',
                _moneda_factura: moneda,
                exento: esExento,
            });
            count++;
        });
        ls('gastos', gastos);
        cerrarModalFactura();
        facStatus.textContent = count + ' gastos guardados desde factura ' + numFac;
        renderGastos();
        showToast(count + ' gastos guardados');
    });
}


