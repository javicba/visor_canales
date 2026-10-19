# Visor de canales de riego

Abrí `index.html` o, en Windows, `ABRIR.cmd`. No necesita instalación para visualizarse. Los mapas base necesitan Internet y el navegador debe tener WebGL disponible.

## Uso

El panel izquierdo combina Departamento, Localidad, Materialidad y búsqueda por nombre o identificador. Localidad depende del departamento elegido; “Sin dato” agrupa valores vacíos. “Limpiar filtros” vuelve a mostrar todos los canales. “Encuadrar resultados” ajusta el mapa a la selección del filtro.

Un clic sobre un canal lo resalta; otro clic sobre el fondo lo deselecciona. El menú de mapas base arranca cerrado. La regla permite marcar puntos, deshacer y borrar una medición. Escape o Finalizar termina la toma de puntos.

Los colores representan materialidad: hormigón azul, tierra marrón, piedra violeta y mampostería roja. Los materiales sin clasificación utilizan gris. Las flechas Flow solo recorren los canales filtrados y se pausan al ocultar la pestaña. Su velocidad es ilustrativa: respetan `sentido_flujo` si vale 1 o -1; en los demás casos siguen el orden de coordenadas.

La cabecera y el resumen de filtros usan el mismo criterio de longitud: `longitud_m`, o `longitud` cuando la primera no esté disponible, considerando ambos en metros. Si falta un número válido, calculan la longitud horizontal de la geometría. Ese respaldo usa una esfera de radio 6.371.008,8 m; no es una medición de ingeniería. El cálculo nunca se escribe en los atributos.

## Actualizar datos

1. Reemplazá `data/cursos_agua_v1.geojson` por una exportación con el mismo esquema.
2. Desde esta carpeta, ejecutá `node actualizar-datos.cjs` con Node instalado.
3. Actualizá en `data-info.js` la fecha de actualización del conjunto y su condición provisoria cuando corresponda.
4. Recargá el navegador con Ctrl + F5.

El actualizador valida la colección, las trazas y sus identificadores antes de reemplazar `data/cursos_agua_v1.js`. Conserva el texto numérico original del GeoJSON. Ante un error de validación mantiene la copia JavaScript anterior. La fecha del conjunto no se cambia automáticamente al ejecutar el proceso.

El GeoJSON es la fuente de datos. El archivo `.js` es una copia generada que permite abrir el visor con doble clic; no debe editarse por separado. Para seleccionar canales se utilizan los `Feature.id` si todos son válidos y únicos; en otro caso, el atributo `fid`, también único. No se reemplazan los identificadores ni se agregan atributos visuales a los datos.

## Organización

- `app.js`: inicio del mapa, representación, selección, cabecera y coordinación.
- `filters.js`: controles y criterios de filtrado; entrega resultados sin acceder al mapa.
- `core.js`: validación, identificación, extensión y distancias compartidas.
- `flow.js`: animación de las trazas filtradas, con un único reloj.
- `measure.js`: regla de distancias.
- `basemaps.js`: definición de Colorful y Google Híbrido XYZ.
- `style.css` e `index.html`: presentación.
- `data-info.js`: metadatos editables del conjunto.
- `vendor/`: MapLibre GL JS y licencias originales.

Una sola fuente contiene los canales. Filtrar cambia su visibilidad sin volver a enviar todas las geometrías; las flechas y la selección usan fuentes pequeñas independientes. Las distancias preparadas para Flow se conservan en memoria y no alteran las coordenadas. La regla se actualiza al medir o restaurar el estilo, no al buscar canales.

## Verificación y distribución

Ejecutá `node tests/verificar.cjs`. Usa los scripts reales y los datos incluidos con un mapa y DOM simulados; prueba filtros, selección, Flow, medición, cambio de fondo, errores, actualización e integridad de datos. No sustituye una prueba visual/WebGL en navegador ni verifica disponibilidad de los proveedores remotos.

Compartí la carpeta completa, conservando la estructura. Para publicar por web, `index.html` es el punto de entrada; no hay servidor de aplicaciones ni proceso de compilación. Los archivos `tests/`, `ABRIR.cmd` y `actualizar-datos.cjs` son auxiliares y no los carga el navegador. Se conservan las atribuciones cartográficas. La integración existente de Google utiliza una URL directa de teselas; sus condiciones de publicación deben revisarse antes de una distribución institucional.

## Respaldo previo

El respaldo local anterior a la optimización se conserva fuera de esta carpeta y no forma parte del paquete de publicación. En GitHub, conservar el historial de commits permite recuperar versiones anteriores. Ver `README.md` para publicar y `REVISION-PUBLICACION.md` para conocer el alcance de la revisión.

No se implementaron caudales, inventario de estructuras ni integración con bases de datos.
