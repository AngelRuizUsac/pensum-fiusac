"use strict";
function cambiarModo(auto){
  $("horario").dataset.modo=auto?"auto":"manual";
  $("modoManual").setAttribute("aria-pressed",String(!auto));
  $("modoAuto").setAttribute("aria-pressed",String(auto));
  $("mesaHorario").hidden=auto;
  $("vistaOriginal").hidden=!auto;
  if(auto) abrirOriginal();
  $("sitioCatalogo").hidden=auto;
  $("ajustesAuto").hidden=!auto;
  $("alternativas").hidden=!auto;
  $("tituloModo").textContent=auto?"Generá tu horario":"Encontrá tus cursos";
  if($("drawerCatalogo").open) $("drawerCatalogo").close();
  $(auto?"sitioDrawer":"sitioCatalogo").append($("catalogoHorario"));
}
$("modoManual").onclick=()=>cambiarModo(false);
$("modoAuto").onclick=()=>cambiarModo(true);
$("abrirCatalogo").onclick=()=>$("drawerCatalogo").showModal();
for(const boton of document.querySelectorAll("[data-cerrar]")) boton.onclick=()=>$(boton.dataset.cerrar).close();
$("modalidadHorario").onchange=dibujarHorario;
function agruparCatalogo(filas,tarjeta){
  const abiertos=new Set([...$("secciones").querySelectorAll("details[open]")].map(d=>d.dataset.grupo));
  const grupos=new Map();
  for(const sec of filas){if(!grupos.has(sec.id)) grupos.set(sec.id,[]);grupos.get(sec.id).push(sec);}
  $("cuentaCursos").textContent=grupos.size+" cursos";
  $("secciones").innerHTML=[...grupos].sort(([a],[b])=>a.localeCompare(b)).map(([id,secciones])=>{
    const modalidades=new Set(secciones.flatMap(x=>x.bloques.map(b=>b.lugar.split(" · ")[0])).filter(Boolean));
    return '<details data-grupo="'+id+'" '+(abiertos.has(id)?"open":"")+'><summary><span><small>'+id+'</small> <b>'+escHorario(catalogo.get(id).name)+'</b><em>'+secciones.length+' secciones · '+escHorario([...modalidades].join(" / "))+'</em></span></summary>'+secciones.map(tarjeta).join("")+'</details>';
  }).join("")||"<p>Sin cursos para estos filtros.</p>";
}

let borradorPerfil,edicionRapida=false,pendienteSugerencia=false;
function estimarSemestre(estados){
  const actuales=cursos.filter(c=>estados[c.id]==="En curso");
  if(actuales.length) return Math.max(...actuales.map(c=>c.semester));
  return cursos.find(c=>c.obligatorio && estados[c.id]!=="Aprobado")?.semester??10;
}
function abrirPerfil(rapido){
  edicionRapida=rapido;
  const perfil=rapido?perfilDelHorario():s;
  borradorPerfil={...perfil,estados:{...perfil.estados}};
  $("tituloPerfil").textContent=rapido?"Planificación rápida":"Mi pénsum";
  $("ayudaPerfil").textContent=rapido?"Elegí tu semestre y ajustá los cursos aprobados para proponer un horario en esta sesión.":"Actualizá tu semestre, promedio y cursos aprobados. El avance se guarda en Mi pénsum.";
  $("semestrePerfil").innerHTML='<option value="auto">Estimar según mi avance</option>'+semestres.map(n=>'<option value="'+n+'">Semestre '+n+'</option>').join("");
  $("semestrePerfil").value=rapido && !perfilRapido?"auto":String(perfil.semestre);
  $("promedioPerfil").value=perfil.rango;
  $("aplicarPerfil").textContent=rapido?"Proponer cursos":"Guardar mi pénsum";
  $("materiasPerfil").innerHTML=semestres.map(n=>'<details '+(n===perfil.semestre?"open":"")+'><summary>Semestre '+n+'</summary>'+cursos.filter(c=>c.semester===n).map(c=>'<label><input type="checkbox" data-aprobada="'+c.id+'" '+(perfil.estados[c.id]==="Aprobado"?"checked":"")+'> '+c.id+' · '+escHorario(c.name)+'</label>').join("")+'</details>').join("");
  resumenBorrador();$("perfilHorario").showModal();
}
function resumenBorrador(){
  const sugerido=estimarSemestre(borradorPerfil.estados);
  $("estimacion").textContent="Semestre estimado según tu avance: "+sugerido+". Podés elegir otro.";
  $("resumenPerfil").textContent=Object.values(borradorPerfil.estados).filter(e=>e==="Aprobado").length+" cursos aprobados";
}
$("editarPerfil").onclick=()=>abrirPerfil(false);
$("abrirRapida").onclick=()=>abrirPerfil(true);
$("materiasPerfil").onchange=e=>{
  const id=e.target.dataset.aprobada;
  if(!id)return;
  if(e.target.checked)borradorPerfil.estados[id]="Aprobado";else delete borradorPerfil.estados[id];
  resumenBorrador();
};
$("marcarPrevios").onclick=()=>{
  const n=Number($("semestrePerfil").value)||estimarSemestre(borradorPerfil.estados);
  for(const c of cursos.filter(c=>c.obligatorio && c.semester<n)){
    borradorPerfil.estados[c.id]="Aprobado";
    $("materiasPerfil").querySelector('[data-aprobada="'+c.id+'"]').checked=true;
  }
  resumenBorrador();
};
function aplicarSugerenciaPendiente(){
  if(!pendienteSugerencia||!ofertaVista||!perfilRapido)return;
  pendienteSugerencia=false;
  const seleccion=[];
  const candidatas=cursos.filter(c=>elegible(c,perfilRapido)).sort((a,b)=>Number(b.obligatorio)-Number(a.obligatorio)||Math.abs(a.semester-perfilRapido.semestre)-Math.abs(b.semester-perfilRapido.semestre));
  for(const c of candidatas){
    const sec=ofertaVista.secciones.find(x=>x.id===c.id && x.tipo==="Teoría" && !razonHorario(x,seleccion));
    if(sec && (periodoVista.startsWith("vacaciones") || sumar(seleccion.map(x=>catalogo.get(x.id)))+c.credits<=(limite(perfilRapido)??32))) seleccion.push(sec);
  }
  deseados=new Set(seleccion.map(x=>x.id));
  iniciarOriginalCon([...deseados]);
  cancelarComparacion();listaDeseados();
  $("notaRapida").textContent="Semestre "+perfilRapido.semestre+" · "+seleccion.length+" cursos sugeridos."+(!perfilRapido.rango && periodoVista.startsWith("semestre")?" Se usaron 32 CLAR como máximo provisional.":"")+" Compará sus secciones y laboratorios.";
}
$("quitarRapida").onclick=()=>{
  perfilRapido=null;pendienteSugerencia=false;deseados.clear(); iniciarOriginalCon([]);$("soloElegibles").checked=false;$("perfilActivo").hidden=true;
  cancelarComparacion();listaDeseados();dibujarHorario();
};
$("formPerfil").onsubmit=e=>{
  e.preventDefault();
  borradorPerfil.semestre=Number($("semestrePerfil").value)||estimarSemestre(borradorPerfil.estados);
  borradorPerfil.rango=$("promedioPerfil").value;
  if(edicionRapida){
    perfilRapido=borradorPerfil;pendienteSugerencia=true;cambiarModo(true);
    $("perfilActivo").hidden=false;$("notaRapida").textContent="Semestre "+perfilRapido.semestre+" · Esperando la oferta.";
    $("soloElegibles").checked=true;aplicarSugerenciaPendiente();
  }else{
    s.semestre=borradorPerfil.semestre;s.estados=borradorPerfil.estados;s.rango=borradorPerfil.rango;
    perfilRapido=null;pendienteSugerencia=false;$("perfilActivo").hidden=true;guardar();cancelarComparacion();listaDeseados();
  }
  $("perfilHorario").close();dibujarHorario();
};

let cursosParaOriginal=null,ultimoPeriodoOriginal="";
function codigoPeriodoOriginal(){
  const p=periodoVista||$("periodoHorario").value||calendario().actual;
  return (p.startsWith("vacaciones")?"v":"")+p.at(-1);
}
function contextoAutomatico(){
  const perfil=perfilDelHorario(),cursos=cursosParaOriginal;
  cursosParaOriginal=null;
  return {preferidas:[...favoritas],periodo:codigoPeriodoOriginal(),tema:document.documentElement.dataset.tema==="oscuro"?"dark":"light",cursos,
    aprobados:Object.entries(perfil.estados).filter(([,e])=>e==="Aprobado").map(([id])=>id)};
}
function validarCargaAutomatica(ids,periodo){
  const perfil=perfilDelHorario();
  if(periodo.startsWith("v")){
    const horas=ofertas.get("vacaciones/"+periodo.at(-1))?.horas;
    if(ids.length>2 || ids.reduce((n,id)=>n+(perfil.horasVac[id]??horas?.get(id)??horasPublicadas[id]??4),0)>4) return "Vacaciones permite un curso de 4 h o hasta dos de 2 h.";
  }else if(limite(perfil) && ids.reduce((n,id)=>n+(catalogo.get(id)?.credits??0),0)>limite(perfil))return "La selección supera el máximo de créditos de tu perfil.";
  return "";
}
function abrirOriginal(forzar=false){
  const marco=$("originalHorario"),periodo=codigoPeriodoOriginal();
  $("cicloOriginal").innerHTML=ciclosDe(s).map((c,i)=>c.ids.length?'<option value="'+i+'">'+(i+1)+'. '+c.tipo+' · '+c.ids.length+' cursos</option>':"").join("");
  $("importarCiclo").disabled=!$("cicloOriginal").options.length;
  if(!marco.hasAttribute("src") || periodo!==ultimoPeriodoOriginal || forzar){
    if(!marco.hasAttribute("src") && cursosParaOriginal===null && deseados.size)cursosParaOriginal=[...deseados];
    ultimoPeriodoOriginal=periodo;marco.src="automatico/index.html?v=18";
  }
}
function iniciarOriginalCon(ids){cursosParaOriginal=ids;abrirOriginal(true);}
$("importarCiclo").onclick=()=>{
  const ciclo=ciclosDe(s)[Number($("cicloOriginal").value)];
  if(!ciclo?.ids.length)return;
  if((ciclo.tipo==="Vacaciones")!==codigoPeriodoOriginal().startsWith("v")){$("avisoOriginal").textContent="Elegí el período correspondiente al ciclo.";return;}
  iniciarOriginalCon([...ciclo.ids]);$("avisoOriginal").textContent="Cursos enviados al generador.";
};
$("guardarOriginal").onclick=()=>{
  const r=$("originalHorario").contentWindow?.leerSeccionesAutomaticas?.();
  const informar=msg=>$("avisoOriginal").textContent=msg;
  if(!r?.cursos?.length)return informar("Generá y elegí un horario primero.");
  if(!ofertaVista || r.periodo!==codigoPeriodoOriginal())return informar("Seleccioná el mismo período en Mi horario y en el generador.");
  const nuevas=[];
  for(const c of r.cursos) for(const k of c.opcion.componentes){
    const tipo=k.categoria==="Clase"?"Teoría":k.categoria.toLowerCase()==="trabajo dirigido"?"Trabajo dirigido":k.categoria;
    const sec=ofertaVista.secciones.find(x=>x.id===c.codigo && x.tipo===tipo && x.sec===k.seccion);
    if(!sec)return informar("La sección "+c.codigo+" "+k.seccion+" falta en la oferta de tu pénsum.");
    const razon=razonHorario(sec,nuevas);if(razon)return informar(razon);nuevas.push(sec);
  }
  if(elegidas.size && !confirm("¿Reemplazar las secciones de tu semana con este horario?"))return;
  elegidas=new Set(nuevas.map(sec=>sec.clave));
  try{localStorage.setItem(llaveHorario(),JSON.stringify([...elegidas]));}catch{avisar("No se pudo guardar la selección.");}
  cambiarModo(false);dibujarHorario();informar("");
};
