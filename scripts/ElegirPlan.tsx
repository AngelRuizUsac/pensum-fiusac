import React, { useEffect, useRef, useState } from "react";
import { E, guardarLocal, touch } from "@/lib/cliente/estado";
import { pedirRestricciones } from "@/lib/cliente/acciones";

export default function ElegirPlan() {
  const dialogo = useRef(null);
  const [planes, setPlanes] = useState([]);
  const [elegido, elegir] = useState("");
  const [mensaje, informar] = useState("");
  const [abierto, abrir] = useState(false);
  const tipo = E.semestre.startsWith("v") ? "Vacaciones" : "Semestre";
  useEffect(() => { if (abierto) dialogo.current?.showModal(); }, [abierto]);

  function mostrar() {
    const lista = window.planesDelPensum?.() || [];
    setPlanes(lista); elegir(""); informar(""); abrir(true);
  }
  const plan = planes.find(p => String(p.indice) === elegido);
  const faltantes = plan?.cursos.filter(c => !E.porCodigo.has(c.id)) || [];
  function aplicar() {
    if (!plan || plan.tipo !== tipo || !E.catalogo || faltantes.length) return;
    const cursos = plan.cursos.map(c => c.id);
    const aviso = window.validarCarga?.(cursos,E.semestre);
    if (aviso) { informar(aviso); return; }
    E.seleccion = cursos; E.manuales = new Set(cursos); E.excluidos.clear();
    E.sync=false; E.miHorario=null; E.vista=null; E.editor=null; E.resultado=null;
    guardarLocal(); touch(); pedirRestricciones();
    dialogo.current.close(); informar("Ciclo "+(plan.indice+1)+" aplicado · "+cursos.length+" cursos.");
  }
  return <>
    <button className="btn" aria-haspopup="dialog" onClick={mostrar}>Elegir plan</button>
    {!abierto && mensaje && <small role="status">{mensaje}</small>}
    {abierto && <dialog ref={dialogo} className="dialogo-plan" aria-labelledby="elegir-titulo" onClose={()=>abrir(false)}>
      <h2 id="elegir-titulo">Elegir plan</h2>
      <p>Elegí un ciclo de tu planificación para usar sus cursos en el horario.</p>
      {planes.map(p=><label key={p.indice} className="opcion-plan">
        <input type="radio" name="ciclo" value={p.indice} checked={elegido===String(p.indice)} disabled={p.tipo!==tipo} onChange={ev=>{elegir(ev.target.value);informar("");}}/>
        <span><strong>Ciclo {p.indice+1} · {p.tipo}</strong><small>{p.cursos.map(c=>c.nombre).join(" · ")}</small>
        {p.tipo!==tipo && <small>Disponible al elegir un período de {p.tipo.toLowerCase()}.</small>}</span>
      </label>)}
      {!planes.length && <p>Todavía no agregaste cursos a un ciclo. <button className="btn-enlace" onClick={()=>window.irAlPlanificador?.()}>Abrir el planificador</button></p>}
      {faltantes.length>0 && <p role="status">Sin oferta en este período: {faltantes.map(c=>c.nombre).join(", ")}.</p>}
      {mensaje && <p role="status">{mensaje}</p>}
      <div className="pie-plan"><button className="btn" onClick={()=>{informar("");dialogo.current.close();}}>Cancelar</button>
      <button className="btn btn-primary" disabled={!plan || !E.catalogo || faltantes.length>0} onClick={aplicar}>Usar este plan</button></div>
    </dialog>}
  </>;
}
