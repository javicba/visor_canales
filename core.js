/* Operaciones sobre canales. Nunca edita geometrías ni atributos de entrada. */
(function (root) {
  'use strict';
  function validate(data) {
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw Error('Se necesita una colección GeoJSON de canales.');
    if (data.crs && !/4326|CRS84/i.test(JSON.stringify(data.crs))) throw Error('Los canales deben estar en WGS 84, con longitud y latitud.');
    for (const [i, feature] of data.features.entries()) {
      if (feature?.type !== 'Feature' || !('geometry' in feature)) throw Error(`Entidad ${i + 1} inválida.`);
      if (feature.properties !== null && (typeof feature.properties !== 'object' || Array.isArray(feature.properties))) throw Error(`Atributos inválidos en la entidad ${i + 1}.`);
      const geometry = feature.geometry;
      if (geometry === null) continue;
      if (!geometry || !['LineString', 'MultiLineString'].includes(geometry.type)) throw Error(`La entidad ${i + 1} no es una traza lineal.`);
      if (!Array.isArray(geometry.coordinates)) throw Error(`Coordenadas inválidas en la entidad ${i + 1}.`);
      for (const line of parts(geometry)) {
        if (!Array.isArray(line) || line.length < 2) throw Error(`Traza incompleta en la entidad ${i + 1}.`);
        for (const p of line) {
          if (!Array.isArray(p) || p.length < 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw Error(`Coordenadas fuera de rango en la entidad ${i + 1}.`);
        }
      }
    }
    return data;
  }
  function parts(geometry) {
    if (!geometry) return [];
    return geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
  }
  function identity(features) {
    const unique = values => values.every(v => typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) && new Set(values).size === values.length;
    // Feature.id tiene prioridad. promoteId solo cambia la identificación del renderizado.
    if (unique(features.map(f => f.id))) return {sourceOptions: {}, expression: ['id'], key: f => f.id};
    if (unique(features.map(f => f.properties?.fid))) return {sourceOptions: {promoteId: 'fid'}, expression: ['get', 'fid'], key: f => f.properties.fid};
    throw Error('Cada canal necesita un id o fid único para seleccionarlo. Los datos no se han modificado.');
  }
  function bounds(features) {
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const f of features) for (const line of parts(f.geometry)) for (const p of line) {
      box[0] = Math.min(box[0], p[0]); box[1] = Math.min(box[1], p[1]);
      box[2] = Math.max(box[2], p[0]); box[3] = Math.max(box[3], p[1]);
    }
    return Number.isFinite(box[0]) ? box : null;
  }
  function distance(a, b) {
    const r = Math.PI / 180, lat = (b[1] - a[1]) * r, lon = (b[0] - a[0]) * r;
    const h = Math.sin(lat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(lon / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
  }
  function lineMeters(points) { return points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0); }
  function featureMeters(feature) {
    for (const value of [feature.properties?.longitud_m, feature.properties?.longitud]) if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
    return parts(feature.geometry).reduce((sum, line) => sum + lineMeters(line), 0);
  }
  function text(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es'); }
  const api = {validate, parts, identity, bounds, distance, lineMeters, featureMeters, text};
  root.GIS = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
