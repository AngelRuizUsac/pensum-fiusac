/* NoHayCupo · Rolando Osorio · MIT (LICENSE.txt). Fuente: https://github.com/Ragosorio/NoHayCupo/tree/c401d208f425db459ec08b6bbeb26049df5785ff/web/src/lib/engine */
var NoHayCupo = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../build-pensum-nhc/index.ts
  var index_exports = {};
  __export(index_exports, {
    findAllValidCombinations: () => findAllValidCombinations,
    hhmmToMin: () => hhmmToMin,
    minToHHMM: () => minToHHMM,
    sesionesSeTraslapan: () => sesionesSeTraslapan
  });

  // ../build-pensum-nhc/overlap.ts
  function sesionesSeTraslapan(a, b) {
    for (const s1 of a) {
      for (const s2 of b) {
        if (s1.dias.some((d) => s2.dias.includes(d))) {
          if (s1.inicio_min < s2.fin_min && s2.inicio_min < s1.fin_min) return true;
        }
      }
    }
    return false;
  }

  // ../build-pensum-nhc/models.ts
  function hhmmToMin(s) {
    const [h, m] = s.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) throw new Error(`hora inv\xE1lida: ${s}`);
    return h * 60 + m;
  }
  function minToHHMM(min) {
    return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  }
  function sesionesDe(op) {
    return op.componentes.map((c) => c.sesion);
  }

  // ../build-pensum-nhc/solver.ts
  function findAllValidCombinations(requisitos, sesionesBloqueadas = [], maxResultados = 2e5) {
    const orden = requisitos.map((_, i) => i).sort((a, b) => requisitos[a][1].length - requisitos[b][1].length);
    const resultados = [];
    const dfs = (pos, elegidos, ocupadas) => {
      if (resultados.length >= maxResultados) return;
      if (pos === orden.length) {
        resultados.push([...elegidos]);
        return;
      }
      const [nombre, opciones] = requisitos[orden[pos]];
      for (const op of opciones) {
        const sesiones = sesionesDe(op);
        if (!sesionesSeTraslapan(sesiones, ocupadas)) {
          elegidos.push([nombre, op]);
          dfs(pos + 1, elegidos, [...ocupadas, ...sesiones]);
          elegidos.pop();
        }
      }
    };
    dfs(0, [], [...sesionesBloqueadas]);
    const posicion = new Map(requisitos.map(([nombre], i) => [nombre, i]));
    return resultados.map((combo) => [...combo].sort((a, b) => posicion.get(a[0]) - posicion.get(b[0])));
  }
  return __toCommonJS(index_exports);
})();
