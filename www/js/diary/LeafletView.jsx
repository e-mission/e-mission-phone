import React, { useEffect, useRef, useState } from "react";
import { angularize } from "../angular-react-helper";
import { object, string } from "prop-types";
import { View } from "react-native";

const LeafletView = ({ geojson, opts }) => {

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
  }, []);

  return (
    <View>
      <div id="map" ref={mapRef} style={{width: '100%', height: '100%'}}></div>
    </View>
  );
};

const pointIcon = L.divIcon({className: 'leaflet-div-icon', iconSize: [0, 0]});
const startIcon = L.divIcon({className: 'leaflet-div-icon-start', iconSize: [18, 18], html: '<div class="leaflet-div-ionicon leaflet-div-ionicon-start">★</div>'});
const stopIcon = L.divIcon({className: 'leaflet-div-icon-stop', iconSize: [18, 18], html: '<div class="leaflet-div-ionicon leaflet-div-ionicon-stop">⚑</div>'});
const pointToLayer = (feature, latlng) => {
  switch(feature.properties.feature_type) {
    case "start_place": return L.marker(latlng, {icon: startIcon});
    case "end_place": return L.marker(latlng, {icon: stopIcon});
    case "stop": return L.circleMarker(latlng);
    case "location": return L.marker(latlng, {icon: pointIcon});
    default: alert("Found unknown type in feature"  + feature); return L.marker(latlng)
  }
};

LeafletView.propTypes = {
  geojson: object,
  opts: object
}

angularize(LeafletView, 'emission.main.diary.button');
export default LeafletView;
