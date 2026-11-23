// Ejecutar con Node, esbuild y las dependencias de web/package-lock.json del clon.
const fs=require("node:fs"),path=require("node:path");
const web=path.resolve(process.argv[2]),dest=path.resolve(__dirname,"../docs/automatico");
const deps=process.argv[3]?path.resolve(process.argv[3]):path.join(web,"node_modules");
const esbuild=require(require.resolve("esbuild",{paths:[deps,web,process.cwd()]}));
const paquete="https://esm.sh/@mlc-ai/web-llm@0.2.84";
const base={bundle:true,format:"esm",target:"es2022",jsx:"automatic",minify:true,legalComments:"eof",nodePaths:[deps],alias:{"@":path.join(web,"src")},define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"adaptar-pages",setup(build){
  build.onResolve({filter:/^@mlc-ai\/web-llm$/},()=>({path:paquete,external:true}));
  build.onLoad({filter:/[\\/](PanelPerfil|PanelCursos|App)\.tsx$/},({path:archivo})=>{
    let src=fs.readFileSync(archivo,"utf8");
    if(path.basename(archivo)==="PanelPerfil.tsx"){
      const ancla='      </div>\n\n      <label className="check-linea"';
      src=src.replace(/\r\n/g,"\n");
      if(!src.includes(ancla)) throw Error("Cambió la tarjeta de perfil.");
      src='import ElegirPlan from '+JSON.stringify(path.resolve(__dirname,"ElegirPlan.tsx"))+';\n'+src.replace(ancla,'        {window.integrado && <ElegirPlan/>}\n'+ancla);
    }else if(path.basename(archivo)==="PanelCursos.tsx"){
      src='import {createElement} from "react"; import {guardarLocal, touch} from "@/lib/cliente/estado";\n'+src
        .replace("const curso = E.porCodigo.get(codigo);", "const original = E.porCodigo.get(codigo); const curso = laboratoriosAutomaticos.paraHorario(original);")
        .replace("{restringidas.length > 0 && (", "{laboratoriosAutomaticos.control(createElement, original, E, guardarLocal, touch)}{restringidas.length > 0 && (");
    }else{
      src=src.replace('<PanelCursos />','{window.integrado ? <details className="panel cursos-plegables"><summary>Cursos y secciones</summary><PanelCursos /></details> : <PanelCursos />}');
    }
    return {contents:src,loader:"tsx",resolveDir:path.dirname(archivo)};
  });
  build.onLoad({filter:/[\\/]cliente[\\/](acciones|compartir|ia[\\/]motor)\.ts$|[\\/]Modales\.tsx$/},({path:archivo})=>{
    let src=fs.readFileSync(archivo,"utf8").replaceAll('fetch(`/api/','window.apiHorario(`/api/').replaceAll('fetch("/api/','window.apiHorario("/api/').replaceAll('${location.origin}/#','${location.origin}${location.pathname}#').replaceAll('./webllm.worker.ts','./worker.js').replaceAll('src="/icons/','src="https://no-hay-cupo.vercel.app/icons/').replaceAll('src="/rago.jpg"','src="https://no-hay-cupo.vercel.app/rago.jpg"');
    src=src.replace("E.catalogo = data;","window.ordenarPorPreferencia?.(data); E.catalogo = data;");
    src=src.replace("catalogo: E.catalogo,", "catalogo: {...E.catalogo, cursos:E.catalogo.cursos.map(laboratoriosAutomaticos.paraHorario)},");
    // El límite académico viene del perfil FIUSAC que abrió esta vista.
    src=src.replace("E.semestre = valor;","E.semestre = valor; window.notificarPeriodo?.(valor);");
    for(const nombre of ["generar(topN = E.topN)","generarConsulta()"]){
      const firma="export async function "+nombre+" {";
      src=src.replace(firma,firma+'\n  const aviso=window.validarCarga?.(E.seleccion,E.semestre); if(aviso){E.estadoGenerar=aviso;touch();return;}');
    }
    return {contents:src,loader:archivo.endsWith("tsx")?"tsx":"ts",resolveDir:path.dirname(archivo)};
  });
}}]};
async function compilar(){
  fs.mkdirSync(dest,{recursive:true});
  await esbuild.build({...base,stdin:{contents:'import React from "react";import {createRoot} from "react-dom/client";import Header from "@/components/Header";import App from "@/components/App";import {comboMostrado} from "@/lib/cliente/acciones";import {E} from "@/lib/cliente/estado";window.leerSeccionesAutomaticas=()=>({periodo:E.semestre,cursos:comboMostrado()});createRoot(document.getElementById("app")).render(<>{!window.integrado && <Header/>}<App/></>);',resolveDir:web,loader:"tsx"},outfile:path.join(dest,"app.js")});
  await esbuild.build({...base,entryPoints:[path.join(web,"src/lib/cliente/ia/webllm.worker.ts")],outfile:path.join(dest,"worker.js")});
}
compilar().catch(e=>{console.error(e);process.exitCode=1;});
