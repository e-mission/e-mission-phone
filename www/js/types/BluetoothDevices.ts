// Device data, as defined in BluetoothClassicSerial's docs
export type BluetoothClassicDevice = {
  class: number;
  id: string;
  address: string;
  name: string;
  is_paired?: boolean;
};

/* Config File containg BLEBeaconData, mapped in the format
 * UID_KEY: {Device_Info}
 *
 * This is set up for how a JSON file would store this data; we
 * will most likely change this later on!
 */

export type BLEBeaconDevice = {
  identifier: string;
  uuid: string;
  broadcast_type: string;
  major: string;
  minor: string;
};
