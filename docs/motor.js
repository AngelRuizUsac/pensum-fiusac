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

// Ambos seminarios exigen la misma cadena de prerrequisitos. Las prácticas
// también forman parte del cierre indicado en la red CLAR 2025 de FIUSAC.
// Las dos humanísticas de 3 CLAR son necesarias para alcanzar 8 de 10.
const esenciales = new Set(["0017","0019","2025","2036","2009"]);
function incluirRequisitos(id) {
  for (const previo of catalogo.get(id).req) {
    if (esenciales.has(previo)) continue;
    esenciales.add(previo);
    incluirRequisitos(previo);
  }
}
for (const id of ["0799","7999","2025","2036","2009"]) incluirRequisitos(id);
function tipoCurso(id) {
  if (["0799","7999"].includes(id)) return "Obligatorio según modalidad";
  if (esenciales.has(id)) return "Obligatorio";
  if (["0006","0008","0009","0011"].includes(id)) return "No obligatorio · vía de inglés";
  if (["0001","0010","0018"].includes(id)) return "No obligatorio · elección de área";
  return "Obligatoriedad por confirmar";
}
