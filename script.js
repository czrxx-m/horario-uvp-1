// ============================================================
// MI HORARIO — LÓGICA PRINCIPAL
// Ingeniería en Agronomía
//
// Funciones incluidas:
//  1. Configuración general.
//  2. Referencias al HTML y estado de la interfaz.
//  3. Utilidades de fecha y hora.
//  4. Selector de los siete días (con teclado).
//  5. Tarjetas de clase, descansos y días libres.
//  6. Resumen y progreso de la jornada.
//  7. Próxima clase y cuenta regresiva.
//  8. Catálogo de materias con buscador.
//  9. Actualización automática alineada al minuto.
// 10. Instalación como app y service worker (modo sin conexión).
//
// Los datos del horario están en horario.js (se carga antes
// que este archivo y define la constante "horario").
// ============================================================


// ------------------------------------------------------------
// 1. CONFIGURACIÓN GENERAL
// ------------------------------------------------------------

const CONFIGURACION = {
    idioma: "es-MX",
    limiteDiasBusqueda: 7,
    mostrarDescansosHastaMinutos: 45
};

const DIAS_ORDENADOS = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo"
];

// Date.getDay() utiliza 0 para domingo y 6 para sábado.
const NOMBRES_DIAS_FECHA = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado"
];

const ABREVIATURAS_DIAS = {
    Lunes: "Lun",
    Martes: "Mar",
    Miércoles: "Mié",
    Jueves: "Jue",
    Viernes: "Vie",
    Sábado: "Sáb",
    Domingo: "Dom"
};


// ------------------------------------------------------------
// 2. REFERENCIAS AL HTML Y ESTADO DE LA INTERFAZ
//
// Los nombres deben coincidir con los id de index.html.
// ------------------------------------------------------------

const elementos = {
    fechaActual: document.getElementById("fecha-actual"),
    estadoDia: document.getElementById("estado-dia"),
    anioActual: document.getElementById("anio-actual"),

    metricasDia: document.getElementById("metricas-dia"),
    progresoContenedor: document.getElementById("progreso-contenedor"),
    barraProgreso: document.getElementById("barra-progreso"),
    progresoRelleno: document.getElementById("progreso-relleno"),
    textoPorcentaje: document.getElementById("texto-porcentaje"),
    textoProgreso: document.getElementById("texto-progreso"),

    mensajeProxima: document.getElementById("mensaje-proxima"),

    botonHoy: document.getElementById("boton-hoy"),
    selectorDias: document.getElementById("selector-dias"),
    nombreDiaSeleccionado: document.getElementById("nombre-dia-seleccionado"),
    contadorClases: document.getElementById("contador-clases"),
    horarioDia: document.getElementById("horario-dia"),

    buscadorMaterias: document.getElementById("buscador-materias"),
    contadorMaterias: document.getElementById("contador-materias"),
    listaMaterias: document.getElementById("lista-materias"),

    botonInstalar: document.getElementById("boton-instalar"),
    pistaInstalar: document.getElementById("pista-instalar"),

    logoUVP: document.getElementById("logo-uvp")
};

// seguirDiaActual indica si la pantalla sigue automáticamente
// el día real. Si eliges otro día, se conserva esa selección.
// El botón "Volver a hoy" recupera el seguimiento automático.
let seguirDiaActual = true;
let diaSeleccionado = obtenerDiaActual();

// Firma de lo que hay dibujado en la lista de clases. Si no cambió
// nada (día y estado de cada clase), no se vuelve a construir el
// DOM: así no hay parpadeos ni se pierde el foco al navegar.
let ultimaFirmaHorario = "";


// ------------------------------------------------------------
// 3. UTILIDADES
// ------------------------------------------------------------

function crearElemento(etiqueta, claseCSS = "", texto = "") {
    const elemento = document.createElement(etiqueta);

    if (claseCSS) {
        elemento.className = claseCSS;
    }

    if (texto !== "") {
        elemento.textContent = texto;
    }

    return elemento;
}

function normalizarTexto(texto) {
    return String(texto)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLocaleLowerCase(CONFIGURACION.idioma)
        .trim();
}

function pluralizar(cantidad, singular, plural) {
    return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

function obtenerDiaActual() {
    return NOMBRES_DIAS_FECHA[new Date().getDay()];
}

function esDiaActual(dia) {
    return dia === obtenerDiaActual();
}

function obtenerHoraActualEnMinutos() {
    const ahora = new Date();

    return ahora.getHours() * 60 + ahora.getMinutes();
}

function horaAMinutos(hora) {
    const [horas, minutos] = hora.split(":").map(Number);

    return horas * 60 + minutos;
}

function minutosDuracion(clase) {
    return Math.max(
        0,
        horaAMinutos(clase.fin) - horaAMinutos(clase.inicio)
    );
}

function formatearHora(hora) {
    const [horas24, minutos] = hora.split(":").map(Number);

    const indicador = horas24 >= 12 ? "p. m." : "a. m.";
    const horas12 = horas24 % 12 || 12;

    return `${horas12}:${String(minutos).padStart(2, "0")} ${indicador}`;
}

function formatearDuracion(totalMinutos) {
    const minutos = Math.max(0, Math.round(totalMinutos));
    const horasCompletas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    if (horasCompletas === 0) {
        return `${minutos} min`;
    }

    if (minutosRestantes === 0) {
        return `${horasCompletas} h`;
    }

    return `${horasCompletas} h ${minutosRestantes} min`;
}

function formatearFechaCompleta(fecha) {
    const texto = new Intl.DateTimeFormat(
        CONFIGURACION.idioma,
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).format(fecha);

    return texto.charAt(0).toLocaleUpperCase(
        CONFIGURACION.idioma
    ) + texto.slice(1);
}

function crearFechaConHora(fechaBase, hora) {
    const fecha = new Date(fechaBase);
    const [horas, minutos] = hora.split(":").map(Number);

    fecha.setHours(horas, minutos, 0, 0);

    return fecha;
}

function formatearFechaRelativa(fecha, fechaReferencia = new Date()) {
    const hoy = new Date(
        fechaReferencia.getFullYear(),
        fechaReferencia.getMonth(),
        fechaReferencia.getDate()
    );

    const diaConsultado = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate()
    );

    const diferenciaDias = Math.round(
        (diaConsultado - hoy) / 86400000
    );

    if (diferenciaDias === 0) {
        return "Hoy";
    }

    if (diferenciaDias === 1) {
        return "Mañana";
    }

    const texto = new Intl.DateTimeFormat(
        CONFIGURACION.idioma,
        {
            weekday: "long",
            day: "numeric",
            month: "short"
        }
    ).format(fecha);

    return texto.charAt(0).toLocaleUpperCase(
        CONFIGURACION.idioma
    ) + texto.slice(1);
}

// Las actividades se ordenan por hora de inicio para asegurar
// una presentación cronológica, aunque cambien de posición
// en horario.js.
function obtenerClasesOrdenadas(dia) {
    const clases = horario[dia] || [];

    return [...clases].sort((a, b) => {
        return horaAMinutos(a.inicio) - horaAMinutos(b.inicio);
    });
}

// Permite abrir la página en un día concreto: index.html?dia=martes
function leerDiaDesdeURL() {
    const parametro = new URLSearchParams(window.location.search).get("dia");

    if (!parametro) {
        return null;
    }

    const buscado = normalizarTexto(parametro);

    return DIAS_ORDENADOS.find(
        dia => normalizarTexto(dia) === buscado
    ) || null;
}


// ------------------------------------------------------------
// 4. SELECTOR DE DÍAS
//
// Los botones se crean UNA sola vez y después solo se actualizan
// sus clases. Así el foco del teclado no se pierde cada minuto.
// El indicador rojo distingue el día real.
// ------------------------------------------------------------

function seleccionarDia(dia) {
    diaSeleccionado = dia;
    seguirDiaActual = esDiaActual(dia);

    actualizarInterfaz({ animar: true });
}

function crearSelectorDias() {
    elementos.selectorDias.replaceChildren();

    DIAS_ORDENADOS.forEach(dia => {
        const boton = crearElemento("button", "boton-dia");

        boton.type = "button";
        boton.dataset.dia = dia;
        boton.setAttribute("aria-label", `Mostrar horario del ${dia}`);

        const nombreCorto = crearElemento(
            "span",
            "dia-corto",
            ABREVIATURAS_DIAS[dia] || dia
        );

        const indicador = crearElemento("span", "dia-indicador");
        indicador.setAttribute("aria-hidden", "true");

        boton.append(nombreCorto, indicador);

        boton.addEventListener("click", () => seleccionarDia(dia));

        elementos.selectorDias.appendChild(boton);
    });

    // Flechas izquierda/derecha, Inicio y Fin para moverse entre días.
    elementos.selectorDias.addEventListener("keydown", evento => {
        const teclas = ["ArrowLeft", "ArrowRight", "Home", "End"];

        if (!teclas.includes(evento.key)) {
            return;
        }

        // La referencia es el botón que tiene el foco (con Tab puede
        // no ser el día seleccionado).
        const botonActual = evento.target.closest(".boton-dia");

        const posicion = DIAS_ORDENADOS.indexOf(
            botonActual ? botonActual.dataset.dia : diaSeleccionado
        );

        let nuevaPosicion = posicion;

        if (evento.key === "ArrowRight") {
            nuevaPosicion = (posicion + 1) % DIAS_ORDENADOS.length;
        } else if (evento.key === "ArrowLeft") {
            nuevaPosicion =
                (posicion - 1 + DIAS_ORDENADOS.length) % DIAS_ORDENADOS.length;
        } else if (evento.key === "Home") {
            nuevaPosicion = 0;
        } else if (evento.key === "End") {
            nuevaPosicion = DIAS_ORDENADOS.length - 1;
        }

        evento.preventDefault();
        seleccionarDia(DIAS_ORDENADOS[nuevaPosicion]);

        const botonNuevo = elementos.selectorDias.querySelector(
            `[data-dia="${DIAS_ORDENADOS[nuevaPosicion]}"]`
        );

        if (botonNuevo) {
            botonNuevo.focus();
        }
    });
}

function actualizarSelectorDias() {
    const botones = elementos.selectorDias.querySelectorAll(".boton-dia");

    botones.forEach(boton => {
        const dia = boton.dataset.dia;
        const estaSeleccionado = dia === diaSeleccionado;
        const esHoy = esDiaActual(dia);

        boton.classList.toggle("seleccionado", estaSeleccionado);
        boton.classList.toggle("hoy", esHoy);
        boton.setAttribute("aria-pressed", String(estaSeleccionado));

        if (esHoy) {
            boton.setAttribute("aria-current", "date");
        } else {
            boton.removeAttribute("aria-current");
        }
    });
}


// ------------------------------------------------------------
// 5. CLASES DEL DÍA
//
// En el día actual, la actividad puede estar pendiente,
// en curso o finalizada. En otros días se muestra como parte
// de la vista del horario sin asumir un estado temporal.
// ------------------------------------------------------------

function obtenerEstadoClase(clase, dia) {
    if (!esDiaActual(dia)) {
        return "programada";
    }

    const ahora = obtenerHoraActualEnMinutos();
    const inicio = horaAMinutos(clase.inicio);
    const fin = horaAMinutos(clase.fin);

    if (ahora >= fin) {
        return "finalizada";
    }

    if (ahora >= inicio && ahora < fin) {
        return "en-curso";
    }

    return "pendiente";
}

function crearEtiquetaEstado(estado) {
    const etiquetas = {
        "en-curso": "EN CURSO",
        "finalizada": "FINALIZADA"
    };

    if (!etiquetas[estado]) {
        return null;
    }

    return crearElemento(
        "span",
        `etiqueta-estado ${estado}`,
        etiquetas[estado]
    );
}

function crearTarjetaClase(clase, dia) {
    const estado = obtenerEstadoClase(clase, dia);

    const tarjeta = crearElemento("article", "clase-tarjeta");

    const profesor = clase.profesor ? `, profesor ${clase.profesor}` : "";

    tarjeta.setAttribute(
        "aria-label",
        `${clase.materia}, ${formatearHora(clase.inicio)} a ${formatearHora(clase.fin)}, salón ${clase.salon}${profesor}`
    );

    if (estado === "en-curso") {
        tarjeta.classList.add("en-curso");
        tarjeta.setAttribute("aria-current", "time");
    }

    if (estado === "finalizada") {
        tarjeta.classList.add("finalizada");
    }

    // Columna izquierda: intervalo de tiempo.
    const columnaHora = crearElemento("div", "clase-eje-hora");

    columnaHora.append(
        crearElemento("span", "clase-hora-inicio", formatearHora(clase.inicio)),
        crearElemento("span", "clase-hora-separador", "hasta"),
        crearElemento("span", "clase-hora-fin", formatearHora(clase.fin))
    );

    // Columna derecha: datos de la materia.
    const contenido = crearElemento("div", "clase-contenido");
    const cabecera = crearElemento("div", "clase-cabecera");

    cabecera.appendChild(
        crearElemento("h4", "clase-titulo", clase.materia)
    );

    const etiqueta = crearEtiquetaEstado(estado);

    if (etiqueta) {
        cabecera.appendChild(etiqueta);
    }

    const detalles = crearElemento("div", "detalles-clase");

    detalles.appendChild(
        crearElemento("span", "detalle-item", `Salón: ${clase.salon}`)
    );

    if (clase.profesor) {
        detalles.appendChild(
            crearElemento("span", "detalle-item", `Profesor: ${clase.profesor}`)
        );
    }

    contenido.append(cabecera, detalles);
    tarjeta.append(columnaHora, contenido);

    return tarjeta;
}

// Cuando existe una pausa breve entre dos clases consecutivas,
// se muestra visualmente el tiempo disponible entre ellas.
// Las pausas largas no se confunden con los descansos de clase.
function crearSeparadorDescanso(minutos) {
    const separador = crearElemento("div", "separador-descanso");

    separador.append(
        crearElemento("span", "linea-descanso"),
        crearElemento("span", "separador-descanso-simbolo", "✦"),
        crearElemento("span", "", `Descanso · ${minutos} min`),
        crearElemento("span", "linea-descanso")
    );

    return separador;
}

// Estado vacío genérico: días libres, búsquedas sin resultados, etc.
function crearMensajeVacio(titulo, descripcion) {
    const contenedor = crearElemento("div", "vacio");

    contenedor.append(
        crearElemento("div", "vacio-simbolo", "✦"),
        crearElemento("h4", "", titulo),
        crearElemento("p", "", descripcion)
    );

    return contenedor;
}

function crearMensajeDiaLibre(dia) {
    if (dia === "Domingo") {
        return crearMensajeVacio(
            "Un espacio para descansar",
            "No tienes actividades registradas para este día. Recarga energía para comenzar una nueva semana."
        );
    }

    if (dia === "Jueves") {
        return crearMensajeVacio(
            "Día libre",
            "No tienes clases registradas para este día. Aprovecha el tiempo para estudiar, descansar o adelantar pendientes."
        );
    }

    return crearMensajeVacio(
        "Día libre",
        "No hay actividades programadas en este día."
    );
}

// El texto "N pendientes de M" solo tiene sentido para el día real.
// En otro día se muestra simplemente cuántas actividades tiene.
function actualizarContadorClases(dia, clases) {
    const total = clases.length;

    if (total === 0) {
        elementos.contadorClases.textContent = "Día sin actividades";
        return;
    }

    if (!esDiaActual(dia)) {
        elementos.contadorClases.textContent =
            pluralizar(total, "actividad", "actividades");
        return;
    }

    const horaActual = obtenerHoraActualEnMinutos();

    const pendientes = clases.filter(
        clase => horaAMinutos(clase.fin) > horaActual
    ).length;

    if (pendientes === 0) {
        elementos.contadorClases.textContent = "Jornada completada";
        return;
    }

    elementos.contadorClases.textContent =
        `${pluralizar(pendientes, "pendiente", "pendientes")} de ${total}`;
}

function renderizarHorarioDia() {
    const dia = diaSeleccionado;
    const clases = obtenerClasesOrdenadas(dia);

    elementos.nombreDiaSeleccionado.textContent = dia;
    actualizarContadorClases(dia, clases);

    // Si no cambió el día ni el estado de ninguna clase, no hay
    // nada que volver a dibujar.
    const firma = [
        dia,
        ...clases.map(clase => obtenerEstadoClase(clase, dia))
    ].join("|");

    if (firma === ultimaFirmaHorario) {
        return;
    }

    ultimaFirmaHorario = firma;

    elementos.horarioDia.replaceChildren();

    if (clases.length === 0) {
        elementos.horarioDia.appendChild(crearMensajeDiaLibre(dia));
        return;
    }

    const lista = crearElemento("div", "lista-clases");

    clases.forEach((clase, indice) => {
        lista.appendChild(crearTarjetaClase(clase, dia));

        const siguienteClase = clases[indice + 1];

        if (!siguienteClase) {
            return;
        }

        const minutosDescanso =
            horaAMinutos(siguienteClase.inicio) - horaAMinutos(clase.fin);

        if (
            minutosDescanso > 0 &&
            minutosDescanso <= CONFIGURACION.mostrarDescansosHastaMinutos
        ) {
            lista.appendChild(crearSeparadorDescanso(minutosDescanso));
        }
    });

    elementos.horarioDia.appendChild(lista);
}


// ------------------------------------------------------------
// 6. RESUMEN DEL DÍA
//
// Calcula cuántas actividades están registradas y cuánto
// tiempo total aparece en el horario.
// Para el día actual, estima los minutos que ya transcurrieron
// dentro de las actividades programadas.
// ------------------------------------------------------------

function crearMetrica(valor, etiqueta) {
    const tarjeta = crearElemento("div", "metrica");
    const acento = crearElemento("span", "metrica-acento");

    acento.setAttribute("aria-hidden", "true");

    tarjeta.append(
        crearElemento("span", "metrica-valor", valor),
        crearElemento("span", "metrica-etiqueta", etiqueta),
        acento
    );

    return tarjeta;
}

function calcularProgresoDia(dia, clases) {
    const totalMinutos = clases.reduce(
        (total, clase) => total + minutosDuracion(clase),
        0
    );

    if (!esDiaActual(dia) || totalMinutos === 0) {
        return {
            totalMinutos,
            transcurridos: 0,
            porcentaje: 0
        };
    }

    const ahora = obtenerHoraActualEnMinutos();

    const transcurridos = clases.reduce((total, clase) => {
        const inicio = horaAMinutos(clase.inicio);
        const fin = horaAMinutos(clase.fin);

        return total + Math.max(0, Math.min(ahora, fin) - inicio);
    }, 0);

    const porcentaje = Math.min(
        100,
        Math.round((transcurridos / totalMinutos) * 100)
    );

    return {
        totalMinutos,
        transcurridos,
        porcentaje
    };
}

function renderizarResumenDia() {
    const dia = diaSeleccionado;
    const clases = obtenerClasesOrdenadas(dia);
    const numeroActividades = clases.length;

    const progreso = calcularProgresoDia(dia, clases);
    const porcentaje = progreso.porcentaje;

    // El progreso en tiempo real solo existe para el día actual
    // y cuando ese día tiene actividades.
    const mostrarProgreso = esDiaActual(dia) && numeroActividades > 0;

    const materiasDistintas = new Set(
        clases.map(clase => clase.materia)
    ).size;

    elementos.metricasDia.replaceChildren();

    elementos.metricasDia.append(
        crearMetrica(
            String(numeroActividades),
            numeroActividades === 1
                ? "Actividad registrada"
                : "Actividades registradas"
        ),

        crearMetrica(
            formatearDuracion(progreso.totalMinutos),
            "Tiempo programado"
        ),

        mostrarProgreso
            ? crearMetrica(`${porcentaje}%`, "Progreso de hoy")
            : crearMetrica(
                String(materiasDistintas),
                materiasDistintas === 1
                    ? "Materia distinta"
                    : "Materias distintas"
            )
    );

    elementos.progresoContenedor.hidden = !mostrarProgreso;

    if (!mostrarProgreso) {
        return;
    }

    elementos.progresoRelleno.style.width = `${porcentaje}%`;
    elementos.barraProgreso.setAttribute("aria-valuenow", String(porcentaje));
    elementos.textoPorcentaje.textContent = `${porcentaje}%`;

    if (progreso.transcurridos === 0) {
        elementos.textoProgreso.textContent =
            `Tu jornada empieza a las ${formatearHora(clases[0].inicio)}.`;
        return;
    }

    if (porcentaje >= 100) {
        elementos.textoProgreso.textContent =
            "Has completado el tiempo programado de todas las actividades de hoy.";
        return;
    }

    elementos.textoProgreso.textContent =
        `Han transcurrido aproximadamente ${formatearDuracion(progreso.transcurridos)} de ${formatearDuracion(progreso.totalMinutos)} de actividad programada para hoy.`;
}


// ------------------------------------------------------------
// 7. PRÓXIMA CLASE Y CUENTA REGRESIVA
//
// Revisa las actividades del día actual y los días siguientes.
// Si una clase ya terminó, la omite.
// Si una clase está en curso, la considera la actividad actual.
// ------------------------------------------------------------

function buscarProximaClase() {
    const ahora = new Date();

    for (
        let desplazamiento = 0;
        desplazamiento <= CONFIGURACION.limiteDiasBusqueda;
        desplazamiento++
    ) {
        const fecha = new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate() + desplazamiento
        );

        const nombreDia = NOMBRES_DIAS_FECHA[fecha.getDay()];

        for (const clase of obtenerClasesOrdenadas(nombreDia)) {
            const inicio = crearFechaConHora(fecha, clase.inicio);
            const fin = crearFechaConHora(fecha, clase.fin);

            // Si la actividad finalizó, buscamos la siguiente.
            if (fin <= ahora) {
                continue;
            }

            return {
                clase,
                inicio,
                fin,
                nombreDia,
                enCurso: ahora >= inicio && ahora < fin
            };
        }
    }

    return null;
}

// Devuelve una expresión legible:
// "en 18 min", "en 2 h 15 min", "en 1 d 3 h".
function textoCuentaRegresiva(fechaObjetivo) {
    const diferencia = fechaObjetivo.getTime() - Date.now();

    if (diferencia <= 0) {
        return "ahora";
    }

    const totalMinutos = Math.ceil(diferencia / 60000);

    const dias = Math.floor(totalMinutos / 1440);
    const horas = Math.floor((totalMinutos % 1440) / 60);
    const minutos = totalMinutos % 60;

    if (dias > 0) {
        return `en ${dias} d ${horas} h`;
    }

    if (horas > 0) {
        return `en ${horas} h ${minutos} min`;
    }

    return `en ${minutos} min`;
}

function renderizarProximaClase() {
    elementos.mensajeProxima.replaceChildren();

    const proxima = buscarProximaClase();

    if (!proxima) {
        elementos.mensajeProxima.appendChild(
            crearMensajeVacio(
                "Sin actividades próximas",
                "No hay actividades registradas en los próximos días."
            )
        );
        return;
    }

    const { clase, inicio, fin, nombreDia, enCurso } = proxima;

    const contenedor = crearElemento("div", "proxima-contenido");

    const estado = crearElemento(
        "div",
        enCurso ? "proxima-estado en-curso" : "proxima-estado",
        enCurso ? "ACTIVIDAD EN CURSO" : "PRÓXIMA ACTIVIDAD"
    );

    const titulo = crearElemento("h3", "proxima-materia", clase.materia);

    const detallesTexto = [
        formatearFechaRelativa(inicio),
        `${formatearHora(clase.inicio)} – ${formatearHora(clase.fin)}`,
        `Salón: ${clase.salon}`
    ];

    if (clase.profesor) {
        detallesTexto.push(`Profesor: ${clase.profesor}`);
    }

    const detalles = crearElemento(
        "p",
        "proxima-detalle",
        detallesTexto.join(" · ")
    );

    const pie = crearElemento("div", "proxima-pie");

    const textoTiempo = enCurso
        ? `Termina ${textoCuentaRegresiva(fin)}`
        : `Comienza ${textoCuentaRegresiva(inicio)}`;

    const nota = crearElemento(
        "span",
        "proxima-nota",
        enCurso
            ? "Mantén tu ritmo."
            : `Actividad del ${nombreDia.toLocaleLowerCase(CONFIGURACION.idioma)}.`
    );

    pie.append(
        crearElemento("span", "proxima-tiempo", textoTiempo),
        nota
    );

    contenedor.append(estado, titulo, detalles, pie);

    elementos.mensajeProxima.appendChild(contenedor);
}


// ------------------------------------------------------------
// 8. CATÁLOGO DE MATERIAS
//
// Agrupa los bloques por nombre de materia.
// Consolida los salones, profesores y días asociados,
// conservando el número de sesiones individuales.
// ------------------------------------------------------------

function obtenerMateriasAgrupadas() {
    const materias = new Map();

    DIAS_ORDENADOS.forEach(dia => {
        obtenerClasesOrdenadas(dia).forEach(clase => {
            if (!materias.has(clase.materia)) {
                materias.set(clase.materia, {
                    nombre: clase.materia,
                    sesiones: 0,
                    minutosTotales: 0,
                    dias: new Set(),
                    salones: new Set(),
                    profesores: new Set()
                });
            }

            const materia = materias.get(clase.materia);

            materia.sesiones += 1;
            materia.minutosTotales += minutosDuracion(clase);
            materia.dias.add(dia);
            materia.salones.add(clase.salon);

            if (clase.profesor) {
                materia.profesores.add(clase.profesor);
            }
        });
    });

    return [...materias.values()].sort(
        (a, b) => a.nombre.localeCompare(b.nombre, CONFIGURACION.idioma)
    );
}

function crearDatoMateria(etiqueta, valor) {
    const contenedor = crearElemento("p", "materia-dato");

    contenedor.append(
        crearElemento("strong", "", etiqueta),
        crearElemento("span", "", valor)
    );

    return contenedor;
}

function crearTarjetaMateria(materia, indice) {
    const tarjeta = crearElemento("article", "materia-card");

    tarjeta.setAttribute("aria-label", `Materia: ${materia.nombre}`);

    const cabecera = crearElemento("div", "materia-cabecera");

    cabecera.append(
        crearElemento(
            "span",
            "materia-numero",
            String(indice + 1).padStart(2, "0")
        ),
        crearElemento(
            "span",
            "materia-sesiones",
            pluralizar(materia.sesiones, "sesión", "sesiones")
        )
    );

    const lineas = crearElemento("div", "materia-lineas");

    lineas.append(
        crearDatoMateria("Días", [...materia.dias].join(", ")),
        crearDatoMateria("Salón o espacio", [...materia.salones].join(", ")),
        crearDatoMateria(
            "Profesor",
            [...materia.profesores].join(", ") || "No especificado"
        ),
        crearDatoMateria(
            "Tiempo semanal",
            formatearDuracion(materia.minutosTotales)
        )
    );

    tarjeta.append(
        cabecera,
        crearElemento("h3", "materia-titulo", materia.nombre),
        lineas
    );

    return tarjeta;
}

// La búsqueda acepta materia, día, profesor o salón, y se pueden
// combinar varias palabras ("martes química"). Se ignoran las
// diferencias entre mayúsculas y acentos.
function renderizarMaterias({ animar = false } = {}) {
    const todasLasMaterias = obtenerMateriasAgrupadas();

    const terminos = normalizarTexto(elementos.buscadorMaterias.value)
        .split(/\s+/)
        .filter(Boolean);

    const materiasFiltradas = todasLasMaterias.filter(materia => {
        const contenido = normalizarTexto(
            [
                materia.nombre,
                ...materia.dias,
                ...materia.salones,
                ...materia.profesores
            ].join(" ")
        );

        return terminos.every(termino => contenido.includes(termino));
    });

    elementos.listaMaterias.classList.toggle("sin-animacion", !animar);
    elementos.listaMaterias.replaceChildren();

    elementos.contadorMaterias.textContent =
        pluralizar(materiasFiltradas.length, "materia", "materias");

    if (materiasFiltradas.length === 0) {
        const mensaje = crearMensajeVacio(
            "No encontramos coincidencias",
            "Prueba con otra materia, nombre de profesor, salón o día de la semana."
        );

        mensaje.classList.add("materias-sin-resultados");
        elementos.listaMaterias.appendChild(mensaje);

        return;
    }

    materiasFiltradas.forEach((materia, indice) => {
        elementos.listaMaterias.appendChild(
            crearTarjetaMateria(materia, indice)
        );
    });
}


// ------------------------------------------------------------
// 9. FECHA, ESTADO Y ACTUALIZACIÓN GENERAL
// ------------------------------------------------------------

function actualizarFechaCabecera() {
    const ahora = new Date();

    elementos.fechaActual.textContent = formatearFechaCompleta(ahora);

    const sinConexion = navigator.onLine === false ? " · SIN CONEXIÓN" : "";

    elementos.estadoDia.textContent =
        `HOY · ${obtenerDiaActual().toLocaleUpperCase(CONFIGURACION.idioma)}${sinConexion}`;

    elementos.anioActual.textContent = String(ahora.getFullYear());
}

// Se reutiliza al seleccionar un día, volver a hoy o cuando pasa
// un minuto. "animar" solo es true cuando la persona hizo algo:
// en las actualizaciones automáticas no se repite la animación.
function actualizarInterfaz({ animar = false } = {}) {
    if (seguirDiaActual) {
        diaSeleccionado = obtenerDiaActual();
    }

    elementos.horarioDia.classList.toggle("sin-animacion", !animar);

    actualizarFechaCabecera();
    actualizarSelectorDias();
    renderizarResumenDia();
    renderizarHorarioDia();
    renderizarProximaClase();
}

// Programa la siguiente actualización justo cuando cambia el
// minuto, para que la cuenta regresiva nunca vaya atrasada.
function programarActualizacion() {
    const ahora = new Date();

    const milisegundosHastaElMinuto =
        60000 - (ahora.getSeconds() * 1000 + ahora.getMilliseconds());

    window.setTimeout(() => {
        actualizarInterfaz();
        programarActualizacion();
    }, milisegundosHastaElMinuto + 50);
}

function configurarBotonHoy() {
    elementos.botonHoy.addEventListener("click", () => {
        seguirDiaActual = true;
        diaSeleccionado = obtenerDiaActual();

        actualizarInterfaz({ animar: true });
    });
}

function configurarBuscador() {
    elementos.buscadorMaterias.addEventListener(
        "input",
        () => renderizarMaterias()
    );
}

// Si uvp.png falta o tiene un nombre incorrecto (en GitHub Pages
// importa mayúsculas y minúsculas), se muestra "UVP" como
// sustituto en lugar de un icono roto.
function configurarRespaldoLogo() {
    const imagen = elementos.logoUVP;

    if (!imagen) {
        return;
    }

    function mostrarRespaldo() {
        if (imagen.dataset.respaldoCreado === "true") {
            return;
        }

        imagen.dataset.respaldoCreado = "true";
        imagen.hidden = true;

        const respaldo = crearElemento("span", "logo-respaldo", "UVP");

        respaldo.setAttribute("aria-label", "UVP");
        imagen.parentElement.appendChild(respaldo);
    }

    imagen.addEventListener("error", mostrarRespaldo, { once: true });

    // Cubre el caso en el que la imagen ya falló al cargar.
    if (imagen.complete && imagen.naturalWidth === 0) {
        mostrarRespaldo();
    }
}


// ------------------------------------------------------------
// 10. INSTALACIÓN COMO APP Y MODO SIN CONEXIÓN
// ------------------------------------------------------------

function estaInstalada() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
    );
}

function configurarInstalacion() {
    const boton = elementos.botonInstalar;
    const pista = elementos.pistaInstalar;

    if (!boton || !pista || estaInstalada()) {
        return;
    }

    let eventoInstalacion = null;

    // Chrome y Edge (Android y escritorio) avisan cuando se puede instalar.
    window.addEventListener("beforeinstallprompt", evento => {
        evento.preventDefault();
        eventoInstalacion = evento;
        boton.hidden = false;
    });

    boton.addEventListener("click", async () => {
        if (!eventoInstalacion) {
            return;
        }

        boton.hidden = true;
        eventoInstalacion.prompt();

        try {
            await eventoInstalacion.userChoice;
        } catch (error) {
            // Si cierra el aviso no pasa nada.
        }

        eventoInstalacion = null;
    });

    window.addEventListener("appinstalled", () => {
        boton.hidden = true;
        pista.hidden = true;
        eventoInstalacion = null;
    });

    // Safari en iPhone/iPad no avisa: solo se puede instalar a mano.
    const esIOS =
        /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
        (window.navigator.platform === "MacIntel" &&
            window.navigator.maxTouchPoints > 1);

    if (esIOS) {
        pista.hidden = false;
    }
}

// sw.js guarda los archivos para que la app abra sin internet.
// Solo funciona con https (GitHub Pages lo es) o en localhost.
function registrarServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js")
            .catch(error => {
                console.warn("No se pudo registrar el service worker:", error);
            });
    });
}


// ------------------------------------------------------------
// 11. ARRANQUE
//
// Primero se configuran las funciones interactivas.
// Después se dibujan los datos en pantalla.
// Finalmente, se activa la actualización periódica.
// ------------------------------------------------------------

function iniciarAplicacion() {
    const diaURL = leerDiaDesdeURL();

    if (diaURL) {
        diaSeleccionado = diaURL;
        seguirDiaActual = esDiaActual(diaURL);
    }

    configurarRespaldoLogo();
    configurarBotonHoy();
    configurarBuscador();
    crearSelectorDias();

    renderizarMaterias({ animar: true });
    actualizarInterfaz({ animar: true });

    programarActualizacion();

    // Al volver a la pestaña o recuperar la conexión, se sincroniza.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            actualizarInterfaz();
        }
    });

    window.addEventListener("online", () => actualizarInterfaz());
    window.addEventListener("offline", () => actualizarInterfaz());

    configurarInstalacion();
    registrarServiceWorker();
}

iniciarAplicacion();
