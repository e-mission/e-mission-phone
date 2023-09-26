/* We have to put a wrapper around the QRCode component to anglarize it.
Once the parent components, anyplace this is used, are converted to React,
we can remove this wrapper and just use the QRCode component directly */

import React from "react";
import QRCode from "react-qr-code";

export function shareQR(message) {
  /*code adapted from demo of react-qr-code*/
  const svg = document.querySelector(".qr-code");
  const svgData = new XMLSerializer().serializeToString(svg);
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const pngFile = canvas.toDataURL("image/png");

    var prepopulateQRMessage = {};
    prepopulateQRMessage['files'] = [pngFile];
    prepopulateQRMessage['url'] = message;
    prepopulateQRMessage['message'] = message; //text saved to files with image!

    window['plugins'].socialsharing.shareWithOptions(prepopulateQRMessage, function (result) {
      console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
      console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    }, function (msg) {
      console.log("Sharing failed with message: " + msg);
    });
  }
  img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
}

const QrCode = ({ value, ...rest }) => {
  return <QRCode className="qr-code" value={value} style={[{ width: '100%', height: '100%' }, rest.style] as any} {...rest} />;
};

export default QrCode;
