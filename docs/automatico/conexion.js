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
    let config={};
    try{config=JSON.parse(localStorage.getItem("nhc")||"{}")||{};}catch{}
    const favoritas=new Set(perfil.preferidas);
    window.ordenarPorPreferencia=datos=>{
      for(const c of datos.cursos||[]){
        const preferida=k=>favoritas.has(c.codigo+"/"+(k.categoria==="Trabajo Dirigido"?"Trabajo dirigido":k.categoria||"Teoría")+"/"+k.seccion);
        c.secciones.sort((a,b)=>Number(preferida(b))-Number(preferida(a)));
      }
      return datos;
    };
    if(perfil.periodo)config.semestre=perfil.periodo;
    config.sidebarOculta=true;
    if(perfil.aprobados)config.aprobadosPor={...config.aprobadosPor,28:perfil.aprobados};
    if(!config.tema)config.tema=perfil.tema;
    if(perfil.cursos){
      config.seleccion=perfil.cursos;
      config.manuales=perfil.cursos;
      config.sync=false;config.miHorario=null;config.vista=null;
    }
    try{localStorage.setItem("nhc",JSON.stringify(config));}catch{}
    window.validarCarga=(ids,periodo)=>window.parent.validarCargaAutomatica(ids,periodo);
  }
}
