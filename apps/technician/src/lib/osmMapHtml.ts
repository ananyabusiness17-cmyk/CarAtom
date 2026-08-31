const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEMO_STYLE = 'demotiles.maplibre.org';

/** Hosts the OSM/MapLibre WebView is allowed to load. Keep in sync with customer MapLibreView. */
export const OSM_WEBVIEW_ORIGINS = [
  'about:blank',
  'about:srcdoc',
  'https://tile.openstreetmap.org',
  'https://*.tile.openstreetmap.org',
  'https://*.openstreetmap.org',
  'https://unpkg.com',
  'https://*.unpkg.com',
  'https://demotiles.maplibre.org',
  'https://*.maplibre.org',
];

export function buildOsmMapHtml({
  latitude,
  longitude,
  pinColor = '#176B9E',
  styleUrl,
}: {
  latitude: number;
  longitude: number;
  pinColor?: string;
  styleUrl?: string;
}): string {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const color = pinColor.replace(/[^#A-Fa-f0-9]/g, '') || '#176B9E';
  const custom =
    styleUrl && styleUrl.trim() && !styleUrl.includes(DEMO_STYLE)
      ? styleUrl.replace(/"/g, '')
      : '';
  const styleExpr = custom
    ? `"${custom}"`
    : `{version:8,sources:{osm:{type:'raster',tiles:['${OSM_TILE_URL}'],tileSize:256,attribution:'© OpenStreetMap'}},layers:[{id:'osm',type:'raster',source:'osm'}]}`;

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<style>
  html,body,#map{margin:0;height:100%;background:#F1F6F9}
  .osm-attr{position:absolute;right:6px;bottom:4px;z-index:10;font:10px/1.3 -apple-system,sans-serif;color:#334155;background:rgba(255,255,255,.88);padding:2px 6px;border-radius:4px;pointer-events:none}
</style>
</head><body>
<div id="map"></div>
<div class="osm-attr">© OpenStreetMap</div>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script>
  const map = new maplibregl.Map({
    container: 'map',
    style: ${styleExpr},
    center: [${lng}, ${lat}],
    zoom: 14,
    attributionControl: false
  });
  const marker = new maplibregl.Marker({ color: '${color}' }).setLngLat([${lng}, ${lat}]).addTo(map);
  window.__setPin = function(nextLat, nextLng) {
    marker.setLngLat([nextLng, nextLat]);
    map.setCenter([nextLng, nextLat]);
  };
</script>
</body></html>`;
}
