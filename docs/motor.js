"use strict";
const planId = "fiusac-sistemas-28-clar";
const catalogo = new Map(cursos.map(c => [c.id, c]));
function inicial() {
  return {plan: planId, version: 1, semestre: 1, estados: {}, seleccion: [], proyectar: false};
}
function validar(s) {
  const estadosValidos = ["Aprobado", "En curso"];
  if (!s || s.plan !== planId || s.version !== 1 || !Number.isInteger(s.semestre) ||
      s.semestre < 1 || s.semestre > 10 || typeof s.proyectar !== "boolean" ||
      !s.estados || typeof s.estados !== "object" || Array.isArray(s.estados) ||
      !Object.entries(s.estados).every(([id, val]) => catalogo.has(id) && estadosValidos.includes(val)) ||
      !Array.isArray(s.seleccion) || !s.seleccion.every(id => catalogo.has(id)) ||
      new Set(s.seleccion).size !== s.seleccion.length) throw Error("Respaldo incompatible con este pénsum.");
  return {...inicial(), semestre:s.semestre, estados:{...s.estados}, seleccion:[...s.seleccion], proyectar:s.proyectar};
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
