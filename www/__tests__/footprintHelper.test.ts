import { initCustomDatasetHelper } from '../js/metrics/customMetricsHelper';
import {
  clearHighestFootprint,
  getFootprintForMetrics,
  getHighestFootprint,
  getHighestFootprintForDistance,
  setUseCustomFootprint,
} from '../js/metrics/footprintHelper';
import { getConfig } from '../js/config/dynamicConfig';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import fakeLabels from '../__mocks__/fakeLabels.json';

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
  setUseCustomFootprint(false);
  clearHighestFootprint();
});

const custom_metrics = [
  { key: 'walk', values: 3000 },
  { key: 'bike', values: 6500 },
  { key: 'drove_alone', values: 10000 },
  { key: 'scootershare', values: 25000 },
  { key: 'unicycle', values: 5000 },
];

it('gets footprint for metrics (custom, fallback 0)', async () => {
  initCustomDatasetHelper(getConfig());
  setUseCustomFootprint(true);
  await new Promise((r) => setTimeout(r, 500));
  expect(getFootprintForMetrics(custom_metrics, 0)).toBe(2.4266);
});

it('gets footprint for metrics (custom, fallback 0.1)', async () => {
  initCustomDatasetHelper(getConfig());
  setUseCustomFootprint(true);
  await new Promise((r) => setTimeout(r, 500));
  expect(getFootprintForMetrics(custom_metrics, 0.1)).toBe(2.4266 + 0.5);
});

it('gets the highest footprint from the dataset, custom', async () => {
  initCustomDatasetHelper(getConfig());
  setUseCustomFootprint(true);
  await new Promise((r) => setTimeout(r, 500));
  expect(getHighestFootprint()).toBe(0.30741);
});

it('gets the highest footprint for distance, custom', async () => {
  initCustomDatasetHelper(getConfig());
  setUseCustomFootprint(true);
  await new Promise((r) => setTimeout(r, 500));
  expect(getHighestFootprintForDistance(12345)).toBe(0.30741 * (12345 / 1000));
});
