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
  const legado = inicial(); delete legado.rango; delete legado.doble;
  assert.equal(validar(legado).rango,"");
  assert.equal(limite(s),null);
  for (const [rango,max] of [["bajo",32],["medio",37],["alto",42]]) {
    assert.equal(limite({...s,rango}),max);
    assert.equal(limite({...s,rango,doble:true}),max+5);
  }
  const candidato = catalogo.get("0101");
  const carga = {...s,rango:"bajo",seleccion:["0103","0107","0147"]};
  assert.equal(cabe(candidato,carga),true);
  carga.seleccion.push("0005");
  assert.equal(cabe(candidato,carga),false);
  assert.equal(cabe(candidato,s),false);
  assert.ok(abreAlAprobar(candidato,s).some(c => c.id === "0103"));
  assert.ok(!abreAlAprobar(candidato,s).some(c => c.id === "0771"));
  const parcial = {...s,estados:{"0101":"Aprobado"}};
  assert.equal(estado(catalogo.get("0103"),parcial),"Disponible");
  assert.equal(estado(catalogo.get("0103"),{...parcial,semestre:10}),"Disponible");
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
