"use strict";
const planId = "fiusac-sistemas-28-clar";
const catalogo = new Map(cursos.map(c => [c.id, c]));
function inicial() {
  return {plan: planId, version: 1, rango:"", doble:false, semestre: 1, estados: {}, seleccion: [], proyectar: false};
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
  return {...inicial(), rango:s.rango ?? "", doble:s.doble ?? false, semestre:s.semestre, estados:{...s.estados}, seleccion:[...s.seleccion], proyectar:s.proyectar};
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
