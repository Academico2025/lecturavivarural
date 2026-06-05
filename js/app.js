
const FALLBACK_ACTIVIDADES = [{"id": 1, "titulo": "Relatos de la vereda", "descripcion": "Escribe y comparte un relato corto sobre tu vereda."}, {"id": 2, "titulo": "Historias familiares", "descripcion": "Entrevista a un familiar y resume su historia."}, {"id": 3, "titulo": "Mapeo del territorio", "descripcion": "Dibuja el mapa de tu territorio y describe lugares importantes."}, {"id": 4, "titulo": "Cuentos colaborativos", "descripcion": "Crea un cuento en equipo inspirado en la comunidad."}, {"id": 5, "titulo": "Lectura de folletos locales", "descripcion": "Lee folletos locales e identifica ideas principales."}, {"id": 6, "titulo": "Diario de campo", "descripcion": "Registra observaciones de plantas, animales o cultivos."}, {"id": 7, "titulo": "Historias orales digitalizadas", "descripcion": "Graba un relato oral y escribe un resumen."}, {"id": 8, "titulo": "Inferencias del entorno", "descripcion": "Observa imágenes del entorno e interpreta qué sucede."}, {"id": 9, "titulo": "Caza de palabras locales", "descripcion": "Busca palabras propias de la comunidad y explica su significado."}, {"id": 10, "titulo": "Comparación de historias", "descripcion": "Compara dos relatos y encuentra semejanzas y diferencias."}, {"id": 11, "titulo": "Periódico escolar", "descripcion": "Redacta noticias escolares o comunitarias."}, {"id": 12, "titulo": "Juego de roles", "descripcion": "Representa una situación de la vereda y escribe lo aprendido."}, {"id": 13, "titulo": "Cartas a la comunidad", "descripcion": "Escribe una carta dirigida a una persona de la comunidad."}, {"id": 14, "titulo": "Historias con imágenes", "descripcion": "Ordena imágenes y crea una historia con inicio, nudo y final."}, {"id": 15, "titulo": "Lectura de recetas locales", "descripcion": "Lee una receta tradicional e identifica pasos e instrucciones."}, {"id": 16, "titulo": "Entrevistas offline", "descripcion": "Realiza una entrevista y organiza las respuestas."}, {"id": 17, "titulo": "Reflexión sobre problemas locales", "descripcion": "Lee una situación del territorio y propone soluciones."}, {"id": 18, "titulo": "Poesía de la vereda", "descripcion": "Crea un poema inspirado en la naturaleza y la comunidad."}, {"id": 19, "titulo": "Historias con elementos locales", "descripcion": "Usa objetos o imágenes locales para inventar una historia."}, {"id": 20, "titulo": "Libro de memorias de clase", "descripcion": "Construye una memoria colectiva con textos de la clase."}];
const emojis = ["🌱","👨‍👩‍👧","🗺️","📚","📰","🌿","🎙️","🖼️","🔎","⚖️","🗞️","🎭","✉️","📷","🍲","🗣️","💧","🌻","🧺","📖"];
const DB_NAME = "LecturaVivaRuralDB";
const STORE = "entregas";
let actividadesCache = [];

function emojiFor(id){ return emojis[id-1] || "⭐"; }

async function getJSON(url, fallback=[]){
  try{
    const r = await fetch(url + "?v=" + Date.now());
    if(!r.ok) return fallback;
    return await r.json();
  }catch(e){
    return fallback;
  }
}

function openDB(){
  return new Promise((resolve, reject)=>{
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE, {keyPath:"id"});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addEntrega(entrega){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entrega);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getEntregas(){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b)=>b.id-a.id));
    req.onerror = () => reject(req.error);
  });
}

async function deleteEntrega(id){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearEntregas(){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function initCommon(){
  actividadesCache = await getJSON("data/actividades.json", FALLBACK_ACTIVIDADES);
  if(!Array.isArray(actividadesCache) || actividadesCache.length === 0){
    actividadesCache = FALLBACK_ACTIVIDADES;
  }
}

async function renderStats(){
  const el = document.getElementById("stat-completadas");
  if(!el) return;
  const entregas = await getEntregas();
  const completadas = new Set(entregas.map(e=>String(e.actividad_id))).size;
  document.getElementById("stat-completadas").textContent = completadas;
  document.getElementById("stat-pendientes").textContent = Math.max(0, actividadesCache.length - completadas);
  document.getElementById("stat-recursos").textContent = entregas.length;
}

async function renderActividades(){
  const box = document.getElementById("actividades-grid");
  if(!box) return;
  const entregas = await getEntregas();
  const hechas = new Set(entregas.map(e=>String(e.actividad_id)));
  box.innerHTML = actividadesCache.map(a => `
    <article class="card activity-card">
      <span class="badge">Actividad ${a.id}</span>
      <h3>${emojiFor(a.id)} ${a.titulo}</h3>
      <p>${a.descripcion}</p>
      <p class="small"><strong>Estado:</strong> ${hechas.has(String(a.id)) ? "Completada" : "Pendiente"}</p>
      <a class="btn secondary" href="subir.html?actividad=${a.id}">Subir resultado</a>
    </article>
  `).join("");
}

async function initSubir(){
  const select = document.getElementById("actividad");
  if(!select) return;
  select.innerHTML = "";
  actividadesCache.forEach(a=>{
    const opt=document.createElement("option");
    opt.value=a.id;
    opt.textContent=`${a.id}. ${a.titulo}`;
    select.appendChild(opt);
  });
  const params = new URLSearchParams(window.location.search);
  if(params.get("actividad")) select.value = params.get("actividad");

  const form = document.getElementById("form-entrega");
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const file = document.getElementById("archivo").files[0] || null;
    const actividad = actividadesCache.find(a => String(a.id) === String(select.value));
    const entrega = {
      id: Date.now(),
      estudiante: document.getElementById("estudiante").value.trim(),
      actividad_id: select.value,
      actividad_titulo: actividad ? actividad.titulo : "Actividad",
      tipo: document.getElementById("tipo").value,
      descripcion: document.getElementById("descripcion").value.trim(),
      fecha: new Date().toLocaleString(),
      archivoNombre: file ? file.name : "",
      archivoTipo: file ? file.type : "",
      archivoBlob: file
    };
    await addEntrega(entrega);
    document.getElementById("mensaje").innerHTML = `<div class="notice"><strong>✅ Resultado guardado.</strong><br>Ahora puedes verlo en la pestaña Recursos.</div>`;
    form.reset();
  });
}

function makePreview(e){
  if(!e.archivoBlob) return `<div class="icon">${emojiFor(Number(e.actividad_id))}</div>`;
  const url = URL.createObjectURL(e.archivoBlob);
  const type = e.archivoTipo || "";
  if(type.startsWith("image/")) return `<img class="preview" src="${url}" alt="Vista previa">`;
  if(type.startsWith("audio/")) return `<audio controls src="${url}"></audio>`;
  if(type.startsWith("video/")) return `<video class="preview" controls src="${url}"></video>`;
  if(type === "application/pdf") return `<div class="icon">📄</div>`;
  return `<div class="icon">📎</div>`;
}

async function renderRecursos(){
  const list = document.getElementById("recursos-list");
  if(!list) return;
  const filtro = document.getElementById("filtro-actividad");
  filtro.innerHTML = `<option value="">Todas las actividades</option>`;
  actividadesCache.forEach(a=>{
    const opt=document.createElement("option");
    opt.value=a.id;
    opt.textContent=`${a.id}. ${a.titulo}`;
    filtro.appendChild(opt);
  });
  async function paint(){
    const selected = filtro.value;
    const entregas = (await getEntregas()).filter(e => !selected || String(e.actividad_id) === String(selected));
    if(entregas.length === 0){
      list.innerHTML = `<div class="card"><h3>📭 Aún no hay recursos</h3><p>Cuando subas resultados desde esta app, aparecerán aquí.</p></div>`;
      return;
    }
    list.innerHTML = entregas.map(e=>{
      const url = e.archivoBlob ? URL.createObjectURL(e.archivoBlob) : "";
      return `<div class="resource">
        ${makePreview(e)}
        <div>
          <strong>${e.actividad_titulo}</strong>
          <div class="small">Estudiante/equipo: ${e.estudiante} · Tipo: ${e.tipo} · Fecha: ${e.fecha}</div>
          <p>${e.descripcion || "Sin descripción adicional."}</p>
          <div class="small">Archivo: ${e.archivoNombre || "Sin archivo adjunto"}</div>
        </div>
        <div class="actions" style="margin:0">
          ${url ? `<a class="btn" href="${url}" target="_blank">Ver</a><a class="btn secondary" href="${url}" download="${e.archivoNombre}">Descargar</a>` : ""}
          <button class="btn danger" onclick="borrarEntrega(${e.id})">Eliminar</button>
        </div>
      </div>`;
    }).join("");
  }
  filtro.addEventListener("change", paint);
  paint();

  const clearBtn = document.getElementById("borrar-todo");
  if(clearBtn) clearBtn.addEventListener("click", async ()=>{
    if(confirm("¿Deseas borrar todas las entregas guardadas en este navegador?")){
      await clearEntregas();
      location.reload();
    }
  });
}

async function borrarEntrega(id){
  await deleteEntrega(id);
  location.reload();
}

async function renderPublicos(){
  const box = document.getElementById("recursos-publicos");
  if(!box) return;
  const publicos = await getJSON("data/recursos_publicos.json", []);
  const visibles = publicos.filter(r => r.archivo && r.archivo.trim() !== "");
  if(visibles.length === 0){
    box.innerHTML = `<div class="card"><h3>📁 Biblioteca institucional vacía</h3><p>Para publicar recursos para todos, sube archivos a <strong>recursos_publicos/</strong> y registra cada uno en <strong>data/recursos_publicos.json</strong>.</p></div>`;
    return;
  }
  box.innerHTML = visibles.map(r=>{
    const ruta = "recursos_publicos/" + r.archivo;
    const img = /\.(jpg|jpeg|png|gif|webp)$/i.test(r.archivo);
    const preview = img ? `<img class="preview" src="${ruta}" alt="Vista previa">` : `<div class="icon">📁</div>`;
    return `<div class="resource">
      ${preview}
      <div><strong>${r.titulo}</strong><div class="small">${r.actividad_titulo || "Recurso institucional"} · ${r.tipo || "Archivo"}</div><p>${r.descripcion || ""}</p></div>
      <div class="actions" style="margin:0"><a class="btn" href="${ruta}" target="_blank">Ver</a><a class="btn secondary" href="${ruta}" download>Descargar</a></div>
    </div>`;
  }).join("");
}

function initTabs(){
  const localBtn = document.getElementById("tab-local");
  const publicBtn = document.getElementById("tab-publicos");
  if(!localBtn) return;
  const local = document.getElementById("panel-local");
  const publ = document.getElementById("panel-publicos");
  localBtn.addEventListener("click", ()=>{
    localBtn.classList.add("active"); publicBtn.classList.remove("active");
    local.classList.remove("hidden"); publ.classList.add("hidden");
  });
  publicBtn.addEventListener("click", ()=>{
    publicBtn.classList.add("active"); localBtn.classList.remove("active");
    publ.classList.remove("hidden"); local.classList.add("hidden");
  });
}

async function renderPerfil(){
  const tbody = document.getElementById("tabla-progreso");
  if(!tbody) return;
  const entregas = await getEntregas();
  tbody.innerHTML = actividadesCache.map(a=>{
    const item = entregas.find(e => String(e.actividad_id) === String(a.id));
    return `<tr><td>${a.id}</td><td>${a.titulo}</td><td>${item ? "Completada" : "Pendiente"}</td><td>${item ? item.fecha : "—"}</td></tr>`;
  }).join("");
}

async function exportarJSON(){
  const entregas = await getEntregas();
  const sinArchivos = entregas.map(e => ({
    id:e.id, estudiante:e.estudiante, actividad_id:e.actividad_id, actividad_titulo:e.actividad_titulo,
    tipo:e.tipo, descripcion:e.descripcion, fecha:e.fecha, archivoNombre:e.archivoNombre, archivoTipo:e.archivoTipo
  }));
  const blob = new Blob([JSON.stringify(sinArchivos, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "entregas_lectura_viva_rural.json";
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", async ()=>{
  await initCommon();
  await renderStats();
  await renderActividades();
  await initSubir();
  await renderRecursos();
  await renderPublicos();
  await renderPerfil();
  initTabs();
  const exportBtn = document.getElementById("exportar-json");
  if(exportBtn) exportBtn.addEventListener("click", exportarJSON);
});
