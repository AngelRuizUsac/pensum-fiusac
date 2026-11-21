"use strict";
const $ = id => document.getElementById(id);
const semestres = Array.from({length:10}, (_, i) => i + 1);
const normalizar = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
let s = inicial(), abierto = null, vista = "mapa", temporizador;
const expandidos = new Set();
function avisar(msg) {
  $("aviso").textContent = msg;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => $("aviso").textContent = "", 6000);
}
try {
  const guardado = localStorage.getItem(planId);
  if (guardado) s = validar(JSON.parse(guardado));
} catch { avisar("No se pudo cargar el avance. Puedes importar un respaldo en Mis datos."); }
expandidos.add(s.semestre);
function guardar() {
  try { localStorage.setItem(planId, JSON.stringify(s)); }
  catch { avisar("Este navegador no pudo guardar el avance. Exporta un respaldo antes de salir."); }
  render();
}
function tarjeta(c, paraPlan = false) {
  const st = estado(c,s);
  const falta = faltantes(c,s);
  const abre = abreAlAprobar(c,s).length;
  const limitado = paraPlan && !cabe(c,s);
  const etiqueta = paraPlan ? (limitado ? (limite(s) === null ? "Indica tu promedio" : "Supera el límite") : falta.length ? "Condicional · añadir" : "Añadir al plan") : st;
  const pista = c.req.length ? '<span class="requisitos"><b>Necesitas aprobar</b>'+c.req.map(id => {
    const req = catalogo.get(id);
    const registro = s.estados[id] || "Pendiente";
    return '<span><em class="req-'+(registro === "Aprobado" ? "ok" : "falta")+'">'+registro+'</em> '+req.id+' · '+req.name+'</span>';
  }).join("")+'</span>' : '<small>Sin prerrequisitos</small>';
  return `<button class="card estado-${normalizar(st).replace(" ","-")}" data-${paraPlan ? "elegir" : "curso"}="${c.id}" ${limitado ? "disabled" : ""}><span class="meta">SEM ${c.semester} · ${c.id} · ${c.credits} CLAR</span><strong>${c.name}</strong><span class="pill ${normalizar(st).replace(" ","-")}">${etiqueta}</span>${pista}${abre ? "<small class='impacto'>Al aprobarlo abres "+abre+(abre === 1 ? " curso" : " cursos")+"</small>" : ""}</button>`;
}
function mapa() {
  const q = normalizar($("buscar").value.trim()), f = $("filtro").value;
  const visibles = cursos.filter(c => normalizar(c.name+" "+c.id).includes(q) && (!f || estado(c,s) === f));
  if ($("orden").value === "estado") {
    const titulos = {Disponible:"Disponibles ahora", "En curso":"En curso", Bloqueado:"Bloqueados por prerrequisitos", Aprobado:"Aprobados"};
    $("grupos").innerHTML = Object.entries(titulos).map(([st,titulo]) => {
      const lista = visibles.filter(c => estado(c,s) === st);
      if (!lista.length) return "";
      return `<details ${st === "Disponible" || q || f ? "open" : ""}><summary>${titulo}<small>${lista.length}</small></summary><div class="grid inner">${lista.map(c => tarjeta(c)).join("")}</div></details>`;
    }).join("") || "<p>Ningún curso coincide con la búsqueda.</p>";
    return;
  }
  $("grupos").innerHTML = semestres.map(n => {
    const lista = visibles.filter(c => c.semester === n);
    if (!lista.length) return "";
    return `<details data-sem="${n}" ${q || f || expandidos.has(n) ? "open" : ""}><summary>Semestre ${n}<small>${lista.length} cursos</small></summary><div class="grid inner">${lista.map(c => tarjeta(c)).join("")}</div></details>`;
  }).join("") || "<p>Ningún curso coincide con la búsqueda.</p>";
}
function planificar() {
  const lista = s.seleccion.map(id => catalogo.get(id));
  const carga = sumar(lista);
  const max = limite(s);
  const saldo = max === null ? "Elige el rango de tu promedio para añadir cursos." : carga > max ? "Exceso de "+(carga-max)+" CLAR. Quita cursos para ajustar tu plan." : "Te quedan "+(max-carga)+" CLAR.";
  $("seleccion").innerHTML = `<p><strong>${carga}${max === null ? "" : " / "+max} CLAR</strong> · ${lista.length} cursos</p><p class="${max !== null && carga > max ? "warning" : ""}">${saldo}</p>` +
    lista.map(c => `<div class="choice"><span><b>${c.name}</b> · ${c.credits} CLAR<br><small>${!elegible(c,s) ? "Revisar requisitos o estado" : faltantes(c,s).length ? "Depende de aprobar "+faltantes(c,s).join(", ") : "Requisitos cumplidos"}</small></span><button data-quitar="${c.id}" aria-label="Quitar ${c.name}">Quitar</button></div>`).join("");
  const opciones = cursos.filter(c => elegible(c,s) && !s.seleccion.includes(c.id));
  $("opciones").innerHTML = opciones.map(c => tarjeta(c,true)).join("") || "<p>No hay más cursos elegibles con esta proyección.</p>";
}
function detalle(id) {
  abierto = id;
  const c = catalogo.get(id), siguientes = cursos.filter(x => x.req.includes(id));
  const nombres = (lista, conEstado) => lista.map(x => {
    const otros = faltantes(x,s).filter(r => r !== id);
    const abre = abreAlAprobar(c,s).some(curso => curso.id === x.id);
    const nota = conEstado ? (s.estados[x.id] || (estado(x,s) === "Disponible" ? "Pendiente · disponible para cursar" : "Pendiente · tiene prerrequisitos")) : s.estados[x.id] ? estado(x,s) : abre ? "Se abre al aprobar este curso" : otros.length ? "También requiere aprobar "+otros.map(r => catalogo.get(r).name).join(", ") : estado(x,s);
    return `<li><button class="ruta" data-curso="${x.id}">${x.name} · ${x.id}<small>${nota}</small></button></li>`;
  }).join("");
  const ruta = rutaPendiente(c,s);
  const previos = ruta.filter(x => !c.req.includes(x.id));
  const listaPrevia = previos.length ? '<h3>Clases previas que también te faltan</h3><p>En orden de prerrequisitos. Selecciona una clase para seguir su ruta.</p><ol>'+nombres(previos,true)+'</ol>' : "";
  const pendientes = faltantes(c,s).length;
  const resumen = c.req.length ? (pendientes ? "Te falta aprobar "+pendientes+" de "+c.req.length+" requisitos directos." : "Ya aprobaste todos los requisitos directos.") : "";
  $("contenido").innerHTML = `<span class="eyecode">CURSO ${id} · SEMESTRE ${c.semester}</span><h2 id="tituloCurso">${c.name}</h2><p>${c.credits} CLAR · ${estado(c,s)}</p><h3>Clases que necesitas para llevarla</h3><p>${resumen}</p>${c.req.length ? "<ul>"+nombres(c.req.map(r => catalogo.get(r)),true)+"</ul>" : "<p>Ingreso libre según la red.</p>"}${listaPrevia}<h3>Es requisito para</h3>${siguientes.length ? "<ul>"+nombres(siguientes,false)+"</ul>" : "<p>Sin cursos posteriores vinculados.</p>"}<h3>Mi registro</h3><div class="actions">${["Pendiente","En curso","Aprobado"].map(v => `<button data-estado="${v}" aria-pressed="${(s.estados[id] || "Pendiente") === v}">${v}</button>`).join("")}</div>`;
  $("detalle").setAttribute("aria-labelledby","tituloCurso");
  if (!$("detalle").open) $("detalle").showModal();
}
function render() {
  $("rango").value = s.rango;
  $("doble").checked = s.doble;
  $("actual").value = s.semestre;
  $("proyectar").checked = s.proyectar;
  const aprobados = cursos.filter(c => s.estados[c.id] === "Aprobado");
  const creditos = sumar(aprobados), pct = Math.min(100, Math.floor(creditos / 3));
  $("percent").textContent = pct+"%";
  $("dial").style.setProperty("--pct",pct+"%");
  $("aprobados").textContent = aprobados.length;
  $("cursando").textContent = cursos.filter(c => s.estados[c.id] === "En curso").length;
  $("disponibles").textContent = cursos.filter(c => estado(c,s) === "Disponible").length;
  $("creditos").textContent = creditos+" / 300";
  for (const v of ["mapa","plan","datos"]) $(v).hidden = v !== vista;
  document.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-current",b.dataset.view === vista ? "page" : "false"));
  if (vista === "mapa") mapa();
  if (vista === "plan") planificar();
}
$("actual").innerHTML = semestres.map(n => `<option value="${n}">${n}.</option>`).join("");
$("actual").onchange = () => { s.semestre = Number($("actual").value); expandidos.clear(); expandidos.add(s.semestre); guardar(); };
$("orden").onchange = mapa;
$("rango").onchange = () => { s.rango = $("rango").value; guardar(); };
$("doble").onchange = () => { s.doble = $("doble").checked; guardar(); };
$("buscar").oninput = mapa;
$("filtro").onchange = mapa;
$("proyectar").onchange = () => { s.proyectar = $("proyectar").checked; guardar(); };
$("grupos").addEventListener("toggle",e => {
  const n = Number(e.target.dataset.sem);
  if (n && !$("buscar").value && !$("filtro").value) {
    if (e.target.open) expandidos.add(n); else expandidos.delete(n);
  }
},true);
$("cerrar").onclick = () => $("detalle").close();
document.addEventListener("click",e => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.view) { vista = d.view; render(); }
  if (d.curso) detalle(d.curso);
  if (d.estado && abierto) {
    if (d.estado === "Pendiente") delete s.estados[abierto];
    else s.estados[abierto] = d.estado;
    s.seleccion = s.seleccion.filter(id => !s.estados[id]);
    guardar(); detalle(abierto);
  }
  if (d.elegir && elegible(catalogo.get(d.elegir),s) && cabe(catalogo.get(d.elegir),s) && !s.seleccion.includes(d.elegir)) {
    s.seleccion.push(d.elegir); guardar();
  }
  if (d.quitar) { s.seleccion = s.seleccion.filter(id => id !== d.quitar); guardar(); }
});
$("exportar").onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:"application/json"}));
  const link = document.createElement("a"); link.href = url; link.download = "mi-pensum-fiusac.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
};
$("importar").onclick = () => $("archivo").click();
$("archivo").onchange = async () => {
  const file = $("archivo").files[0];
  if (!file) return;
  try {
    if (file.size > 100000) throw Error();
    const copia = validar(JSON.parse(await file.text()));
    if (confirm("¿Reemplazar el avance de este navegador con el respaldo seleccionado?")) {
      s = copia; expandidos.clear(); expandidos.add(s.semestre); avisar("Respaldo importado."); guardar();
    }
  } catch { avisar("El archivo no es un respaldo válido de este plan."); }
  $("archivo").value = "";
};
render();
