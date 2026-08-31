import { buildOsmMapHtml } from './osmMapHtml';

const html = buildOsmMapHtml({
  latitude: 12.9352,
  longitude: 77.6245,
  interactive: true,
  pinColor: '#E07A3D',
});

if (!html.includes('tile.openstreetmap.org/{z}/{x}/{y}.png')) {
  throw new Error('OSM raster tiles missing from map HTML');
}
if (!html.includes('© OpenStreetMap')) {
  throw new Error('OSM attribution missing');
}
if (html.includes('demotiles.maplibre.org')) {
  throw new Error('demo tiles must not be the default');
}
if (!html.includes('draggable: true')) {
  throw new Error('interactive pin must be draggable');
}

const custom = buildOsmMapHtml({
  latitude: 12.9,
  longitude: 77.6,
  styleUrl: 'https://demotiles.maplibre.org/style.json',
});
if (custom.includes('demotiles.maplibre.org')) {
  throw new Error('demo style URL must be ignored in favour of OSM');
}

console.log('osmMapHtml OK');
