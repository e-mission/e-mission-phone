import { mockLogger } from "../__mocks__/globalMocks";
import { createWriteFile } from "../js/controlHelper";

mockLogger();

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

// These are fake values; createWriteFile does not require these objects
// specifically, but it is better to test with similar data - using real data 
// would take up too much code space, and we cannot use getRawEnteries() in testing
const generateDummyValues = (arraySize: number) => {
  const sampleDataObj = {
    data: {
      name: 'MODE', 
      ts: 1234567890.9876543,
      reading: 0.1234567891011121
    },
    metadata: 'testValue #',
    user_id: {
      $uuid: '41t0l8e00s914tval1234567u9658699'
    },
    _id: {
      $oid: '12341x123afe3fbf541524d8'
    }
  };
  // The parse/stringify lets us "deep copy" the objects, to quickly populate/change the data
  let values = Array.from({length: arraySize}, e => JSON.parse(JSON.stringify(sampleDataObj)));
  values.forEach((element, index) => {
    values[index].metadata = element.metadata + index.toString()
  });
  
  return values;
};

it(`writes a file for an array of objects`, async () => {
  const testPhoneObj = { phone_data: generateDummyValues(100) };
  const writeFile = createWriteFile('testFile.temp');
  const testPromise = new Promise(() => {
    return testPhoneObj;
  });
  expect(testPromise.then(writeFile)).resolves.not.toThrow();
});
