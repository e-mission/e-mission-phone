import { getMet } from '../js/metrics/metHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import fakeLabels from '../__mocks__/fakeLabels.json';
import { getConfig } from '../js/config/dynamicConfig';
import { initCustomDatasetHelper } from '../js/metrics/customMetricsHelper';
import fakeConfig from '../__mocks__/fakeConfig.json';

mockBEMUserCache(fakeConfig);

global.fetch = (url: string) =>
  new Promise((rs, rj) => {
    setTimeout(() =>
      rs({
        text: () =>
          new Promise((rs, rj) => {
            let myJSON = JSON.stringify(fakeLabels);
            setTimeout(() => rs(myJSON), 100);
          }),
      }),
    );
  }) as any;

it('gets met for mode and speed', () => {
  expect(getMet('WALKING', 1.47523, 0)).toBe(4.3); //1.47523 mps = 3.299 mph -> 4.3 METs
  expect(getMet('BICYCLING', 4.5, 0)).toBe(6.8); //4.5 mps = 10.07 mph =  6.8 METs
  expect(getMet('UNICYCLE', 100, 0)).toBe(0); //unkown mode, 0 METs
  expect(getMet('CAR', 25, 1)).toBe(0); //0 METs in CAR
  expect(getMet('ON_FOOT', 1.47523, 0)).toBe(4.3); //same as walking!
  expect(getMet('WALKING', -2, 0)).toBe(0); //negative speed -> 0
});

it('gets custom met for mode and speed', async () => {
  const appConfig = await getConfig();
  await initCustomDatasetHelper(appConfig!);
  expect(getMet('walk', 1.47523, 0)).toBe(4.3); //1.47523 mps = 3.299 mph -> 4.3 METs
  expect(getMet('bike', 4.5, 0)).toBe(6.8); //4.5 mps = 10.07 mph =  6.8 METs
  expect(getMet('unicycle', 100, 0)).toBe(0); //unkown mode, 0 METs
  expect(getMet('drove_alone', 25, 1)).toBe(0); //0 METs IN_VEHICLE
  expect(getMet('e-bike', 6, 1)).toBe(4.9); //e-bike is 4.9 for all speeds
  expect(getMet('e-bike', 12, 1)).toBe(4.9); //e-bike is 4.9 for all speeds
  expect(getMet('walk', -2, 1)).toBe(0); //negative speed -> 0
});
