import React, { useEffect, useRef, useState } from "react";
import { angularize } from "../angular-react-helper";
import { object, string } from "prop-types";
import { View } from "react-native";

const mapSet = new Set();
export function invalidateMaps() {
  mapSet.forEach(map => map.invalidateSize());
}

const LeafletView = ({ geojson, opts, ...otherProps }) => {

  const mapElRef = useRef(null);
  const leafletMapRef = useRef(null);
  const geoJsonIdRef = useRef(null);

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
    const map = L.map(mapElRef.current, opts || {});
    initMap(map);
  }, []);

  /* If the geojson is different between renders, we need to recreate the map
    (happens because of FlashList's view recycling on the trip cards:
      https://shopify.github.io/flash-list/docs/recycling) */
  if (geoJsonIdRef.current && geoJsonIdRef.current !== geojson.data.id) {
    console.debug('leafletMapRef changed, invalidating map', geoJsonIdRef.current, geojson.data.id);
    leafletMapRef.current.eachLayer(layer => leafletMapRef.current.removeLayer(layer));
    initMap(leafletMapRef.current);
  }

  return (
    <View {...otherProps}>
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
      `}</style>
      <div id="map" ref={mapElRef} data-tap-disabled="true"
            style={{width: '100%', height: '100%', zIndex: 0}}></div>
    </View>
  );
};

const startIcon = L.divIcon({className: 'leaflet-div-icon-start', iconSize: [18, 18], html: '<div class="leaflet-div-ionicon leaflet-div-ionicon-start">★</div>'});
const stopIcon = L.divIcon({className: 'leaflet-div-icon-stop', iconSize: [18, 18], html: '<div class="leaflet-div-ionicon leaflet-div-ionicon-stop">⚑</div>'});
const pointToLayer = (feature, latlng) => {
  switch(feature.properties.feature_type) {
    case "start_place": return L.marker(latlng, {icon: startIcon});
    case "end_place": return L.marker(latlng, {icon: stopIcon});
    // case "stop": return L.circleMarker(latlng);
    default: alert("Found unknown type in feature"  + feature); return L.marker(latlng)
  }
};

LeafletView.propTypes = {
  geojson: object,
  opts: object
}

angularize(LeafletView, 'LeafletView', 'emission.main.leaflet');
export default LeafletView;
