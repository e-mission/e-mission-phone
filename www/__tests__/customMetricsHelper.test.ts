import { getConfig } from '../js/config/dynamicConfig';
import {
  _test_clearCustomMetrics,
  getCustomFootprint,
  getCustomMETs,
  initCustomDatasetHelper,
} from '../js/metrics/customMetricsHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import fakeLabels from '../__mocks__/fakeLabels.json';
import fakeConfig from '../__mocks__/fakeConfig.json';

mockBEMUserCache(fakeConfig);
mockLogger();

beforeEach(() => {
  _test_clearCustomMetrics();
});

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

it('has no footprint or mets before initialized', () => {
  expect(getCustomFootprint()).toBeUndefined();
  expect(getCustomMETs()).toBeUndefined();
});

it('gets the custom mets', async () => {
  const appConfig = await getConfig();
  await initCustomDatasetHelper(appConfig!);
  //expecting the keys from fakeLabels.json NOT metrics/metDataset.ts
  expect(getCustomMETs()).toMatchObject({
    walk: expect.any(Object),
    bike: expect.any(Object),
    bikeshare: expect.any(Object),
    'e-bike': expect.any(Object),
    scootershare: expect.any(Object),
    drove_alone: expect.any(Object),
  });
});

it('gets the custom footprint', async () => {
  const appConfig = await getConfig();
  await initCustomDatasetHelper(appConfig!);
  //numbers from fakeLabels.json
  expect(getCustomFootprint()).toMatchObject({
    walk: 0,
    bike: 0,
    bikeshare: 0,
    'e-bike': 0.00728,
    scootershare: 0.00894,
    drove_alone: 0.22031,
  });
});
