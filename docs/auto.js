"use strict";
let propuesta = null, tareaRuta = 0;
const control = id => document.getElementById(id);
function limpiarRuta() {
  clearTimeout(tareaRuta);
  propuesta=null;
  control("resultadoRuta").replaceChildren();
}
function configurarMeta() {
  const meta=control("metaAuto").value;
  control("elegirObjetivo").hidden=meta!=="curso";
  control("elegirSemestre").hidden=meta!=="semestre";
  control("modalidadAuto").hidden=meta==="curso";
  limpiarRuta();
}
function filtrarObjetivos() {
  const q=normalizar(control("buscarObjetivo").value.trim());
  control("objetivoAuto").innerHTML=cursos.filter(c=>normalizar(c.id+" "+c.name).includes(q)).map(c=>`<option value="${c.id}">${c.id} · ${c.name}</option>`).join("");
}
control("buscarObjetivo").oninput=()=>{filtrarObjetivos(); limpiarRuta();};
filtrarObjetivos();
control("semAuto").innerHTML=Array.from({length:10},(_,i)=>`<option>${i+1}</option>`).join("");
control("configAuto").onchange=configurarMeta;
control("calcularAuto").onclick=async()=>{
  if(control("usarVac").checked) await iniciarOfertaPlan();
  if (!control("maxAuto").reportValidity()) return;
  const cfg={extras:control("extrasAuto").checked,maximo:control("maxAuto").value==="" ? null : control("maxAuto").valueAsNumber,meta:control("metaAuto").value,curso:control("objetivoAuto").value,semestre:Number(control("semAuto").value),seminario:control("seminarioAuto").value,vacaciones:control("usarVac").checked};
  const salida=control("resultadoRuta");
  limpiarRuta();
  if(cfg.meta==="curso" && !cfg.curso){salida.textContent="Selecciona un curso que coincida con la búsqueda.";return;}
  const busqueda=explorarRutas(s,cfg);
  let ultimoAviso=0;
  function avanzar() {
    try {
      const hasta=performance.now()+14;
      do {
        const paso=busqueda.next();
        if(paso.done) { mostrar(paso.value); return; }
        const dato=paso.value;
        if(dato.etapa){salida.textContent="Calculando etapa de "+dato.etapa.toLowerCase()+" · "+dato.horizonte+" períodos.";continue;}
        if(!propuesta && dato.propuesta) mostrar(dato.propuesta);
        if(dato.propuesta || performance.now()-ultimoAviso>500) {
          control("progresoExacto").textContent="Comprobando "+dato.horizonte+" períodos. Mejor ruta: "+propuesta.ciclos.length+" períodos. Posible ahorro: hasta "+(propuesta.ciclos.length-dato.horizonte)+".";
          ultimoAviso=performance.now();
        }
      } while(performance.now()<hasta);
      tareaRuta=setTimeout(avanzar,0);
    } catch(error) { propuesta=null; salida.textContent=error.message; }
  }
  function mostrar(valor) {
    propuesta=valor;
    const ciclos=propuesta.ciclos;
    if(!ciclos.length){salida.textContent="Ya cumples esta meta con el avance y la proyección seleccionados.";return;}
    salida.innerHTML=`<h3>${propuesta.fases?"Obligatorios y después optativos":propuesta.minima?"Ruta mínima":"Mejor ruta encontrada"}</h3><p id="progresoExacto">${propuesta.fases ? "Etapa de obligatorios: "+propuesta.corte+" períodos. Optativos restantes: "+(ciclos.length-propuesta.corte)+" períodos." : propuesta.minima ? "Duración mínima comprobada para tu configuración." : ""}</p><p>${ciclos.length} períodos · ${ciclos.filter(c=>c.tipo==="Semestre").length} semestres y ${ciclos.filter(c=>c.tipo==="Vacaciones").length} vacaciones · ${sumar(ciclos.flatMap(c=>c.ids).map(id=>catalogo.get(id)))} CLAR</p>`+ciclos.map((c,i)=>`<details open><summary>${i+1}. ${c.tipo} · ${sumar(c.ids.map(id=>catalogo.get(id)))} ${c.tipo==="Semestre" ? "de "+(cfg.maximo ?? limite(s))+" CLAR" : "CLAR · "+horasCiclo({...s,indiceVac:Math.floor(i/2)},c.ids)+" de 4 h"}</summary><div class="inner">${c.ids.map(id=>catalogo.get(id).name+" ("+id+") · "+tipoCurso(id)+(c.tipo==="Vacaciones" ? " · "+etiquetaHoras(id,Math.floor(i/2))+" · "+estadoOferta(id,Math.floor(i/2)) : "")).join(" · ") || "Sin cursos"}</div></details>`).join("")+'<button class="primary" id="aplicarAuto">Usar en mi plan por ciclos</button>';
    control("aplicarAuto").onclick=()=>{
      if(ciclosDe(s).some(c=>c.ids.length) && !confirm("¿Reemplazar tu plan por ciclos con esta ruta?")) return;
      const filas=ciclos.map(c=>({tipo:c.tipo,ids:[...c.ids]}));
      s.vacaciones=filas[0]?.tipo==="Vacaciones"?filas.shift().ids:[];
      s.seleccion=filas[0]?.tipo==="Semestre"?filas.shift().ids:[];
      s.posteriores=filas;cicloActivo=s.vacaciones.length?0:1;
      guardar();avisar("Ruta incorporada al plan por ciclos.");control("cronograma").scrollIntoView({block:"center"});
    };
  }
  avanzar();
};
configurarMeta();
