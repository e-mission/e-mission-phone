import { getMet, setUseCustomMET } from '../js/metrics/metHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import fakeLabels from '../__mocks__/fakeLabels.json';
import { getConfig } from '../js/config/dynamicConfig';
import { initCustomDatasetHelper } from '../js/metrics/customMetricsHelper';

mockBEMUserCache();
mockLogger();

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

beforeEach(() => {
  setUseCustomMET(false);
});

it('gets met for mode and speed', () => {
  expect(getMet('WALKING', 1.47523, 0)).toBe(4.3);
  expect(getMet('BICYCLING', 4.5, 0)).toBe(6.8);
  expect(getMet('UNICYCLE', 100, 0)).toBe(0);
  expect(getMet('CAR', 25, 1)).toBe(0);
});

it('gets custom met for mode and speed', async () => {
  initCustomDatasetHelper(getConfig());
  setUseCustomMET(true);
  await new Promise((r) => setTimeout(r, 500));
  expect(getMet('walk', 1.47523, 0)).toBe(4.3);
  expect(getMet('bike', 4.5, 0)).toBe(6.8);
  expect(getMet('unicycle', 100, 0)).toBe(0);
  expect(getMet('drove_alone', 25, 1)).toBe(0);
  expect(getMet('e-bike', 6, 1)).toBe(4.9);
  expect(getMet('e-bike', 12, 1)).toBe(4.9);
});
