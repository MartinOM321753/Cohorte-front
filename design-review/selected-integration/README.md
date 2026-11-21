# Selección integrada en develop

Se incorporaron únicamente las piezas elegidas por el usuario:

- Proyecto: tarjetas e información integrada de `http://localhost:5173/landing/proyecto-propuesta/index.html?v=6#proyecto`. El servidor entrega actualmente los estilos v7 en esa misma dirección. Se mantienen las imágenes naturales junto al texto y arriba en «Una cohorte. Múltiples dimensiones.».
- Instituciones: directorio de la propuesta Hallmark, con sus nueve destinos originales.
- Gráficas: trazos, colores y donas de la propuesta Hallmark, dentro de la sección de resultados original. Se mantienen sus encabezados, tarjetas, controles, notas y solicitud de acceso.

No se incorporó el resto del rediseño Hallmark. Portada, encabezado, evolución, evaluaciones, fotografías, preguntas, cierre y footer conservan su contenido y presentación base. Los estilos nuevos están limitados al proyecto, las instituciones y los elementos gráficos.

## Validación

- 105 combinaciones de indicadores/mediciones y ancho de pantalla: 320, 390, 768, 1024 y 1440 px. Ningún gráfico tiene desplazamiento interno horizontal o vertical, rótulos recortados ni valores superpuestos.
- Los SVG siguen el ancho disponible. En espacio reducido se distribuyen las fechas y las cifras entre paréntesis en dos líneas, conservando cada dato.
- Los datos por sexo de las donas permanecen visibles incluso con movimiento reducido.
- 40 comprobaciones funcionales pasaron, incluyendo menú móvil, navegación interna, traducción de contenido nuevo, las nueve instituciones, contactos, modal de evaluaciones, acceso al formulario, validación obligatoria y redirección a login.
- Se comparó el HTML: los párrafos y destinos originales siguen presentes. La sección de resultados conserva íntegro su HTML anterior.
- Los archivos de resultados, evaluaciones, formulario y controlador del formulario permanecen sin cambios.
- `npm run build` pasó. Vite mantiene la advertencia de tamaño de paquetes de la aplicación.

## Vista previa y capturas

[Abrir landing de develop](http://localhost:5175/).

Para iniciar este worktree: `npm run dev -- --host localhost --port 5175`.

Las capturas `proyecto-*`, `dimensiones-*`, `instituciones-*` y `graficas-*` muestran las piezas integradas a 1440 y 390 px. La barra flotante se oculta solo al generar estas capturas de componentes para que no tape el contenido recortado; permanece en la landing.

La integración queda en `develop` local. No se publicó el sitio ni se enviaron cambios al remoto.

## Ajustes posteriores

Los párrafos están justificados. En instituciones, el texto introductorio y los logos están centrados verticalmente; los logos miden 104 px en escritorio y 96 px en móvil. Los selectores de indicadores y mediciones se alinean a la derecha, pasando a una fila propia cuando falta espacio.

Se recuperó la secuencia de trazado de líneas, puntos, etiquetas y donas al entrar en pantalla. Con movimiento reducido los datos aparecen completos sin animación. Pasaron 24 comprobaciones adicionales de estos ajustes a 320, 390, 768 y 1440 px, incluidas la ejecución y la finalización de las animaciones.

Composición corporal y salud mental conservan la malla tridimensional gris, con el cerebro en vista superior. El corazón usa la imagen anatómica elegida y proporcionada por el usuario; el hígado es una ilustración de volumen suave en marrón rojizo oscuro, sin vesícula. Los archivos tienen fondo alfa transparente. Las ilustraciones generadas con ImageGen, sus prompts y la procedencia del corazón se registran en `public/landing/propuestas-imagenes/prompts.json`. Se comprobó su carga y colocación junto al texto a 390 y 1440 px.
