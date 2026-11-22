"use strict";
// Minimiza el número de períodos transcurridos para un calendario y una meta fijos.
function llenarOptativos(s,cfg,ruta) {
  const ocupados = new Set(ruta.ciclos.flatMap(c=>c.ids));
  const previos = {...s,estados:{...s.estados}};
  const max = cfg.maximo ?? limite(s);
  for (const ciclo of ruta.ciclos) {
    const vac = ciclo.tipo === "Vacaciones";
    let carga = vac ? horasCiclo(s,ciclo.ids) : sumar(ciclo.ids.map(id=>catalogo.get(id)));
    const saldo = (vac ? 4 : max) - carga;
    // Mochila 0/1: entre los optativos elegibles, aprovecha el mayor número de CLAR.
    const opciones = Array(saldo+1).fill(null);
    opciones[0] = {creditos:0,ids:[]};
    for (const c of cursos) {
      if (c.obligatorio || ["0799","7999"].includes(c.id) || ocupados.has(c.id) || !elegible(c,previos)) continue;
      const peso = vac ? horasCurso(s,c.id) : c.credits;
      for (let n=saldo;n>=peso;n--) {
        const previo = opciones[n-peso];
        if (previo && previo.creditos+c.credits > (opciones[n]?.creditos ?? -1))
          opciones[n] = {creditos:previo.creditos+c.credits,ids:[...previo.ids,c.id]};
      }
    }
    const mejor = opciones.reduce((a,b)=>b && b.creditos>a.creditos ? b : a,opciones[0]);
    ciclo.ids.push(...mejor.ids);
    mejor.ids.forEach(id=>ocupados.add(id));
    for (const id of ciclo.ids) previos.estados[id]="Aprobado";
  }
}
function* explorarRutas(s,cfg) {
  if (cfg.meta !== "fases") return yield* resolverMeta(s,cfg);
  const primera = yield* etapa(s,{...cfg,meta:"obligatorios"},"Obligatorios");
  const estados = {...s.estados};
  for (const ciclo of primera.ciclos) for (const id of ciclo.ids) estados[id]="Aprobado";
  const segunda = yield* etapa({...s,estados},{...cfg,meta:"todo",extras:false,
    inicio:primera.ciclos.length},"Optativos");
  return {ciclos:[...primera.ciclos,...segunda.ciclos],fases:true,corte:primera.ciclos.length};
}
function* etapa(s,cfg,nombre) {
  const generador=resolverMeta(s,cfg);
  for (let paso=generador.next();;paso=generador.next()) {
    if (paso.done) return paso.value;
    yield {etapa:nombre,horizonte:paso.value.horizonte};
  }
}
function* resolverMeta(s, cfg) {
  const oficial = limite(s);
  const max = cfg.maximo ?? oficial;
  if (cfg.maximo != null && (!Number.isInteger(max) || max<1 || (oficial && max>oficial)))
    throw Error("El máximo debe ser un entero entre 1 y el límite de tu promedio.");
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
  if (!oficial) throw Error("Selecciona primero el rango de tu promedio para calcular el límite semestral.");
  const enCurso = [...pendientes].filter(id => s.estados[id] === "En curso");
  if (enCurso.length) throw Error("La meta depende de cursos actuales: "+enCurso.map(id=>catalogo.get(id).name).join(", ")+". Activa la proyección de aprobaciones o actualiza tu registro.");
  const lista = cursos.filter(c => pendientes.has(c.id));
  if (!cfg.vacaciones && lista.some(c=>c.credits>max)) throw Error("Hay cursos que superan tu máximo personal. Aumenta el límite o habilita vacaciones.");
  const idx = new Map(lista.map((c,i)=>[c.id,i]));
  const padres = lista.map(c=>c.req.filter(id=>idx.has(id)).map(id=>idx.get(id)));
  const hijos = lista.map(()=>[]);
  padres.forEach((ps,i)=>ps.forEach(p=>hijos[p].push(i)));
  const largo = lista.map(()=>1);
  for(let i=lista.length-1;i>=0;i--) for(const h of hijos[i]) largo[i]=Math.max(largo[i],1+largo[h]);
  const orden = lista.map((_,i)=>i).sort((a,b)=>largo[b]-largo[a] || hijos[b].length-hijos[a].length || lista[b].credits-lista[a].credits);
  // Una asignación factible sirve de cota superior y de respaldo para metas grandes.
  const esVac = t => cfg.vacaciones && (t+(cfg.inicio ?? 0))%2===0;
  const horas = lista.map(c => horasCurso(s,c.id));
  const asignado = lista.map(()=>-1);
  let faltan=lista.length, t=0;
  while(faltan) {
    let carga=0, horasUsadas=0;
    for(const i of orden) {
      if(asignado[i]>=0 || padres[i].some(p=>asignado[p]<0 || asignado[p]===t)) continue;
      if(esVac(t) ? horasUsadas+horas[i]>4 : carga+lista[i].credits>max) continue;
      asignado[i]=t; horasUsadas+=horas[i]; carga+=lista[i].credits; faltan--;
    }
    t++;
  }

  function resultado(solucion, longitud, minima) {
    const ciclos = Array.from({length:longitud},(_,j)=>({
      tipo:esVac(j)?"Vacaciones":"Semestre",
      ids:lista.filter((_,i)=>solucion[i]===j).map(c=>c.id)
    }));
    const ruta = {ciclos,minima};
    if (cfg.extras) llenarOptativos(s,cfg,ruta);
    return ruta;
  }
  const inicialFactible = resultado(asignado,t,false);
  let visitas=0;
  for(let horizonte=Math.max(...largo);horizonte<t;horizonte++) {
    yield {propuesta:inicialFactible,horizonte,visitas};
    const puestos=lista.map(()=>-1);
    const carga=Array(horizonte).fill(0), horasUsadas=Array(horizonte).fill(0);
    function* buscar(restantes) {
      if(!restantes) return true;
      if(++visitas%64===0) yield {horizonte,visitas};
      const desde=[], hasta=[], dominios=[];
      function cabeEn(i,j) {
        if(puestos[i]>=0) return puestos[i]===j;
        return esVac(j) ? horasUsadas[j]+horas[i]<=4 : carga[j]+lista[i].credits<=max;
      }
      // Propaga ambos extremos por el grafo antes de elegir la materia más restringida.
      for(let i=0;i<lista.length;i++) {
        let j=Math.max(-1,...padres[i].map(p=>desde[p]))+1;
        while(j<horizonte && !cabeEn(i,j)) j++;
        if(j===horizonte) return false;
        desde[i]=j;
      }
      for(let i=lista.length-1;i>=0;i--) {
        let j=Math.min(horizonte,...hijos[i].map(h=>hasta[h]))-1;
        while(j>=desde[i] && !cabeEn(i,j)) j--;
        if(j<desde[i]) return false;
        hasta[i]=j;
      }
      let elegido=-1;
      for(const i of orden) {
        if(puestos[i]>=0) continue;
        const opciones=[];
        for(let j=desde[i];j<=hasta[i];j++) if(cabeEn(i,j)) opciones.push(j);
        dominios[i]=opciones;
        if(elegido<0 || opciones.length<dominios[elegido].length) elegido=i;
      }
      // Descarta ventanas cuya carga obligada supera incluso su capacidad más favorable.
      for(let a=0;a<horizonte;a++) {
        let capacidad=0;
        for(let b=a;b<horizonte;b++) {
          if(esVac(b)) {
            const pesos=lista.filter((c,i)=>puestos[i]<0 && dominios[i].includes(b)).map(c=>c.credits).sort((u,v)=>v-u);
            capacidad+=pesos.slice(0,Math.floor((4-horasUsadas[b])/2)).reduce((n,k)=>n+k,0);
          } else capacidad+=max-carga[b];
          let exigida=0;
          for(let i=0;i<lista.length;i++) if(puestos[i]<0 && desde[i]>=a && hasta[i]<=b) exigida+=lista[i].credits;
          if(exigida>capacidad) return false;
        }
      }
      for(const j of dominios[elegido]) {
        puestos[elegido]=j; horasUsadas[j]+=horas[elegido]; carga[j]+=lista[elegido].credits;
        if(yield* buscar(restantes-1)) return true;
        puestos[elegido]=-1; horasUsadas[j]-=horas[elegido]; carga[j]-=lista[elegido].credits;
      }
      return false;
    }
    if(yield* buscar(lista.length)) return resultado(puestos,horizonte,true);
  }
  return resultado(asignado,t,true);
}
// Para verificaciones síncronas. La interfaz consume el generador en segundo plano.
function calcularRuta(s,cfg,presupuestoMs=Infinity) {
  const busqueda=explorarRutas(s,cfg), fin=Date.now()+presupuestoMs;
  let mejor;
  while(true) {
    const paso=busqueda.next();
    if(paso.done) return paso.value;
    if(paso.value.propuesta) mejor=paso.value.propuesta;
    if(mejor && Date.now()>=fin) return mejor;
  }
}
