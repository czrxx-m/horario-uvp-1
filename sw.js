// ============================================================
// MI HORARIO — SERVICE WORKER
//
// Qué hace:
// - Guarda en el teléfono todos los archivos de la app la
//   primera vez que se abre, para que funcione sin internet.
// - Con internet, SIEMPRE busca primero la versión más nueva
//   (así, cuando subes cambios a GitHub, los ves al abrir la
//   app, sin tener que borrar nada).
// - Sin internet (o si la red tarda más de 4 s), usa la copia
//   guardada.
//
// Cuándo tocar este archivo:
// - Si agregas un archivo nuevo a la app, añádelo a ARCHIVOS.
// - Si quieres forzar una limpieza total del caché en todos los
//   dispositivos, cambia el número de VERSION.
// ============================================================

const VERSION = "1";

// El prefijo es propio de esta app: en github.io todos tus
// proyectos comparten el mismo "almacén" y no queremos tocar
// el caché de ninguno de los otros.
const PREFIJO_CACHE = "mi-horario-agronomia-";
const CACHE = PREFIJO_CACHE + VERSION;

const TIEMPO_LIMITE_RED_MS = 4000;

// Rutas relativas a este archivo (sw.js), por eso funcionan igual
// en usuario.github.io/mi-horario/ que en un dominio propio.
const ARCHIVOS = [
    "./",
    "index.html",
    "style.css",
    "horario.js",
    "script.js",
    "manifest.json",
    "uvp.png",
    "icons/favicon.ico",
    "icons/favicon-32.png",
    "icons/apple-touch-icon.png",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-192.png",
    "icons/icon-maskable-512.png"
];


// ------------------------------------------------------------
// INSTALACIÓN: descarga y guarda todos los archivos.
// ------------------------------------------------------------

self.addEventListener("install", evento => {
    evento.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE);

            // "reload" evita que el caché del navegador nos entregue
            // una copia vieja mientras se instala.
            await cache.addAll(
                ARCHIVOS.map(ruta => new Request(ruta, { cache: "reload" }))
            );

            // Que la versión nueva tome el control sin esperar.
            await self.skipWaiting();
        })()
    );
});


// ------------------------------------------------------------
// ACTIVACIÓN: borra cachés de versiones anteriores de ESTA app.
// ------------------------------------------------------------

self.addEventListener("activate", evento => {
    evento.waitUntil(
        (async () => {
            const nombres = await caches.keys();

            await Promise.all(
                nombres
                    .filter(nombre =>
                        nombre.startsWith(PREFIJO_CACHE) && nombre !== CACHE
                    )
                    .map(nombre => caches.delete(nombre))
            );

            await self.clients.claim();
        })()
    );
});


// ------------------------------------------------------------
// PETICIONES: primero la red, y si falla, el caché.
// ------------------------------------------------------------

// Quita la parte "?dia=martes" o "#semana" para que todas las
// variantes de la misma página usen una sola copia guardada.
function claveDeCache(url) {
    const limpia = new URL(url);

    limpia.search = "";
    limpia.hash = "";

    return limpia.href;
}

function esperar(milisegundos) {
    return new Promise(resolver => setTimeout(resolver, milisegundos));
}

async function respuestaSinConexion(peticion, cache) {
    if (peticion.mode === "navigate") {
        const inicio = await cache.match(
            new URL("index.html", self.registration.scope).href
        );

        if (inicio) {
            return inicio;
        }
    }

    return new Response("Sin conexión.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
}

async function redPrimero(evento) {
    const peticion = evento.request;
    const clave = claveDeCache(peticion.url);

    const cache = await caches.open(CACHE);
    const guardada = await cache.match(clave);

    // "no-cache" = pregunta al servidor si cambió (GitHub responde
    // 304 si no, y es casi instantáneo). Evita ver archivos viejos.
    const desdeLaRed = fetch(clave, { cache: "no-cache" }).then(respuesta => {
        // Solo se guardan respuestas completas (200); las parciales
        // (206) o con error no se pueden ni deben guardarse.
        if (respuesta.status === 200 && respuesta.type === "basic") {
            cache.put(clave, respuesta.clone()).catch(() => {});
        }

        return respuesta;
    });

    // Primera vez que se pide este archivo: no hay copia, hay que esperar.
    if (!guardada) {
        try {
            return await desdeLaRed;
        } catch (error) {
            return respuestaSinConexion(peticion, cache);
        }
    }

    // Hay copia: si la red tarda o falla, se usa la guardada.
    // La descarga sigue en segundo plano para actualizar el caché.
    evento.waitUntil(desdeLaRed.catch(() => {}));

    const limite = esperar(TIEMPO_LIMITE_RED_MS).then(() => guardada);

    try {
        return await Promise.race([desdeLaRed, limite]);
    } catch (error) {
        return guardada;
    }
}

self.addEventListener("fetch", evento => {
    const peticion = evento.request;

    // Solo se gestionan lecturas de archivos de esta misma app.
    if (peticion.method !== "GET") {
        return;
    }

    const url = new URL(peticion.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (!url.href.startsWith(self.registration.scope)) {
        return;
    }

    evento.respondWith(redPrimero(evento));
});
