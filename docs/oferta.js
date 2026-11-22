const limpio = html => html.replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
function leer(html,periodo) {
  const titulo = limpio(html.match(/<h4[^>]*header-title[^>]*>(.*?)<\/h4>/is)?.[1] ?? "");
  const anio = Number(titulo.match(/\b(20\d{2})\b/)?.[1]);
  if (!anio || /VACACIONES/i.test(titulo)!==periodo.startsWith("vacaciones") || !titulo.includes(periodo.endsWith("1")?"PRIMER":"SEGUNDO")) throw Error("Encabezado de período inesperado");
  const columnas = [...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/gis)].map(m=>limpio(m[1]));
  const secciones = new Map();
  for (const fila of html.matchAll(/<tr\b[^>]*>(.*?)<\/tr>/gis)) {
    const celdas = [...fila[1].matchAll(/<td\b[^>]*>(.*?)<\/td>/gis)].map(m=>m[1]);
    if (!celdas.length) continue;
    const campo = nombre=>limpio(celdas[columnas.indexOf(nombre)] ?? "");
    const id = campo("Nombre de Curso").split(" ")[0];
    if (!catalogo.has(id)) continue;
    const clase = celdas[0].match(/badge-(blue|info|success|danger)\b/i)?.[1];
    const tipo = ({blue:"Laboratorio",info:"Trabajo dirigido",success:"Dibujo",danger:"Práctica"})[clase] ?? "Teoría";
    const sec = campo("Sección"), clave = [id,tipo,sec].join("/");
    const dias = campo("Días").split(/\s+/).filter(Boolean);
    const inicio = campo("Inicio"), fin = campo("Final");
    if (!dias.length || !/^\d\d:\d\d$/.test(inicio) || !/^\d\d:\d\d$/.test(fin) || fin<=inicio) continue;
    const bloque = {dias,inicio,fin,docente:campo("Catedrático"),auxiliar:campo("Auxiliar"),lugar:[campo("Modalidad"),campo("Edificio"),campo("Salón")].filter(Boolean).join(" · ")};
    if (!secciones.has(clave)) secciones.set(clave,{clave,id,sec,tipo,bloques:[],restricciones:false});
    const grupo=secciones.get(clave);
    grupo.restricciones ||= /verRestricciones/i.test(celdas.at(-1));
    if (!grupo.bloques.some(b=>JSON.stringify(b)===JSON.stringify(bloque))) grupo.bloques.push(bloque);
  }
  if (!secciones.size) throw Error("Sin secciones del pénsum");
  return {anio,secciones:[...secciones.values()]};
}

const nombresPeriodo = {"semestre/1":"Primer semestre","vacaciones/1":"Vacaciones de junio","semestre/2":"Segundo semestre","vacaciones/2":"Vacaciones de diciembre"};
const ofertas = new Map(), solicitudes = new Map();
function calendario(fecha=new Date()) {
  const partes=new Intl.DateTimeFormat("en-US",{timeZone:"America/Guatemala",year:"numeric",month:"numeric"}).formatToParts(fecha);
  const mes=Number(partes.find(p=>p.type==="month").value);
  const mitad=mes<=6?1:2;
  return {anio:Number(partes.find(p=>p.type==="year").value),mitad,actual:(mes%6===5 || mes%6===0?"vacaciones/":"semestre/")+mitad};
}
function minutos(hora) {
  const [h,m]=hora.split(":").map(Number);
  return h*60+m;
}
function cargaSeccion(sec) {
  const totales={};
  for(const b of sec.bloques) for(const dia of b.dias) totales[dia]=(totales[dia]||0)+minutos(b.fin)-minutos(b.inicio);
  return Math.max(...Object.values(totales))/60;
}
function catalogoNoHayCupo(datos,codigo) {
  if(datos.semestre!==codigo || !Array.isArray(datos.cursos)) throw Error("Catálogo incompatible");
  const grupos=new Map();
  for(const curso of datos.cursos) {
    if(!catalogo.has(curso.codigo)) continue;
    for(const fila of curso.secciones) {
      if(!fila.inicio || !fila.fin || fila.inicio>=fila.fin || !Array.isArray(fila.dias) || !fila.dias.length) continue;
      const tipo=fila.categoria==="Trabajo Dirigido"?"Trabajo dirigido":fila.categoria||"Teoría";
      const clave=[curso.codigo,tipo,fila.seccion].join("/");
      if(!grupos.has(clave)) grupos.set(clave,{clave,id:curso.codigo,tipo,sec:fila.seccion,bloques:[],restricciones:false});
      const grupo=grupos.get(clave);
      grupo.restricciones ||= !!fila.restringida;
      const bloque={dias:fila.dias,inicio:fila.inicio,fin:fila.fin,docente:fila.catedratico||"Sin asignar",auxiliar:fila.auxiliar||"Sin auxiliar",lugar:fila.modalidad||"Sin ubicación"};
      if(!grupo.bloques.some(b=>JSON.stringify(b)===JSON.stringify(bloque))) grupo.bloques.push(bloque);
    }
  }
  return {anio:Number(datos.restricciones_params?.anio)||null,secciones:[...grupos.values()],fuente:"NoHayCupo"};
}
async function cargarOferta(periodo,forzar=false) {
  if(!forzar && ofertas.has(periodo)) return ofertas.get(periodo);
  if(solicitudes.has(periodo)) return solicitudes.get(periodo);
  const url="https://usuarios.ingenieria.usac.edu.gt/horarios/"+periodo;
  const descargar=async()=>{
    const codigo=(periodo.startsWith("vacaciones")?"v":"")+periodo.slice(-1);
    const api="https://no-hay-cupo.vercel.app/api/catalogo/"+codigo;
    const puente=u=>"https://corsproxy.net/?u="+encodeURIComponent(u);
    for(const [origen,json] of [[url,false],[puente(url),false],[api,true],[puente(api),true]]) {
      try {
        const r=await fetch(origen,{cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer",signal:AbortSignal.timeout(18000)});
        if(!r.ok) continue;
        const datos=json ? catalogoNoHayCupo(await r.json(),codigo) : leer(await r.text(),periodo);
        datos.horas=new Map();
        for(const sec of datos.secciones.filter(sec=>sec.tipo==="Teoría" && !sec.bloques.some(b=>/CERRAD/i.test(b.lugar)))) {
          datos.horas.set(sec.id,Math.max(datos.horas.get(sec.id)||0,cargaSeccion(sec)));
        }
        if(!datos.horas.size) continue;
        ofertas.set(periodo,datos);
        return datos;
      } catch {}
    }
    ofertas.delete(periodo);
    throw Error("FIUSAC no devolvió una oferta disponible para este período.");
  };
  const tarea=descargar().finally(()=>solicitudes.delete(periodo));
  solicitudes.set(periodo,tarea);
  return tarea;
}
function periodoVac(n=0) {
  return "vacaciones/"+((calendario().mitad-1+n)%2+1);
}
function estadoOferta(id,n=0) {
  const act=calendario(), datos=ofertas.get(periodoVac(n));
  if(datos?.horas.has(id) && datos.anio===act.anio && n===0) return "Publicado";
  if(datos?.horas.has(id)) return "Referencia del mismo período";
  if([...ofertas].some(([p,d])=>p.startsWith("vacaciones") && d.horas.has(id))) return "Solo en otra convocatoria";
  return "Sin oferta verificada";
}
function permiteVac(perfil,id,n=0) {
  const e=estadoOferta(id,n);
  return perfil.noConfirmados || e==="Publicado" || (n>0 && e==="Referencia del mismo período");
}
let cargaPlan=null;
async function iniciarOfertaPlan(forzar=false) {
  if(cargaPlan && !forzar) return cargaPlan;
  $("estadoOfertaPlan").textContent="Consultando ambas convocatorias…";
  cargaPlan=Promise.allSettled([cargarOferta("vacaciones/1",forzar),cargarOferta("vacaciones/2",forzar)]).then(()=>{
    const d=ofertas.get(periodoVac());
    $("estadoOfertaPlan").textContent=d ? nombresPeriodo[periodoVac()]+" "+(d.anio??"(año sin verificar)")+" · "+d.horas.size+" cursos con teoría. Para ciclos futuros se usa como referencia la última oferta de junio o diciembre." : "Oferta vigente sin confirmar. Puedes planificar semestres o incluir cursos no confirmados.";
    limpiarRuta(); if(vista==="plan") planificar();
  });
  return cargaPlan;
}
