/* We have to put a wrapper around the QRCode component to anglarize it.
Once the parent components, anyplace this is used, are converted to React,
we can remove this wrapper and just use the QRCode component directly */

import React from 'react';
import QRCode from 'react-qr-code';
import { logDebug, logWarn } from '../plugin/logger';
import packageJsonBuild from '../../../package.cordovabuild.json';

const URL_SCHEME = packageJsonBuild.cordova.plugins['cordova-plugin-customurlscheme'].URL_SCHEME;

export function shareQR(message) {
  /*code adapted from demo of react-qr-code*/
  const svg = document.querySelector('.qr-code');
  if (!svg) return logWarn('No QR code found to share');
  const svgData = new XMLSerializer().serializeToString(svg);
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const pngFile = canvas.toDataURL('image/png');

    const prepopulateQRMessage = {};
    prepopulateQRMessage['files'] = [pngFile];
    prepopulateQRMessage['url'] = message;
    prepopulateQRMessage['message'] = message; //text saved to files with image!

    window['plugins'].socialsharing.shareWithOptions(
      prepopulateQRMessage,
      (result) => {
        // On Android apps mostly return completed=false even while it's true
        // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        logDebug(`socialsharing: share completed? ' + ${result.completed}; 
          shared to app: ${result.app}`);
      },
      (msg) => {
        logWarn('socialsharing: failed with message: ' + msg);
      },
    );
  };
  img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
}

const QrCode = ({ value, ...rest }) => {
  let hasLink = value.toString().includes('//');
  if (!hasLink) {
    value = `${URL_SCHEME}://login_token?token=${value}`;
  }

  return (
    <QRCode
      className="qr-code"
      value={value}
      style={[{ width: '100%', height: '100%' }, rest.style] as any}
      {...rest}
    />
  );
};

export default QrCode;
