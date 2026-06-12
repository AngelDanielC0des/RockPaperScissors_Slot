# 🎰 Piedra, Papel o Tijera — Slot Edition | Component
Juego de Piedra, Papel o Tijera implementado como un **componente web autocontenido** con HTML5 semántico, CSS moderno y JavaScript ES6+ sin dependencias externas ni paso de compilación. Funciona por **torneos a 5 rondas**, con animación de ruletas tipo "tragaperras", confeti puro CSS al ganar, persistencia de la partida y soporte completo de accesibilidad y teclado.

---

## Tabla de contenidos

- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Cómo se juega](#cómo-se-juega)
- [Convenciones de nombrado](#convenciones-de-nombrado)
- [HTML — estructura y semántica](#html--estructura-y-semántica)
- [CSS — técnicas y decisiones](#css--técnicas-y-decisiones)
- [JavaScript — lógica y patrones](#javascript--lógica-y-patrones)
- [Accesibilidad (a11y)](#accesibilidad-a11y)
- [Glosario de términos técnicos](#glosario-de-términos-técnicos)
- [Compatibilidad](#compatibilidad)

---

## Arquitectura del proyecto

El proyecto se compone de tres archivos sin ningún proceso de compilación ni librerías. Se abre directamente en el navegador.

```
piedrapapeltijera/
├── index.html    → Estructura semántica y marcado accesible
├── styles.css    → Estilos, animaciones y diseño responsive
├── script.js     → Lógica del juego y manipulación del DOM
├── victory.mp3   → Sonido de victoria al ganar el torneo
└── README.md     → Este documento
```

La separación sigue el principio de **separación de responsabilidades** (*separation of concerns*): el HTML define *qué* es cada cosa (estructura y significado), el CSS define *cómo se ve* (presentación) y el JavaScript define *cómo se comporta* (lógica). Ninguna de las tres capas invade el terreno de las otras; por ejemplo, no hay estilos en línea en el HTML ni texto de presentación incrustado en el marcado.

---

## Cómo se juega

1. Se elige una jugada: **✊ Piedra**, **✋ Papel** o **✌️ Tijera**, con el ratón o con las teclas `1`, `2`, `3`.
2. Se gira de dos formas equivalentes: pulsando el botón **¡GIRAR!** o accionando la **palanca de tragaperras** situada en el borde izquierdo del botón. Ambas ruletas giran y se detienen en la jugada de cada bando.
3. Se resuelve la ronda y se actualiza el marcador (jugador / empates / máquina). **En caso de empate, ambos contendientes suman +1 punto** (y el contador de empates también se incrementa).
4. Tras **5 rondas** el torneo finaliza, se muestra el veredicto y, si gana el jugador, aparece confeti y suena un sonido de victoria. El botón pasa a **Reiniciar Torneo** y la palanca desaparece hasta el siguiente torneo.

El estado se guarda en `sessionStorage`, de modo que recargar la pestaña a media partida no pierde el progreso (salvo que el torneo ya hubiera terminado, en cuyo caso la clave se elimina).

---

## Convenciones de nombrado

El nombrado es deliberado y consistente en todo el proyecto. Es una de las decisiones más importantes para la legibilidad.

### En CSS: metodología BEM

Las clases siguen **BEM** (*Block, Element, Modifier*), un esquema que evita colisiones de nombres y hace evidente la relación entre elementos con solo leer la clase:

```
.juego-ppt                 →  Bloque   (el componente raíz)
.juego-ppt__marcador       →  Elemento (una parte del bloque, separada por «__»)
.juego-ppt--ganador        →  Modificador (un estado/variante, separado por «--»)
```

| Parte | Sintaxis | Significado |
|-------|----------|-------------|
| **Block** | `.juego-ppt` | Entidad independiente con sentido propio |
| **Element** | `.juego-ppt__boton-accion` | Una pieza que solo existe dentro del bloque |
| **Modifier** | `.juego-ppt--ganador` | Una variación de aspecto o estado |

Ventaja: la especificidad se mantiene **plana** (casi todo son selectores de una sola clase), por lo que nunca hace falta recurrir a `!important` ni pelear con cascadas impredecibles.

### En JavaScript: español, descriptivo y por rol

- **Variables y funciones:** `camelCase` y en español, describiendo la acción o el dato: `obtenerSeleccionJugador`, `generarJugadaMaquina`, `actualizarMarcadores`. El nombre dice lo que hace sin necesidad de comentario.
- **Constantes de configuración:** `UPPER_SNAKE_CASE` para valores fijos globales: `CLAVE_SESION`, `CONFIG`, `MATRIZ_REGLAS`, `EMOJIS`, `TITULO_ORIGINAL`. La mayúscula señala de un vistazo "esto no cambia en tiempo de ejecución".
- **Objetos de módulo:** `PascalCase` para los dos grandes contenedores lógicos: `GameLogic` y `UI`.
- **Métodos "privados":** prefijo `_` por convención para lo que no se piensa usar desde fuera del objeto: `_crearTiraCarrusel`, `_programarTimeout`, `_configurarEventos`. JavaScript no impone privacidad real aquí, pero el guion bajo comunica la intención.

### En los `id` y atributos del HTML

Los identificadores son descriptivos y en `kebab-case`: `marcador-puntos-jugador`, `carrusel-opciones-maquina`, `boton-iniciar-giro`. Cada `id` que usa el JS está pensado para no ser ambiguo.

---

## HTML — estructura y semántica

El marcado usa **etiquetas semánticas de HTML5** en lugar de `div` genéricos, para que navegadores y lectores de pantalla entiendan la estructura:

- `<main>` — el contenido principal único de la página, etiquetado con `aria-labelledby` apuntando al título.
- `<header>` — la cabecera del componente (título, marcador, mensaje de estado).
- `<section>` — el área de juego, agrupada y etiquetada con `aria-label`.
- `<form>` + `<fieldset>` + `<legend>` — los controles de selección agrupados semánticamente. El `<fieldset>` agrupa los radios de "qué jugada eliges" y la `<legend>` (oculta con `.sr-only`) los titula para tecnologías de asistencia.
- Jerarquía de encabezados limpia: un único `<h1>` (el título) y dos `<h2>` (Jugador / Máquina), sin saltos de nivel.

Otros detalles del marcado:

- **Radios en vez de botones sueltos:** la elección de jugada se modela con `<input type="radio">`, semántica correcta para "elige una opción de un grupo". Aporta navegación por teclado y agrupación de forma nativa.
- **`<kbd>`** envuelve los números `1`/`2`/`3` porque representan teclas físicas del teclado.
- **Emojis decorativos** del título envueltos en `<span aria-hidden="true">` para que el lector de pantalla no los lea como "máquina tragaperras".
- **Subtítulos en capitalización normal** ("Jugador" / "Máquina") en el HTML; las mayúsculas visuales se aplican en el CSS con `text-transform`, manteniendo el contenido separado de la presentación.
- **Favicon embebido como SVG** en un `data:` URI, sin archivo externo.
- **`defer`** en el `<script>` para que el JS se descargue en paralelo y se ejecute justo después de parsear el HTML, sin bloquear el render.

---

## CSS — técnicas y decisiones

### Tokens de diseño (variables CSS)

Toda la paleta y algunas medidas viven como **custom properties** en `:root`:

```css
:root {
    --ppt-color-acento: #e94560;
    --ppt-alto-item-ruleta: 100px;
    /* ... */
}
```

Cambiar un color o la altura de la ruleta se hace en **un solo sitio** y se propaga a todo el componente. La misma altura (`--ppt-alto-item-ruleta`) tiene su equivalente en JS (`CONFIG.alturaItemPx`), manteniendo CSS y JS coordinados.

### Propiedades lógicas

Se usan propiedades **lógicas** de forma consistente en lugar de físicas: `padding-inline`, `padding-block`, `margin-block-end`, `inline-size`, `min-block-size`. Se basan en el flujo del texto (inicio/fin del eje en línea y de bloque) en lugar de izquierda/derecha/arriba/abajo, lo que da soporte automático a idiomas de derecha a izquierda y es la práctica moderna recomendada.

### Container Queries

Cada ruleta es un **contenedor de consulta** (`container-type: inline-size`). El tamaño de fuente del emoji se adapta al **ancho de su propio contenedor**, no al de la ventana:

```css
.juego-ppt__modulo-ruleta { container-type: inline-size; }

@container (min-inline-size: 180px) {
    .juego-ppt__carrusel-item { font-size: 3.2rem; }
}
```

Es más robusto que las media queries clásicas: el componente se adapta sin importar dónde se coloque.

### Selector `:has()` (el "selector padre")

Se usa para atenuar las etiquetas de selección **mientras** hay una animación en curso, mirando hacia un descendiente:

```css
.juego-ppt:has(.juego-ppt__carrusel-tira.is-animating) .juego-ppt__etiqueta {
    opacity: 0.5;
    pointer-events: none;
}
```

Antes de `:has()` esto exigía JavaScript; ahora es CSS puro.

### Truco de los radios ocultos (`radio + label`)

Los `<input type="radio">` se ocultan visualmente (pero siguen siendo accesibles, mediante `clip-path: inset(50%)`, no `display:none`) y el aspecto se pinta sobre el `<label>` usando el **selector hermano adyacente** `+`:

```css
.juego-ppt__radio:checked + .juego-ppt__etiqueta {
    background: var(--ppt-color-acento);
    transform: translateY(-2px);
}
```

Así se consigue un selector visual personalizado conservando toda la mecánica nativa de un grupo de radios.

### Confeti 100% CSS

El confeti no usa imágenes ni JS: son los pseudo-elementos `::before` y `::after` del contenedor ganador, multiplicados con **`box-shadow` múltiple** (decenas de sombras desplazadas, cada una un "papelito") y animados con `@keyframes confeti-caida`. Se activa solo añadiendo la clase modificadora `.juego-ppt--ganador`.

### Transiciones específicas y `will-change` dinámico

- Se transicionan **propiedades concretas** (`background-color`, `transform`, `box-shadow`, `opacity`) en vez de `transition: all`, que sería más costoso e impredecible.
- `will-change: transform` se aplica **solo durante** la animación (clase `.is-animating`), evitando reservar recursos de GPU de forma permanente.

### Palanca de tragaperras (puro CSS)

La palanca es un elemento **decorativo** (`aria-hidden`) anclado al borde izquierdo del botón. Es un brazo metálico con una bola que **pivota sobre su base** (`transform-origin: bottom center`):

```css
.juego-ppt__palanca        { transform: rotate(12deg); }   /* reposo */
.juego-ppt__palanca.is-down { transform: rotate(155deg); }  /* accionada */
.juego-ppt__palanca.is-hidden { opacity: 0; transform: rotate(12deg) scale(0.4); }
```

El JavaScript solo alterna esas clases: baja al girar (`is-down`), vuelve a reposo al terminar la ronda, y se oculta (`is-hidden`) cuando el botón pasa a modo *Reiniciar*. La transición suave la da `transition: transform`, que se anula con `prefers-reduced-motion`. Accionar la palanca con el ratón equivale a pulsar **¡GIRAR!**.

### Responsive y accesibilidad de movimiento

La estrategia responsive es **conservadora y deliberada**: las ruletas y el marcador permanecen en horizontal todo lo posible (flexbox y las container queries gestionan su encogido), porque apilarlos verticalmente alargaría la tarjeta y rompería la lectura "versus". Solo el **selector de opciones** se apila, ya que sus tres etiquetas largas dejarían de caber en una fila.

- **`@media (max-width: 560px)`** apila el selector de opciones y reduce el *padding* de la tarjeta.
- **`@media (max-width: 380px)`** afina tamaños (fuente del marcador y del emoji, *gaps*) para evitar cualquier desborde en móviles pequeños, manteniendo ruletas y marcador en fila.
- **`@media (hover: hover)`** aplica los efectos `:hover` solo en dispositivos con puntero real (evita estados "pegados" en táctiles).
- **`@media (prefers-reduced-motion: reduce)`** desactiva transiciones, animaciones y confeti para usuarios que han pedido reducir el movimiento.
- **`:focus-visible`** dibuja un contorno claro solo al navegar con teclado, sin molestar al usar el ratón.
- **`min-block-size: 100dvh`** usa la unidad de viewport dinámica para evitar saltos por la barra de direcciones en móviles.

---

## JavaScript — lógica y patrones

### Encapsulación con IIFE y `'use strict'`

Todo el código vive dentro de una **IIFE** (*Immediately Invoked Function Expression*) en modo estricto:

```js
(() => {
    'use strict';
    // ... todo el juego ...
})();
```

Esto evita contaminar el ámbito global (`window`): ninguna variable del juego se filtra fuera. `'use strict'` activa comprobaciones más severas y previene errores silenciosos.

### Dos objetos con responsabilidad única

- **`GameLogic`** — el "modelo": estado de la partida, reglas, persistencia y el flujo de una ronda. No toca el DOM directamente.
- **`UI`** — la "vista": caché de elementos, animaciones, accesibilidad y confeti. No conoce las reglas del juego.

Esta separación permite razonar y modificar cada parte por separado.

### Tabla de búsqueda O(1) en vez de `if` anidados

El resultado de una ronda no se calcula con condicionales encadenados, sino consultando un **objeto-diccionario** con clave `"jugador-maquina"`:

```js
const MATRIZ_REGLAS = {
    '0-2': 'ganas',   '1-0': 'ganas',   '2-1': 'ganas',
    '2-0': 'pierdes', '0-1': 'pierdes', '1-2': 'pierdes',
    '0-0': 'empate',  '1-1': 'empate',  '2-2': 'empate'
};
```

El acceso por clave es **O(1)** (tiempo constante): no importa cuántas reglas haya, la consulta es inmediata y el código queda declarativo y sin ramas.

### Una única fuente de verdad para los emojis

La lista de jugadas se declara **una sola vez** en `CONFIG.opciones`, y el mapa `EMOJIS` (índice → emoji) se **deriva** de ella con `Object.fromEntries`, de modo que ambas estructuras nunca se desincronizan:

```js
const EMOJIS = Object.fromEntries(
    CONFIG.opciones.map((emoji, indice) => [indice, emoji])
);
```

### Lectura defensiva de la selección

`obtenerSeleccionJugador` lee el `value` de la `RadioNodeList` del grupo. Como esa propiedad devuelve `''` cuando no hay nada marcado (y `Number('')` sería `0`, una jugada válida por accidente), se normaliza explícitamente a `NaN` para que el guard posterior lo rechace:

```js
return valor === '' || valor == null ? NaN : Number(valor);
```

### Manipulación del DOM eficiente

- **Caché de referencias:** los elementos se buscan **una vez** al iniciar (`UI.inicializarCache`) y se guardan en `UI.cache`, evitando consultas repetidas al DOM.
- **`DocumentFragment`:** las tiras de las ruletas se construyen en un fragmento en memoria y se insertan de una sola vez, evitando *reflows* (recálculos de diseño) por cada `<li>`.
- **`replaceChildren()`:** reemplaza el contenido de un nodo de forma limpia, sin `innerHTML = ''` ni bucles de borrado.

### Animaciones con la Web Animations API (WAAPI)

Las ruletas se animan con `element.animate()` en lugar de mutar estilos en un bucle. Devuelve una promesa (`anim.finished`) que permite **esperar a que ambas ruletas terminen en paralelo** con `Promise.all`:

```js
await Promise.all([
    UI.ejecutarAnimacionCarrusel(carruselJugador, seleccionJugador),
    UI.ejecutarAnimacionCarrusel(carruselMaquina, seleccionMaquina)
]);
```

`fill: 'forwards'` mantiene la posición final, y la duración pasa a `0` ms si el usuario tiene activado `prefers-reduced-motion`.

### Gestión de eventos y de timers

- Los listeners se registran **una sola vez** (`submit`, `keydown`, `visibilitychange`), no uno por botón.
- Los `setTimeout` se registran en un `Set` (`_programarTimeout` / `cancelarTimers`) para poder **cancelarlos todos** al reiniciar, evitando *memory leaks* y callbacks fantasma.
- `try / catch / finally` en la ronda garantiza que la interfaz se **desbloquee siempre**, incluso si la animación falla.

### Persistencia en `sessionStorage`

- Se guarda **solo la clave específica** (`ESTADO_PARTIDA_PPT_V1`); nunca se usa `clear()`, para no afectar a otros datos de la página.
- La carga va envuelta en `try/catch`: si el JSON está corrupto, se captura el error y se elimina únicamente esa clave.
- Al finalizar el torneo, la clave se elimina.

### Page Visibility API

Al cambiar de pestaña, el `document.title` muestra "🎮 Vuelve a la partida" y se restaura al volver, como guiño para recuperar la atención del usuario.

### Inicialización segura

El arranque comprueba el estado del documento para funcionar tanto si el script carga antes como después de que el DOM esté listo:

```js
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarJuego);
} else {
    inicializarJuego();
}
```

---

## Accesibilidad (a11y)

La accesibilidad está integrada, no añadida al final:

- **Una única región viva** (`aria-live` / `aria-atomic`) en el mensaje de estado: concentra los anuncios para evitar lecturas dobles. El mensaje sube temporalmente a `aria-live="assertive"` para anunciar el resultado de inmediato y vuelve a `polite`. El marcador conserva su `aria-label` pero **no** es región viva, evitando que se relea la puntuación completa en cada ronda.
- **`role="status"`** en el mensaje de estado de la partida.
- **`<legend class="sr-only">`** titula el grupo de opciones solo para lectores de pantalla (`.sr-only` lo oculta visualmente pero lo deja en el árbol de accesibilidad).
- **`aria-keyshortcuts`** documenta los atajos `1`/`2`/`3` para tecnologías de asistencia.
- **`aria-hidden="true"`** en las tiras de las ruletas (decorativas) y en los emojis del título, para no generar ruido.
- **Navegación por teclado completa:** selección con `1`/`2`/`3`, envío con `Enter`, y foco siempre visible gracias a `:focus-visible`.
- **`prefers-reduced-motion`** respetado tanto en CSS como en JS.

---

## Glosario de términos técnicos avanzados

| Término | Qué significa aquí |
|---------|--------------------|
| **BEM** | Convención de nombres CSS: Bloque, Elemento (`__`), Modificador (`--`). |
| **IIFE** | Función que se ejecuta sola al definirse; aísla el código del ámbito global. |
| **Token de diseño** | Variable CSS (`--ppt-...`) que centraliza un valor reutilizable. |
| **Propiedad lógica** | `inline`/`block` en vez de `left`/`right`/`top`/`bottom`; respeta el flujo del idioma. |
| **Container Query** | Estilo que reacciona al tamaño del contenedor, no al de la ventana. |
| **`:has()`** | Selector que estiliza un elemento según sus descendientes ("selector padre"). |
| **WAAPI** | Web Animations API: animar con `element.animate()` desde JavaScript. |
| **O(1)** | Operación de tiempo constante; no se ralentiza al crecer los datos. |
| **DocumentFragment** | Contenedor en memoria para insertar muchos nodos de una vez, sin *reflows*. |
| **Reflow** | Recálculo de la disposición de la página; costoso, conviene minimizarlo. |
| **RadioNodeList** | Colección que devuelve `form.elements` para un grupo de radios con el mismo `name`. |
| **`prefers-reduced-motion`** | Preferencia del sistema para reducir animaciones. |

---

## Compatibilidad

Funciona en cualquier navegador moderno que soporte:

- **Web Animations API** (Chrome 36+, Firefox 48+, Safari 13.1+, Edge 79+)
- **CSS Custom Properties**, **propiedades lógicas** y unidad **`dvh`**
- **Container Queries** y **`:has()`** (Chrome/Edge 105+, Safari 15.4+, Firefox 121+)
- **`DocumentFragment`** y **`replaceChildren`**

> En navegadores sin soporte de Container Queries o `:has()`, el juego sigue siendo funcional; solo se pierden refinamientos visuales (ajuste tipográfico por contenedor y atenuado de etiquetas durante el giro).

---

## Desplegado en githuhpages:

https://angeldanielc0des.github.io/RockPaperScissors_Slot/
