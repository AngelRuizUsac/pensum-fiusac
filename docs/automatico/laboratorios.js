"use strict";
const laboratoriosAutomaticos = (() => {
  const clave = "pensum-laboratorios-ganados";
  let ganados = new Set();
  try {
    const guardados = window.labsGanadosDelPerfil ?? JSON.parse(localStorage.getItem(clave));
    if (Array.isArray(guardados)) ganados = new Set(guardados);
  } catch {}

  function permiteElegir(curso) {
    return curso?.tiene_clase && curso.componentes_practicos.includes("Laboratorio");
  }

  function paraHorario(curso) {
    if (!permiteElegir(curso) || !ganados.has(curso.codigo)) return curso;
    return {
      ...curso,
      componentes_practicos: curso.componentes_practicos.filter(tipo => tipo !== "Laboratorio"),
      secciones: curso.secciones.filter(sec => sec.categoria !== "Laboratorio")
    };
  }

  function control(crear, curso, estado, guardar, actualizar) {
    if (!permiteElegir(curso)) return null;
    return crear("label", {className: "incluir-laboratorio"},
      crear("input", {
        type: "checkbox",
        role: "switch",
        checked: !ganados.has(curso.codigo),
        "aria-label":  "Incluir laboratorio de " + curso.nombre,
        onChange(evento) {
          if (!evento.target.checked) ganados.add(curso.codigo);
          else ganados.delete(curso.codigo);
          window.actualizarLaboratorioDelPerfil?.(curso.codigo, !evento.target.checked);
          localStorage.setItem(clave, JSON.stringify([...ganados]));
          estado.resultado = estado.miHorario = estado.editor = estado.vista = null;
          estado.estadoGenerar = "";
          guardar();
          actualizar();
        }
      }), "Incluir laboratorio");
  }
  return {paraHorario, control};
})();
