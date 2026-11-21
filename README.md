# Mi Pénsum FIUSAC
Aplicación en español para el plan CLAR de Ingeniería en Ciencias y Sistemas, vigente para estudiantes con este pénsum a partir de 2025. [Red oficial](https://redesestudio.ingenieria.usac.edu.gt/redesDeEstudio/ingenieriaEnCienciasYSistemas/28/clar).

## Uso
Abre `docs/index.html` en un navegador moderno. Para servir el sitio en una dirección local estable, ejecuta `python -m http.server 8000 --directory docs` y abre http://localhost:8000.

Selecciona tu semestre y registra los cursos aprobados o en curso. En **Próximo semestre** puedes añadir cursos elegibles, ver la carga en CLAR y proyectar aprobaciones. Un cambio de prerrequisitos marca las selecciones afectadas para revisión. La disponibilidad representa elegibilidad académica según los códigos de la red. Consulta los horarios y las condiciones de asignación con FIUSAC.

El avance es local a cada navegador y dirección. Usa **Mis datos** para exportar o importar un respaldo JSON. La aplicación funciona sin cuentas, bibliotecas externas ni servicios de terceros.

## GitHub Pages
Publica este proyecto en GitHub. En **Settings → Pages → Deploy from a branch**, elige la rama `main` y la carpeta `/docs`. La ruta de publicación admite subdirectorios sin recompilar.

## Verificación
Ejecuta `node verificar.cjs` con Node.js. Las pruebas cubren integridad del catálogo, bloqueo por múltiples requisitos, proyección y validación de respaldos. Los cursos y prerrequisitos están en `docs/cursos.js`.
