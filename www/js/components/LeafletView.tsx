import React, { useEffect, useMemo, useRef } from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';
import L, { Map as LeafletMap } from 'leaflet';
import { GeoJSONData, GeoJSONStyledFeature } from '../types/diaryTypes';
import useLeafletCache from './useLeafletCache';

// styles for Leaflet
import 'leaflet/dist/leaflet.css';

const mapSet = new Set<any>();

// open the URL in the system browser & prevent any other effects of the click event
window['launchURL'] = (url, event) => {
  window['cordova'].InAppBrowser.open(url, '_system');
  event.stopPropagation();
  return false;
};
const osmURL = 'http://www.openstreetmap.org/copyright';
const leafletURL = 'https://leafletjs.com';

export function invalidateMaps() {
  mapSet.forEach((map) => map.invalidateSize());
}

type Props = ViewProps & {
  geojson: GeoJSONData;
  opts?: L.MapOptions;
  downscaleTiles?: boolean;
  cacheHtml?: boolean;
};
const LeafletView = ({ geojson, opts, downscaleTiles, cacheHtml, ...otherProps }: Props) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const geoJsonIdRef = useRef<string | null>(null);
  const { colors } = useTheme();
  const leafletCache = useLeafletCache();

  // unique ID for map element, like "map-5f3e3b" or "map-5f3e3b-downscaled"
  const mapElId = useMemo(() => {
    let id = 'map-';
    // non-alphanumeric characters are not safe for element IDs
    id += geojson.data.id.replace(/[^a-zA-Z0-9]/g, '');
    if (downscaleTiles) id += '-downscaled';
    return id;
  }, [geojson.data.id, downscaleTiles]);

  function initMap(map: LeafletMap) {
    map.attributionControl?.setPrefix(
      `<a href="#" onClick="launchURL('${leafletURL}', event)">Leaflet</a>`,
    );
    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: `&copy; <a href="#" onClick="launchURL('${osmURL}', event)">OpenStreetMap</a>`,
      opacity: 1,
      detectRetina: !downscaleTiles,
    }).addTo(map);
    const gj = L.geoJson(geojson.data, {
      pointToLayer: pointToLayer,
      style: (feature) => (feature as GeoJSONStyledFeature)?.style || {},
    }).addTo(map);
    const gjBounds = gj.getBounds().pad(0.2);
    map.fitBounds(gjBounds);
    geoJsonIdRef.current = geojson.data.id;
    leafletMapRef.current = map;
    mapSet.add(map);
    return tileLayer;
  }

  useEffect(() => {
    // if a Leaflet map is cached, there is no need to create the map again
    if (cacheHtml && leafletCache.has(mapElId)) return;
    // if a Leaflet map already exists (because we are re-rendering), remove it before creating a new one
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      mapSet.delete(leafletMapRef.current);
    }
    if (!mapElRef.current) return;
    const map = L.map(mapElRef.current, opts || {});
    const tileLayer = initMap(map);

    if (cacheHtml) {
      new Promise((resolve) => tileLayer.on('load', resolve)).then(() => {
        // After a Leaflet map is rendered, cache the map to reduce the cost for creating a map
        const mapHTMLElements = document.getElementById(mapElId);
        leafletCache.set(mapElId, mapHTMLElements?.innerHTML);
      });
    }
  }, [geojson, cacheHtml]);

  /* If the geojson is different between renders, we need to recreate the map
    (happens because of FlashList's view recycling on the trip cards:
      https://shopify.github.io/flash-list/docs/recycling) */
  if (
    !leafletCache.has(mapElId) &&
    geoJsonIdRef.current &&
    geoJsonIdRef.current !== geojson.data.id &&
    leafletMapRef.current
  ) {
    leafletMapRef.current.eachLayer((layer) => leafletMapRef.current?.removeLayer(layer));
    initMap(leafletMapRef.current);
  }

  return (
    <View {...otherProps} role="img" aria-label="Map">
      <style>{`
        .leaflet-bottom {
          max-width: 100%;
        }
        .leaflet-pane {
          z-index: -1;
        }
       .leaflet-control-attribution {
          width: 100%;
          white-space: nowrap;
          z-index: 9;
        }
        #${mapElId} .leaflet-div-icon-start, #${mapElId} .leaflet-div-icon-stop {
          box-sizing: border-box;
          border: 2px solid ${colors.primary};
          border-radius: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        #${mapElId} .leaflet-div-icon-start {
          color: ${colors.onPrimary};
          background-color: ${colors.primary};
        }
        #${mapElId} .leaflet-div-icon-stop {
          color: ${colors.primary};
          background-color: ${colors.onPrimary};
        }
        #${mapElId} .leaflet-div-icon-start::after {
          font-family: MaterialCommunityIcons;
          content: "󱘈"; ${
            /* glyph for 'map-marker-star' from https://pictogrammers.com/library/mdi/icon/map-marker-star/*/ ''
          }
        }
        #${mapElId} .leaflet-div-icon-stop::after {
          font-family: MaterialCommunityIcons;
          content: "󰈻"; ${
            /* glyph for 'flag' from https://pictogrammers.com/library/mdi/icon/flag/ */ ''
          }
        }
        .leaflet-tile-loaded {
          opacity: 1 !important;
        }
      `}</style>

      <div
        id={mapElId}
        ref={mapElRef}
        data-tap-disabled="true"
        aria-hidden={true}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
        dangerouslySetInnerHTML={
          /* this is not 'dangerous' here because the content is not user-generated;
          it's just an HTML string that we cached from a previous render */
          cacheHtml && leafletCache?.has(mapElId)
            ? { __html: leafletCache.get(mapElId) }
            : undefined
        }
      />
    </View>
  );
};

const startIcon = L.divIcon({ className: 'leaflet-div-icon-start', iconSize: [18, 18] });
const stopIcon = L.divIcon({ className: 'leaflet-div-icon-stop', iconSize: [18, 18] });

function pointToLayer(feature, latlng) {
  switch (feature.properties.feature_type) {
    case 'start_place':
      return L.marker(latlng, { icon: startIcon });
    case 'end_place':
      return L.marker(latlng, { icon: stopIcon });
    // case "stop": return L.circleMarker(latlng);
    default:
      alert('Found unknown type in feature' + feature);
      return L.marker(latlng);
  }
}

export default LeafletView;
