/* We have to put a wrapper around the QRCode component to anglarize it.
Once the parent components, anyplace this is used, are converted to React,
we can remove this wrapper and just use the QRCode component directly */

import React from "react";
import { angularize } from "../angular-react-helper";
import { string } from "prop-types";
import QRCode from "react-qr-code";

const QrCode = ({ value }) => {
  return <QRCode value={value} style={{ width: '100%', height: '100%' }} />;
};

QrCode.propTypes = {
  value: string,
}

angularize(QrCode, 'emission.main.qrcode');
export default QrCode;
