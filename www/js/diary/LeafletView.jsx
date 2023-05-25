import React from "react";
import { angularize } from "../angular-react-helper";
import { string } from "prop-types";
import { WebView } from 'react-native-web-webview';

const html = `<h1>Hello world!</h1>`;
// const html = `<div id="map"></div>`;
const js = `var map = L.map('map').setView([51.505, -0.09], 13);`;

const LeafletView = ({ text }) => {

  return (
      <WebView
        source={{html}} style={{ flex: 1 }}
      />
  );
};

LeafletView.propTypes = {
  text: string
}

angularize(LeafletView, 'emission.main.diary.button');
export default LeafletView;
