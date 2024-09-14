import { removeDup, combinedPromises } from '../js/services/unifiedDataLoader';
import { LocalDt, BEMData } from '../js/types/serverData';

const testOne: BEMData<any> = {
  data: '',
  metadata: {
    key: '',
    platform: '',
    write_ts: 1, // the only value checked by removeDup
    time_zone: '',
    write_fmt_time: '',
    write_local_dt: {} as LocalDt,
  },
};

const testTwo = JSON.parse(JSON.stringify(testOne));
testTwo.metadata.write_ts = 2;
const testThree = JSON.parse(JSON.stringify(testOne));
testThree.metadata.write_ts = 3;
const testFour = JSON.parse(JSON.stringify(testOne));
testFour.metadata.write_ts = 4;

describe('removeDup can', () => {
  it('work with an empty array', () => {
    expect(removeDup([])).toEqual([]);
  });

  it('work with an array of len 1', () => {
    expect(removeDup([testOne])).toEqual([testOne]);
  });

  it('work with an array of len >=1', () => {
    expect(removeDup([testOne, testTwo])).toEqual([testOne, testTwo]);
    expect(removeDup([testOne, testOne])).toEqual([testOne]);
    expect(removeDup([testOne, testTwo, testThree])).toEqual([testOne, testTwo, testThree]);
    expect(removeDup([testOne, testOne, testThree])).toEqual([testOne, testThree]);
    expect(removeDup([testOne, testOne, testOne])).toEqual([testOne]);
  });
});

// combinedPromises tests
const promiseGenerator = (values: Array<BEMData<any>>) => {
  return Promise.resolve(values);
};
const badPromiseGenerator = (input: string) => {
  return Promise.reject(input);
};

it('throws an error on an empty input', async () => {
  expect(() => {
    combinedPromises([], removeDup);
  }).toThrow();
});

it('catches when all promises fails', async () => {
  expect(combinedPromises([badPromiseGenerator('')], removeDup)).rejects.toEqual(['']);
  expect(
    combinedPromises([badPromiseGenerator('bad'), badPromiseGenerator('promise')], removeDup),
  ).rejects.toEqual(['bad', 'promise']);
  expect(
    combinedPromises(
      [badPromiseGenerator('very'), badPromiseGenerator('bad'), badPromiseGenerator('promise')],
      removeDup,
    ),
  ).rejects.toEqual(['very', 'bad', 'promise']);

  expect(
    combinedPromises([badPromiseGenerator('bad'), promiseGenerator([testOne])], removeDup),
  ).resolves.toEqual([testOne]);
  expect(
    combinedPromises([promiseGenerator([testOne]), badPromiseGenerator('bad')], removeDup),
  ).resolves.toEqual([testOne]);
});

it('work with arrays of len 1', async () => {
  const promiseArrayOne = [promiseGenerator([testOne])];
  const promiseArrayTwo = [promiseGenerator([testOne, testTwo])];
  const testResultOne = await combinedPromises(promiseArrayOne, removeDup);
  const testResultTwo = await combinedPromises(promiseArrayTwo, removeDup);

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

  const testResultOne = await combinedPromises(promiseArrayOne, removeDup);
  const testResultTwo = await combinedPromises(promiseArrayTwo, removeDup);
  const testResultThree = await combinedPromises(promiseArrayThree, removeDup);
  const testResultFour = await combinedPromises(promiseArrayFour, removeDup);
  const testResultFive = await combinedPromises(promiseArrayFive, removeDup);

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

  const testResultOne = await combinedPromises(promiseArrayOne, removeDup);
  const testResultTwo = await combinedPromises(promiseArrayTwo, removeDup);
  const testResultThree = await combinedPromises(promiseArrayThree, removeDup);
  const testResultFour = await combinedPromises(promiseArrayFour, removeDup);

  expect(testResultOne).toEqual([testOne, testTwo, testThree]);
  expect(testResultTwo).toEqual([testOne, testTwo]);
  expect(testResultThree).toEqual([testOne, testTwo, testThree, testFour]);
  expect(testResultFour).toEqual([testOne, testTwo, testThree, testFour]);
});

/*
  TO-DO: Once getRawEnteries can be tested via end-to-end testing, we will be able to 
  test getUnifiedDataForInterval as well. 
*/
