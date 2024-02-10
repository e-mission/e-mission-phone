function gatherData(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      let logs: string[] = [];
  
      window['bluetoothSerial'].discoverUnpaired(
        (devices) => {
          logs.push("Successfully scanned, results...");
          devices.forEach(function (device) {
            logs.push("ID: " + device.id + " Name: " + device.name);
          });
          resolve(logs);
        },
        (failure) => {
          logs.push("Failed!");
          logs.push("ERROR: " + failure);
          console.debug("ERROR: " + failure);
          reject(new Error(failure));
        }
      );
    });
}
  
  export { gatherData };