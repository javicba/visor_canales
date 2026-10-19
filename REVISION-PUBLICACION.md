# Revisión para publicación — 18 de octubre de 2026

## Resultado

Proyecto apto estructuralmente para alojamiento estático en GitHub Pages, sin compilación ni dependencias adicionales. La publicación remota y la prueba visual del sitio publicado quedan pendientes. Este informe no certifica disponibilidad de servicios externos ni rendimiento WebGL.

## Comprobaciones realizadas

- Las referencias de scripts, estilos e imágenes en el HTML son relativas y corresponden a recursos locales existentes. Permiten publicar bajo la subruta de un repositorio.
- MapLibre y sus estilos están incluidos localmente, junto con su licencia. Los mapas base, glifos y sprites externos requieren Internet.
- El GeoJSON y su copia JavaScript coinciden. El conjunto contiene 20 trazas y conserva sus atributos e identificadores.
- `node tests/verificar.cjs` pasa: cubre datos, filtros, colores, selección y deselección, Flow, medición, cambio de fondo, errores y actualización. Utiliza un mapa y DOM simulados; no sustituye una comprobación visual en navegador.
- Se mantienen los ajustes del usuario: mampostería `#e7271a` y posición de escritorio del control de mapas base `top: 325px`.
- No se necesitan rutas de Windows, archivos del directorio de trabajo ni respaldos para ejecutar el visor. La documentación anterior fue ajustada para evitar publicar la ubicación local del respaldo.

## Aspectos a comprobar antes de difundir el sitio

- Los datos siguen marcados como provisorios en `data-info.js`. Mantener esa indicación hasta validar el inventario.
- Los datos y atributos enviados al navegador son descargables. Confirmar que el conjunto completo y los logos están destinados a difusión pública; ocultar un atributo en la interfaz no restringe su acceso.
- El fondo Google existente usa una URL directa de teselas (`mt1.google.com`), sin una integración oficial de API configurada en el proyecto. Su autorización y condiciones de publicación institucional no fueron verificadas. El fondo Colorful también depende de servicios externos. Se conservaron los proveedores y atribuciones existentes.
- Probar en la URL final ambos fondos, controles, filtros, flechas, selección, medición y diseño en escritorio y teléfono. Revisar posibles errores de red o consola.

## Qué subir

Subir el contenido completo de `visor-canales-v1` a la raíz del repositorio, incluidos los archivos que empiezan con punto. No incluir la carpeta contenedora `outputs`, respaldos ni ZIP. Los tests, documentación y actualizador son herramientas de mantenimiento y no se cargan al abrir el mapa.

## Recuperación

Antes de reemplazar una versión existente en GitHub, anotar su commit o crear una etiqueta. Si una actualización falla, revertir el commit correspondiente y esperar al nuevo despliegue. Los datos fuente y su copia JavaScript deben recuperarse juntos. El respaldo local anterior a la optimización permanece fuera de esta carpeta y no se incluye en el paquete.
