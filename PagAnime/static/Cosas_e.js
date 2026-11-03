const nombreAnime = document.getElementById("nombre-anime");
const imagenAnime = document.getElementById("link-imagen");
const botonGuardar = document.getElementById("botonG");
const listaAnimes = document.getElementById("lista-animes");
const filtroAnimes = document.getElementById("filtro-animes");
const ordenAnimes = document.getElementById("orden-animes");
const descripcionAnime = document.getElementById("descripcion-info");
const botonVerMas = document.getElementById("boton-ver-mas");
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
const imagenPredeterminada =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='60'%3E%3Crect width='100%25' height='100%25' fill='%23212121'/%3E%3Ctext x='50%25' y='50%25' fill='%2300ffd5' text-anchor='middle' dominant-baseline='middle' font-size='8'%3ESin imagen%3C/text%3E%3C/svg%3E";
const limiteDescripcion = 180;
let descripcionCompleta = "";
let descripcionExpandida = false;

// 1. Iniciamos la lista vacía
let animes = [];

// 2. Traer animes desde la base de datos de Django
async function cargarAnimesDesdeServidor() {
    listaAnimes.innerHTML = '<li class="estado-lista">Cargando animes...</li>';
    try {
        const respuesta = await fetch('/api/animes/');
        if (!respuesta.ok) {
            throw new Error(`El servidor respondió con el estado ${respuesta.status}.`);
        }
        const datos = await respuesta.json();
        if (!Array.isArray(datos)) {
            throw new Error("La respuesta del servidor no tiene un formato válido.");
        }

        // Adaptamos los campos de la base de datos al formato que usa tu HTML
        animes = datos.map(function(item) {
            return {
                ...item,
                nombre: item.apodo || item.titulo || "Sin nombre",
                imagen: item.imagen_url || imagenPredeterminada
            };
        });

        dibujarAnimes();
    } catch (error) {
        console.error("Error al cargar animes desde el servidor:", error);
        animes = [];
        listaAnimes.innerHTML = `
            <li class="estado-lista error-lista">
                No se pudieron cargar los animes. Comprueba que el servidor Django esté activo.
            </li>
        `;
    }
}

// Ejecutar la carga inicial al abrir la página
cargarAnimesDesdeServidor();

function mostrarDescripcion() {
    const necesitaExpandir = descripcionCompleta.length > limiteDescripcion;
    descripcionAnime.textContent = necesitaExpandir && !descripcionExpandida
        ? `${descripcionCompleta.slice(0, limiteDescripcion).trimEnd()}…`
        : descripcionCompleta;
    botonVerMas.classList.toggle("mostrar", necesitaExpandir);
    botonVerMas.textContent = descripcionExpandida ? "Ver menos" : "Ver más";
    botonVerMas.setAttribute("aria-expanded", String(descripcionExpandida));
}

botonVerMas.addEventListener("click", function() {
    descripcionExpandida = !descripcionExpandida;
    mostrarDescripcion();
});

function dibujarAnimes() {
  listaAnimes.innerHTML = "";
  const filtro = filtroAnimes.value.trim().toLocaleLowerCase();
  const orden = ordenAnimes.value;
  const animesFiltrados = animes
    .map(function(anime, posicion) {
      return { anime, posicion };
    })
    .filter(function(elemento) {
      const coincideNombre = elemento.anime.nombre.toLocaleLowerCase().includes(filtro);
      const coincideEstado =
        (orden !== "vistos" || elemento.anime.visto === true) &&
        (orden !== "por-ver" || elemento.anime.visto !== true);
      return coincideNombre && coincideEstado;
    });

  if (orden === "az") {
    animesFiltrados.sort(function(a, b) {
      return a.anime.nombre.localeCompare(b.anime.nombre, "es", { sensitivity: "base" });
    });
  }

  if (animesFiltrados.length === 0 && (filtro || animes.length > 0)) {
    const mensaje = filtro
      ? "No se encontraron animes."
      : orden === "vistos"
        ? "Todavía no hay animes vistos."
        : orden === "por-ver"
          ? "No hay animes pendientes por ver."
          : "No se encontraron animes.";
    listaAnimes.innerHTML = `<li class="sin-resultados">${mensaje}</li>`;
    return;
  }

  animesFiltrados.forEach(function(elemento) {
    const anime = elemento.anime;
    const posicion = elemento.posicion;
    listaAnimes.innerHTML += `
        <li>
            <img
                src="${anime.imagen}"
                class="mini-anime"
                alt="Portada de ${anime.nombre.replace(/"/g, "&quot;")}"
                onerror="this.onerror=null; this.src='${imagenPredeterminada}'"
            >
            <button
                class="estado-anime ${anime.visto ? "visto" : "por-ver"}"
                type="button"
                onclick="cambiarEstadoAnime(${posicion})"
                aria-label="Estado: ${anime.visto ? "Visto" : "Por ver"}. Cambiar estado"
            >${anime.visto ? "Visto" : "Por ver"}</button>
            <button class="nombre-anime" onclick="masInformacion(${posicion})">${anime.nombre}</button>
            
            <!-- EL NUEVO MENÚ ENCAPSULADO -->
            <div class="contenedor-menu">
                <button class="boton-tres-lineas" onclick="abrirMenu(${posicion})">☰</button>
                
                <!-- Esta es la caja oculta -->
                <div id="menu-${posicion}" class="menu-desplegable">
                    <button onclick="modificarAnime(${posicion})">Modificar</button>
                    <button onclick="eliminarAnime(${posicion})">Eliminar</button>
                </div>
            </div>
        </li>
    `;
  }); 
}

filtroAnimes.addEventListener("input", dibujarAnimes);
ordenAnimes.addEventListener("change", dibujarAnimes);

window.cambiarEstadoAnime = function(posicion) {
    const anime = animes[posicion];
    actualizarAnime(anime.id, { visto: !anime.visto });
};

    window.abrirMenu = function(posicion) {
        const menu = document.getElementById(`menu-${posicion}`);
        const yaEstaAbierto = menu.classList.contains("mostrar-menu");

        document.querySelectorAll(".menu-desplegable.mostrar-menu").forEach(function(menuAbierto) {
            menuAbierto.classList.remove("mostrar-menu");
        });

        if (!yaEstaAbierto) {
            menu.classList.add("mostrar-menu");
        }
    }

async function obtenerDatosKitsu(nombre) {
    const respuesta = await fetch(
        `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(nombre)}&page[limit]=6`
    );

    if (!respuesta.ok) {
        throw new Error("Kitsu no está disponible.");
    }

    const datos = await respuesta.json();
    const animeConInfo = datos.data?.find(function(anime) {
        const attributes = anime.attributes || {};
        const poster = attributes.posterImage;
        return poster?.original || poster?.large || poster?.medium || poster?.small;
    });

    if (!animeConInfo) {
        throw new Error("Kitsu no encontró información para este anime.");
    }

    const attributes = animeConInfo.attributes || {};
    const poster = attributes.posterImage || {};
    const descripcion = (attributes.synopsis || "").replace(/\s+/g, " ").trim();
    const genres = attributes.genre || attributes.genres || "No disponible";
    const genero = Array.isArray(genres)
        ? genres.map(function(item) { return item.name || item; }).join(", ")
        : (typeof genres === "string" ? genres : "No disponible");

    return {
        titulo: attributes.canonicalTitle || attributes.titles?.en || attributes.titles?.ja_jp || nombre,
        apodo: attributes.canonicalTitle || attributes.titles?.en || attributes.titles?.ja_jp || nombre,
        imagen_url: poster.original || poster.large || poster.medium || poster.small || "",
        episodios: attributes.episodeCount ?? null,
        ano: attributes.startDate ? Number(String(attributes.startDate).slice(0, 4)) : null,
        genero: genero || "No disponible",
        descripcion: descripcion || "Sin descripción disponible."
    };
}

async function obtenerImagenDeKitsu(nombre) {
    const datos = await obtenerDatosKitsu(nombre);
    return datos.imagen_url;
}

botonGuardar.addEventListener("click", async function() {
    const nombre = nombreAnime.value.trim();
    if (!nombre) {
        alert("Por favor, ingrese un nombre de anime.");
        return;
    }

    const nombreNormalizado = nombre.toLocaleLowerCase();
    const nombreRepetido = animes.some(function(anime) {
        return (anime.nombre || "").trim().toLocaleLowerCase() === nombreNormalizado;
    });

    if (nombreRepetido) {
        alert("El nombre está repetido.");
        return;
    }

    let imagen = imagenAnime.value.trim();
    let datosKitsu = null;
    if (!imagen && confirm("No ingresaste una imagen. ¿Quieres buscar una portada automáticamente en Kitsu?")) {
        try {
            datosKitsu = await obtenerDatosKitsu(nombre);
            imagen = datosKitsu.imagen_url;
        } catch (error) {
            console.error("Error buscando una portada en Kitsu:", error);
            alert("No se pudo obtener una imagen desde Kitsu. El anime se guardará sin portada.");
        }
    }

    // Datos listos para la base de datos de Django
    const nuevoAnime = {
        apodo: nombre,
        titulo: nombre,
        imagen_url: imagen,
        visto: false,
        episodios: datosKitsu?.episodios ?? null,
        ano: datosKitsu?.ano ?? null,
        genero: datosKitsu?.genero ?? null,
        descripcion: datosKitsu?.descripcion ?? null
    };

    try {
        const respuesta = await fetch('/api/animes/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(nuevoAnime)
        });

        if (respuesta.ok) {
            // Recargamos la lista desde el servidor para mostrarlo de inmediato
            await cargarAnimesDesdeServidor();
            nombreAnime.value = "";
            imagenAnime.value = "";
        } else {
            const error = await respuesta.json().catch(function() { return {}; });
            alert(error.error || "Hubo un error al guardar en el servidor.");
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("No se pudo conectar con el servidor.");
    }
});

async function actualizarAnime(id, cambios) {
    try {
        const respuesta = await fetch(`/api/animes/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
            body: JSON.stringify(cambios)
        });
        if (!respuesta.ok) {
            const error = await respuesta.json().catch(function() { return {}; });
            throw new Error(error.error || "No se pudo actualizar el anime.");
        }
        await cargarAnimesDesdeServidor();
    } catch (error) {
        console.error("Error actualizando anime:", error);
        alert(error.message);
    }
}

window.modificarAnime = async function(posicion) {
    const anime = animes[posicion];
    const opcion = prompt(
        "¿Qué desea modificar?\n1. Cambiar nombre\n2. Cambiar imagen\n3. Buscar imagen en Kitsu"
    );

    if (opcion === null) {
        return;
    }

    if (opcion.trim() === "1") {
        const nuevoNombre = prompt("Ingrese el nuevo nombre del anime:", anime.nombre);
        if (nuevoNombre !== null && nuevoNombre.trim() !== "") {
            const repetido = animes.some(function(item, indice) {
                return indice !== posicion &&
                    item.nombre.trim().toLocaleLowerCase() === nuevoNombre.trim().toLocaleLowerCase();
            });
            if (repetido) {
                alert("El nombre está repetido.");
                return;
            }
            await actualizarAnime(anime.id, { apodo: nuevoNombre.trim(), titulo: nuevoNombre.trim() });
        }
    } else if (opcion.trim() === "2") {
        const nuevaImagen = prompt("Ingrese el nuevo enlace de la imagen:", anime.imagen_url || anime.imagen);
        if (nuevaImagen !== null) {
            await actualizarAnime(anime.id, { imagen_url: nuevaImagen.trim() });
        }
    } else if (opcion.trim() === "3") {
        try {
            const datosKitsu = await obtenerDatosKitsu(anime.nombre);
            await actualizarAnime(anime.id, {
                apodo: anime.apodo || anime.nombre,
                titulo: anime.titulo || anime.nombre,
                imagen_url: datosKitsu.imagen_url,
                episodios: datosKitsu.episodios,
                ano: datosKitsu.ano,
                genero: datosKitsu.genero,
                descripcion: datosKitsu.descripcion
            });
            alert("Se actualizó la imagen y los datos del anime desde Kitsu.");
        } catch (error) {
            console.error("Error al buscar la imagen en Kitsu:", error);
            alert(error.message || "No se pudo encontrar una imagen válida en Kitsu.");
        }
    } else {
        alert("Opción no válida. Elija 1 para cambiar el nombre, 2 para cambiar la imagen o 3 para buscarla en Kitsu.");
        return;
    }

}; 
window.eliminarAnime = async function(posicion) {
    const confirmacion = confirm("¿Está seguro de que desea eliminar este anime?");
    if (confirmacion) {
        try {
            const respuesta = await fetch(`/api/animes/${animes[posicion].id}/`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }
            });
            if (!respuesta.ok) {
                const error = await respuesta.json().catch(function() { return {}; });
                throw new Error(error.error || "No se pudo eliminar el anime.");
            }
            await cargarAnimesDesdeServidor();
        } catch (error) {
            console.error("Error eliminando anime:", error);
            alert(error.message);
        }
    }
};
async function traducirDescripcion(texto) {
    const partes = [];
    let pendiente = texto.trim();

    while (pendiente.length > 450) {
        let corte = pendiente.lastIndexOf(" ", 450);
        if (corte < 250) {
            corte = 450;
        }

        partes.push(pendiente.slice(0, corte).trim());
        pendiente = pendiente.slice(corte).trim();
    }

    if (pendiente) {
        partes.push(pendiente);
    }

    const traducciones = [];

    for (const parte of partes) {
        const respuesta = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(parte)}&langpair=en|es`
        );

        if (!respuesta.ok) {
            throw new Error("El servicio de traducción no está disponible.");
        }

        const datos = await respuesta.json();
        const traduccion = datos.responseData?.translatedText;

        if (datos.responseStatus !== 200 || !traduccion) {
            throw new Error("El servicio no devolvió una traducción válida.");
        }

        const textoDecodificado = document.createElement("textarea");
        textoDecodificado.innerHTML = traduccion;
        traducciones.push(textoDecodificado.value);
    }

    return traducciones.join(" ");
}

window.masInformacion = async function(posicion) {
    const nombreAnime = animes[posicion].nombre.trim();
    const panelInfo = document.getElementById("panel-info");
    panelInfo.classList.remove("mostrar-detalles");
    descripcionCompleta = "";
    descripcionExpandida = false;
    mostrarDescripcion();

    // Validamos que el nombre del anime tenga al menos 3 caracteres para evitar búsquedas vacías o demasiado genéricas
    if (nombreAnime.length<3) {
        alert("Por favor, ingrese un nombre de anime válido para buscar información.");
        return;
    }

    try {
        // 1. Cambiamos el enlace para buscar en los servidores de Kitsu
        const response = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(nombreAnime)}`);
        
        if (!response.ok) {
            alert("⚠️ Hubo un problema al conectar con los servidores de Kitsu.");
            return;
        }

        const data = await response.json();
        
        // Kitsu también devuelve un arreglo 'data', comprobamos si hay resultados
        if (data.data && data.data.length > 0) {
            // Kitsu guarda toda la info útil dentro de "attributes"
            const animeInfo = data.data[0].attributes;
            
            document.getElementById("nombre-anime-info").innerText = animeInfo.canonicalTitle || "No disponible";
            document.getElementById("episodios-info").innerText = animeInfo.episodeCount || "Desconocido";
            
            // Kitsu da la fecha completa (ej. 2011-01-07), cortamos para mostrar solo el año
            const anio = animeInfo.startDate ? animeInfo.startDate.substring(0, 4) : "No disponible";
            document.getElementById("año-info").innerText = anio;
            
            // Nota: Kitsu requiere una consulta extra para los géneros, así que ponemos un texto base por ahora
            document.getElementById("genero-info").innerText = "Buscar en Kitsu.io";
            
            const sinopsis = animeInfo.synopsis?.trim();
            if (sinopsis) {
                try {
                    descripcionCompleta = await traducirDescripcion(sinopsis);
                } catch (error) {
                    console.error("Error traduciendo la descripción:", error);
                    descripcionCompleta = sinopsis;
                }
            } else {
                descripcionCompleta = "No disponible";
            }
            mostrarDescripcion();
            
            panelInfo.classList.add("mostrar-detalles");

        } else {
            alert(`No se encontró información para el anime: "${nombreAnime}"`);
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("Ocurrió un error al intentar conectar con internet.");
    }
};


window.cerrarPanel = function() {
    const panelInfo = document.getElementById("panel-info");
    panelInfo.classList.remove("mostrar-detalles");
    document.getElementById("nombre-anime-info").innerText = "Información del anime";
}
dibujarAnimes();

const sugerenciasAnime = document.getElementById("sugerencias-anime");

let temporizadorBusqueda;

nombreAnime.addEventListener("input", function () {

    const texto = nombreAnime.value.trim();

    clearTimeout(temporizadorBusqueda);

    if (texto.length < 3) {
        sugerenciasAnime.innerHTML = "";
        sugerenciasAnime.style.display = "none";
        sugerenciasAnime.parentElement.classList.remove("mostrar-sugerencias");
        return;
    }

    temporizadorBusqueda = setTimeout(async function () {

        try {

            const respuesta = await fetch(
                `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(texto)}&page[limit]=6`
            );

            if (!respuesta.ok) {
                throw new Error("Error al consultar Kitsu");
            }

            const datos = await respuesta.json();

            sugerenciasAnime.innerHTML = "";

            if (!datos.data || datos.data.length === 0) {
                sugerenciasAnime.style.display = "none";
                sugerenciasAnime.parentElement.classList.remove("mostrar-sugerencias");
                return;
            }

            datos.data.forEach(function (anime) {

                const informacion = anime.attributes;

                const titulo =
                    informacion.canonicalTitle ||
                    informacion.titles?.en ||
                    informacion.titles?.ja_jp ||
                    "Sin nombre";

                const elemento = document.createElement("div");

                elemento.classList.add("sugerencia-anime");

                elemento.textContent = titulo;

                elemento.addEventListener("click", function () {

                    nombreAnime.value = titulo;

                    sugerenciasAnime.innerHTML = "";
                    sugerenciasAnime.style.display = "none";
                    sugerenciasAnime.parentElement.classList.remove("mostrar-sugerencias");

                });

                sugerenciasAnime.appendChild(elemento);

            });

            sugerenciasAnime.style.display = "block";
            sugerenciasAnime.parentElement.classList.add("mostrar-sugerencias");

        } catch (error) {

            console.error("Error buscando anime:", error);

            sugerenciasAnime.style.display = "none";
            sugerenciasAnime.parentElement.classList.remove("mostrar-sugerencias");

        }

    }, 400);

});
