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

const startIcon = L.divIcon({className: 'leaflet-div-icon-start', iconSize: [18, 18], 
  html: '<svg class="div-icon-start" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9C5 14.2 12 22 12 22S19 14.2 19 9C19 5.1 15.9 2 12 2M14.5 13L12 11.5L9.5 13L10.2 10.2L8 8.3L10.9 8.1L12 5.4L13.1 8L16 8.3L13.8 10.2L14.5 13Z" /></svg>'});
const stopIcon = L.divIcon({className: 'leaflet-div-icon-stop', iconSize: [18, 18], 
  html: '<svg class="div-icon-stop" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.4,6L14,4H5V21H7V14H12.6L13,16H20V6H14.4Z" /></svg>'});

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
