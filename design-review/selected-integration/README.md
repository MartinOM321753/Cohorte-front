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

Solo los párrafos de las seis tarjetas de investigación están justificados; el resto de la landing conserva su alineación original. En instituciones, el texto introductorio y los logos están centrados verticalmente; los logos miden 104 px en escritorio y 96 px en móvil. Los selectores de indicadores y mediciones se alinean a la derecha, pasando a una fila propia cuando falta espacio.

Se recuperó la secuencia de trazado de líneas, puntos, etiquetas y donas al entrar en pantalla. Con movimiento reducido los datos aparecen completos sin animación. Pasaron 24 comprobaciones adicionales de estos ajustes a 320, 390, 768 y 1440 px, incluidas la ejecución y la finalización de las animaciones.

Composición corporal y salud mental conservan la malla tridimensional gris, con el cerebro en vista superior. El corazón usa la imagen anatómica elegida y proporcionada por el usuario; el hígado es una ilustración de volumen suave en marrón rojizo oscuro, sin vesícula. Los archivos tienen fondo alfa transparente. Las ilustraciones generadas con ImageGen, sus prompts y la procedencia del corazón se registran en `public/landing/propuestas-imagenes/prompts.json`. Se comprobó su carga y colocación junto al texto a 390 y 1440 px.

El ADN de la tarjeta de genética usa la imagen verde, marfil y dorada proporcionada y elegida por el usuario, conservada sin cambios. Las imágenes elegidas de corazón, hígado, cuerpo y cerebro se conservan.

La sección de investigación longitudinal conserva todos sus textos y presenta sus tres pasos en una secuencia vertical conectada, junto a la introducción en escritorio y debajo de ella en móvil. Se retiró la franja «El proyecto» con sus dos enlaces; se conserva el destino `#proyecto`. Los títulos de áreas de investigación e información integrada se centran a 820 px o menos.

El menú centra los cuatro destinos; idioma e inicio de sesión comparten una fila de acciones dentro de la barra. Se comprobaron ambos idiomas a 901 y 1440 px, y la apertura, alineación y cierre del menú a 390 px. Las tarjetas de investigación tienen sombra e inclinación 3D según el mouse; el efecto vuelve a reposo al salir y se omite para entrada táctil o movimiento reducido. Se revisaron desbordamientos a 390, 768, 900, 901 y 1440 px.

Se reforzó la inclinación de las tarjetas hasta 9 grados, con elevación y sombra más visibles. La activación usa el tipo del evento del puntero en lugar de exigir que el navegador declare un mouse como entrada principal; esto admite equipos híbridos. Se probaron las seis tarjetas, el regreso al reposo, la exclusión de eventos táctiles y el movimiento reducido.

La introducción del proyecto se reorganizó con una fotografía existente de una medición y tres perspectivas acompañadas por símbolos. Se verificó que todos los títulos y párrafos se conservan. «Múltiples dimensiones» incorpora entrada escalonada, flotación suave de los modelos, luz y profundidad al mover el mouse, y un botón para reproducir la secuencia.

Se confirmó que el navegador de pruebas recibe `prefers-reduced-motion: reduce` del sistema. La interacción directa con el mouse ahora funciona también con esa preferencia, sin transiciones interpoladas; los movimientos automáticos permanecen desactivados. El botón de reproducción solicita expresamente una secuencia finita. Se verificaron la interacción con la preferencia real, la reproducción explícita, la flotación automática con movimiento habilitado, la traducción y el diseño a 390, 768 y 1440 px.

La interacción de las seis tarjetas se suavizó posteriormente: un progreso compartido interpola inclinación, elevación, iluminación y sombra, con amortiguación dependiente del tiempo y retorno gradual. La inclinación máxima es ahora de 6 grados. «Múltiples dimensiones» usa una interacción distinta: bloque fijo, acercamiento de la ilustración, halo suave y trazo bajo el título. Se verificaron muestras de entrada y salida progresivas con la preferencia real del sistema, la recuperación del reposo, la ausencia de inclinación en dimensiones y los anchos 390, 768 y 1440 px.
