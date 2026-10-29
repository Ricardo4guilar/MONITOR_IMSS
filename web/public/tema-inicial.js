// Aplica el tema guardado ANTES de que el navegador pinte, para que quien eligió el modo claro
// no vea un destello oscuro al cargar. Lleva la misma lógica que src/features/tema/utils/tema.ts.
//
// Vive en un archivo propio y no dentro de index.html para que la política de seguridad de contenido
// del despliegue pueda prohibir scripts en línea (script-src 'self') sin romper el tema.
;(function () {
  try {
    var guardada = localStorage.getItem('imss.tema')
    var oscuro =
      guardada === 'claro' ? false : guardada === 'sistema' ? matchMedia('(prefers-color-scheme: dark)').matches : true
    var raiz = document.documentElement
    raiz.classList.toggle('dark', oscuro)
    raiz.style.colorScheme = oscuro ? 'dark' : 'light'
  } catch (e) {
    // Sin localStorage (modo privado estricto) se queda el tema oscuro por defecto.
  }
})()
