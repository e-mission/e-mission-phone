// Device data, as defined in BluetoothClassicSerial's docs
export type BluetoothClassicDevice = {
  class: number;
  id: string;
  address: string;
  name: string;
  is_paired?: boolean; // We keep track of this, BCS doesn't
};
