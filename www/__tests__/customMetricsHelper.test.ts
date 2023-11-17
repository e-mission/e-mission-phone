import { getConfig } from '../js/config/dynamicConfig';
import {
  getCustomFootprint,
  getCustomMETs,
  initCustomDatasetHelper,
} from '../js/metrics/customMetricsHelper';
import { setUseCustomMET } from '../js/metrics/metHelper';
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

it('gets the custom mets', async () => {
  initCustomDatasetHelper(getConfig());
  setUseCustomMET(true);
  await new Promise((r) => setTimeout(r, 800));
  expect(getCustomMETs()).toMatchObject({
    walk: {},
    bike: {},
    bikeshare: {},
    'e-bike': {},
    scootershare: {},
    drove_alone: {},
  });
});

it('gets the custom footprint', async () => {
  initCustomDatasetHelper(getConfig());
  await new Promise((r) => setTimeout(r, 800));
  expect(getCustomFootprint()).toMatchObject({
    walk: {},
    bike: {},
    bikeshare: {},
    'e-bike': {},
    scootershare: {},
    drove_alone: {},
  });
});
