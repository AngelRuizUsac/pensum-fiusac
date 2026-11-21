"use strict";
// Cruce por curso del catálogo CLAR con los programas de laboratorio de ECYS, 2S 2026.
const laboratorioECYS = {titulo:"Programas de laboratorio de ECYS · segundo semestre de 2026",url:"https://dtt-ecys.org/resources?r=15"};
const laboratorios = new Map("0283 0785 0778 0774 0775 0089 0772 0787 0972 0770 0771 0768 0796 0729 0964 0777 0970 0975 0281 0786 0780".split(" ").map(id=>[id,laboratorioECYS]));
for (const [id,titulo,url] of [
  ["0147","Programa de Física Básica","https://fisica.ingenieria.usac.edu.gt/Docs/1S2020/PFB.pdf"],
  ["0150","Programa de Física 1","https://fisica.ingenieria.usac.edu.gt/Docs/1S2020/PF1.pdf"],
  ["0152","Programa de Laboratorio de Física Dos","https://fisica.usac.edu.gt/fisica/Laboratorio/LFDos-P2025.pdf"],
  ["0200","Programa de Ingeniería Eléctrica 1","https://eime.ingenieria.usac.edu.gt/docs/Programas/Electrotecnia/200_Ingenieria_electrica_1.pdf"],
  ["0601","Laboratorio de Investigación de Operaciones I","https://emi.ingenieria.usac.edu.gt/wp-content/uploads/2019/06/IO1p.pdf"],
  ["0603","Laboratorio de Investigación de Operaciones II","https://emi.ingenieria.usac.edu.gt/wp-content/uploads/2019/06/LABORATORIOI-DE-INVESTIGACION-DE-OPERACIONES-II.pdf"]
]) laboratorios.set(id,{titulo,url});
