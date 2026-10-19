'use strict';
// Pruebas sin dependencias: datos reales, DOM mínimo y ciclo de estilo simulado.
// No sustituye la inspección visual ni la prueba WebGL en un navegador.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const base = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'IDs HTML únicos');
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert(fs.existsSync(path.join(base, m[1])), `Falta ${m[1]}`);
assert(!/<details[^>]*\bopen\b/.test(html), 'Mapas base comienza cerrado');
const raw = fs.readFileSync(path.join(base, 'data/cursos_agua_v1.geojson'), 'utf8');
const original = JSON.parse(raw);
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
class Element {
  constructor() { this.children=[]; this.attributes={}; this.style={}; this.hidden=false; this.value=''; this._text=''; }
  set textContent(v) { this._text=String(v); this.children=[]; }
  get textContent() { return this._text+this.children.map(x=>x.textContent).join(''); }
  append(...children) { for (const child of children) { child.parent=this; this.children.push(child); } }
  replaceChildren(...children) { this._text=''; this.children=[]; this.append(...children); }
  setAttribute(k,v) { this.attributes[k]=String(v); }
  getAttribute(k) { return this.attributes[k]; }
  getBoundingClientRect() { return {height:24}; }
  remove() { if(this.parent) this.parent.children=this.parent.children.filter(x=>x!==this); }
  click() { this.onclick?.(); }
}
function boot(dataOverride) {
  const elements=new Map(ids.map(id=>[id,new Element()]));
  elements.get('notice').hidden=true;
  const domEvents=new Map(), frames=new Map();let frameId=0, map;
  class MapStub {
    constructor(options) { map=this; this.style=options.style; this.sources={};this.layers={};this.images={};this.events={};this.controls=[];this.canvas=new Element();this.hits=[]; }
    on(name,fn) { (this.events[name] ||= []).push(fn); }
    emit(name,event={}) { for(const fn of this.events[name]||[]) fn(event); }
    addControl(control,position) { this.controls.push({control,position}); control.onAdd?.(this); }
    getContainer() { return {querySelector:()=>new Element()}; }
    getCanvas() { return this.canvas; }
    addSource(id,options) {
      assert(!this.sources[id],`Fuente duplicada ${id}`);
      this.sources[id]={...options,updates:0,setData(data){this.data=data;this.updates++;}};
    }
    getSource(id) { return this.sources[id]; }
    removeSource(id) { delete this.sources[id]; }
    addLayer(layer) { assert(!this.layers[layer.id],`Capa duplicada ${layer.id}`);assert(this.sources[layer.source]);this.layers[layer.id]=layer; }
    getLayer(id) { return this.layers[id]; }
    removeLayer(id) { delete this.layers[id]; }
    moveLayer(id) { assert(this.layers[id],`Mover capa inexistente ${id}`); }
    setFilter(id,filter) { assert(this.layers[id]);this.layers[id].filter=filter; }
    hasImage(id) { return Boolean(this.images[id]); }
    addImage(id,image) { this.images[id]=image; }
    fitBounds(bounds,options) { this.fitted={bounds,options}; }
    setStyle(style) { if(this.failStyle) throw Error('Fallo simulado');this.style=style;this.sources={};this.layers={};this.images={}; }
    queryRenderedFeatures(_point,options) {
      assert.deepEqual(Array.from(options.layers),['channels-line']);
      const allowed=this.layers['channels-line'].filter[2][1];
      return this.hits.filter(f=>allowed.includes(f.id));
    }
  }
  const document={hidden:false,getElementById:id=>elements.get(id)||null,createElement:()=>new Element(),
    addEventListener:(name,fn)=>{if(!domEvents.has(name))domEvents.set(name,new Set());domEvents.get(name).add(fn);},
    removeEventListener:(name,fn)=>domEvents.get(name)?.delete(fn)};
  const context={console,document,structuredClone,innerWidth:1280,maplibregl:{Map:MapStub,NavigationControl:class{},ScaleControl:class{}},
    requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),
    ResizeObserver:class{observe(){}disconnect(){}}};
  context.window=context;context.globalThis=context;vm.createContext(context);
  for(const file of scripts) {
    if(file.startsWith('vendor/'))continue;
    if(file==='app.js') { if(dataOverride!==undefined)context.LOCAL_CHANNELS=dataOverride;freeze(context.LOCAL_CHANNELS); }
    vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:file});
  }
  return {elements,map,context,frames,domEvents,document};
}
const app=boot(),{map,context,elements,frames}=app;
const $=id=>elements.get(id);
const visible=()=>Array.from(map.layers['channels-line'].filter[2][1]);
const clickChip=(field,label)=>{
  const button=$('filter-'+field).children.find(b=>b.textContent===label);assert(button,`Falta opción ${label}`);button.click();
};
const search=text=>{$('search').value=text;$('search').oninput();};
map.emit('style.load');
assert($('notice').hidden,$('notice').textContent);
assert.equal(map.sources.channels.promoteId,'fid');
assert.deepEqual(JSON.parse(JSON.stringify(map.sources.channels.data)),original);
assert.equal(visible().length,20);
assert.equal($('channel-total').textContent,'105.444 m');
assert($('filter-results').textContent.includes('105,44 km'));
assert.equal(frames.size,1);
assert(!Object.keys(map.layers).some(id=>/fill|data-0/.test(id)));
assert.equal(map.layers['channels-line'].paint['line-color'][0],'match');
function tick(time){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(time);}
tick(1000);const start=JSON.stringify(map.sources['flow-arrows'].data);
tick(1100);assert.notEqual(JSON.stringify(map.sources['flow-arrows'].data),start);
assert.equal(frames.size,1);
const measurement=map.controls.find(x=>x.control.constructor.name==='DistanceControl').control;
const measurementUpdates=map.sources['distance-measurement'].updates;
clickChip('material','Hormigón');assert.equal(visible().length,2);
assert.equal(map.sources.channels.updates,0,'Filtrar no reenvía geometrías');
assert.equal(map.sources['distance-measurement'].updates,measurementUpdates,'Filtrar no actualiza la regla');
const concrete=original.features.filter(f=>f.properties.material==='Hormigón');
const expectedArrows=concrete.reduce((sum,f)=>sum+context.GIS.parts(f.geometry).reduce((s,p)=>s+Math.min(12,Math.max(1,Math.ceil(context.Flow.prepare(p).length/1200))),0),0);
assert.equal(map.sources['flow-arrows'].data.features.length,expectedArrows);
search('NO EXISTE');assert.equal(visible().length,0);assert.equal(frames.size,0);assert.equal(map.sources['flow-arrows'].data.features.length,0);
$('reset-filters').click();assert.equal(visible().length,20);assert.equal(frames.size,1);
search('canal matriz');assert.equal(visible().length,1);
const previousIds=visible();$('basemap').value='googleXYZ';$('basemap').onchange();assert.equal(frames.size,0);
map.emit('style.load');assert.deepEqual(visible(),previousIds);assert.equal(frames.size,1);
assert.equal(map.style.name,'Google · Híbrido XYZ');
$('reset-filters').click();
map.hits=[{id:original.features[0].properties.fid}];map.emit('click',{point:{x:5,y:5}});
assert.equal(map.sources.selection.data.features[0].properties.fid,original.features[0].properties.fid);
map.hits=[{id:original.features[1].properties.fid}];map.emit('click',{point:{x:5,y:5}});
assert.equal(map.sources.selection.data.features[0].properties.fid,original.features[1].properties.fid);
map.hits=[];map.emit('click',{point:{x:30,y:30}});assert.equal(map.sources.selection.data.features.length,0);
map.hits=[{id:original.features[0].properties.fid}];map.emit('click',{point:{x:5,y:5}});search('NO EXISTE');assert.equal(map.sources.selection.data.features.length,0);
$('reset-filters').click();measurement.button.click();
map.emit('click',{point:{x:0,y:0},lngLat:{lng:-65.8,lat:-28.4}});
map.emit('click',{point:{x:1,y:1},lngLat:{lng:-65.79,lat:-28.4}});
assert.equal(measurement.points.length,2);assert.equal(map.sources['distance-measurement'].data.features.length,3);
measurement.finish.click();assert.equal(measurement.active,false);
$('basemap').value='colorful';$('basemap').onchange();map.emit('style.load');assert.equal(map.sources['distance-measurement'].data.features.length,3);
measurement.clear.click();assert.equal(map.sources['distance-measurement'].data.features.length,0);
$('toggle-filters').click();assert.equal($('filter-body').hidden,true);$('toggle-filters').click();assert.equal($('filter-body').hidden,false);
app.document.hidden=true;for(const fn of app.domEvents.get('visibilitychange'))fn();assert.equal(frames.size,0);
app.document.hidden=false;for(const fn of app.domEvents.get('visibilitychange'))fn();assert.equal(frames.size,1);
map.emit('error',{error:Error('Sin conexión')});assert(!$('notice').hidden);assert.equal($('basemap').disabled,false);
map.failStyle=true;$('basemap').value='googleXYZ';$('basemap').onchange();assert.equal($('basemap').value,'colorful');assert.equal(frames.size,1);map.failStyle=false;
map.emit('remove');assert.equal(frames.size,0);assert.equal(app.domEvents.get('visibilitychange').size,0);
// Cascada con datos sintéticos en memoria, sin editar el archivo del usuario.
const synthetic=structuredClone(original);synthetic.features[0].properties.departamento='Tinogasta';synthetic.features[0].properties.localidad='Fiambalá';
const cascade=boot(synthetic);cascade.map.emit('style.load');
cascade.elements.get('filter-departamento').children.find(b=>b.textContent==='Tinogasta').click();
assert(cascade.elements.get('filter-localidad').children.some(b=>b.textContent==='Fiambalá'));
assert(!cascade.elements.get('filter-localidad').children.some(b=>b.textContent==='Antapoca'));
cascade.elements.get('filter-localidad').children.find(b=>b.textContent==='Fiambalá').click();
cascade.elements.get('filter-departamento').children.find(b=>b.textContent==='Todos').click();
assert.equal(cascade.map.layers['channels-line'].filter[2][1].length,20);
// Identificadores, precisión, validación y archivo generado.
const GIS=context.GIS;
const identified=structuredClone(original);identified.features.forEach((f,i)=>f.id='original-'+i);
assert.equal(GIS.identity(identified.features).key(identified.features[0]),'original-0');
assert.equal(GIS.validate(identified).features[0].id,'original-0');
assert.deepEqual(JSON.parse(JSON.stringify(context.LOCAL_CHANNELS)),original);
assert.equal(GIS.featureMeters({properties:{longitud:null},geometry:{type:'LineString',coordinates:[[0,0],[0,.001]]}})>100,true);
assert.throws(()=>GIS.validate({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[181,0],[0,0]]}}]}));
const invalid=boot({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[]}}]});
assert(!invalid.elements.get('notice').hidden);assert(!invalid.map);
const empty=boot({type:'FeatureCollection',features:[]});empty.map.emit('style.load');assert.equal(empty.frames.size,0);
// Actualizador: validar antes de escribir y conservar los decimales del texto fuente.
const updater=fs.readFileSync(path.join(base,'actualizar-datos.cjs'),'utf8');let written='',renamed=false;
function update(input){vm.runInNewContext(updater,{__dirname:base,console:{log(){}},require:name=>name==='fs'?{readFileSync:()=>input,writeFileSync:(_p,s)=>written=s,renameSync:()=>renamed=true,existsSync:()=>false}:name==='./core.js'?GIS:require(name)});}
update('\uFEFF'+raw);assert(renamed);assert(written.includes(raw.trim()));new vm.Script(written);
written='';assert.throws(()=>update('{'));assert.equal(written,'');
for(const file of fs.readdirSync(base).filter(n=>/\.(js|cjs)$/.test(n)))new vm.Script(fs.readFileSync(path.join(base,file),'utf8'),{filename:file});
console.log('OK: datos e IDs intactos, filtros, colores, Flow, regla, selección, cambio de fondo, errores, actualización y recursos locales.');
