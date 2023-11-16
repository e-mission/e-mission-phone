import { mockLogger } from '../__mocks__/globalMocks';
import * as CommHelper from '../js/services/commHelper';
import {
  baseLabelInputDetails,
  getLabelInputDetails,
  getLabelOptions,
  inferFinalLabels,
  labelInputDetailsForTrip,
  labelKeyToReadable,
  labelKeyToRichMode,
  labelOptionByValue,
  readableLabelToKey,
  verifiabilityForTrip,
} from '../js/survey/multilabel/confirmHelper';

import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;
mockLogger();

const fakeAppConfig = {
  label_options: 'json/label-options.json.sample',
};
const fakeAppConfigWithModeOfStudy = {
  ...fakeAppConfig,
  intro: {
    mode_studied: 'walk',
  },
};
const fakeDefaultLabelOptions = {
  MODE: [
    { value: 'walk', baseMode: 'WALKING', met_equivalent: 'WALKING', kgCo2PerKm: 0 },
    { value: 'bike', baseMode: 'BICYCLING', met_equivalent: 'BICYCLING', kgCo2PerKm: 0 },
  ],
  PURPOSE: [{ value: 'home' }, { value: 'work' }],
  REPLACED_MODE: [{ value: 'no_travel' }, { value: 'walk' }, { value: 'bike' }],
  translations: {
    en: {
      walk: 'Walk',
      bike: 'Regular Bike',
      no_travel: 'No travel',
      home: 'Home',
      work: 'To Work',
    },
  },
};

CommHelper.fetchUrlCached = jest
  .fn()
  .mockImplementation(() => JSON.stringify(fakeDefaultLabelOptions));

describe('confirmHelper', () => {
  it('returns labelOptions given an appConfig', async () => {
    const labelOptions = await getLabelOptions(fakeAppConfig);
    expect(labelOptions).toBeTruthy();
    expect(labelOptions.MODE[0].text).toEqual('Walk'); // translation is filled in
  });

  it('returns base labelInputDetails for a labelUserInput which does not have mode of study', () => {
    const fakeLabelUserInput = {
      MODE: fakeDefaultLabelOptions.MODE[1],
      PURPOSE: fakeDefaultLabelOptions.PURPOSE[0],
    };
    const labelInputDetails = labelInputDetailsForTrip(
      fakeLabelUserInput,
      fakeAppConfigWithModeOfStudy,
    );
    expect(labelInputDetails).toEqual(baseLabelInputDetails);
  });

  it('returns full labelInputDetails for a labelUserInput which has the mode of study', () => {
    const fakeLabelUserInput = {
      MODE: fakeDefaultLabelOptions.MODE[0], // 'walk' is mode of study
      PURPOSE: fakeDefaultLabelOptions.PURPOSE[0],
    };
    const labelInputDetails = labelInputDetailsForTrip(
      fakeLabelUserInput,
      fakeAppConfigWithModeOfStudy,
    );
    const fullLabelInputDetails = getLabelInputDetails(fakeAppConfigWithModeOfStudy);
    expect(labelInputDetails).toEqual(fullLabelInputDetails);
  });

  it(`converts 'other' text to a label key`, () => {
    const mode1 = readableLabelToKey(`Scooby Doo Mystery Machine `);
    expect(mode1).toEqual('scooby_doo_mystery_machine'); // trailing space is trimmed
    const mode2 = readableLabelToKey(`My niece's tricycle . `);
    expect(mode2).toEqual(`my_niece's_tricycle_.`); // apostrophe and period are preserved
    const purpose1 = readableLabelToKey(`Going to the store to buy 12 eggs.`);
    expect(purpose1).toEqual('going_to_the_store_to_buy_12_eggs.'); // numbers are preserved
  });

  it(`converts keys to readable labels`, () => {
    const mode1 = labelKeyToReadable(`scooby_doo_mystery_machine`);
    expect(mode1).toEqual(`Scooby Doo Mystery Machine`);
    const mode2 = labelKeyToReadable(`my_niece's_tricycle_.`);
    expect(mode2).toEqual(`My Niece's Tricycle .`);
    const purpose1 = labelKeyToReadable(`going_to_the_store_to_buy_12_eggs.`);
    expect(purpose1).toEqual(`Going To The Store To Buy 12 Eggs.`);
  });

  it('looks up a rich mode from a label key, or humanizes the label key if there is no rich mode', () => {
    const key = 'walk';
    const richMode = labelKeyToRichMode(key);
    expect(richMode).toEqual('Walk');
    const key2 = 'scooby_doo_mystery_machine';
    const readableMode = labelKeyToRichMode(key2);
    expect(readableMode).toEqual('Scooby Doo Mystery Machine');
  });

  /* BEGIN: tests for inferences, which are loosely based on the server-side tests from
    e-mission-server -> emission/tests/storageTests/TestTripQueries.py -> testExpandFinalLabels() */

  it('has no final label for a trip with no user labels or inferred labels', () => {
    const fakeTrip = {};
    const fakeUserInput = {};
    expect(inferFinalLabels(fakeTrip, fakeUserInput)).toEqual({});
    expect(verifiabilityForTrip(fakeTrip, fakeUserInput)).toEqual('cannot-verify');
  });

  it('returns a final inference for a trip no user labels and all high-confidence inferred labels', () => {
    const fakeTrip = {
      inferred_labels: [{ labels: { mode_confirm: 'walk', purpose_confirm: 'exercise' }, p: 0.9 }],
    };
    const fakeUserInput = {};
    const final = inferFinalLabels(fakeTrip, fakeUserInput);
    expect(final.MODE.value).toEqual('walk');
    expect(final.PURPOSE.value).toEqual('exercise');
    expect(verifiabilityForTrip(fakeTrip, fakeUserInput)).toEqual('can-verify');
  });

  it('gives no final inference when there are user labels and no inferred labels', () => {
    const fakeTrip = {};
    const fakeUserInput = {
      MODE: labelOptionByValue('bike', 'MODE'),
      PURPOSE: labelOptionByValue('shopping', 'PURPOSE'),
    };
    const final = inferFinalLabels(fakeTrip, fakeUserInput);
    expect(final.MODE?.value).toBeUndefined();
    expect(final.PURPOSE?.value).toBeUndefined();
    expect(verifiabilityForTrip(fakeTrip, fakeUserInput)).toEqual('already-verified');
  });

  it('still gives no final inference when there are user labels and high-confidence inferred labels', () => {
    const fakeTrip = {
      inferred_labels: [{ labels: { mode_confirm: 'walk', purpose_confirm: 'exercise' }, p: 0.9 }],
    };
    const fakeUserInput = {
      MODE: labelOptionByValue('bike', 'MODE'),
      PURPOSE: labelOptionByValue('shopping', 'PURPOSE'),
    };
    const final = inferFinalLabels(fakeTrip, fakeUserInput);
    expect(final.MODE?.value).toBeUndefined();
    expect(final.PURPOSE?.value).toBeUndefined();
    expect(verifiabilityForTrip(fakeTrip, fakeUserInput)).toEqual('already-verified');
  });

  it('mixes user input labels with mixed-confidence inferred labels', () => {
    const fakeTrip = {
      inferred_labels: [
        { labels: { mode_confirm: 'bike', purpose_confirm: 'shopping' }, p: 0.1 },
        { labels: { mode_confirm: 'walk', purpose_confirm: 'exercise' }, p: 0.9 },
      ],
    };
    const fakeUserInput = { MODE: labelOptionByValue('bike', 'MODE') };
    const final = inferFinalLabels(fakeTrip, fakeUserInput);
    expect(final.MODE.value).toEqual('bike');
    expect(final.PURPOSE.value).toEqual('shopping');
    expect(verifiabilityForTrip(fakeTrip, fakeUserInput)).toEqual('can-verify');
  });
});
