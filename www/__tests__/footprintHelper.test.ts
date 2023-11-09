import { initCustomDatasetHelper } from '../js/metrics/CustomMetricsHelper';
import {
  getFootprintForMetrics,
  mtokm,
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

const metrics = [
  { key: 'WALKING', values: 3000 },
  { key: 'BICYCLING', values: 6500 },
  { key: 'CAR', values: 50000 },
  { key: 'LIGHT_RAIL', values: 30000 },
  { key: 'Unicycle', values: 5000 },
];

it('gets footprint for metrics (not custom, fallback 0', () => {
  expect(getFootprintForMetrics(metrics, 0)).toBe(10.534493474207583);
});

it('gets footprint for metrics (not custom, fallback 0.1', () => {
  expect(getFootprintForMetrics(metrics, 0.1)).toBe(10.534493474207583 + 0.5);
});

const custom_metrics = [
  { key: 'walk', values: 3000 },
  { key: 'bike', values: 6500 },
  { key: 'drove_alone', values: 10000 },
  { key: 'scootershare', values: 25000 },
  { key: 'unicycle', values: 5000 },
];

it('gets footprint for metrics (custom, fallback 0', async () => {
  initCustomDatasetHelper(getConfig());
  setUseCustomFootprint();
  await new Promise((r) => setTimeout(r, 500));
  expect(getFootprintForMetrics(custom_metrics, 0)).toBe(2.4266);
});

it('gets footprint for metrics (custom, fallback 0.1', async () => {
  initCustomDatasetHelper(getConfig());
  setUseCustomFootprint();
  await new Promise((r) => setTimeout(r, 500));
  expect(getFootprintForMetrics(custom_metrics, 0.1)).toBe(2.4266 + 0.5);
});
