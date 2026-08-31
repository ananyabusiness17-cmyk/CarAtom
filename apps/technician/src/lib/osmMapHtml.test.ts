import { buildOsmMapHtml } from './osmMapHtml';

const html = buildOsmMapHtml({ latitude: 12.9352, longitude: 77.6245 });
if (!html.includes('tile.openstreetmap.org/{z}/{x}/{y}.png')) {
  throw new Error('OSM raster tiles missing from technician map HTML');
}
if (!html.includes('© OpenStreetMap')) {
  throw new Error('OSM attribution missing');
}
console.log('technician osmMapHtml OK');
