import {
  _test_clearCustomMetrics,
  initCustomDatasetHelper,
} from '../js/metrics/customMetricsHelper';
import {
  clearHighestFootprint,
  getFootprintForMetrics,
  getHighestFootprint,
  getHighestFootprintForDistance,
} from '../js/metrics/footprintHelper';
import { getConfig } from '../js/config/dynamicConfig';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import fakeLabels from '../__mocks__/fakeLabels.json';
import fakeConfig from '../__mocks__/fakeConfig.json';

mockBEMUserCache(fakeConfig);
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
  clearHighestFootprint();
  _test_clearCustomMetrics();
});

const custom_metrics = [
  { key: 'ON_FOOT', values: 3000 }, //hits fallback under custom paradigm
  { key: 'bike', values: 6500 },
  { key: 'drove_alone', values: 10000 },
  { key: 'scootershare', values: 25000 },
  { key: 'unicycle', values: 5000 },
];

/*
  3*0 + 6.5*0 + 10*0.22031 + 25*0.00894 + 5*0
  0 + 0 + 2.2031 + 0.2235 + 0
  2.4266
*/
it('gets footprint for metrics (custom, fallback 0)', async () => {
  const appConfig = await getConfig();
  await initCustomDatasetHelper(appConfig);
  expect(getFootprintForMetrics(custom_metrics, 0)).toBe(2.4266);
});

/* 
  3*0.1 + 6.5*0 + 10*0.22031 + 25*0.00894 + 5*0.1
  0.3 + 0 + 2.2031 + 0.2235 + 0.5
  0.3 2.4266 + 0.5
*/
it('gets footprint for metrics (custom, fallback 0.1)', async () => {
  const appConfig = await getConfig();
  await initCustomDatasetHelper(appConfig);
  expect(getFootprintForMetrics(custom_metrics, 0.1)).toBe(3.2266);
});

//expects TAXI from the fake labels
it('gets the highest footprint from the dataset, custom', async () => {
  const appConfig = await getConfig();
  await initCustomDatasetHelper(appConfig);
  expect(getHighestFootprint()).toBe(0.30741);
});

/*
  TAXI co2/km * meters/1000
*/
it('gets the highest footprint for distance, custom', async () => {
  const appConfig = await getConfig();
  await initCustomDatasetHelper(appConfig);
  expect(getHighestFootprintForDistance(12345)).toBe(0.30741 * (12345 / 1000));
});

it('errors out if not initialized', () => {
  const t = () => {
    getFootprintForMetrics(custom_metrics, 0);
  };
  expect(t).toThrow(Error);
});
