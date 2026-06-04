
const DB_NAME = "lectura_viva_rural_db";
const STORE = "entregas";
const DB_VERSION = 1;

const emojis = ["🌱","👨‍👩‍👧","🗺️","📚","📰","🌿","🎙️","🖼️","🔎","⚖️","🗞️","🎭","✉️","📷","🍲","🗣️","💧","🌻","🧺","📖"];
function emojiFor(id){ return emojis[Number(id)-1] || "⭐"; }

function openDB(){
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addEntrega(entrega){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entrega);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getEntregas(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a,b) => b.id - a.id));
    request.onerror = () => reject(request.error);
  });
}

async function clearEntregas(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteEntrega(id){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(Number(id));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getActividades(){
  try{
    const r = await fetch("data/actividades.json");
    if(!r.ok) throw new Error("No se pudo cargar actividades.json");
    return await r.json();
  }catch(e){
    return [];
  }
}

function readFileAsDataURL(file){
  return new Promise((resolve, reject) => {
    if(!file) return resolve({nombre:"Sin archivo", tipo:"", dataUrl:""});
    const reader = new FileReader();
    reader.onload = () => resolve({nombre:file.name, tipo:file.type, dataUrl:reader.result});
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function renderStats(){
  const actividades = await getActividades();
  const entregas = await getEntregas();
  const completadas = new Set(entregas.map(e => String(e.actividad_id))).size;
  const s1 = document.getElementById("stat-completadas");
  const s2 = document.getElementById("stat-pendientes");
  const s3 = document.getElementById("stat-recursos");
  if(s1) s1.textContent = completadas;
  if(s2) s2.textContent = Math.max(0, actividades.length - completadas);
  if(s3) s3.textContent = entregas.length;
}

async function renderActividades(){
  const box = document.getElementById("actividades-grid");
  if(!box) return;
  const actividades = await getActividades();
  const entregas = await getEntregas();
  const hechas = new Set(entregas.map(e => String(e.actividad_id)));
  box.innerHTML = actividades.map(a => `
    <article class="card activity-card">
      <span class="badge">Actividad ${a.id}</span>
      <h3>${emojiFor(a.id)} ${a.titulo}</h3>
      <p>${a.descripcion}</p>
      <p class="small"><strong>Estado en este navegador:</strong> ${hechas.has(String(a.id)) ? "Completada" : "Pendiente"}</p>
      <a class="btn secondary" href="subir.html?actividad=${a.id}">Subir resultado</a>
    </article>
  `).join("");
}

async function initSubir(){
  const select = document.getElementById("actividad");
  const form = document.getElementById("form-entrega-github");
  if(!select || !form) return;

  const actividades = await getActividades();
  actividades.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = `${a.id}. ${a.titulo}`;
    select.appendChild(opt);
  });

  const params = new URLSearchParams(window.location.search);
  if(params.get("actividad")) select.value = params.get("actividad");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = document.getElementById("archivo").files[0];
    const actividad = actividades.find(a => String(a.id) === String(select.value));
    const archivo = await readFileAsDataURL(file);

    const entrega = {
      id: Date.now(),
      estudiante: document.getElementById("estudiante").value.trim(),
      actividad_id: select.value,
      actividad_titulo: actividad ? actividad.titulo : "Actividad",
      tipo: document.getElementById("tipo").value,
      descripcion: document.getElementById("descripcion").value.trim(),
      archivo_nombre: archivo.nombre,
      archivo_tipo: archivo.tipo,
      archivo_data_url: archivo.dataUrl,
      fecha: new Date().toLocaleString()
    };

    await addEntrega(entrega);
    document.getElementById("mensaje").innerHTML = `
      <div class="notice">
        <strong>✅ Resultado guardado en este navegador.</strong><br>
        Para compartirlo con otro computador, usa la opción <strong>Exportar recursos</strong> en la página Recursos.
      </div>`;
    form.reset();
  });
}

function makePreview(e){
  const data = e.archivo_data_url || "";
  const name = e.archivo_nombre || "";
  if(!data) return `<div class="icon">${emojiFor(e.actividad_id)}</div>`;
  if((e.archivo_tipo || "").startsWith("image/")) return `<img class="preview" src="${data}" alt="Vista previa">`;
  if((e.archivo_tipo || "").startsWith("audio/")) return `<audio controls src="${data}" style="max-width:220px"></audio>`;
  if((e.archivo_tipo || "").startsWith("video/")) return `<video controls src="${data}" class="preview"></video>`;
  if(/\.pdf$/i.test(name)) return `<div class="icon">📄</div>`;
  return `<div class="icon">📎</div>`;
}

async function renderRecursos(){
  const list = document.getElementById("recursos-list");
  const filtro = document.getElementById("filtro-actividad");
  if(!list || !filtro) return;

  const actividades = await getActividades();
  actividades.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = `${a.id}. ${a.titulo}`;
    filtro.appendChild(opt);
  });

  async function paint(){
    const selected = filtro.value;
    const entregas = (await getEntregas()).filter(e => !selected || String(e.actividad_id) === String(selected));
    if(entregas.length === 0){
      list.innerHTML = `<div class="card"><h3>📭 Aún no hay recursos</h3><p>Cuando los estudiantes suban resultados desde este navegador, aparecerán aquí.</p></div>`;
      return;
    }

    list.innerHTML = entregas.map(e => `
      <div class="resource">
        ${makePreview(e)}
        <div>
          <strong>${e.actividad_titulo}</strong>
          <div class="small">Estudiante/equipo: ${e.estudiante} · Tipo: ${e.tipo} · Fecha: ${e.fecha}</div>
          <p>${e.descripcion || "Sin descripción adicional."}</p>
          <div class="small">Archivo: ${e.archivo_nombre || "Sin archivo"}</div>
        </div>
        <div class="actions" style="margin:0">
          ${e.archivo_data_url ? `<a class="btn" href="${e.archivo_data_url}" target="_blank">Ver</a><a class="btn secondary" href="${e.archivo_data_url}" download="${e.archivo_nombre}">Descargar</a>` : ""}
          <button class="btn danger" data-delete="${e.id}">Eliminar</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteEntrega(btn.dataset.delete);
        paint();
        renderStats();
      });
    });
  }

  filtro.addEventListener("change", paint);
  paint();
}

async function renderPerfil(){
  const tbody = document.getElementById("tabla-progreso");
  if(!tbody) return;
  const actividades = await getActividades();
  const entregas = await getEntregas();
  tbody.innerHTML = actividades.map(a => {
    const item = entregas.find(e => String(e.actividad_id) === String(a.id));
    return `<tr>
      <td>${a.id}</td>
      <td>${a.titulo}</td>
      <td>${item ? "Completada" : "Pendiente"}</td>
      <td>${item ? item.fecha : "—"}</td>
    </tr>`;
  }).join("");
}

async function initExportImport(){
  const exportBtn = document.getElementById("exportar");
  const importInput = document.getElementById("importar");
  const clearBtn = document.getElementById("limpiar");
  if(exportBtn){
    exportBtn.addEventListener("click", async () => {
      const entregas = await getEntregas();
      const blob = new Blob([JSON.stringify(entregas, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recursos_lectura_viva_rural.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  if(importInput){
    importInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      for(const item of data){
        await addEntrega(item);
      }
      location.reload();
    });
  }
  if(clearBtn){
    clearBtn.addEventListener("click", async () => {
      if(confirm("¿Seguro que deseas borrar los recursos guardados en este navegador?")){
        await clearEntregas();
        location.reload();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderStats();
  renderActividades();
  initSubir();
  renderRecursos();
  renderPerfil();
  initExportImport();
});
