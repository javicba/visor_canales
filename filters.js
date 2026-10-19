/* Controles del panel. Comunica resultados sin acceder al mapa ni al Flow. */
(function (root) {
  'use strict';
  function create(features, color, onChange, onFit) {
    const $ = id => document.getElementById(id);
    const state = {departamento: null, localidad: null, material: null};
    const missing = '\u0000';
    let visible = features;
    const value = (f, field) => {
      const v = f.properties?.[field];
      return v == null || String(v).trim() === '' ? missing : String(v).trim();
    };
    function apply() {
      const query = GIS.text($('search').value);
      visible = features.filter(f => Object.keys(state).every(k => state[k] === null || value(f, k) === state[k]) &&
        (!query || ['nombre', 'nombcompl', 'id_canal', 'id_tramo', 'fid'].some(k => GIS.text(f.properties?.[k]).includes(query))));
      const meters = visible.reduce((sum, f) => sum + GIS.featureMeters(f), 0);
      $('filter-results').textContent = `${visible.length} de ${features.length} tramos · ${(meters / 1000).toLocaleString('es-AR', {maximumFractionDigits: 2})} km`;
      onChange(visible);
    }
    function render() {
      for (const field of Object.keys(state)) {
        const candidates = field === 'localidad' && state.departamento !== null
          ? features.filter(f => value(f, 'departamento') === state.departamento) : features;
        const values = [...new Set(candidates.map(f => value(f, field)))].sort((a, b) => a === missing ? 1 : b === missing ? -1 : a.localeCompare(b, 'es'));
        if (state[field] !== null && !values.includes(state[field])) state[field] = null;
        const box = $('filter-' + field); box.replaceChildren();
        for (const v of [null, ...values]) {
          const label = v === null ? (field === 'departamento' ? 'Todos' : 'Todas') : v === missing ? 'Sin dato' : v;
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'filter-chip';
          button.setAttribute('aria-pressed', String(state[field] === v));
          if (field === 'material' && v !== null) {
            const swatch = document.createElement('span');
            swatch.className = 'material-swatch'; swatch.style.backgroundColor = color(v === missing ? null : v);
            swatch.setAttribute('aria-hidden', 'true'); button.append(swatch);
          }
          const text = document.createElement('span'); text.textContent = label; button.append(text);
          button.onclick = () => {
            state[field] = v;
            if (field === 'departamento') state.localidad = null;
            render(); apply();
          };
          box.append(button);
        }
      }
    }
    $('search').oninput = apply;
    $('reset-filters').onclick = () => {
      Object.keys(state).forEach(k => state[k] = null);
      $('search').value = ''; render(); apply();
    };
    $('fit-results').onclick = () => onFit(visible);
    $('toggle-filters').onclick = () => {
      const body = $('filter-body'), button = $('toggle-filters');
      body.hidden = !body.hidden;
      button.textContent = body.hidden ? 'Mostrar filtros' : 'Ocultar';
      button.setAttribute('aria-expanded', String(!body.hidden));
    };
    render(); apply();
  }
  root.ChannelFilters = {create};
})(globalThis);
