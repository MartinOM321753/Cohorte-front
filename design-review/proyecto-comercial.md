# Propuesta visual de El proyecto

Vista independiente: http://localhost:5173/landing/proyecto-propuesta/index.html?v=3
Rama: codex/landing-direcciones-visuales. La landing principal no se ha modificado.
Comparación con la distribución anterior: /landing/proyecto-propuesta/anterior.html.

## Comparación de referencias
- Owkin, Data Access: https://www.owkin.com/data/data-access. Separa el propósito de investigación de las modalidades de información y usa módulos con distinto peso. Se adoptó esa separación narrativa, conservando los hechos de la Cohorte.
- Tempus, Real-World Data: https://www.tempus.com/solutions/real-world-data/. Distingue información multimodal, conexión y seguimiento longitudinal. Se tomó la idea de hacer comprensible la integración con una representación visual. No se importaron cifras, afirmaciones ni capacidades de Tempus.
- Linear: https://linear.app/. Se consultó la página y su estructura de producto; la captura del contenido principal quedó incompleta, por lo que no se usa como prueba de comparación visual.

## Diseño
Seis áreas en composición asimétrica con ilustraciones vectoriales conceptuales para reconocimiento, cambio de escala tipográfica y fondos de la misma familia verde. Se mantienen todas las descripciones visibles. El bloque de información integrada cambia de registro y permite resaltar cada una de las tres capas sin ocultar contenido.

Las ilustraciones SVG son recursos conceptuales originales en el HTML, no gráficos de resultados o anatomía clínica. ADN y logotipo proceden de public/landing/assets, sin modificaciones. Manrope autoalojada reutiliza exploraciones/fonts.css y su licencia OFL existente.

## Verificación
- 22 títulos y textos cotejados automáticamente contra ambos bloques originales. Incluye las dos notas y el encabezado Una cohorte. Múltiples dimensiones.
- Playwright Chromium a 390, 768, 1440: 6 áreas y 3 grupos presentes, scrollWidth igual al viewport en cada tamaño, imágenes cargadas, sin errores JS.
- Los tres selectores cambian aria-pressed y la capa del esquema. Activación mediante teclado comprobada.
- Reduced motion: desplazamiento auto y transición 0s.
- Capturas: proyecto-comercial-390.png, proyecto-comercial-768.png, proyecto-comercial-1440.png.
- Auditoría mecánica Impeccable ejecutada una vez. Ajustado texto secundario. El warning de padding en sección exterior corresponde al fondo a todo el ancho: su contenido está insetado por .container (96 px en escritorio, 20 px en móvil).
- No se volvió a ejecutar compilación global: son archivos estáticos aislados. El bloqueo TypeScript de BiobancoPage/BioBancoPage informado previamente está fuera de este cambio.

Pendiente: elección del usuario e integración en la principal solo cuando lo indique.
## Ajustes de revisión final
El titular usa una jerarquía continua. La selección de una dimensión muestra confirmación junto al propio control, para que en móvil no sea necesario volver al diagrama. Todos los textos originales siguen visibles. Captura adicional: proyecto-seleccion-390.png.
## Revisión v4 — solo información integrada
El usuario aprobó la composición de áreas y pidió reemplazar únicamente el bloque de capas. La v4 presenta tres grupos en columnas abiertas sobre verde claro, con ilustraciones conceptuales de cuestionario, molécula y estudios de imagen. En móvil se distribuyen en filas con las imágenes junto al título. Se eliminó el selector de capas y su JavaScript, manteniendo los textos completos y la nota de disponibilidad.

Se comprobó que el HTML del bloque research aprobado es idéntico, y los hashes de _content.html, theme.css y LandingPage.tsx siguen iguales. Capturas actuales del bloque: dimensiones-390.png, dimensiones-768.png, dimensiones-1440.png. Playwright: sin desbordamiento ni errores JS en los tres tamaños. Auditoría: contraste de las categorías corregido; padding explícito preserva la geometría. Las imágenes vectoriales son ilustrativas, no resultados clínicos.
## Revisión v6 — familia tridimensional y sección común
El usuario pidió imágenes con realismo y volumen similares al ADN, y una indicación clara de que ambos bloques pertenecen a El proyecto. Se generaron ocho ilustraciones 3D con la herramienta integrada image_gen, usando ADN como referencia de material/paleta. El ADN original se conserva. Son ilustraciones conceptuales; no representan fotografías de participantes, muestras o resultados clínicos reales.

Recursos finales: public/landing/proyecto-propuesta/images/{heart,body,bone,brain,liver,clinical,molecular,followup}-3d.webp. Prompts exactos, modo de generación y referencia: image-prompts.json. Los PNG originales se conservan en el workspace, en ../tmp/proyecto-imagegen-originals; los derivados WebP preservan transparencia, miden 768×768 y suman 966198 bytes.

Se añadió h1 El proyecto en un contenedor común con dos secciones hijas y navegación a Áreas de investigación e Información integrada. Se corrigieron niveles de encabezados sin alterar los textos. Se verificaron los 22 títulos/párrafos de contenido originales, 8 imágenes nuevas completas, 6 áreas y 3 grupos. Capturas: proyecto-realista-390.png, proyecto-realista-768.png, proyecto-realista-1440.png. Playwright: scrollWidth igual al viewport en los tres tamaños, enlaces internos correctos y sin errores JS. Sin publicación ni cambios en la landing principal.
## Revisión v7 — colores naturales e integración lateral
Pedido del usuario: colores anatómicos/materiales reales y figuras laterales dentro de las seis tarjetas; en Una cohorte. Múltiples dimensiones, imágenes arriba también en móvil. La herramienta integrada image_gen editó nueve ilustraciones, conservando sujetos y composición. Órganos en colores anatómicos, instrumentos con acero/plásticos/goma; moléculas y ADN con colores convencionales CPK, que no se presentan como color intrínseco. Son ilustraciones educativas, no fotografías clínicas.

Recursos finales: public/landing/proyecto-propuesta/images/*-natural.webp. Prompts exactos y lista de archivos en image-prompts-natural.json. PNG editados conservados en ../tmp/proyecto-natural-originals; versión anterior en Git y en ../tmp/proyecto-previous-webp. Derivados WebP creados por conversión de formato/tamaño vía canvas, lado mayor768, calidad0.92 y alfa conservado.

Grid lateral en todas las tarjetas; en tablet una tarjeta por fila evita columnas estrechas. Bloque de información mantiene imágenes superiores y textos completos. Pruebas Playwright320/390/768/1440: mismo ancho de scroll y viewport, imágenes cargadas, sin errores JS, cajas de imágenes y textos disjuntas. Se comprobó la disposición lateral en investigación y la imagen superior al título en dimensiones. Los22 textos siguen íntegros. Capturas proyecto-natural-{320,390,768,1440}.png. Revisión visual final: ship en este alcance. No se tocó la landing principal.

