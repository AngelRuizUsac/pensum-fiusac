"use strict";
const planId = "fiusac-sistemas-28-clar";
const catalogo = new Map(cursos.map(c => [c.id, c]));
function inicial() {
  return {plan: planId, version: 1, labsGanados: [], horasVac: {}, noConfirmados:false, rango:"", doble:false, semestre: 1, estados: {}, seleccion: [], vacaciones: [], posteriores: [], proyectar: false};
}
function validar(s) {
  const estadosValidos = ["Aprobado", "En curso"];
  if (!s || s.plan !== planId || s.version !== 1 || !Number.isInteger(s.semestre) ||
      s.semestre < 1 || s.semestre > 10 || typeof s.proyectar !== "boolean" ||
      !s.estados || typeof s.estados !== "object" || Array.isArray(s.estados) ||
      !Object.entries(s.estados).every(([id, val]) => catalogo.has(id) && estadosValidos.includes(val)) ||
      !Array.isArray(s.seleccion) || !s.seleccion.every(id => catalogo.has(id)) ||
      new Set(s.seleccion).size !== s.seleccion.length) throw Error("Respaldo incompatible con este pénsum.");
  if (s.rango !== undefined && !["","bajo","medio","alto"].includes(s.rango) || s.doble !== undefined && typeof s.doble !== "boolean") throw Error("Perfil académico inválido.");
  const vacaciones = s.vacaciones ?? [], posteriores = s.posteriores ?? [];
  const listaValida = ids => Array.isArray(ids) && ids.every(id => catalogo.has(id)) && new Set(ids).size === ids.length;
  const labsGanados = s.labsGanados ?? [];
  if (!listaValida(labsGanados)) throw Error("Registro de laboratorios inválido.");
  if (!listaValida(vacaciones) || !Array.isArray(posteriores) || !posteriores.every(c => c && ["Semestre","Vacaciones"].includes(c.tipo) && listaValida(c.ids))) throw Error("Ciclos incompatibles.");
  const horasVac = s.horasVac ?? {};
  if (typeof horasVac !== "object" || Array.isArray(horasVac) || !Object.entries(horasVac).every(([id,h]) => catalogo.has(id) && [2,4].includes(h))) throw Error("Duración de vacaciones inválida.");
  const idsPlan = [...vacaciones,...s.seleccion,...posteriores.flatMap(c => c.ids)];
  if (new Set(idsPlan).size !== idsPlan.length) throw Error("Curso repetido en el plan.");
  return {...inicial(), labsGanados:[...labsGanados], horasVac:{...horasVac}, noConfirmados:s.noConfirmados===true, vacaciones:[...vacaciones], posteriores:posteriores.map(c => ({tipo:c.tipo,ids:[...c.ids]})), rango:s.rango ?? "", doble:s.doble ?? false, semestre:s.semestre, estados:{...s.estados}, seleccion:[...s.seleccion], proyectar:s.proyectar};
}
function faltantes(c, s, proyectar = false) {
  return c.req.filter(id => s.estados[id] !== "Aprobado" && !(proyectar && s.estados[id] === "En curso"));
}
function estado(c, s) {
  return s.estados[c.id] || (faltantes(c, s).length ? "Bloqueado" : "Disponible");
}
function elegible(c, s) {
  return !s.estados[c.id] && faltantes(c, s, s.proyectar).length === 0;
}
function sumar(lista) {
  return lista.reduce((total, c) => total + c.credits, 0);
}

function limite(s) {
  if (!s.rango) return null;
  return {bajo:32, medio:37, alto:42}[s.rango] + (s.doble ? 5 : 0);
}
function cabe(c, s) {
  const max = limite(s);
  return max !== null && sumar(s.seleccion.map(id => catalogo.get(id))) + c.credits <= max;
}
function abreAlAprobar(c, s) {
  return cursos.filter(x => !s.estados[x.id] && x.req.includes(c.id) &&
    faltantes(x,s).length === 1 && faltantes(x,s)[0] === c.id);
}

function rutaPendiente(c, s) {
  const vistos = new Set();
  const ruta = [];
  function visitar(id) {
    if (vistos.has(id) || s.estados[id] === "Aprobado") return;
    vistos.add(id);
    const requisito = catalogo.get(id);
    requisito.req.forEach(visitar);
    ruta.push(requisito);
  }
  c.req.forEach(visitar);
  return ruta;
}

function tipoCurso(id) {
  return catalogo.get(id).obligatorio ? "● Obligatorio" : "No obligatorio";
}

// El catálogo está ordenado topológicamente: los requisitos son de semestres previos.
function redPosterior(id, completa) {
  const niveles = new Map([[id,0]]);
  const aristas = [];
  for (const c of cursos) {
    const padres = c.req.filter(p => completa ? niveles.has(p) : p === id);
    if (!padres.length) continue;
    niveles.set(c.id,1 + Math.max(...padres.map(p => niveles.get(p))));
    for (const p of padres) aristas.push([p,c.id]);
  }
  return {niveles,aristas};
}

// Horas diarias de teoría, Escuela de Vacaciones 2026. Computación 1 corresponde a junio.
const horasPublicadas = {"0101":4,"0103":4,"0107":4,"0112":2,"0114":2,"0116":2,"0118":2,"0147":2,"0150":2,"0152":2,"0960":2};
function horasCurso(s,id,n=s.indiceVac ?? 0) {
  if(s.horasVac?.[id]) return s.horasVac[id];
  const h=typeof ofertas==="undefined" ? null : ofertas.get(periodoVac(n))?.horas.get(id);
  if(h!=null) return h<=2 ? 2 : Math.max(4,Math.ceil(h));
  return horasPublicadas[id] ?? 4;
}
function horasCiclo(s,ids) {
  return ids.reduce((total,id) => total + horasCurso(s,id), 0);
}
function ciclosDe(s) {
  return [{tipo:"Vacaciones",ids:s.vacaciones},{tipo:"Semestre",ids:s.seleccion},...s.posteriores];
}
function evaluarCiclos(s) {
  const simulacion = {...s,estados:{...s.estados}};
  let nVac=-1;
  return ciclosDe(s).map(ciclo => {
    if(ciclo.tipo==="Vacaciones") nVac++;
    const previo = {...simulacion,indiceVac:nVac,estados:{...simulacion.estados},seleccion:ciclo.ids};
    const carga = sumar(ciclo.ids.map(id=>catalogo.get(id)));
    const max = ciclo.tipo === "Semestre" ? limite(s) : null;
    const admisible = ciclo.tipo === "Vacaciones" ? horasCiclo(previo,ciclo.ids) <= 4 && ciclo.ids.length<=2 : (max !== null && carga <= max);
    const validos = ciclo.ids.filter(id => admisible && (ciclo.tipo!=="Vacaciones" || typeof permiteVac==="undefined" || permiteVac(s,id,nVac)) && elegible(catalogo.get(id),previo));
    validos.forEach(id => simulacion.estados[id] = "Aprobado");
    return {...ciclo, previo, carga, max, validos};
  });
}

function redDelCurso(id, modo = "ruta") {
  const visibles = new Set(redPosterior(id, modo !== "directa").niveles.keys());
  if (modo === "pensum") {
    cursos.forEach(c => visibles.add(c.id));
  } else if (modo === "directa") {
    catalogo.get(id).req.forEach(p => visibles.add(p));
  } else {
    // Incluye también las ramas que convergen en un curso posterior.
    for (const c of [...cursos].reverse()) {
      if (visibles.has(c.id)) c.req.forEach(p => visibles.add(p));
    }
  }
  const lista = cursos.filter(c => visibles.has(c.id));
  const semestresVisibles = [...new Set(lista.map(c => c.semester))];
  const niveles = new Map(lista.map(c => [c.id,semestresVisibles.indexOf(c.semester)]));
  const aristas = lista.flatMap(c => c.req.filter(p => visibles.has(p) &&
    (modo !== "directa" || c.id === id || p === id)).map(p => [p,c.id]));
  return {niveles,aristas};
}
