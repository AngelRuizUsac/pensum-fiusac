const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const entorno = vm.createContext({assert});
for (const nombre of ["cursos","motor"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,"docs",nombre+".js"),"utf8"),entorno);
}
vm.runInContext(`
  assert.equal(cursos.length,75);
  assert.equal(catalogo.size,cursos.length);
  assert.equal(new Set(cursos.map(c => c.semester)).size,10);
  for (const c of cursos) {
    assert.ok(Number.isInteger(c.credits) && c.credits >= 0);
    for (const id of c.req) assert.ok(catalogo.get(id).semester < c.semester);
  }
  const s = inicial();
  const mb2 = catalogo.get("0103");
  assert.equal(estado(mb2,s),"Bloqueado");
  s.estados["0101"] = "En curso";
  assert.equal(elegible(mb2,s),false);
  s.proyectar = true;
  assert.equal(elegible(mb2,s),true);
  assert.equal(estado(mb2,s),"Bloqueado");
  s.estados["0101"] = "Aprobado";
  assert.equal(estado(mb2,s),"Disponible");
  const ipc2 = catalogo.get("0771");
  for (const id of ipc2.req.slice(1)) s.estados[id] = "Aprobado";
  assert.equal(elegible(ipc2,s),false);
  s.estados[ipc2.req[0]] = "Aprobado";
  assert.equal(elegible(ipc2,s),true);
  s.seleccion.push(ipc2.id);
  assert.deepEqual(validar(JSON.parse(JSON.stringify(s))),s);
  assert.throws(() => validar({...s, semestre:0}));
  assert.throws(() => validar({...s, seleccion:["9999"]}));
  assert.throws(() => validar({...s, estados:{"0101":"inválido"}}));
`,entorno);
console.log("Catálogo, prerrequisitos, proyección y respaldo verificados.");
