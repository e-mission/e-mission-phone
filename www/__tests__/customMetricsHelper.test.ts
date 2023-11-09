import { getConfig } from '../js/config/dynamicConfig';
import {
  getCustomFootprint,
  getCustomMETs,
  getFallbackFootprint,
  initCustomDatasetHelper,
} from '../js/metrics/CustomMetricsHelper';
import { setUseCustomMET } from '../js/metrics/metHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import fakeLabels from '../__mocks__/fakeLabels.json';
import { setUseCustomFootprint } from '../js/metrics/footprintHelper';
import { number } from 'prop-types';

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

it('gets the fallback carbon', async () => {
  expect(getFallbackFootprint()).toEqual(
    expect.objectContaining({
      WALKING: 0,
      BICYCLING: 0,
      CAR: 267 / 1609,
      TRAIN: 92 / 1609,
    }),
  );
});

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
  setUseCustomFootprint(true);
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
