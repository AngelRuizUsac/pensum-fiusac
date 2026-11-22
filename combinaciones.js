"use strict";
function medirSemana(secciones, favoritas) {
  const dias=new Map();
  for(const sec of secciones) for(const b of sec.bloques) for(const dia of b.dias){
    if(!dias.has(dia)) dias.set(dia,[]);
    dias.get(dia).push([minutos(b.inicio),minutos(b.fin)]);
  }
  let huecos=0,salida=0,entrada=1440;
  for(const bloques of dias.values()){
    bloques.sort((a,b)=>a[0]-b[0]);
    entrada=Math.min(entrada,bloques[0][0]);
    salida=Math.max(salida,bloques.at(-1)[1]);
    for(let i=1;i<bloques.length;i++) huecos+=bloques[i][0]-bloques[i-1][1];
  }
  return {dias:dias.size,huecos,salida,entrada,preferidas:secciones.filter(x=>favoritas.has(x.clave)).length};
}
function* combinarSecciones(grupos,favoritas,criterio,admite,presupuesto=150000){
  const mejores=[], parcial=[];
  let visitas=0,total=0,limitada=false;
  const opciones=grupos.map(g=>[...g].sort((a,b)=>Number(favoritas.has(b.clave))-Number(favoritas.has(a.clave)))).sort((a,b)=>a.length-b.length);
  function ordenar(a,b){
    const x=a.metrica,y=b.metrica;
    const principal=criterio==="entrada"?y.entrada-x.entrada:x[criterio]-y[criterio];
    return y.preferidas-x.preferidas || principal || x.huecos-y.huecos || x.dias-y.dias || x.salida-y.salida;
  }
  function* explorar(i){
    if(i===opciones.length){
      total++;
      const resultado={secciones:[...parcial],metrica:medirSemana(parcial,favoritas)};
      mejores.push(resultado); mejores.sort(ordenar); if(mejores.length>5) mejores.pop();
      return;
    }
    for(const sec of opciones[i]){
      if(visitas>=presupuesto){limitada=true;return;}
      if(++visitas%128===0) yield visitas;
      if(!admite(sec,parcial)) continue;
      parcial.push(sec); yield* explorar(i+1); parcial.pop();
      if(limitada) return;
    }
  }
  yield* explorar(0);
  return {mejores,total,limitada};
}
let contextoComparador="", deseados=new Set(), favoritas=new Set(), alternativas=[], busquedaHorario=0;
function cancelarComparacion(){
  busquedaHorario++; alternativas=[];
  $("alternativas").replaceChildren();
}
function prepararComparador(){
  cancelarComparacion();
  if(contextoComparador!==llaveHorario()) deseados=new Set();
  contextoComparador=llaveHorario();
  try {favoritas=new Set(JSON.parse(localStorage.getItem(llaveHorario()+"-preferidas")||"[]"));}catch{favoritas=new Set();}
  $("cicloHorario").innerHTML=ciclosDe(s).map((c,i)=>c.ids.length?'<option value="'+i+'">'+(i+1)+'. '+c.tipo+' · '+c.ids.length+' cursos</option>':"").join("");
  $("usarCicloHorario").disabled=!$("cicloHorario").options.length;
  listaDeseados();
}
function listaDeseados(){
  $("listaDeseados").innerHTML=[...deseados].map(id=>'<button data-retirar="'+id+'">'+escHorario(catalogo.get(id).name)+' ×</button>').join(" ") || "Todavía no elegiste cursos.";
  const q=normalizar($("buscarMateriaHorario").value.trim());
  $("materiaHorario").innerHTML=cursos.filter(c=>!deseados.has(c.id) && normalizar(c.name+" "+c.id).includes(q) && ofertaVista?.secciones.some(x=>x.id===c.id)).map(c=>'<option value="'+c.id+'">'+escHorario(c.id+" · "+c.name)+'</option>').join("");
}
$("buscarMateriaHorario").oninput=listaDeseados;
$("sumarMateriaHorario").onclick=()=>{
  const id=$("materiaHorario").value;
  if(id){deseados.add(id); cancelarComparacion(); listaDeseados();}
};
$("usarCicloHorario").onclick=()=>{
  const ciclo=ciclosDe(s)[Number($("cicloHorario").value)];
  if(!ciclo || !ofertaVista) return;
  if((ciclo.tipo==="Vacaciones")!==periodoVista.startsWith("vacaciones")){
    $("alternativas").textContent="Elegí un período de "+ciclo.tipo.toLowerCase()+" para ese ciclo.";return;
  }
  deseados=new Set(ciclo.ids); cancelarComparacion(); listaDeseados();
};
$("horario").addEventListener("click",e=>{
  const d=e.target.closest("button")?.dataset;
  if(!d || !ofertaVista) return;
  if(d.retirar){deseados.delete(d.retirar);cancelarComparacion();listaDeseados();}
  if(d.preferida){
    if(favoritas.has(d.preferida)) favoritas.delete(d.preferida);
    else { favoritas.add(d.preferida); deseados.add(d.preferida.split("/")[0]); listaDeseados(); }
    try{localStorage.setItem(llaveHorario()+"-preferidas",JSON.stringify([...favoritas]));}catch{}
    cancelarComparacion();dibujarHorario();
  }
  if(d.aplicarHorario!==undefined){
    const a=alternativas[Number(d.aplicarHorario)];
    if(!a || (elegidas.size && !confirm("¿Reemplazar las secciones de tu semana por esta opción?"))) return;
    elegidas=new Set(a.secciones.map(x=>x.clave));
    try{localStorage.setItem(llaveHorario(),JSON.stringify([...elegidas]));}catch{avisar("No se pudo guardar la selección.");}
    dibujarHorario();$("agenda").scrollIntoView({block:"start"});
  }
});
$("criteriosHorario").onchange=cancelarComparacion;
$("generarHorario").onclick=()=>{
  cancelarComparacion();
  const turno=busquedaHorario, salida=$("alternativas");
  if(!ofertaVista || !deseados.size){salida.textContent="Elige los cursos que querés combinar.";return;}
  const desde=$("horaEntrada").value,hasta=$("horaSalida").value;
  if(desde && hasta && desde>=hasta){salida.textContent="La hora de salida debe ser posterior a la de entrada.";return;}
  const libres=new Set([...document.querySelectorAll("[data-dia-libre]:checked")].map(x=>x.value));
  const grupos=[];
  for(const id of deseados){
    const secciones=ofertaVista.secciones.filter(x=>x.id===id);
    const tipos=new Set(secciones.map(x=>x.tipo));
    if(!tipos.has("Teoría")){salida.textContent=catalogo.get(id).name+" carece de sección de teoría publicada para este período.";return;}
    for(const tipo of tipos){
      if(tipo!=="Teoría" && !$("incluirLab").checked) continue;
      const candidatas=secciones.filter(x=>x.tipo===tipo && x.bloques.every(b=>(!desde || b.inicio>=desde) && (!hasta || b.fin<=hasta) && !b.dias.some(d=>libres.has(d)) && !/CERRAD/i.test(b.lugar)));
      if(!candidatas.length){salida.textContent=catalogo.get(id).name+" · "+tipo+" no tiene secciones dentro de tu disponibilidad.";return;}
      grupos.push(candidatas);
    }
  }
  const gen=combinarSecciones(grupos,favoritas,$("ordenHorario").value,(sec,otras)=>!razonHorario(sec,otras));
  const reloj=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
  function avanzar(){
    if(turno!==busquedaHorario || vista!=="horario")return;
    const fin=performance.now()+12;
    do{
      const paso=gen.next();
      if(!paso.done){salida.textContent="Comparando secciones…";continue;}
      const r=paso.value;alternativas=r.mejores;
      salida.innerHTML='<p>'+r.total+' horarios compatibles encontrados. '+(r.limitada?'Búsqueda parcial por cantidad de combinaciones. ':'')+(r.total?'Mostrando '+alternativas.length+'.':'Revisa tus cursos, días libres o límites de carga.')+'</p>'+alternativas.map((a,i)=>{
        const m=a.metrica;
        return '<details class="planbox" '+(!i?'open':'')+'><summary>Opción '+(i+1)+' · '+m.preferidas+' preferidas · '+m.dias+' días · '+m.huecos+' min libres entre clases</summary><p>Primera entrada '+reloj(m.entrada)+' · Última salida '+reloj(m.salida)+'</p>'+a.secciones.map(x=>'<p><b>'+escHorario(catalogo.get(x.id).name+" · "+x.tipo+" "+x.sec)+'</b>'+x.bloques.map(b=>'<br>'+escHorario(b.dias.join(" ")+" "+b.inicio+"–"+b.fin+" · "+b.docente+" · Auxiliar: "+b.auxiliar)).join("")+'</p>').join("")+'<button class="primary" data-aplicar-horario="'+i+'">Usar este horario</button></details>';
      }).join("");return;
    }while(performance.now()<fin);
    setTimeout(avanzar,0);
  }
  avanzar();
};
