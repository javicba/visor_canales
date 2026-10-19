'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const GIS = require('./core.js');

// El GeoJSON es la fuente. Se valida sin escribir sobre él.
const input = path.join(__dirname, 'data/cursos_agua_v1.geojson');
const output = path.join(__dirname, 'data/cursos_agua_v1.js');
const raw = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '');
const data = GIS.validate(JSON.parse(raw));
GIS.identity(data.features);
// Se conserva el texto numérico original, incluidos todos sus decimales.
const script = 'window.LOCAL_CHANNELS = ' + raw.trim() + ';\n';
new vm.Script(script);
const temporary = output + '.tmp';
try {
  fs.writeFileSync(temporary, script, 'utf8');
  fs.renameSync(temporary, output);
} finally {
  if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log(`Actualizados ${data.features.length} canales. El GeoJSON original no fue modificado.`);
