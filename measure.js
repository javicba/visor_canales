/* Medición local de distancias entre puntos marcados sobre el mapa.
 * Se suman distancias geográficas sobre una esfera (Haversine), en metros.
 * Es una medición horizontal aproximada: no incluye altura ni sigue rutas automáticamente.
 */
(function (root) {
  "use strict";
  const sourceId = "distance-measurement";

  // Control nativo de MapLibre: se agrega después de NavigationControl para quedar debajo.
  class DistanceControl {
    constructor() { this.points = []; this.active = false; }
    onAdd(map) {
      this.map = map;
      const el = (tag, text, cls) => { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; };
      this.container = el("div", "", "maplibregl-ctrl maplibregl-ctrl-group measure-control");
      this.button = el("button", "📏", "measure-toggle");
      this.button.type = "button";
      this.button.title = "Medir distancias en metros";
      this.button.setAttribute("aria-label", "Medir distancias en metros");
      this.button.setAttribute("aria-pressed", "false");
      this.button.onclick = () => { this.active = !this.active; this.render(); };
      this.panel = el("div", "", "measure-panel");
      this.panel.setAttribute("aria-label", "Medición de distancias");
      this.result = el("strong", "0,0 m");
      this.result.setAttribute("role", "status");
      this.result.setAttribute("aria-live", "polite");
      this.help = el("p");
      const actions = el("div", "", "measure-actions");
      this.undo = el("button", "Deshacer");
      this.undo.onclick = () => { this.points.pop(); this.render(); };
      this.clear = el("button", "Borrar");
      this.clear.onclick = () => { this.points = []; this.render(); };
      this.finish = el("button", "Finalizar");
      this.finish.onclick = () => { this.active = false; this.render(); };
      for (const button of [this.undo, this.clear, this.finish]) { button.type = "button"; actions.append(button); }
      this.panel.append(el("span", "DISTANCIA", "eyebrow"), this.result, this.help, actions);
      this.container.append(this.button, this.panel);
      // Escape finaliza conservando la medición; no interfiere al escribir en el buscador.
      this.onKey = (event) => {
        if (this.active && event.key === "Escape") { this.active = false; this.render(); }
      };
      document.addEventListener("keydown", this.onKey);
      this.render();
      return this.container;
    }
    onRemove() {
      document.removeEventListener("keydown", this.onKey);
      this.container.remove();
      for (const id of ["measure-vertices", "measure-line"]) if (this.map.getLayer(id)) this.map.removeLayer(id);
      if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
      this.map.getCanvas().style.cursor = "";
    }
    // Solo agrega vértices en modo medición. No modifica las capas del usuario.
    addPoint(lngLat) {
      if (!this.active) return;
      this.points.push([lngLat.lng, lngLat.lat]);
      this.render();
    }
    data() {
      const features = this.points.map(point => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: point } }));
      if (this.points.length > 1) features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: this.points } });
      return { type: "FeatureCollection", features };
    }
    // Reconstruye la medición al cambiar el mapa base; conserva puntos y distancia.
    sync() {
      if (!this.map) return;
      if (this.map.getSource(sourceId)) this.map.getSource(sourceId).setData(this.data());
      else this.map.addSource(sourceId, { type: "geojson", data: this.data() });
      if (!this.map.getLayer("measure-line")) this.map.addLayer({ id: "measure-line", source: sourceId, type: "line", filter: ["==", ["geometry-type"], "LineString"], paint: {
        "line-color": "#e55324", "line-width": 3, "line-dasharray": [2, 1],
      } });
      if (!this.map.getLayer("measure-vertices")) this.map.addLayer({ id: "measure-vertices", source: sourceId, type: "circle", filter: ["==", ["geometry-type"], "Point"], paint: {
        "circle-color": "#fff", "circle-radius": 5, "circle-stroke-color": "#e55324", "circle-stroke-width": 2,
      } });
      this.map.moveLayer("measure-line"); this.map.moveLayer("measure-vertices");
    }
    render() {
      this.button.setAttribute("aria-pressed", String(this.active));
      this.button.className = "measure-toggle" + (this.active ? " is-active" : "");
      this.panel.hidden = !this.active && !this.points.length;
      this.result.textContent = GIS.lineMeters(this.points).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " m";
      this.help.textContent = this.active ? "Hacé clic en el mapa para marcar puntos. Escape o Finalizar termina la medición." : "Medición finalizada. Activá la regla para continuar o borrá los puntos.";
      this.undo.disabled = this.clear.disabled = !this.points.length;
      this.finish.hidden = !this.active;
      this.map.getCanvas().style.cursor = this.active ? "crosshair" : "";
      if (this.map.getSource(sourceId)) this.sync();
    }
  }
  const api = { DistanceControl };
  if (typeof module !== "undefined") module.exports = api;
  root.Measure = api;
})(globalThis);
