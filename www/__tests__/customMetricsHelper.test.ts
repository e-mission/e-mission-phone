import { getConfig } from '../js/config/dynamicConfig';
import {
  getCustomFootprint,
  getCustomMETs,
  initCustomDatasetHelper,
} from '../js/metrics/customMetricsHelper';
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
  const appConfig = await getConfig();
  await initCustomDatasetHelper(appConfig);
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
  await initCustomDatasetHelper(appConfig);
  expect(getCustomFootprint()).toMatchObject({
    walk: expect.any(Number),
    bike: expect.any(Number),
    bikeshare: expect.any(Number),
    'e-bike': expect.any(Number),
    scootershare: expect.any(Number),
    drove_alone: expect.any(Number),
  });
});
