"use strict";
const diasSemana={LU:"Lunes",MA:"Martes",MI:"Miércoles",JU:"Jueves",VI:"Viernes",SA:"Sábado",DO:"Domingo"};
const escHorario=t=>String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
let ofertaVista=null, periodoVista="", revisionHorario=0, elegidas=new Set();
function llaveHorario(){return planId+"-horario-"+periodoVista+"-"+(ofertaVista.anio??"referencia");}
function cruzan(a,b) {
  return a.bloques.some(x=>b.bloques.some(y=>x.inicio<y.fin && y.inicio<x.fin && x.dias.some(d=>y.dias.includes(d))));
}
function razonHorario(sec,seleccion) {
  if(sec.bloques.some(b=>/CERRAD/i.test(b.lugar))) return "Sección cerrada";
  if(seleccion.some(x=>x.id===sec.id && x.tipo===sec.tipo)) return "Ya elegiste otra sección";
  const cruce=seleccion.find(x=>cruzan(sec,x));
  if(cruce) return "Cruce con "+catalogo.get(cruce.id).name+" "+cruce.sec;
  if(sec.tipo==="Teoría"){
    const teoria=seleccion.filter(x=>x.tipo==="Teoría");
    if(periodoVista.startsWith("vacaciones") && (teoria.length>=2 || teoria.reduce((n,x)=>n+cargaSeccion(x),cargaSeccion(sec))>4)) return "Supera la carga de vacaciones";
    if(periodoVista.startsWith("semestre") && limite(s) && sumar([...teoria,sec].map(x=>catalogo.get(x.id)))>limite(s)) return "Supera el límite de créditos";
  }
  return "";
}
async function abrirHorario(forzar=false) {
  const turno=++revisionHorario, fecha=calendario(), solicitado=$("periodoHorario").value;
  let periodo=solicitado||fecha.actual, nota="";
  cancelarComparacion();
  ofertaVista=null; $("agenda").replaceChildren(); $("secciones").replaceChildren();
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
    prepararComparador();dibujarHorario();
  } catch {
    if(turno===revisionHorario) $("estadoHorario").textContent="No se pudo leer el horario. Reintenta o elige otro período.";
  }
}
function dibujarHorario() {
  if(!ofertaVista) return;
  const seleccion=ofertaVista.secciones.filter(x=>elegidas.has(x.clave));
  const q=normalizar($("filtroHorario").value.trim()), dia=$("diaHorario").value;
  const filas=ofertaVista.secciones.filter(x=>(!$("soloElegibles").checked || elegible(catalogo.get(x.id),s) || s.estados[x.id]==="En curso") && normalizar([catalogo.get(x.id).name,x.clave,...x.bloques.flatMap(b=>[b.docente,b.auxiliar])].join(" ")).includes(q) && (!dia || x.bloques.some(b=>b.dias.includes(dia))));
  const nombre=x=>escHorario(x.id+" · "+catalogo.get(x.id).name+" · "+x.tipo+" "+(x.sec||"sin sección"));
  const boton=(x,t,des=false)=>'<button data-seccion="'+escHorario(x.clave)+'" '+(des?"disabled":"")+'>'+escHorario(t)+'</button>';
  $("secciones").innerHTML=filas.map(x=>{
    const dentro=elegidas.has(x.clave), razon=dentro?"":razonHorario(x,seleccion);
    return '<article class="planbox"><strong>'+nombre(x)+'</strong>'+x.bloques.map(b=>'<p>'+escHorario(b.dias.join(" ")+" · "+b.inicio+"–"+b.fin+" · "+b.lugar)+'<br>'+escHorario("Docente: "+b.docente+" · Auxiliar: "+b.auxiliar)+'</p>').join("")+(x.restricciones?"<p>Ver restricciones en el horario oficial.</p>":"")+'<button data-preferida="'+escHorario(x.clave)+'" aria-pressed="'+favoritas.has(x.clave)+'">'+(favoritas.has(x.clave)?'★ Preferida':'☆ Preferir sección')+'</button> '+boton(x,dentro?"Quitar":razon||"Agregar",!!razon)+'</article>';
  }).join("")||"<p>Sin secciones para estos filtros.</p>";
  const dias=Object.entries(diasSemana).map(([id,d])=>{
    const bloques=seleccion.flatMap(x=>x.bloques.filter(b=>b.dias.includes(id)).map(b=>({x,b}))).sort((a,b)=>a.b.inicio.localeCompare(b.b.inicio));
    return bloques.length?'<section class="planbox"><h4>'+d+'</h4>'+bloques.map(({x,b})=>'<p><b>'+escHorario(b.inicio+"–"+b.fin)+'</b> '+nombre(x)+'<br>'+escHorario(b.lugar)+'</p>').join("")+'</section>':"";
  });
  $("agenda").innerHTML=seleccion.length?'<p>'+seleccion.length+' secciones · '+sumar(seleccion.filter(x=>x.tipo==="Teoría").map(x=>catalogo.get(x.id)))+' CLAR</p><div class="grid">'+dias.join("")+'</div>'+seleccion.map(x=>boton(x,"Quitar "+x.id+" "+x.sec)).join(" "):"<p>Agrega una sección para verla en tu semana.</p>";
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
