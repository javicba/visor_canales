/* Flechas ilustrativas sobre los canales filtrados. Recorren cada parte real.
 * La línea y sus colores pertenecen a app.js; este módulo solo anima símbolos.
 * No calcula caudales ni modifica el GeoJSON original. */
(function (root) {
  "use strict";

  // Velocidad ilustrativa: no representa velocidad hidráulica medida.
  const config = {
    speedMetersPerSecond: 120,
    spacingMeters: 1200, maxArrowsPerPart: 12, framesPerSecond: 30,
    reverse: false, iconSize: 0.65
  };
  const radians = Math.PI / 180;
  const sourceId = "flow-arrows", layerId = "flow-arrows-symbol", imageId = "flow-arrow-icon";

  // Precalcula las distancias acumuladas una vez; omite vértices repetidos.
  function prepare(coordinates) {
    const points = [], cumulative = [0];
    for (const point of coordinates) {
      if (!points.length) { points.push(point); continue; }
      const length = GIS.distance(points[points.length - 1], point);
      if (length > 0.001) { cumulative.push(cumulative[cumulative.length - 1] + length); points.push(point); }
    }
    return points.length > 1 ? { points, cumulative, length: cumulative[cumulative.length - 1] } : null;
  }

  // Ubica una distancia dentro de la línea por búsqueda binaria.
  // Interpola dentro del tramo real; así no se acelera donde hay menos vértices.
  function sample(path, meters, reverse = false) {
    const d = Math.max(0, Math.min(path.length, meters));
    let low = 0, high = path.points.length - 1;
    while (high - low > 1) { const mid = (low + high) >> 1; if (path.cumulative[mid] <= d) low = mid; else high = mid; }
    const a = path.points[low], b = path.points[high];
    const t = (d - path.cumulative[low]) / (path.cumulative[high] - path.cumulative[low]);
    // Rumbo geográfico: 0° norte, 90° este. El icono original apunta al norte.
    const dl = (b[0] - a[0]) * radians;
    const y = Math.sin(dl) * Math.cos(b[1] * radians);
    const x = Math.cos(a[1] * radians) * Math.sin(b[1] * radians) - Math.sin(a[1] * radians) * Math.cos(b[1] * radians) * Math.cos(dl);
    return { coordinates: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], bearing: (Math.atan2(y, x) / radians + (reverse ? 180 : 0) + 360) % 360 };
  }

  // Genera los puntos móviles a partir del tiempo transcurrido.
  // Al llegar al final cada partícula reaparece al inicio.
  function frame(paths, seconds, options = config) {
    const features = [];
    for (const path of paths) {
      const reverse = path.reverse ?? options.reverse;
      const count = Math.min(options.maxArrowsPerPart, Math.max(1, Math.ceil(path.length / options.spacingMeters)));
      for (let i = 0; i < count; i++) {
        const offset = (seconds * options.speedMetersPerSecond + i * path.length / count) % path.length;
        const p = sample(path, reverse ? path.length - offset : offset, reverse);
        features.push({ type: "Feature", properties: { bearing: p.bearing }, geometry: { type: "Point", coordinates: p.coordinates } });

      }
    }
    return { type: "FeatureCollection", features };
  }

  // Flecha clara con borde oscuro, independiente del color del material.
  function icon() {
    const data = new Uint8Array(32 * 32 * 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const dx = Math.abs(x - 15.5), edge = Math.abs(y - (7 + dx));
      if (dx <= 11 && edge <= 4) {
        data.set(edge <= 1.7 && dx <= 9 ? [255,255,255,255] : [27,43,58,255], (y*32+x)*4);
      }
    }
    return {width:32, height:32, data};
  }
  function create(map, options = config) {
    let paths = [], seconds = 0, previous = null, request = null, lastDraw = -Infinity;
    const cache = new WeakMap();
    function pause() {
      if (request !== null) root.cancelAnimationFrame(request);
      request = null; previous = null; lastDraw = -Infinity;
    }
    function tick(now) {
      request = null;
      if (!map.getSource(sourceId) || !paths.length || root.document?.hidden) return;
      if (previous !== null) seconds += Math.min((now-previous)/1000, .1);
      previous = now;
      if (now-lastDraw >= 1000/options.framesPerSecond) {
        map.getSource(sourceId).setData(frame(paths,seconds,options)); lastDraw=now;
      }
      request=root.requestAnimationFrame(tick);
    }
    function resume() {
      if (request === null && paths.length && !root.document?.hidden) request=root.requestAnimationFrame(tick);
    }
    function visibility() { pause(); resume(); }
    root.document?.addEventListener('visibilitychange', visibility);
    map.on('remove', () => {pause(); root.document?.removeEventListener('visibilitychange',visibility);});
    function sync(features) {
      pause(); paths=[];
      for (const feature of features) {
        const geometry=feature.geometry;
        if (!geometry) continue;
        let prepared=cache.get(geometry);
        if (!prepared) {
          prepared=GIS.parts(geometry).map(prepare).filter(Boolean);
          cache.set(geometry,prepared);
        }
        const direction=Number(feature.properties?.sentido_flujo);
        for (const path of prepared) paths.push({...path,reverse:direction===-1?true:direction===1?false:options.reverse});
      }
      if (!map.hasImage(imageId)) map.addImage(imageId, icon());
      const data=frame(paths,seconds,options);
      if (map.getSource(sourceId)) map.getSource(sourceId).setData(data);
      else map.addSource(sourceId,{type:'geojson',data});
      if (!map.getLayer(layerId)) map.addLayer({id:layerId,source:sourceId,type:'symbol',layout:{
        'icon-image':imageId,'icon-size':options.iconSize,'icon-rotate':['get','bearing'],
        'icon-rotation-alignment':'map','icon-pitch-alignment':'map',
        'icon-allow-overlap':true,'icon-ignore-placement':true
      }});
      map.moveLayer(layerId);
      resume();
    }
    return {sync,pause};
  }
  const api = { config, prepare, sample, frame, create };
  if (typeof module !== "undefined") module.exports = api;
  root.Flow = api;
})(globalThis);
