"use strict";
const esquema = matchMedia("(prefers-color-scheme: dark)");
let temaElegido="sistema";
try { temaElegido=localStorage.getItem("fiusac-tema")||"sistema"; } catch {}
function aplicarTema(){
  document.documentElement.dataset.tema=temaElegido==="sistema"?(esquema.matches?"oscuro":"claro"):temaElegido;
}
aplicarTema();
esquema.addEventListener("change",aplicarTema);
document.addEventListener("DOMContentLoaded",()=>{
  const selector=document.getElementById("temaInterfaz");
  selector.value=temaElegido;
  selector.onchange=()=>{
    temaElegido=selector.value;aplicarTema();
    try{localStorage.setItem("fiusac-tema",temaElegido);}catch{}
  };
  function ir(){const id=location.hash.slice(1);if(["horario","mapa","plan","datos"].includes(id) && vista!==id) document.querySelector('[data-view="'+id+'"]').click();}
  ir();window.addEventListener("hashchange",ir);
});

// Agenda por columnas y franjas, adaptada del patrón AgendaGrid de FisioGest.
function grillaSemanal(secciones){
  const dias=Object.entries(diasSemana).filter(([dia])=>!["SA","DO"].includes(dia) || secciones.some(s=>s.bloques.some(b=>b.dias.includes(dia))));
  const bloques=secciones.flatMap(s=>s.bloques);
  const inicio=bloques.length?Math.floor(Math.min(...bloques.map(b=>minutos(b.inicio)))/60):7;
  const fin=bloques.length?Math.ceil(Math.max(...bloques.map(b=>minutos(b.fin)))/60):13;
  const franjas=Array.from({length:fin-inicio},(_,i)=>inicio+i);
  const escala=franjas.map(h=>'<div>'+NoHayCupo.minToHHMM(h*60)+'</div>').join("");
  const columnas=dias.map(([dia,nombre])=>{
    const eventos=secciones.flatMap(sec=>sec.bloques.filter(b=>b.dias.includes(dia)).map(b=>{
      const ficha=catalogo.get(sec.id).name+" · "+sec.tipo+" "+sec.sec;
      const t=b.inicio+"–"+b.fin;
      const detalle=[ficha,t,b.docente,"Auxiliar: "+b.auxiliar,b.lugar].join(" · ");
      return '<div class="evento" data-tono="'+(sec.tipo==="Teoría"?"teoria":"lab")+'" style="top:'+((minutos(b.inicio)-inicio*60)/60*5)+'rem;height:'+((minutos(b.fin)-minutos(b.inicio))/60*5)+'rem" tabindex="0" title="'+escHorario(detalle)+'" aria-label="'+escHorario(detalle)+'"><b>'+escHorario(t)+'</b><span>'+escHorario(ficha)+'</span></div>';
    })).join("");
    return '<div class="col-dia"><h4>'+nombre+'</h4><div class="carril">'+eventos+'</div></div>';
  }).join("");
  return '<div class="semana-scroll" tabindex="0" aria-label="Horario semanal"><div class="semana" style="--dias:'+dias.length+';--alto:'+(franjas.length*5)+'rem"><div class="escala"><h4>Hora</h4>'+escala+'</div>'+columnas+'</div></div>';
}
