import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useTheme } from "react-native-paper";
import L from "leaflet";

const mapSet = new Set<any>();
export function invalidateMaps() {
  mapSet.forEach(map => map.invalidateSize());
}

const LeafletView = ({ geojson, opts, ...otherProps }) => {

  const mapElRef = useRef(null);
  const leafletMapRef = useRef(null);
  const geoJsonIdRef = useRef(null);
  const { colors } = useTheme();

  function initMap(map) {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      opacity: 1,
      detectRetina: true,
    }).addTo(map);
    const gj = L.geoJson(geojson.data, {
      pointToLayer: pointToLayer,
      style: (feature) => feature.style
    }).addTo(map);
    const gjBounds = gj.getBounds().pad(0.2);
    map.fitBounds(gjBounds);
    geoJsonIdRef.current = geojson.data.id;
    leafletMapRef.current = map;
    mapSet.add(map);
  }

  useEffect(() => {
    // if a Leaflet map already exists (because we are re-rendering), remove it before creating a new one
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      mapSet.delete(leafletMapRef.current);
    }
    const map = L.map(mapElRef.current, opts || {});
    initMap(map);
  }, [geojson]);

  /* If the geojson is different between renders, we need to recreate the map
    (happens because of FlashList's view recycling on the trip cards:
      https://shopify.github.io/flash-list/docs/recycling) */
  if (geoJsonIdRef.current && geoJsonIdRef.current !== geojson.data.id) {
    leafletMapRef.current.eachLayer(layer => leafletMapRef.current.removeLayer(layer));
    initMap(leafletMapRef.current);
  }

  // non-alphanumeric characters are not safe for element IDs
  const mapElId = `map-${geojson.data.id.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View {...otherProps} role='img' aria-label='Map'>
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
          content: "󱘈"; ${/* glyph for 'map-marker-star' from https://pictogrammers.com/library/mdi/icon/map-marker-star/*/''}
        }
        #${mapElId} .leaflet-div-icon-stop::after {
          font-family: MaterialCommunityIcons;
          content: "󰈻"; ${/* glyph for 'flag' from https://pictogrammers.com/library/mdi/icon/flag/ */''}
        }
      `}</style>
      <div id={mapElId} ref={mapElRef} data-tap-disabled="true" aria-hidden={true}
            style={{width: '100%', height: '100%', zIndex: 0}}></div>
    </View>
  );
};

const startIcon = L.divIcon({className: 'leaflet-div-icon-start', iconSize: [18, 18]});
const stopIcon = L.divIcon({className: 'leaflet-div-icon-stop', iconSize: [18, 18]});

  const pointToLayer = (feature, latlng) => {
  switch(feature.properties.feature_type) {
    case "start_place": return L.marker(latlng, {icon: startIcon});
    case "end_place": return L.marker(latlng, {icon: stopIcon});
    // case "stop": return L.circleMarker(latlng);
    default: alert("Found unknown type in feature"  + feature); return L.marker(latlng)
  }
};

export default LeafletView;
