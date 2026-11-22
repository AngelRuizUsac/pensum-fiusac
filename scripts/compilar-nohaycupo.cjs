// Ejecutar con Node, esbuild y las dependencias de web/package-lock.json del clon.
const fs=require("node:fs"),path=require("node:path");
const web=path.resolve(process.argv[2]),dest=path.resolve(__dirname,"../docs/automatico");
const deps=process.argv[3]?path.resolve(process.argv[3]):path.join(web,"node_modules");
const esbuild=require(require.resolve("esbuild",{paths:[deps,web,process.cwd()]}));
const paquete="https://esm.sh/@mlc-ai/web-llm@0.2.84";
const base={bundle:true,format:"esm",target:"es2022",jsx:"automatic",minify:true,legalComments:"eof",nodePaths:[deps],alias:{"@":path.join(web,"src")},define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"adaptar-pages",setup(build){
  build.onResolve({filter:/^@mlc-ai\/web-llm$/},()=>({path:paquete,external:true}));
  build.onLoad({filter:/[\\/]cliente[\\/](acciones|compartir|ia[\\/]motor)\.ts$|[\\/]Modales\.tsx$/},({path:archivo})=>{
    let src=fs.readFileSync(archivo,"utf8").replaceAll('fetch(`/api/','window.apiHorario(`/api/').replaceAll('fetch("/api/','window.apiHorario("/api/').replaceAll('${location.origin}/#','${location.origin}${location.pathname}#').replaceAll('./webllm.worker.ts','./worker.js').replaceAll('src="/icons/','src="https://no-hay-cupo.vercel.app/icons/').replaceAll('src="/rago.jpg"','src="https://no-hay-cupo.vercel.app/rago.jpg"');
    src=src.replace("E.catalogo = data;","window.ordenarPorPreferencia?.(data); E.catalogo = data;");
    // El límite académico viene del perfil FIUSAC que abrió esta vista.
    for(const nombre of ["generar(topN = E.topN)","generarConsulta()"]){
      const firma="export async function "+nombre+" {";
      src=src.replace(firma,firma+'\n  const aviso=window.validarCarga?.(E.seleccion,E.semestre); if(aviso){E.estadoGenerar=aviso;touch();return;}');
    }
    return {contents:src,loader:archivo.endsWith("tsx")?"tsx":"ts",resolveDir:path.dirname(archivo)};
  });
}}]};
async function compilar(){
  fs.mkdirSync(dest,{recursive:true});
  await esbuild.build({...base,stdin:{contents:'import React from "react";import {createRoot} from "react-dom/client";import Header from "@/components/Header";import App from "@/components/App";import {comboMostrado} from "@/lib/cliente/acciones";import {E} from "@/lib/cliente/estado";window.leerSeccionesAutomaticas=()=>({periodo:E.semestre,cursos:comboMostrado()});createRoot(document.getElementById("app")).render(<><Header/><App/></>);',resolveDir:web,loader:"tsx"},outfile:path.join(dest,"app.js")});
  await esbuild.build({...base,entryPoints:[path.join(web,"src/lib/cliente/ia/webllm.worker.ts")],outfile:path.join(dest,"worker.js")});
}
compilar().catch(e=>{console.error(e);process.exitCode=1;});
