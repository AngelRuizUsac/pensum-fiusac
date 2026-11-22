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
  limpiarRuta();
  try { localStorage.setItem(planId, JSON.stringify(s)); }
  catch { avisar("Este navegador no pudo guardar el avance. Exporta un respaldo antes de salir."); }
  render();
}
function tarjeta(c, paraPlan = false, contexto = s, esVacaciones = false) {
  const st = estado(c,contexto);
  const falta = faltantes(c,contexto);
  const dependeDePlan = paraPlan && c.req.some(id => s.estados[id] !== "Aprobado");
  const abre = !paraPlan && st === "Disponible" ? abreAlAprobar(c,s).length : 0;
  const limitado = paraPlan && (esVacaciones ? (!permiteVac(contexto,c.id,contexto.indiceVac) || horasCiclo(contexto,[...contexto.seleccion,c.id]) > 4) : !cabe(c,contexto));
  const etiqueta = paraPlan ? (limitado ? (esVacaciones ? (!permiteVac(contexto,c.id,contexto.indiceVac) ? "Sin confirmar" : "Supera las 4 h") : limite(s) === null ? "Indica tu promedio" : "Supera el límite") : dependeDePlan ? "Condicional · añadir" : "Añadir al plan") : st;
  const pista = st === "Bloqueado" ? '<span class="requisitos"><b>Necesitas aprobar</b>'+falta.map(id => {
    const req = catalogo.get(id);
    const registro = s.estados[id] || "Pendiente";
    return '<span><em class="req-'+(registro === "Aprobado" ? "ok" : "falta")+'">'+registro+'</em> '+req.id+' · '+req.name+'</span>';
  }).join("")+'</span>' : "";
  return `<button class="card estado-${normalizar(st).replace(" ","-")}" data-${paraPlan ? "elegir" : "curso"}="${c.id}" ${limitado ? "disabled" : ""}><span class="meta">SEM ${c.semester} · ${c.id} · ${c.credits} CLAR</span><strong>${c.name}</strong><small class="tipo">${tipoCurso(c.id)}${esVacaciones ? " · "+etiquetaHoras(c.id,contexto.indiceVac)+" · "+estadoOferta(c.id,contexto.indiceVac) : ""}${s.labsGanados.includes(c.id) ? " · Laboratorio ganado" : tieneLaboratorio(c.id) ? " · Con laboratorio" : ""}</small><span class="pill ${normalizar(st).replace(" ","-")}">${etiqueta}</span>${pista}${abre ? "<small class='impacto'>Al aprobarlo abres "+abre+(abre === 1 ? " curso" : " cursos")+"</small>" : ""}</button>`;
}
function mapa() {
  const q = normalizar($("buscar").value.trim()), f = $("filtro").value;
  const visibles = cursos.filter(c => (!$("soloLabs").checked || tieneLaboratorio(c.id)) && normalizar(c.name+" "+c.id).includes(q) && (!f || estado(c,s) === f));
  function porSemestre(lista, malla = false) {
    return semestres.map(n => {
      const grupo = lista.filter(c => c.semester === n);
      if (!grupo.length) return "";
      const tarjetas = grupo.map(c => tarjeta(c)).join("");
      return malla ? `<section><h3>Semestre ${n}</h3>${tarjetas}</section>` :
        `<details ${q || f ? "open" : ""}><summary>Semestre ${n}<small>${grupo.length} cursos</small></summary><div class="grid inner">${tarjetas}</div></details>`;
    }).join("");
  }
  if ($("orden").value === "malla" && visibles.length) {
    $("grupos").innerHTML = '<div class="malla" tabindex="0" aria-label="Malla de cursos por semestre">'+porSemestre(visibles,true)+'</div>';
    return;
  }
  if ($("orden").value === "estado") {
    const titulos = {Disponible:"Disponibles ahora", "En curso":"En curso", Bloqueado:"Bloqueados por prerrequisitos", Aprobado:"Aprobados"};
    $("grupos").innerHTML = Object.entries(titulos).map(([st,titulo]) => {
      const lista = visibles.filter(c => estado(c,s) === st);
      if (!lista.length) return "";
      if (st === "Bloqueado") return `<details ${q || f ? "open" : ""}><summary>${titulo}<small>${lista.length}</small></summary><div class="inner">${porSemestre(lista)}</div></details>`;
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
let cicloActivo = 1;
function etiquetaHoras(id,n=0) {
  const referencia=ofertas.get(periodoVac(n))?.horas.get(id);
  if(!s.horasVac[id] && referencia) return referencia+" h de teoría";
  return s.horasVac[id] ? s.horasVac[id]+" h" : horasPublicadas[id] ? horasPublicadas[id]+" h de teoría (FIUSAC)" : "4 h reservadas (por confirmar)";
}
$("cursoHoras").innerHTML = cursos.map(c=>`<option value="${c.id}">${c.id} · ${c.name}</option>`).join("");
$("cursoHoras").onchange = () => {
  const id = $("cursoHoras").value;
  $("duracionVac").options[0].textContent = horasPublicadas[id] ? "Horario publicado · "+horasPublicadas[id]+" h" : "Sin confirmar";
  $("duracionVac").value = s.horasVac[id] ?? "";
};
$("duracionVac").onchange = () => {
  const id = $("cursoHoras").value, valor = Number($("duracionVac").value);
  if (valor) s.horasVac[id] = valor;
  else delete s.horasVac[id];
  guardar();
};
function planificar() {
  $("cursoHoras").onchange();
  const ciclos = evaluarCiclos(s);
  cicloActivo = Math.min(cicloActivo,ciclos.length-1);
  const actual = ciclos[cicloActivo], vac = actual.tipo === "Vacaciones";
  $("cronograma").innerHTML = ciclos.map((c,i) => {
    const cursosPlan = c.ids.map(id => catalogo.get(id).name + (c.validos.includes(id) ? "" : " (revisar)")).join(" · ");
    return `<div class="filaCiclo"><button data-ciclo="${i}" aria-pressed="${i === cicloActivo}"><b>${i+1}. ${c.tipo}</b> · ${c.carga} CLAR<small>${cursosPlan || "Sin cursos seleccionados"}</small></button>${i>=2 ? '<button data-borrar-ciclo="'+i+'" aria-label="Eliminar ciclo '+(i+1)+'">Eliminar</button>' : ""}</div>`;
  }).join("") + "<p><b>Total del plan: "+ciclos.reduce((n,c)=>n+c.carga,0)+" CLAR</b></p>";
  $("perfilCarga").hidden = false;
  $("seleccion").innerHTML = `<h3>Ciclo ${cicloActivo+1} · ${actual.tipo}</h3><p>${actual.carga} CLAR${vac ? " · "+horasCiclo(actual.previo,actual.ids)+" de 4 h"+(horasCiclo(actual.previo,actual.ids)>4 ? " · Supera el límite. Ajusta la selección para proyectar este período." : "") : actual.max === null ? " · Elige tu rango de promedio." : " de "+actual.max+" · Saldo: "+(actual.max-actual.carga)+" CLAR"}</p>` +
    actual.ids.map(id => {
      const c = catalogo.get(id), falta = faltantes(c,actual.previo,s.proyectar);
      const nota = actual.validos.includes(id) ? "Incluido en la proyección" : falta.length ? "Falta aprobar: "+falta.map(r=>catalogo.get(r).name).join(", ") : "Revisa el estado del curso o el límite de carga";
      return `<div class="choice"><span><b>${c.name}</b> · ${c.credits} CLAR<br><small>${vac ? etiquetaHoras(id,actual.previo.indiceVac)+" · "+estadoOferta(id,actual.previo.indiceVac)+" · " : ""}${nota}</small></span><button data-quitar="${id}">Quitar</button></div>`;
    }).join("");
  const usados = new Set(ciclos.flatMap(c=>c.ids));
  $("opciones").innerHTML = cursos.filter(c=>!usados.has(c.id) && (!vac || permiteVac(s,c.id,actual.previo.indiceVac)) && elegible(c,actual.previo)).map(c=>tarjeta(c,true,actual.previo,vac)).join("") || "<p>No hay más cursos elegibles en este ciclo.</p>";
}
let modoGrafo = "ruta";
function grafo(c) {
  const {niveles,aristas} = redDelCurso(c.id,modoGrafo);
  const columnas = [];
  for (const [id,nivel] of niveles) (columnas[nivel] ??= []).push(id);
  const posiciones = new Map();
  const alto = Math.max(...columnas.map(col => col.length))*10;
  const ancho = columnas.length*16-2;
  columnas.forEach((col,n) => col.forEach((id,i) => posiciones.set(id,{x:n*16,y:(alto-col.length*10)/2+i*10})));
  const lineas = aristas.map(([a,b]) => {
    const p = posiciones.get(a), q = posiciones.get(b);
    const x = p.x+14, y = p.y+4.5, fin = q.y+4.5;
    return `<path d="M ${x} ${y} C ${x+1.2} ${y}, ${q.x-1.2} ${fin}, ${q.x-.1} ${fin}" marker-end="url(#punta)"/>`;
  }).join("");
  const tarjetas = [...posiciones].map(([id,p]) => {
    const curso = catalogo.get(id), st = estado(curso,s);
    let nota = st;
    if (id !== c.id && curso.req.includes(c.id) && st === "Bloqueado") {
      const otros = faltantes(curso,s).filter(r => r !== c.id);
      nota = otros.length ? "También falta: "+otros.join(", ") : "Se abre al aprobar "+c.id;
    }
    return `<button class="nodo estado-${normalizar(st).replace(" ","-")}" style="left:${p.x}rem;top:${p.y}rem" data-nodo="${id}" ${id===c.id ? "disabled" : ""}><small>${id} · Sem. ${curso.semester}${id === c.id ? " · Seleccionado" : ""}</small><b>${curso.name}</b><span class="tipoNodo">${tipoCurso(id)}${tieneLaboratorio(id) ? " · Lab." : ""}</span><small>${nota}</small></button>`;
  }).join("");
  return `<h3>Grafo de cursos</h3><p>Las flechas conectan cada prerrequisito con el curso que lo necesita. Cada columna corresponde a un semestre.</p><label>Mostrar <select id="modoGrafo">${[["ruta","Ruta completa"],["directa","Conexiones directas"],["pensum","Pénsum completo"]].map(([valor,nombre]) => `<option value="${valor}" ${valor===modoGrafo ? "selected" : ""}>${nombre}</option>`).join("")}</select></label> <button data-ajustar>Ver todo el grafo</button><div class="grafo" role="region" aria-label="Grafo de prerrequisitos y cursos posteriores" tabindex="0"><div style="width:${ancho}rem;height:${alto}rem"><svg aria-hidden="true" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none"><defs><marker id="punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><polygon points="0,0 10,5 0,10" fill="#596779"/></marker></defs>${lineas}</svg>${tarjetas}</div></div>`;
}
function detalle(id) {
  if (abierto !== id || !$("detalle").open) modoGrafo = "ruta";
  abierto = id;
  const c = catalogo.get(id), st = estado(c,s);
  const enlaces = lista => lista.map(x => `<li><button class="ruta" data-curso="${x.id}">${x.id} · ${x.name}<small>${estado(x,s)}</small></button></li>`).join("");
  const lab = laboratorios.get(id);
  const infoLab = lab ? `<p>Con laboratorio · <a href="${lab.url}" target="_blank" rel="noopener">${lab.titulo}</a></p>` : "<p>Laboratorio por confirmar en el programa del ciclo.</p>";
  const directos = st === "Bloqueado" ? faltantes(c,s).map(r => catalogo.get(r)) : [];
  const previos = directos.length ? rutaPendiente(c,s).filter(x => !c.req.includes(x.id)) : [];

  $("contenido").innerHTML = `<span class="eyecode">CURSO ${id} · SEMESTRE ${c.semester}</span><h2 id="tituloCurso">${c.name}</h2><p>${c.credits} CLAR · ${st} · ${tipoCurso(id)}</p>${lab || !tieneLaboratorio(id) ? infoLab : ""}${tieneLaboratorio(id) ? controlLaboratorio(id) : ""}${["0799","7999"].includes(id) ? "<p>Para el cierre debes aprobar uno de los dos seminarios de investigación según tu modalidad de graduación.</p>" : ""}${directos.length ? "<h3>Te falta aprobar</h3><ul>"+enlaces(directos)+"</ul>" : ""}${previos.length ? "<h3>Clases previas pendientes</h3><ol>"+enlaces(previos)+"</ol>" : ""}<h3>Mi registro</h3><div class="actions">${["Pendiente","En curso","Aprobado"].map(v => `<button data-estado="${v}" aria-pressed="${(s.estados[id] || "Pendiente") === v}">${v}</button>`).join("")}</div>${grafo(c)}`;
  $("detalle").setAttribute("aria-labelledby","tituloCurso");
  if (!$("detalle").open) $("detalle").showModal();
  const region = $("contenido").querySelector(".grafo");
  const nodo = region.querySelector("[disabled]");
  region.scrollLeft = nodo.offsetLeft - (region.clientWidth-nodo.offsetWidth)/2;
  region.scrollTop = nodo.offsetTop - (region.clientHeight-nodo.offsetHeight)/2;
  $("modoGrafo").onchange = e => { modoGrafo = e.target.value; detalle(id); $("modoGrafo").focus(); };
}
function render() {
  document.body.dataset.vista=vista;
  $("noConfirmados").checked=!!s.noConfirmados;
  $("topePerfil").textContent = limite(s) ? "Máximo por promedio: "+limite(s)+" CLAR." : "Selecciona tu promedio en Mi límite de créditos.";
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
  for (const v of ["mapa","plan","horario","datos"]) $(v).hidden = v !== vista;
  document.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-current",b.dataset.view === vista ? "page" : "false"));
  if (vista === "mapa") mapa();
  if (vista === "plan") planificar();
}
$("actual").innerHTML = semestres.map(n => `<option value="${n}">${n}.</option>`).join("");
$("noConfirmados").onchange=()=>{s.noConfirmados=$("noConfirmados").checked; guardar();};
$("recargarOferta").onclick=()=>iniciarOfertaPlan(true);
$("actual").onchange = () => { s.semestre = Number($("actual").value); expandidos.clear(); expandidos.add(s.semestre); guardar(); };
$("orden").onchange = mapa;
$("rango").onchange = () => { s.rango = $("rango").value; guardar(); };
$("doble").onchange = () => { s.doble = $("doble").checked; guardar(); };
$("buscar").oninput = mapa;
$("filtro").onchange = mapa;
$("soloLabs").onchange = mapa;
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
  if (d.view) { vista = d.view; history.replaceState(null,"","#"+vista); render(); if(vista==="horario") abrirHorario(); if(vista==="plan") iniciarOfertaPlan(); }
  if (d.curso || d.nodo) detalle(d.curso || d.nodo);
  if ("ajustar" in d) {
    const region = $("contenido").querySelector(".grafo"), lienzo = region.firstElementChild;
    const reducir = !lienzo.style.zoom;
    lienzo.style.zoom = reducir ? Math.min(1,(region.clientWidth-26)/lienzo.offsetWidth,(innerHeight*.46-26)/lienzo.offsetHeight) : "";
    b.textContent = reducir ? "Ver tamaño normal" : "Ver todo el grafo";
    if (reducir) region.scrollTo(0,0);
  }
  if (d.estado && abierto) {
    if (d.estado === "Pendiente") delete s.estados[abierto];
    else s.estados[abierto] = d.estado;
    for (const ciclo of ciclosDe(s)) {
      const i = ciclo.ids.indexOf(abierto);
      if (i >= 0 && s.estados[abierto]) ciclo.ids.splice(i,1);
    }
    guardar(); detalle(abierto);
  }
  if (d.ciclo !== undefined) { cicloActivo = Number(d.ciclo); planificar(); }
  if (d.nuevo) {
    s.posteriores.push({tipo:d.nuevo,ids:[]});
    cicloActivo = ciclosDe(s).length-1;
    guardar();
  }
  if (d.borrarCiclo !== undefined) {
    const i = Number(d.borrarCiclo);
    if (!s.posteriores[i-2].ids.length || confirm("¿Eliminar este ciclo y su selección?")) {
      s.posteriores.splice(i-2,1);
      if (i <= cicloActivo) cicloActivo--;
      guardar();
    }
  }
  if (d.elegir) {
    const ciclos = evaluarCiclos(s), ciclo = ciclos[cicloActivo], c = catalogo.get(d.elegir);
    if (elegible(c,ciclo.previo) && !ciclos.some(x => x.ids.includes(c.id)) && (ciclo.tipo === "Vacaciones" ? permiteVac(s,c.id,ciclo.previo.indiceVac) && horasCiclo(ciclo.previo,[...ciclo.ids,c.id]) <= 4 : cabe(c,ciclo.previo))) {
      ciclo.ids.push(c.id); guardar();
    }
  }
  if (d.quitar) {
    const ids = ciclosDe(s)[cicloActivo].ids, i = ids.indexOf(d.quitar);
    if (i >= 0) ids.splice(i,1);
    guardar();
  }
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
