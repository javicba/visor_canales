# Canales de riego · Catamarca

Visor cartográfico estático con MapLibre GL JS. Permite explorar canales por departamento, localidad, materialidad y nombre, seleccionar trazas y medir distancias. Las flechas son ilustrativas: no representan un caudal ni una velocidad medida.

Los datos incluidos son provisorios. El proyecto no requiere frameworks, instalación de dependencias ni servidor de aplicaciones.

## Abrir en la computadora

Abrir `index.html` o `ABRIR.cmd`. Los mapas base requieren Internet y el navegador debe permitir WebGL.

## Subir a GitHub y publicar

1. Crear un repositorio o utilizar el repositorio existente del visor. Si ya contiene una versión publicada, guardar una referencia a su último commit antes de reemplazar archivos.
2. Subir **el contenido de esta carpeta a la raíz del repositorio**: `index.html` debe quedar directamente en la raíz, junto con los archivos JavaScript y CSS y las carpetas `data`, `vendor`, `img`, `assets` y `tests`. Incluir también `.nojekyll`, `.gitignore` y `.gitattributes`. No subir el ZIP, la carpeta `work` ni respaldos.
3. En GitHub, abrir **Settings → Pages → Build and deployment**. Elegir **Deploy from a branch**, rama **main** (o la rama donde se hayan subido los archivos), carpeta **/(root)** y guardar.
4. Esperar a que finalice el despliegue. GitHub muestra la dirección del sitio en Pages. Abrir esa dirección, no la vista del archivo HTML dentro del repositorio.
5. Comprobar filtros, selección y deselección, regla, flechas, ambos fondos y vista en teléfono. Si aparecen datos anteriores, recargar con Ctrl + F5.

El archivo `.nojekyll` permite servir los archivos estáticos sin procesarlos con Jekyll. No hace falta un workflow personalizado ni un proceso de compilación.

Si se usa la subida web de GitHub, descomprimir primero el paquete y comprobar que también se incluyeron los archivos que empiezan con punto. GitHub no descomprime un ZIP para publicar su contenido.

Referencia: [configuración oficial de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Actualizar los datos

1. Respaldar y reemplazar `data/cursos_agua_v1.geojson`, manteniendo el esquema, identificadores únicos y coordenadas WGS 84 (longitud, latitud).
2. Con Node.js instalado, abrir una terminal en esta carpeta y ejecutar:

   ```powershell
   node actualizar-datos.cjs
   node tests/verificar.cjs
   ```

3. Actualizar la fecha y condición provisoria en `data-info.js`.
4. Subir juntos `data/cursos_agua_v1.geojson`, `data/cursos_agua_v1.js` y `data-info.js` al repositorio. Esperar al nuevo despliegue y recargar.

El navegador lee la copia `.js`, necesaria para admitir también apertura local con doble clic. Reemplazar solamente el GeoJSON no actualiza el mapa. El actualizador valida los datos y conserva el texto numérico original; no modifica el GeoJSON. Si falla la validación, mantiene la copia JavaScript anterior.

Si se cambia una traza, actualizar también su longitud en QGIS: el visor prioriza `longitud_m` o `longitud`, ambos en metros, antes de calcular una longitud horizontal desde la geometría. No hay actualización en vivo ni escritura de datos desde el mapa.

## Documentación y alcance

- [Guía de uso y organización](LEEME.md).
- [Revisión para publicación](REVISION-PUBLICACION.md).
- [Licencias de MapLibre y componentes incluidos](vendor/LICENSE.txt).

No se incorporaron caudales, estructuras hidráulicas ni PostGIS. No se ha asignado una licencia general al código propio, a los datos ni a los logos; su titular debe definir las condiciones de reutilización. Las licencias de terceros se conservan por separado.
