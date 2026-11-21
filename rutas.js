"use strict";
// Minimiza el número de períodos transcurridos para un calendario y una meta fijos.
function calcularRuta(s, cfg, presupuestoMs = 500) {
  const max = limite(s);
  const aprobados = id => s.estados[id] === "Aprobado" || (s.proyectar && s.estados[id] === "En curso");
  const hasta = cfg.meta === "dia" ? s.semestre : cfg.semestre;
  const modalidad = c => !["0799","7999"].includes(c.id) || c.id === cfg.seminario;
  const obligatorios = cursos.filter(c => modalidad(c) && (c.obligatorio || c.id === cfg.seminario));
  let meta;
  switch (cfg.meta) {
    case "curso": meta = [cfg.curso]; break;
    case "dia": meta = obligatorios.filter(c => c.semester <= hasta).map(c=>c.id); break;
    case "semestre": meta = obligatorios.filter(c => c.semester === hasta && !aprobados(c.id)).flatMap(c=>c.req); break;
    case "obligatorios": meta = obligatorios.map(c=>c.id); break;
    case "todo": meta = cursos.filter(modalidad).map(c=>c.id); break;
    default: throw Error("Selecciona una meta.");
  }
  const pendientes = new Set();
  function incluir(id) {
    if (aprobados(id) || pendientes.has(id)) return;
    pendientes.add(id);
    catalogo.get(id).req.forEach(incluir);
  }
  meta.forEach(incluir);
  if (!pendientes.size) return {ciclos:[],minima:true};
  if (!max) throw Error("Selecciona primero el rango de tu promedio para calcular el límite semestral.");
  const enCurso = [...pendientes].filter(id => s.estados[id] === "En curso");
  if (enCurso.length) throw Error("La meta depende de cursos actuales: "+enCurso.map(id=>catalogo.get(id).name).join(", ")+". Activa la proyección de aprobaciones o actualiza tu registro.");
  const lista = cursos.filter(c => pendientes.has(c.id));
  const idx = new Map(lista.map((c,i)=>[c.id,i]));
  const padres = lista.map(c=>c.req.filter(id=>idx.has(id)).map(id=>idx.get(id)));
  const hijos = lista.map(()=>[]);
  padres.forEach((ps,i)=>ps.forEach(p=>hijos[p].push(i)));
  const largo = lista.map(()=>1);
  for(let i=lista.length-1;i>=0;i--) for(const h of hijos[i]) largo[i]=Math.max(largo[i],1+largo[h]);
  const orden = lista.map((_,i)=>i).sort((a,b)=>largo[b]-largo[a] || hijos[b].length-hijos[a].length || lista[b].credits-lista[a].credits);
  // Una asignación factible sirve de cota superior y de respaldo para metas grandes.
  const esVac = t => cfg.vacaciones && t%2===0;
  const asignado = lista.map(()=>-1);
  let faltan=lista.length, t=0;
  while(faltan) {
    let carga=0, cantidad=0;
    for(const i of orden) {
      if(asignado[i]>=0 || padres[i].some(p=>asignado[p]<0 || asignado[p]===t)) continue;
      if(esVac(t) ? cantidad>=cfg.cupo : carga+lista[i].credits>max) continue;
      asignado[i]=t; cantidad++; carga+=lista[i].credits; faltan--;
    }
    t++;
  }
  let mejor=asignado.slice(), minima=true;
  const vence=Date.now()+presupuestoMs;
  const totalCreditos=sumar(lista), mayorCredito=Math.max(...lista.map(c=>c.credits));
  for(let horizonte=Math.max(...largo);horizonte<t;horizonte++) {
    const plazas=Array.from({length:horizonte},(_,j)=>esVac(j)?cfg.cupo*mayorCredito:max);
    if(plazas.reduce((a,b)=>a+b,0)<totalCreditos) continue;
    const colocados=lista.map(()=>-1), carga=plazas.map(()=>0), cantidad=plazas.map(()=>0);
    let vencido=false;
    function buscar(pos) {
      if(pos===orden.length) return true;
      if(Date.now()>=vence){vencido=true;return false;}
      const i=orden[pos], primero=Math.max(-1,...padres[i].map(p=>colocados[p]))+1;
      for(let j=primero;j<=horizonte-largo[i];j++) {
        if(esVac(j) ? cantidad[j]>=cfg.cupo : carga[j]+lista[i].credits>max) continue;
        colocados[i]=j;cantidad[j]++;carga[j]+=lista[i].credits;
        if(buscar(pos+1)) return true;
        colocados[i]=-1;cantidad[j]--;carga[j]-=lista[i].credits;
        if(vencido) return false;
      }
      return false;
    }
    if(buscar(0)){mejor=colocados;t=horizonte;break;}
    if(vencido){minima=false;break;}
  }
  return {minima,ciclos:Array.from({length:t},(_,j)=>({tipo:esVac(j)?"Vacaciones":"Semestre",ids:lista.filter((_,i)=>mejor[i]===j).map(c=>c.id)}))};
}
