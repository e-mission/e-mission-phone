// Device data, as defined in BluetoothClassicSerial's docs
export type BluetoothClassicDevice = {
  class: number;
  id: string;
  address: string;
  name: string;
  is_paired?: boolean; // We keep track of this, because BCS doesn't
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
  major: number;
  minor: number;
  type_name?: string; // e.g., "BeaconRegion"; used for callback
};
export type BLEDeviceList = {
  [key: string]: {
    identifier: string;
    minor: number;
    major: number;
    monitorResult: string;
    rangeResult: string;
    in_range: boolean;
  };
};

export type BLEPluginCallback = {
  region: BLEBeaconDevice;
  eventType: string;
  state: string;
};
