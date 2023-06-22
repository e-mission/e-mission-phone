import React, { useEffect, useRef, useState } from "react";
import { angularize } from "../angular-react-helper";
import { object, string } from "prop-types";
import { View } from "react-native";

const mapSet = new Set();
export function invalidateMaps() {
  mapSet.forEach(map => map.invalidateSize());
}

const LeafletView = ({ geojson, opts, ...otherProps }) => {

  const mapRef = useRef(null);

  useEffect(() => {
    const map = L.map(mapRef.current, opts || {});
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
    mapSet.add(map);
  }, []);

  return (
    <View {...otherProps}>
      <style>{`
        .leaflet-bottom {
          max-width: 100%;
        }
        .leaflet-control-attribution {
          width: 100%;
          white-space: nowrap;
          z-index: 9;
        }
      `}</style>
      <div id="map" ref={mapRef} style={{width: '100%', height: '100%', zIndex: 0}}></div>
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
