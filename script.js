/**
 * @fileoverview Piedra, Papel o Tijera — Componente Premium v4.0
 * Arquitectura modular con objetos UI y GameLogic separados.
 * Mejoras: inicialización segura, carrusel optimizado (3 vueltas),
 * selección por teclado (1,2,3), confeti CSS al ganar torneo,
 * anuncios accesibles por resultado, cleanup robusto de animaciones,
 * palanca de tragaperras accionable y regla de empate con punto doble.
 */
(() => {
    'use strict';

    /* ── 1. CONFIGURACIÓN Y CONSTANTES GLOBALES ────────────────────────────── */
    const CLAVE_SESION = 'ESTADO_PARTIDA_PPT';
    const TITULO_ORIGINAL = 'Piedra, Papel o Tijera - Slot Edition'

    const CONFIG = {
        alturaItemPx: 100,
        duracionAnimacionMs: 3000,
        opciones: ['✊', '✋', '✌️'],
        maximoRondas: 5,
        indiceFinalCarrusel: 7, // 1 spacer + (3 vueltas × 3 opciones) = 10 items; último bloque inicia en índice 7
        duracionConfetiMs: 4000,
        delayRevertirAriaLiveMs: 200
    };

    // Derivado de CONFIG.opciones para mantener una única fuente de verdad
    const EMOJIS = Object.fromEntries(
        CONFIG.opciones.map((emoji, indice) => [indice, emoji])
    );

    /**
     * TABLA DE BÚSQUEDA O(1) — Resuelve resultado sin condicionales anidados.
     * Clave: 'jugadaJugador-jugadaMaquina' (0=Piedra, 1=Papel, 2=Tijera)
     */
    const MATRIZ_REGLAS = {
        '0-2': 'ganas',   '1-0': 'ganas',   '2-1': 'ganas',
        '2-0': 'pierdes', '0-1': 'pierdes', '1-2': 'pierdes',
        '0-0': 'empate',  '1-1': 'empate',  '2-2': 'empate'
    };

    /* ── 2. GameLogic — Estado, reglas, persistencia y flujo de partida ────── */
    const GameLogic = {
        /** @type {{ puntuacionJugador: number, puntuacionMaquina: number,
         *           cantidadEmpates: number, totalRondasJugadas: number,
         *           partidaFinalizada: boolean }} */
        estado: {
            puntuacionJugador: 0,
            puntuacionMaquina: 0,
            cantidadEmpates: 0,
            totalRondasJugadas: 0,
            partidaFinalizada: false
        },

        /** @returns {number} 0=Piedra, 1=Papel, 2=Tijera — distribución uniforme */
        generarJugadaMaquina() {
            return Math.floor(Math.random() * 3);
        },

        /** Resuelve resultado vía tabla O(1) */
        resolverResultado(jugador, maquina) {
            return MATRIZ_REGLAS[`${jugador}-${maquina}`];
        },

        /** Actualiza puntuaciones según el resultado de la ronda */
        actualizarPuntuacion(resultado) {
            if (resultado === 'ganas') {
                this.estado.puntuacionJugador++;
            } else if (resultado === 'pierdes') {
                this.estado.puntuacionMaquina++;
            } else {
                // Regla de empate: ambos reciben +1 para mantener la tensión
                // del torneo — un empate no es "gratis", cuesta un punto a cada bando
                this.estado.puntuacionJugador++;
                this.estado.puntuacionMaquina++;
                this.estado.cantidadEmpates++;
            }
            this.estado.totalRondasJugadas++;
        },

        /** Serializa y persiste el estado en SessionStorage */
        guardarSesion() {
            sessionStorage.setItem(CLAVE_SESION, JSON.stringify(this.estado));
        },

        /** Recupera estado desde SessionStorage con manejo defensivo de errores */
        cargarSesion() {
            try {
                const datos = sessionStorage.getItem(CLAVE_SESION);
                if (datos) {
                    Object.assign(this.estado, JSON.parse(datos));
                }
            } catch (e) {
                sessionStorage.removeItem(CLAVE_SESION);
            }
        },

        /** Determina si el torneo ha finalizado */
        torneoFinalizado() {
            return this.estado.totalRondasJugadas >= CONFIG.maximoRondas;
        },

        /** Retorna el ganador del torneo: 'jugador' | 'maquina' | 'empate' */
        resultadoTorneo() {
            if (this.estado.puntuacionJugador > this.estado.puntuacionMaquina) return 'jugador';
            if (this.estado.puntuacionMaquina > this.estado.puntuacionJugador) return 'maquina';
            return 'empate';
        },

        /** Reinicia el modelo a valores iniciales */
        reiniciarEstado() {
            Object.assign(this.estado, {
                puntuacionJugador: 0,
                puntuacionMaquina: 0,
                cantidadEmpates: 0,
                totalRondasJugadas: 0,
                partidaFinalizada: false
            });
            sessionStorage.removeItem(CLAVE_SESION);
        },

        /**
         * Orquestador principal de una ronda completa.
         *
         * Flujo: leer selección → generar jugada máquina → bloquear UI →
         * animar ambas ruletas en paralelo → resolver resultado → actualizar
         * estado → reflejar en UI → verificar fin de torneo.
         */
        async procesarRonda() {
            const seleccionJugador = UI.obtenerSeleccionJugador();
            if (!Number.isInteger(seleccionJugador)) return;

            const seleccionMaquina = this.generarJugadaMaquina();

            UI.bloquearControles(true);
            UI.establecerMensaje('¡Girando la suerte! 🎰', 'var(--ppt-color-texto)');
            UI.iniciarAnimacion();

            try {
                await Promise.all([
                    UI.ejecutarAnimacionCarrusel(UI.cache.carruselJugador, seleccionJugador),
                    UI.ejecutarAnimacionCarrusel(UI.cache.carruselMaquina, seleccionMaquina)
                ]);

                const resultado = this.resolverResultado(seleccionJugador, seleccionMaquina);
                this.actualizarPuntuacion(resultado);

                UI.actualizarMarcadores(this.estado);
                UI.anunciarResultadoAccesible(resultado, seleccionJugador, seleccionMaquina);

                if (this.torneoFinalizado()) {
                    this.finalizarTorneo();
                } else {
                    this.guardarSesion();
                }
            } catch (error) {
                console.error('Fallo durante la animación:', error);
            } finally {
                UI.finalizarAnimacion();
                if (!this.estado.partidaFinalizada) {
                    UI.bloquearControles(false);
                    UI.cache.botonGirar.focus()
                }
            }
        },

        /** Finaliza el torneo, muestra veredicto y prepara reinicio */
        finalizarTorneo() {
            this.estado.partidaFinalizada = true;
            sessionStorage.removeItem(CLAVE_SESION);

            const { puntuacionJugador: pj, puntuacionMaquina: pm } = this.estado;
            const ganador = this.resultadoTorneo();

            if (ganador === 'jugador') {
                UI.establecerMensaje(
                    `🏆 ¡Ganaste el Torneo! (${pj}-${pm})`,
                    'var(--ppt-color-exito)'
                );
                UI.mostrarConfeti();
                UI.reproducirSonidoVictoria();
            } else if (ganador === 'maquina') {
                UI.establecerMensaje(
                    `❌ Derrota en el torneo (${pm}-${pj})`,
                    'var(--ppt-color-acento)'
                );
            } else {
                UI.establecerMensaje(
                    '⚖️ Torneo terminado en Empate Absoluto',
                    'var(--ppt-color-empate)'
                );
            }

            UI.prepararBotonReinicio();
            UI.cache.botonGirar.focus();
        },

        /** Reinicia todo para un nuevo torneo desde cero */
        iniciarNuevoTorneo() {
            UI.cancelarTimers();
            UI.ocultarConfeti();
            UI.limpiarAnimaciones();
            UI.restaurarPalanca();
            UI.restaurarAudio();
            this.reiniciarEstado();
            UI.actualizarMarcadores(this.estado);
            UI.establecerMensaje('Elige tu opción y gira', 'var(--ppt-color-exito)');
            UI.cache.formulario.reset();
            UI.cache.radioPiedra.checked = true;
            UI.bloquearControles(false);
        }
    };

    /* ── 3. UI — Capa de vista, animaciones, accesibilidad y confeti ───────── */
    const UI = {
        /** @type {Object<string, HTMLElement>} */
        cache: {},
        /** @type {HTMLInputElement[]} */
        radios: [],
        _timers: new Set(),
        /** @type {HTMLAudioElement|null} */
        _audioVictoria: null,

        /** Cachea todas las referencias DOM en un solo punto para evitar queries repetitivos */
        inicializarCache() {
            this.cache = {
                marcadorJugador: document.getElementById('marcador-puntos-jugador'),
                marcadorEmpates: document.getElementById('marcador-puntos-empates'),
                marcadorMaquina: document.getElementById('marcador-puntos-maquina'),
                mensajeEstado: document.getElementById('mensaje-estado-partida'),
                carruselJugador: document.getElementById('carrusel-opciones-jugador'),
                carruselMaquina: document.getElementById('carrusel-opciones-maquina'),
                formulario: document.getElementById('formulario-control-juego'),
                botonGirar: document.getElementById('boton-iniciar-giro'),
                contenedor: document.querySelector('.juego-ppt'),
                radioPiedra: document.getElementById('opcion-piedra'),
                palanca: document.getElementById('palanca-tragaperras')
            };
            this.radios = [...document.querySelectorAll('.juego-ppt__radio')];
            this._audioVictoria = new Audio('victory.mp3');
            this._audioVictoria.preload = 'auto';
            this._audioVictoria.volume = 0.6;
        },

        /** @returns {number} Índice numérico de la opción seleccionada, o NaN si ninguna */
        obtenerSeleccionJugador() {
            const valor = this.cache.formulario
                .elements
                .opcionSeleccionadaJugador
                ?.value;
            return valor === '' || valor == null ? NaN : Number(valor);
        },

        /** Genera y asigna el contenido de ambos carruseles */
        generarCarruseles() {
            const tira = this._crearTiraCarrusel();
            this.cache.carruselJugador.replaceChildren(tira.cloneNode(true));
            this.cache.carruselMaquina.replaceChildren(tira.cloneNode(true));
        },

        /**
         * Crea una tira de carrusel eficiente con DocumentFragment.
         * Solo 3 vueltas completas — suficiente para el efecto visual.
         */
        _crearTiraCarrusel() {
            const frag = document.createDocumentFragment();

            const itemVacio = document.createElement('li');
            itemVacio.className = 'juego-ppt__carrusel-item';
            frag.appendChild(itemVacio);

            for (let i = 0; i < 3; i++) {
                CONFIG.opciones.forEach(emoji => {
                    const item = document.createElement('li');
                    item.className = 'juego-ppt__carrusel-item';
                    item.textContent = emoji;
                    frag.appendChild(item);
                });
            }
            return frag;
        },

        /** Añade clases indicadoras de animación en curso y baja la palanca */
        iniciarAnimacion() {
            this.cache.carruselJugador.classList.add('is-animating');
            this.cache.carruselMaquina.classList.add('is-animating');
            this.cache.palanca.classList.add('is-down');
        },

        /** Quita clases indicadoras de animación y sube la palanca a reposo */
        finalizarAnimacion() {
            this.cache.carruselJugador.classList.remove('is-animating');
            this.cache.carruselMaquina.classList.remove('is-animating');
            this.cache.palanca.classList.remove('is-down');
        },

        /**
         * Ejecuta animación de carrete vertical vía Web Animations API.
         *
         * @param {HTMLElement} nodo - Elemento <ul> del carrusel
         * @param {number} indiceOpcion - Índice destino (0, 1 o 2)
         * @returns {Promise<void>}
         */
        ejecutarAnimacionCarrusel(nodo, indiceOpcion) {
            const posFinal = CONFIG.indiceFinalCarrusel + Number(indiceOpcion);
            const px = posFinal * CONFIG.alturaItemPx;
            const reducirMovimiento = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches;

            const anim = nodo.animate(
                [
                    { transform: 'translateY(0px)' },
                    { transform: `translateY(-${px}px)` }
                ],
                {
                    duration: reducirMovimiento ? 0 : CONFIG.duracionAnimacionMs,
                    easing: 'cubic-bezier(0.15, 0.85, 0.45, 1)',
                    fill: 'forwards'
                }
            );

            return anim.finished;
        },

        /**
         * Cancela todas las animaciones activas en ambos carruseles.
         * Prevención de memory leaks y estados residuales.
         */
        limpiarAnimaciones() {
            [this.cache.carruselJugador, this.cache.carruselMaquina].forEach(el => {
                el.getAnimations().forEach(a => a.cancel());
            });
        },

        /** Sincroniza los tres marcadores con el estado actual */
        actualizarMarcadores(estado) {
            this.cache.marcadorJugador.textContent = estado.puntuacionJugador;
            this.cache.marcadorEmpates.textContent = estado.cantidadEmpates;
            this.cache.marcadorMaquina.textContent = estado.puntuacionMaquina;
        },

        /** Establece texto y color del mensaje de estado */
        establecerMensaje(texto, color) {
            this.cache.mensajeEstado.textContent = texto;
            this.cache.mensajeEstado.style.color = color;
        },

        /**
         * Anuncio accesible del resultado con contexto completo.
         * Cambia aria-live a 'assertive' temporalmente para forzar
         * el anuncio inmediato en lectores de pantalla.
         * También establece el color semántico correspondiente.
         */
        anunciarResultadoAccesible(resultado, selJugador, selMaquina) {
            const emojiJ = EMOJIS[selJugador];
            const emojiM = EMOJIS[selMaquina];
            const plantillas = {
                ganas: ['¡Ganaste! Elegiste %s contra %s 🎉', 'var(--ppt-color-exito)'],
                pierdes: ['Perdiste. La máquina jugó %s contra tu %s 🤖', 'var(--ppt-color-acento)'],
                empate: ['Empate. Ambos jugaron %s 🤝', 'var(--ppt-color-empate)']
            };
            const [plantilla, color] = plantillas[resultado];
            const texto = plantilla.replace('%s', emojiJ).replace('%s', emojiM);

            const region = this.cache.mensajeEstado;
            region.setAttribute('aria-live', 'assertive');
            this.establecerMensaje(texto, color);

            this._programarTimeout(() => {
                region.setAttribute('aria-live', 'polite');
            }, CONFIG.delayRevertirAriaLiveMs);
        },

        /** Habilita o deshabilita los controles del formulario */
        bloquearControles(bloquear) {
            this.cache.botonGirar.disabled = bloquear;
            this.cache.botonGirar.textContent = bloquear ? 'Procesando...' : '¡GIRAR!';
            this.radios.forEach(r => {
                r.disabled = bloquear;
            });
        },

        /** Selecciona la opción del jugador según índice de tecla (0,1,2) */
        seleccionarOpcionPorIndice(indice) {
            if (indice >= 0 && indice < this.radios.length) {
                this.radios[indice].checked = true;
            }
        },

        /** Activa el efecto visual de confeti al ganar el torneo */
        mostrarConfeti() {
            this.cache.contenedor.classList.add('juego-ppt--ganador');
            this._programarTimeout(() => this.ocultarConfeti(), CONFIG.duracionConfetiMs);
        },

        ocultarConfeti() {
            this.cache.contenedor.classList.remove('juego-ppt--ganador');
        },

        /** Reproduce el sonido de victoria al ganar el torneo */
        reproducirSonidoVictoria() {
            const audio = this._audioVictoria;
            if (!audio) return;
            audio.currentTime = 0;
            audio.play().catch(error => {
                console.warn('No se pudo reproducir el sonido de victoria:', error);
            });
        },

        /** Detiene y reinicia el audio de victoria al comenzar un nuevo torneo */
        restaurarAudio() {
            if (this._audioVictoria) {
                this._audioVictoria.pause();
                this._audioVictoria.currentTime = 0;
            }
        },

        /** Reconfigura el botón de giro como disparador de reinicio del torneo */
        prepararBotonReinicio() {
            this.cache.botonGirar.textContent = 'Reiniciar Torneo 🔄';
            this.cache.botonGirar.disabled = false;
            this.cache.palanca.classList.add('is-hidden');
        },

        restaurarPalanca() {
            this.cache.palanca.classList.remove('is-hidden', 'is-down');
        },

        /** Ejecuta un setTimeout rastreable que se limpia con el componente */
        _programarTimeout(fn, ms) {
            const id = setTimeout(() => {
                this._timers.delete(id);
                fn();
            }, ms);
            this._timers.add(id);
            return id;
        },

        cancelarTimers() {
            this._timers.forEach(id => clearTimeout(id));
            this._timers.clear();
        }
    };

    /* ── 4. INICIALIZACIÓN Y SUSCRIPCIÓN A EVENTOS ─────────────────────────── */

    /**
     * Inicialización segura: garantiza que el DOM esté disponible antes de
     * acceder a cualquier elemento. Soporta tanto carga síncrona como asíncrona.
     */
    function inicializarJuego() {
        UI.inicializarCache();
        UI.generarCarruseles();
        GameLogic.cargarSesion();
        UI.actualizarMarcadores(GameLogic.estado);
        UI.cache.radioPiedra.checked = true;
        _configurarEventos();
    }

    /**
     * Registra todos los listeners del componente.
     *
     * - visibilitychange: actualiza el título de la pestaña para recuperar
     *   la atención del usuario cuando abandona la partida.
     * - submit: orquesta rondas o reinicios según el estado de partidaFinalizada.
     * - keydown: mapea las teclas 1/2/3 a selección de opción para accesibilidad
     *   de teclado. Se ignoran las pulsaciones si la partida está finalizada o
     *   los controles están bloqueados por una animación en curso.
     */
    function _configurarEventos() {
        document.addEventListener('visibilitychange', () => {
            document.title = document.hidden ? '🎮 Vuelve a la partida' : TITULO_ORIGINAL;
        });

        UI.cache.formulario.addEventListener('submit', (e) => {
            e.preventDefault();
            if (GameLogic.estado.partidaFinalizada) {
                GameLogic.iniciarNuevoTorneo();
            } else {
                GameLogic.procesarRonda();
            }
        });

        // Accionar la palanca equivale a pulsar «¡GIRAR!»
        UI.cache.palanca.addEventListener('click', () => {
            if (GameLogic.estado.partidaFinalizada || UI.cache.botonGirar.disabled) return;
            UI.cache.formulario.requestSubmit();
        });

      document.addEventListener('keydown', (e) => {
            // Captura global de la tecla Intro
            if (e.key === 'Enter') {
                if (GameLogic.estado.partidaFinalizada) {
                    e.preventDefault();
                    UI.cache.formulario.requestSubmit(); // Dispara el reinicio del torneo
                    return;
                }
                if (!UI.cache.botonGirar.disabled) {
                    e.preventDefault();
                    UI.cache.formulario.requestSubmit(); // Dispara el giro de la ruleta
                    return;
                }
            }

            // Mapeo existente de teclas 1, 2, 3
            if (GameLogic.estado.partidaFinalizada) return;
            if (UI.cache.botonGirar.disabled) return;

            const tecla = e.key;
            if (tecla === '1' || tecla === '2' || tecla === '3') {
                e.preventDefault();
                UI.seleccionarOpcionPorIndice(Number(tecla) - 1);
            }
        });
    }

    // Ejecución segura — espera al DOM si aún no está listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarJuego);
    } else {
        inicializarJuego();
    }

})();
