/* Visor de una capa de canales. Coordina mapa, filtros y controles. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const colors = {hormigon: '#1677cf', tierra: '#9a602c', piedra: '#8253b6', mamposteria: '#e7271a', pvc: '#00877d', pead: '#00877d', acero: '#4c667b'};
  const materialColor = value => colors[GIS.text(value)] || '#7b8794';
  const collection = features => ({type: 'FeatureCollection', features});
  let map, flow, measure, data, identity, visible = [], selected = null, ready = false, firstLoad = true;
  let activeBasemap = 'colorful';
  const byId = new Map();
  function notice(message) { $('notice').textContent = message; $('notice').hidden = !message; }
  function fit(features) {
    if (!ready) return;
    const box = GIS.bounds(features);
    if (!box) { notice('No hay resultados para encuadrar.'); return; }
    notice('');
    const narrow = window.innerWidth <= 800;
    map.fitBounds([[box[0], box[1]], [box[2], box[3]]], {
      padding: {top: narrow ? 125 : 105, bottom: 85, left: narrow ? 35 : 330, right: 45}, maxZoom: 16, duration: 650
    });
  }
  function clearSelection() {
    selected = null;
    map.getSource('selection')?.setData(collection([]));
  }
  function updateMap() {
    if (!ready) return;
    map.setFilter('channels-line', ['in', identity.expression, ['literal', visible.map(identity.key)]]);
    if (selected && !visible.includes(selected)) clearSelection();
    flow.sync(visible);
  }
  function receiveFiltered(features) {
    if (features.length === visible.length && features.every((f, i) => f === visible[i])) return;
    visible = features; notice(''); updateMap();
  }
  function addLayers() {
    map.addSource('channels', {type: 'geojson', data, ...identity.sourceOptions});
    const materialValues = [...new Set(data.features.map(f => String(f.properties?.material ?? '')))];
    const lineColor = materialValues.length ? ['match', ['to-string', ['coalesce', ['get', 'material'], '']],
      ...materialValues.flatMap(v => [v, materialColor(v)]), '#7b8794'] : '#7b8794';
    map.addLayer({id: 'channels-line', source: 'channels', type: 'line',
      layout: {'line-cap': 'round', 'line-join': 'round'},
      paint: {'line-color': lineColor, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 5, 18, 8]}});
    map.addSource('selection', {type: 'geojson', data: collection(selected ? [selected] : [])});
    map.addLayer({id: 'selection-line', source: 'selection', type: 'line',
      layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': '#e29229', 'line-width': 7}});
  }
  function renderHeader() {
    $('channel-total').textContent = Math.round(data.features.reduce((sum, f) => sum + GIS.featureMeters(f), 0)).toLocaleString('es-AR') + ' m';
    $('channel-total').title = 'Longitud registrada en metros; cálculo geométrico horizontal cuando falta el dato.';
    const metadata = window.CHANNEL_DATA_INFO || {};
    $('channel-data-note').textContent = metadata.isDemo ? 'DATOS DE PRUEBA' : 'CANALES DE RIEGO';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(metadata.updatedOn || '') ? new Date(metadata.updatedOn + 'T12:00:00') : null;
    $('channel-updated').textContent = date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-AR', {day: '2-digit', month: 'short', year: 'numeric'}) : 'Sin fecha';
    if (date && Number.isFinite(date.getTime())) $('channel-updated').dateTime = metadata.updatedOn;
  }
  function placeLogo() {
    const attribution = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
    if (!attribution) return;
    const position = () => { $('water-brand').style.bottom = Math.ceil(attribution.getBoundingClientRect().height + 24) + 'px'; };
    position();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(position); observer.observe(attribution);
      map.on('remove', () => observer.disconnect());
    }
  }
  try {
    data = GIS.validate(window.LOCAL_CHANNELS);
    identity = GIS.identity(data.features);
    data.features.forEach(f => byId.set(identity.key(f), f));
    visible = data.features;
    renderHeader();
    map = new maplibregl.Map({container: 'map', style: structuredClone(BASEMAP_STYLES.colorful), center: [-65.7792, -28.4689], zoom: 10, attributionControl: true});
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    measure = new Measure.DistanceControl(); map.addControl(measure, 'top-right');
    map.addControl(new maplibregl.ScaleControl({unit: 'metric'}));
    flow = Flow.create(map);
    placeLogo();
    ChannelFilters.create(data.features, materialColor, receiveFiltered, fit);
    $('basemap').onchange = () => {
      const next = $('basemap').value;
      if (next === activeBasemap || !Object.hasOwn(BASEMAP_STYLES, next)) return;
      ready = false; flow.pause(); $('basemap').disabled = true;
      const previous = activeBasemap;
      try {
        activeBasemap = next;
        notice('Cambiando mapa base…');
        map.setStyle(structuredClone(BASEMAP_STYLES[next]), {diff: false});
      } catch (error) {
        activeBasemap = previous; $('basemap').value = previous; $('basemap').disabled = false;
        ready = Boolean(map.getSource('channels'));
        notice('No se pudo cambiar el mapa base: ' + error.message);
        updateMap();
      }
    };
    map.on('style.load', () => {
      try {
        addLayers(); ready = true;
        updateMap(); measure.sync();
        $('basemap').disabled = false; $('basemap').value = activeBasemap;
        notice('');
        if (firstLoad) { firstLoad = false; fit(visible); }
      } catch (error) {
        ready = false; flow.pause(); $('basemap').disabled = false;
        notice('No se pudieron mostrar los canales: ' + error.message);
      }
    });
    map.on('mousemove', event => {
      $('position').textContent = `${event.lngLat.lng.toFixed(5)}°, ${event.lngLat.lat.toFixed(5)}° · WGS 84`;
      if (!ready) return;
      map.getCanvas().style.cursor = measure.active ? 'crosshair' : map.queryRenderedFeatures(event.point, {layers: ['channels-line']}).length ? 'pointer' : '';
    });
    map.on('click', event => {
      if (!ready) return;
      if (measure.active) { measure.addPoint(event.lngLat); return; }
      const hit = map.queryRenderedFeatures([[event.point.x - 4, event.point.y - 4], [event.point.x + 4, event.point.y + 4]], {layers: ['channels-line']})[0];
      selected = hit ? byId.get(hit.id) || null : null;
      map.getSource('selection').setData(collection(selected ? [selected] : []));
    });
    map.on('error', event => {
      $('basemap').disabled = false;
      notice('No se pudo cargar un recurso del mapa. Revisá la conexión o elegí otro fondo. ' + (event.error?.message || ''));
    });
  } catch (error) {
    $('basemap').disabled = true;
    notice('No se pudo iniciar el visor: ' + error.message);
  }
})();
