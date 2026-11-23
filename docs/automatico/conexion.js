"use strict";
window.apiHorario=async ruta=>{
  const url=new URL(ruta,"https://no-hay-cupo.vercel.app");
  if(url.origin!=="https://no-hay-cupo.vercel.app" || !url.pathname.startsWith("/api/"))throw Error("Ruta de catálogo inválida.");
  for(const origen of [url.href,"https://corsproxy.net/?u="+encodeURIComponent(url.href)]){
    try{const r=await fetch(origen,{credentials:"omit",referrerPolicy:"no-referrer",signal:AbortSignal.timeout(18000)});if(r.ok)return r;}catch{}
  }
  throw Error("El servicio de horarios no respondió. Intentá actualizar el catálogo.");
};
if(window.parent!==window && document.referrer && new URL(document.referrer).origin===location.origin){
  const perfil=window.parent.contextoAutomatico?.();
  if(perfil){
    window.integrado=true; document.body.classList.add("integrado");
    window.planesDelPensum=()=>parent.planesParaHorario();
    window.irAlPlanificador=()=>parent.document.querySelector('[data-view="plan"]').click();
    window.notificarPeriodo=valor=>parent.periodoDesdeGenerador(valor);
    let config={};
    try{config=JSON.parse(localStorage.getItem("nhc")||"{}")||{};}catch{}
    const ganados=new Set(perfil.labsGanados);
    window.labsGanadosDelPerfil = [...ganados];
    window.actualizarLaboratorioDelPerfil = (id, ganado) => parent.actualizarLaboratorioGanado(id, ganado);
    const firma=JSON.stringify([...ganados].sort());
    if((config.labsGanadosFIUSAC||"[]")!==firma){
      config.miHorario=null;config.vista=null;
    }
    config.labsGanadosFIUSAC=firma;
    const favoritas=new Set(perfil.preferidas);
    window.ordenarPorPreferencia=datos=>{
      for(const c of datos.cursos||[]){
        c.secciones.forEach(fila=>{
          const tipo=parent.tipoComponente(fila.categoria);
          if(tipo==="Laboratorio") parent.registrarLaboratorioOfertado(c.codigo);
          fila.categoria=tipo==="Teoría"?null:tipo==="Trabajo dirigido"?"Trabajo Dirigido":tipo;

        });
        c.componentes_practicos=[...new Set(c.secciones.map(fila=>fila.categoria).filter(Boolean))];
        const preferida=k=>favoritas.has(c.codigo+"/"+(k.categoria==="Trabajo Dirigido"?"Trabajo dirigido":k.categoria||"Teoría")+"/"+k.seccion);
        c.secciones.sort((a,b)=>Number(preferida(b))-Number(preferida(a)));
      }
      return datos;
    };
    if(perfil.periodo)config.semestre=perfil.periodo;
    config.sidebarOculta=false;
    if(perfil.aprobados)config.aprobadosPor={...config.aprobadosPor,28:perfil.aprobados};
    config.tema=perfil.tema; localStorage.setItem("nhc_visto","1");
    if(perfil.cursos){
      config.seleccion=perfil.cursos;
      config.manuales=perfil.cursos;
      config.sync=false;config.miHorario=null;config.vista=null;
    }
    try{localStorage.setItem("nhc",JSON.stringify(config));}catch{}
    window.validarCarga=(ids,periodo)=>window.parent.validarCargaAutomatica(ids,periodo);
  }
}
