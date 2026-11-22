const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const entorno = vm.createContext({assert});
for (const nombre of ["cursos","motor","rutas","laboratorios"]) {
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
  const rutaIPC2 = rutaPendiente(catalogo.get("0771"),s).map(c => c.id);
  assert.ok(rutaIPC2.indexOf("0101") >= 0 && rutaIPC2.indexOf("0101") < rutaIPC2.indexOf("0107"));
  assert.equal(new Set(rutaIPC2).size,rutaIPC2.length);
  assert.equal(rutaPendiente(catalogo.get("0103"),parcial).length,0);
  assert.equal(cursos.filter(c=>c.obligatorio).length,57);
  assert.equal(catalogo.get("0014").obligatorio,true);
  assert.equal(catalogo.get("0039").obligatorio,false);
  const directos = redPosterior("0101",false), completa = redPosterior("0101",true);
  assert.equal(directos.niveles.get("0103"),1);
  assert.ok(!directos.niveles.has("0771") && completa.niveles.has("0771"));
  for (const [a,b] of completa.aristas) assert.ok(catalogo.get(b).req.includes(a) && completa.niveles.get(a)<completa.niveles.get(b));
  assert.equal(redPosterior("0014",true).aristas.length,0);
  const anual = inicial();
  anual.rango = "bajo";
  anual.vacaciones = ["0101"];
  anual.seleccion = ["0103"];
  anual.posteriores = [{tipo:"Vacaciones",ids:["0107"]}];
  assert.deepEqual(evaluarCiclos(anual).map(c=>c.validos.length),[1,1,1]);
  assert.equal(estado(catalogo.get("0107"),anual),"Bloqueado");
  assert.deepEqual(validar(JSON.parse(JSON.stringify(anual))),anual);
  anual.vacaciones = [];
  assert.deepEqual(evaluarCiclos(anual).map(c=>c.validos.length),[0,0,0]);
  anual.vacaciones = ["0101","0103"];
  assert.deepEqual(evaluarCiclos(anual)[0].validos,[]);
  const par = {...inicial(),vacaciones:["0005","0017"], horasVac:{"0005":2,"0017":2}};
  assert.equal(evaluarCiclos(par)[0].validos.length,2);
  assert.equal(evaluarCiclos({...par,horasVac:{"0005":4,"0017":2}})[0].validos.length,0);
  assert.equal(evaluarCiclos({...par,vacaciones:[...par.vacaciones,"0101"],horasVac:{...par.horasVac,"0101":2}})[0].validos.length,0);
  const perfilPar = {...par, rango:"medio", estados:Object.fromEntries(cursos.filter(c=>!par.vacaciones.includes(c.id)).map(c=>[c.id,"Aprobado"]))};
  const rutaPar = calcularRuta(perfilPar,{meta:"dia",vacaciones:true});
  assert.deepEqual(rutaPar.ciclos,[{tipo:"Vacaciones",ids:par.vacaciones}]);
  assert.throws(()=>validar(anual));
  const rutaFisica = redDelCurso("0150");
  assert.ok(rutaFisica.niveles.has("0101") && rutaFisica.niveles.has("0152"));
  assert.ok(redDelCurso("0014").niveles.has("0732"));
  assert.equal(redDelCurso("0014","pensum").niveles.size,cursos.length);
  for (const [a,b] of rutaFisica.aristas) assert.ok(catalogo.get(b).req.includes(a) && rutaFisica.niveles.get(a)<rutaFisica.niveles.get(b));
  assert.equal(laboratorios.size,27);
  for (const [id,fuente] of laboratorios) assert.ok(catalogo.has(id) && fuente.url.startsWith("https://"));
  const perfilAuto = {...inicial(),rango:"bajo"};
  const opcionesAuto = {meta:"curso",curso:"0107",vacaciones:false,cupo:1,seminario:"0799",semestre:4};
  const rapida = calcularRuta(perfilAuto,opcionesAuto);
  assert.equal(rapida.minima,true);
  assert.deepEqual(rapida.ciclos.map(c=>c.ids),[["0101"],["0103"],["0107"]]);
  for (const meta of ["curso","dia","semestre","todo"]) for (const vacaciones of [true,false]) {
    const cfg = {...opcionesAuto,meta,vacaciones};
    const ruta = calcularRuta(perfilAuto,cfg,25);
    const hechos = new Set();
    for (const ciclo of ruta.ciclos) {
      if (ciclo.tipo==="Vacaciones") assert.ok(vacaciones && ciclo.ids.length<=cfg.cupo);
      else assert.ok(sumar(ciclo.ids.map(id=>catalogo.get(id)))<=32);
      for(const id of ciclo.ids) assert.ok(!hechos.has(id) && catalogo.get(id).req.every(p=>hechos.has(p)));
      ciclo.ids.forEach(id=>hechos.add(id));
    }
    if(meta==="todo") assert.equal(hechos.size,74);
  }
  assert.throws(()=>calcularRuta({...perfilAuto,estados:{"0101":"En curso"}},opcionesAuto));
  assert.deepEqual(calcularRuta({...perfilAuto,estados:{"0107":"Aprobado"}},opcionesAuto).ciclos,[]);
  for(const seminario of ["0799","7999"]) for(const vacaciones of [true,false]) {
    const perfil={...perfilAuto,estados:{"0101":"Aprobado"}};
    const ruta=calcularRuta(perfil,{...opcionesAuto,meta:"obligatorios",seminario,vacaciones},25);
    const esperados=cursos.filter(c=>c.id!=="0101" && (c.id===seminario || (c.obligatorio && c.id!=="0799"))).map(c=>c.id);
    assert.deepEqual(ruta.ciclos.flatMap(c=>c.ids).sort(),esperados.sort());
    esperados.forEach(id=>perfil.estados[id]="Aprobado");
    assert.equal(calcularRuta(perfil,{...opcionesAuto,meta:"obligatorios",seminario,vacaciones}).ciclos.length,0);
  }
  const busquedaExacta=explorarRutas({...inicial(),rango:"medio"},{...opcionesAuto,meta:"obligatorios",vacaciones:true,cupo:1});
  let pasoExacto=busquedaExacta.next();
  const cotaInicial=pasoExacto.value.propuesta.ciclos.length;
  while(!pasoExacto.done) pasoExacto=busquedaExacta.next();
  assert.ok(pasoExacto.value.minima && pasoExacto.value.ciclos.length<cotaInicial);
  assert.equal(pasoExacto.value.ciclos.length,15);
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
