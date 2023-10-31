import { mockLogger } from '../__mocks__/globalMocks';
import { combineWithDedup, combinedPromises } from '../js/services/unifiedDataLoader';
import { ServerData } from '../js/types/serverData';

mockLogger();

const testOne: ServerData<any> = {
  data: '',
  metadata: {
    key: '',
    platform: '',
    write_ts: 1, // the only value checked by combineWithDedup
    time_zone: '',
    write_fmt_time: '',
    write_local_dt: null,
  },
};

const testTwo = JSON.parse(JSON.stringify(testOne));
testTwo.metadata.write_ts = 2;
const testThree = JSON.parse(JSON.stringify(testOne));
testThree.metadata.write_ts = 3;
const testFour = JSON.parse(JSON.stringify(testOne));
testFour.metadata.write_ts = 4;

describe('combineWithDedup can', () => {
  it('work with empty arrays', () => {
    expect(combineWithDedup([], [])).toEqual([]);
    expect(combineWithDedup([], [testOne])).toEqual([testOne]);
    expect(combineWithDedup([testOne, testTwo], [])).toEqual([testOne, testTwo]);
  });
  it('work with arrays of len 1', () => {
    expect(combineWithDedup([testOne], [testOne])).toEqual([testOne]);
    expect(combineWithDedup([testOne], [testTwo])).toEqual([testOne, testTwo]);
  });
  it('work with arrays of len > 1', () => {
    expect(combineWithDedup([testOne], [testOne, testTwo])).toEqual([testOne, testTwo]);
    expect(combineWithDedup([testOne], [testTwo, testTwo])).toEqual([testOne, testTwo]);
    expect(combineWithDedup([testOne, testTwo], [testTwo, testTwo])).toEqual([testOne, testTwo]);
    expect(combineWithDedup([testOne, testTwo, testThree], [testOne, testTwo])).toEqual([
      testOne,
      testTwo,
      testThree,
    ]);
  });
});

// combinedPromises tests
const promiseGenerator = (values: Array<ServerData<any>>) => {
  return Promise.resolve(values);
};
const badPromiseGenerator = (input: string) => {
  return Promise.reject(input);
}

it('throws an error on an empty input', async () => {
  expect(() => {
    combinedPromises([], combineWithDedup);
  }).toThrow();
});

it('catches when all promises fails', async () => {
  expect(combinedPromises([badPromiseGenerator('')], combineWithDedup)).rejects.toEqual(['']);
  expect(combinedPromises([badPromiseGenerator('bad'), badPromiseGenerator('promise')], combineWithDedup)).rejects.toEqual(['bad','promise']);
  expect(combinedPromises([badPromiseGenerator('very'), badPromiseGenerator('bad'), badPromiseGenerator('promise')], combineWithDedup)).rejects.toEqual(['very','bad','promise']);

  expect(combinedPromises([badPromiseGenerator('bad'), promiseGenerator([testOne])], combineWithDedup)).resolves.toEqual([testOne]);
  expect(combinedPromises([promiseGenerator([testOne]), badPromiseGenerator('bad')], combineWithDedup)).resolves.toEqual([testOne]);
});

it('work with arrays of len 1', async () => {
  const promiseArrayOne = [promiseGenerator([testOne])];
  const promiseArrayTwo = [promiseGenerator([testOne, testTwo])];
  const testResultOne = await combinedPromises(promiseArrayOne, combineWithDedup);
  const testResultTwo = await combinedPromises(promiseArrayTwo, combineWithDedup);

  expect(testResultOne).toEqual([testOne]);
  expect(testResultTwo).toEqual([testOne, testTwo]);
});

it('works with arrays of len 2', async () => {
  const promiseArrayOne = [promiseGenerator([testOne]), promiseGenerator([testTwo])];
  const promiseArrayTwo = [promiseGenerator([testOne, testTwo]), promiseGenerator([testThree])];
  const promiseArrayThree = [promiseGenerator([testOne]), promiseGenerator([testTwo, testThree])];
  const promiseArrayFour = [
    promiseGenerator([testOne, testTwo]),
    promiseGenerator([testThree, testFour]),
  ];
  const promiseArrayFive = [
    promiseGenerator([testOne, testTwo]),
    promiseGenerator([testTwo, testThree]),
  ];

  const testResultOne = await combinedPromises(promiseArrayOne, combineWithDedup);
  const testResultTwo = await combinedPromises(promiseArrayTwo, combineWithDedup);
  const testResultThree = await combinedPromises(promiseArrayThree, combineWithDedup);
  const testResultFour = await combinedPromises(promiseArrayFour, combineWithDedup);
  const testResultFive = await combinedPromises(promiseArrayFive, combineWithDedup);

  expect(testResultOne).toEqual([testOne, testTwo]);
  expect(testResultTwo).toEqual([testOne, testTwo, testThree]);
  expect(testResultThree).toEqual([testOne, testTwo, testThree]);
  expect(testResultFour).toEqual([testOne, testTwo, testThree, testFour]);
  expect(testResultFive).toEqual([testOne, testTwo, testThree]);
});

it('works with arrays of len >= 2', async () => {
  const promiseArrayOne = [
    promiseGenerator([testOne]),
    promiseGenerator([testTwo]),
    promiseGenerator([testThree]),
  ];
  const promiseArrayTwo = [
    promiseGenerator([testOne]),
    promiseGenerator([testTwo]),
    promiseGenerator([testTwo]),
  ];
  const promiseArrayThree = [
    promiseGenerator([testOne]),
    promiseGenerator([testTwo]),
    promiseGenerator([testThree, testFour]),
  ];
  const promiseArrayFour = [
    promiseGenerator([testOne]),
    promiseGenerator([testTwo, testThree]),
    promiseGenerator([testFour]),
  ];

  const testResultOne = await combinedPromises(promiseArrayOne, combineWithDedup);
  const testResultTwo = await combinedPromises(promiseArrayTwo, combineWithDedup);
  const testResultThree = await combinedPromises(promiseArrayThree, combineWithDedup);
  const testResultFour = await combinedPromises(promiseArrayFour, combineWithDedup);

  expect(testResultOne).toEqual([testOne, testTwo, testThree]);
  expect(testResultTwo).toEqual([testOne, testTwo]);
  expect(testResultThree).toEqual([testOne, testTwo, testThree, testFour]);
  expect(testResultFour).toEqual([testOne, testTwo, testThree, testFour]);
});

/*
  TO-DO: Once getRawEnteries can be tested via end-to-end testing, we will be able to 
  test getUnifiedDataForInterval as well. 
*/
