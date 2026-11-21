"use strict";
let propuesta = null;
const control = id => document.getElementById(id);
function limpiarRuta() {
  propuesta=null;
  control("resultadoRuta").replaceChildren();
}
function configurarMeta() {
  const meta=control("metaAuto").value;
  control("elegirObjetivo").hidden=meta!=="curso";
  control("elegirSemestre").hidden=meta!=="semestre";
  control("modalidadAuto").hidden=meta==="curso";
  control("cupoVac").hidden=!control("usarVac").checked;
  limpiarRuta();
}
control("objetivoAuto").innerHTML=cursos.map(c=>`<option value="${c.id}">${c.id} · ${c.name}</option>`).join("");
control("semAuto").innerHTML=Array.from({length:10},(_,i)=>`<option>${i+1}</option>`).join("");
control("configAuto").onchange=configurarMeta;
control("calcularAuto").onclick=()=>{
  const cfg={meta:control("metaAuto").value,curso:control("objetivoAuto").value,semestre:Number(control("semAuto").value),seminario:control("seminarioAuto").value,vacaciones:control("usarVac").checked,cupo:Number(control("cantidadVac").value)};
  const salida=control("resultadoRuta");
  try {
    propuesta=calcularRuta(s,cfg);
    const ciclos=propuesta.ciclos;
    if(!ciclos.length){salida.textContent="Ya cumples esta meta con el avance y la proyección seleccionados.";return;}
    salida.innerHTML=`<h3>${propuesta.minima?"Ruta mínima":"Ruta factible · mínimo sin demostrar"}</h3><p>${ciclos.length} períodos · ${ciclos.filter(c=>c.tipo==="Semestre").length} semestres y ${ciclos.filter(c=>c.tipo==="Vacaciones").length} vacaciones · ${sumar(ciclos.flatMap(c=>c.ids).map(id=>catalogo.get(id)))} CLAR</p>`+ciclos.map((c,i)=>`<details open><summary>${i+1}. ${c.tipo} · ${sumar(c.ids.map(id=>catalogo.get(id)))} CLAR</summary><div class="inner">${c.ids.map(id=>catalogo.get(id).name+" ("+id+")").join(" · ") || "Sin cursos"}</div></details>`).join("")+'<button class="primary" id="aplicarAuto">Usar en mi plan por ciclos</button>';
    control("aplicarAuto").onclick=()=>{
      if(ciclosDe(s).some(c=>c.ids.length) && !confirm("¿Reemplazar tu plan por ciclos con esta ruta?")) return;
      const filas=ciclos.map(c=>({tipo:c.tipo,ids:[...c.ids]}));
      s.vacaciones=filas[0]?.tipo==="Vacaciones"?filas.shift().ids:[];
      s.seleccion=filas[0]?.tipo==="Semestre"?filas.shift().ids:[];
      s.posteriores=filas;cicloActivo=s.vacaciones.length?0:1;
      guardar();avisar("Ruta incorporada al plan por ciclos.");control("cronograma").scrollIntoView({block:"center"});
    };
  } catch(error) { propuesta=null;salida.textContent=error.message; }
};
configurarMeta();
