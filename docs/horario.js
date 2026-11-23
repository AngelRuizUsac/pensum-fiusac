"use strict";
const diasSemana={LU:"Lunes",MA:"Martes",MI:"Miércoles",JU:"Jueves",VI:"Viernes",SA:"Sábado",DO:"Domingo"};
const escHorario=t=>String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
let ofertaVista=null, periodoVista="", revisionHorario=0, elegidas=new Set();
let perfilRapido=null;
function perfilDelHorario(){return perfilRapido??s;}
function llaveHorario(){return planId+"-horario-"+periodoVista+"-"+(ofertaVista.anio??"referencia");}
const sesionesPorSeccion=new WeakMap();
function sesionesHorario(sec){
  if(!sesionesPorSeccion.has(sec)) sesionesPorSeccion.set(sec,sec.bloques.map(b=>({dias:b.dias,inicio_min:NoHayCupo.hhmmToMin(b.inicio),fin_min:NoHayCupo.hhmmToMin(b.fin)})));
  return sesionesPorSeccion.get(sec);
}
function cruzan(a,b){
  return NoHayCupo.sesionesSeTraslapan(sesionesHorario(a),sesionesHorario(b));
}
function razonHorario(sec,seleccion) {
  if(sec.tipo==="Laboratorio" && s.labsGanados.includes(sec.id)) return "Laboratorio ganado";
  if(sec.bloques.some(b=>/CERRAD/i.test(b.lugar))) return "Sección cerrada";
  if(seleccion.some(x=>x.id===sec.id && x.tipo===sec.tipo)) return "Ya elegiste otra sección";
  const cruce=seleccion.find(x=>cruzan(sec,x));
  if(cruce) return "Cruce con "+catalogo.get(cruce.id).name+" "+cruce.sec;
  if(sec.tipo==="Teoría"){
    const teoria=seleccion.filter(x=>x.tipo==="Teoría");
    if(periodoVista.startsWith("vacaciones") && (teoria.length>=2 || teoria.reduce((n,x)=>n+cargaSeccion(x),cargaSeccion(sec))>4)) return "Supera la carga de vacaciones";
    if(periodoVista.startsWith("semestre") && limite(perfilDelHorario()) && sumar([...teoria,sec].map(x=>catalogo.get(x.id)))>limite(perfilDelHorario())) return "Supera el límite de créditos";
  }
  return "";
}
async function abrirHorario(forzar=false) {
  const turno=++revisionHorario, fecha=calendario(), solicitado=$("periodoHorario").value;
  let periodo=solicitado||fecha.actual, nota="";
  cancelarComparacion();
  $("cuentaHorario").textContent="";$("cuentaCursos").textContent="";
  ofertaVista=null; $("agenda").innerHTML=grillaSemanal([]); $("secciones").replaceChildren();
  $("estadoHorario").textContent="Consultando el horario oficial…";
  try {
    let datos;
    try {
      datos=await cargarOferta(periodo,forzar);
      if(!solicitado && periodo.startsWith("vacaciones") && datos.anio!==fecha.anio) throw Error();
    } catch(error) {
      if(!periodo.startsWith("vacaciones")) throw error;
      nota="Vacaciones sin oferta disponible. Se muestra el semestre correspondiente. ";
      periodo="semestre/"+periodo.slice(-1);
      datos=await cargarOferta(periodo,forzar);
    }
    if(turno!==revisionHorario) return;
    periodoVista=periodo; ofertaVista=datos;
    try { elegidas=new Set(JSON.parse(localStorage.getItem(llaveHorario())||"[]")); } catch { elegidas=new Set(); }
    $("estadoHorario").textContent=nota+nombresPeriodo[periodo]+" "+(datos.anio??"(año sin verificar)")+" · "+(datos.fuente?"Catálogo de "+datos.fuente+" · ":"")+(periodo===fecha.actual && datos.anio===fecha.anio?"Período actual":"Horario de referencia");
    $("fuenteHorario").href="https://usuarios.ingenieria.usac.edu.gt/horarios/"+periodo;
    prepararComparador();aplicarSugerenciaPendiente();dibujarHorario();
    if($("horario").dataset.modo==="auto") abrirOriginal();
  } catch {
    if(turno===revisionHorario) $("estadoHorario").textContent="No se pudo leer el horario. Reintenta o elige otro período.";
  }
}
function dibujarHorario() {
  if(!ofertaVista) return;
  let cambio=false;
  for(const sec of ofertaVista.secciones) if(sec.tipo==="Laboratorio" && s.labsGanados.includes(sec.id) && elegidas.delete(sec.clave)) cambio=true;
  if(cambio) try{localStorage.setItem(llaveHorario(),JSON.stringify([...elegidas]));}catch{avisar("No se pudo guardar tu selección.");}
  const seleccion=ofertaVista.secciones.filter(x=>elegidas.has(x.clave));
  const q=normalizar($("filtroHorario").value.trim()), dia=$("diaHorario").value;
  const perfil=perfilDelHorario();
  const modalidad=$("modalidadHorario").value.toUpperCase();
  const tipo=$("tipoHorario").value;
  const filas=ofertaVista.secciones.filter(x=>(!tipo || x.tipo===tipo) && (!modalidad || x.bloques.some(b=>b.lugar.toUpperCase().split(/[^A-Z]+/).includes(modalidad))) && (!$("soloElegibles").checked || elegible(catalogo.get(x.id),perfil) || perfil.estados[x.id]==="En curso") && normalizar([catalogo.get(x.id).name,x.clave,...x.bloques.flatMap(b=>[b.docente,b.auxiliar])].join(" ")).includes(q) && (!dia || x.bloques.some(b=>b.dias.includes(dia))));
  const nombre=x=>escHorario(x.id+" · "+catalogo.get(x.id).name+" · "+(x.tipo==="Teoría"?"Magistral":x.tipo)+" "+(x.sec||"sin sección"));
  const boton=(x,t,des=false)=>'<button data-seccion="'+escHorario(x.clave)+'" '+(des?"disabled":"")+'>'+escHorario(t)+'</button>';
  const tarjetaSeccion=x=>{
    const dentro=elegidas.has(x.clave), razon=dentro?"":razonHorario(x,seleccion);
    return '<article class="planbox"><strong>'+nombre(x)+'</strong>'+x.bloques.map(b=>'<p>'+escHorario(b.dias.join(" ")+" · "+b.inicio+"–"+b.fin+" · "+b.lugar)+'<br>'+escHorario("Docente: "+b.docente+" · Auxiliar: "+b.auxiliar)+'</p>').join("")+(x.restricciones?"<p>Ver restricciones en el horario oficial.</p>":"")+'<button data-preferida="'+escHorario(x.clave)+'" aria-pressed="'+favoritas.has(x.clave)+'">'+(favoritas.has(x.clave)?'★ Preferida':'☆ Preferir sección')+'</button> '+boton(x,dentro?"Quitar":razon||"Agregar",!!razon)+'</article>';
  };
  agruparCatalogo(filas,tarjetaSeccion);
  $("cuentaHorario").textContent=seleccion.length+" secciones";
  $("agenda").innerHTML=(seleccion.length?'<p>'+seleccion.length+' secciones · '+sumar(seleccion.filter(x=>x.tipo==="Teoría").map(x=>catalogo.get(x.id)))+' CLAR</p>':"<p>Agrega una sección o aplica un horario para ver tu semana.</p>")+grillaSemanal(seleccion)+seleccion.map(x=>boton(x,"Quitar "+x.id+" "+x.sec)).join(" ");
}
$("horario").addEventListener("click",e=>{
  const clave=e.target.closest("[data-seccion]")?.dataset.seccion;
  if(!clave || !ofertaVista) return;
  if(elegidas.has(clave)) elegidas.delete(clave);
  else {
    const sec=ofertaVista.secciones.find(x=>x.clave===clave);
    if(!sec || razonHorario(sec,ofertaVista.secciones.filter(x=>elegidas.has(x.clave)))) return;
    elegidas.add(clave);
  }
  try{localStorage.setItem(llaveHorario(),JSON.stringify([...elegidas]));}catch{avisar("No se pudo guardar tu selección.");}
  dibujarHorario();
});
$("periodoHorario").onchange=()=>abrirHorario();
$("refrescarHorario").onclick=()=>abrirHorario(true);
$("filtroHorario").oninput=dibujarHorario;
$("diaHorario").onchange=dibujarHorario;
$("soloElegibles").onchange=dibujarHorario;
$("diaHorario").innerHTML+=Object.entries(diasSemana).map(([id,d])=>'<option value="'+id+'">'+d+'</option>').join("");

function actualizarLaboratorioGanado(id, ganado){
  if(!catalogo.has(id)) return;
  s.labsGanados=s.labsGanados.filter(codigo=>codigo!==id);
  if(ganado) s.labsGanados.push(id);
  guardar();
  cancelarComparacion();
  dibujarHorario();
  if($("detalle").open) detalle(id);
}
document.addEventListener("change",e=>{
  const id=e.target.dataset.labGanado;
  if(!id || !catalogo.has(id)) return;
  actualizarLaboratorioGanado(id,e.target.checked);
  if($("originalHorario").hasAttribute("src")) abrirOriginal(true);
});
