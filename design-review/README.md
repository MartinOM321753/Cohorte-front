# Exploraciones de la landing

Etapa 1, pendiente de elección A/B. Rama: codex/landing-direcciones-visuales.

## Abrir
Desde client: `npm run dev`. Con el puerto local actual:
- A: http://localhost:5173/landing/exploraciones/a.html
- B: http://localhost:5173/landing/exploraciones/b.html

Cada propuesta permite cambiar a la otra desde la barra superior. Las secciones que no forman parte del prototipo enlazan al HTML original; Acceder mantiene /login. No se modificó la landing principal ni las propuestas anteriores.

## Dirección visual y tokens

| Propiedad | A: ciencia cercana | B: historia compartida |
| --- | --- | --- |
| Fondo | #edf2e9 | #123e31 |
| Texto | #153c31 | #f4f3e9 |
| Acción | #164c3c, texto blanco | #d8e9a5, texto #123e31 |
| Superficie de proyecto | #edf2e9 | #d8e9a5 |
| Titular | Manrope 600 | Literata 400 |
| Texto | Manrope 400, 16–17 px | Manrope 400, 16–17 px |
| Composición | Título y fotografía vertical; sección de lectura abierta | Titular ancho; fotografía horizontal; sección de información desplegable |

Fuentes autoalojadas con licencias OFL. Recursos visuales heredados del proyecto, con procedencia indicada en exploraciones/fonts/README.md. No se agregaron cifras, afirmaciones ni inscripciones.

## Revisión realizada
- Playwright CLI, Chromium: 390×844, 768×844, 1440×1000.
- Scroll width coincide con viewport en ambas propuestas en los tres tamaños.
- Todas las imágenes cargadas; capturas completas adjuntas en este directorio.
- Menú móvil abre, cierra con Escape y devuelve foco; navegación de proyecto y disclosures probados.
- Preferencia reduced-motion verificada sin estilos inline que falseen el resultado.
- 19 destinos/enlaces de B responden 200, anclas presentes; acceso a resultados y formulario de login navegado. Las instituciones y navegación son comunes a ambas opciones.
- No errores JavaScript en el recorrido comprobado.
- Revisión Impeccable: se corrigieron contraste del skip link, padding de la barra, iconos y CTA de B en tablet. Revisor independiente: ship para los dos hallazgos finales resueltos; limitado a etapa 1.

| Before | After | Why |
| --- | --- | --- |
| La acción en tablet B terminaba a 869 px | Termina a 705 px dentro de 844 px | CTA completo sin scroll inicial |
| Glifos de menú y desplegables | SVG consistentes, foco visible y Escape | Claridad y operación accesible |
| Fotografía B cortaba parte de la cabeza | Encuadre vertical al 20% en escritorio | Mantener a la participante reconocible |

## Límite de verificación
`npm run build` falla por TS1261 preexistente: Router.tsx importa BiobancoPage.tsx pero también se incluye BioBancoPage.tsx (diferencia de mayúsculas). Estos archivos no fueron modificados. Las propuestas son HTML/CSS/JS estáticos servidos correctamente por Vite; no se declara validada la compilación global. No se probaron autenticación contra backend ni integraciones ajenas a estas propuestas. No se publicó.

## Recomendación
B aporta el cambio más visible solicitado manteniendo un contexto serio de investigación. A queda como alternativa institucional más conservadora. Esperar la elección antes de extender a toda la landing.
