import { mockLogger } from "../__mocks__/globalMocks";
import { mockFileSystem } from "../__mocks__/fileSystemMocks";
import { mockDevice, mockCordova, mockFile } from "../__mocks__/cordovaMocks";

import { getMyDataHelpers } from "../js/services/controlHelper";
import { FsWindow } from "../js/types/fileShareTypes"
import { ServerData, ServerResponse} from "../js/types/serverData"

mockDevice();
mockCordova();
mockFile();
mockFileSystem();
mockLogger();
declare let window: FsWindow;

// Test constants:
const fileName = 'testOne'
const startTime = '1969-06-16'
const endTime = '1969-06-24'
const getDataMethodsOne = getMyDataHelpers(fileName, startTime, endTime);
const writeFile = getDataMethodsOne.writeFile;

// createWriteFile does not require these objects specifically, but it
// is better to test with similar data - using real data would take
// up too much code space, and we cannot use getRawEnteries() in testing
const generateFakeValues = (arraySize: number) => {
  if (arraySize <= 0) 
    return Promise.reject();

  const sampleDataObj : ServerData<any>= {
    data: {
      name: 'testValue #', 
      ts: 1234567890.9876543,
      reading: 0.1234567891011121,
    },
    metadata: {
      key: 'MyKey/test',
      platform: 'dev_testing', 
      time_zone: 'America/Los_Angeles', 
      write_fmt_time: '2023-04-14T00:09:10.80023-07:00',
      write_local_dt: {
        minute: 1,
        hour: 2,
        second: 3,
        day: 4,
        weekday: 5,
        month: 6,
        year: 7,
        timezone: 'America/Los_Angeles',
      },
      write_ts: 12345.6789,
    },
    user_id: {
      $uuid: '41t0l8e00s914tval1234567u9658699',
    },
    _id: {
      $oid: '12341x123afe3fbf541524d8',
    }
  };

  // The parse/stringify lets us "deep copy" the objects, to quickly populate/change the data
  let values = Array.from({length: arraySize}, e => JSON.parse(JSON.stringify(sampleDataObj)));
  values.forEach((element, index) => {
    values[index].data.name = element.data.name + index.toString()
  });
  return Promise.resolve({ phone_data: values });
};

// A variation of createShareData; confirms the file has been written,
// without calling the sharing components
const confirmFileExists = (fileName: string, dataCluster: ServerResponse<any>) => {
  return function() {
    return new Promise(function() {
      window.requestFileSystem(window.LocalFileSystem.TEMPORARY, 0, function(fs) {
        fs.root.getFile(fileName, null, function(fileEntry) {
          if (!fileEntry.isFile)
            return fileEntry.isFile;
          const reader = new FileReader();
          reader.onloadend = function () {
            const readResult = this.result as string;
            const expectedResult = JSON.stringify(dataCluster);
            return (readResult === expectedResult);
          }
        });
      });
    });
  };
};

it('writes a file for an array of objects', async () => {
  const testPromiseOne = generateFakeValues(1);
  const testPromiseTwo =  generateFakeValues(2222);
  expect(testPromiseOne.then(writeFile)).resolves.not.toThrow();
  expect(testPromiseTwo.then(writeFile)).resolves.not.toThrow();
});

