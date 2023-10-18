import { mockLogger } from "../__mocks__/globalMocks";
import { createWriteFile } from "../js/controlHelper";
import { fsWindow } from "../js/types/fileIOTypes"

mockLogger();
declare let window: fsWindow;

// See PR 1052 for a detailed interface
interface dataObj {
  data: {
    name: string, 
    ts: number,
    reading: number
  },
  metadata: any, 
  user_id: {
    $uuid: string
  },
  _id: {
    $oid: string
  }
}

// createWriteFile does not require these objects specifically, but it
// is better to test with similar data - using real data would take
// up too much code space, and we cannot use getRawEnteries() in testing
const generateFakeValues = (arraySize: number) => {
  if (arraySize <= 0) 
    return new Promise (() => {return []});
  const sampleDataObj = {
    data: {
      name: 'MODE', 
      ts: 1234567890.9876543,
      reading: 0.1234567891011121,
    },
    metadata: 'testValue #',
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
    values[index].metadata = element.metadata + index.toString()
  });
  
  return new Promise(() => {
    return { phone_data: values };
  });
};

// A variation of createShareData; confirms the file has been written,
// without sharing the data. 
const confirmFileExists = (fileName: string) => {
  return function() {
    return new Promise(function() {
      window.requestFileSystem(window.LocalFileSystem.TEMPORARY, 0, function(fs) {
        fs.root.getFile(fileName, null, function(fileEntry) {
          return fileEntry.isFile;
        });
      });
    });
  };
};

it('writes a file for an array of objects', async () => {
  const testPromiseOne = generateFakeValues(1);
  const testPromiseTwo=  generateFakeValues(222);
  const writeFile = createWriteFile('test_one.temp');
  
  expect(testPromiseOne.then(writeFile)).resolves.not.toThrow();
  expect(testPromiseTwo.then(writeFile)).resolves.not.toThrow();
});

it('correctly writes the files', async () => {
  const fileName = 'test_two.timeline'
  const fileExists = confirmFileExists(fileName);
  const testPromise = generateFakeValues(1);
  const writeFile = createWriteFile(fileName);
  expect(testPromise.then(writeFile).then(fileExists)).resolves.not.toThrow();
  expect(testPromise.then(writeFile).then(fileExists)).resolves.toEqual(true);
});

it('rejects an empty input', async () => {
  const writeFile = createWriteFile('test_one.temp');
  const testPromise = generateFakeValues(0);
    expect(testPromise.then(writeFile)).rejects.toThrow();
});

/*
  createShareData() is not tested, because it relies on the phoneGap social 
  sharing plugin, which cannot be mocked.

  getMyData relies on createShareData, and likewise cannot be tested - it also
  relies on getRawEnteries().
*/
