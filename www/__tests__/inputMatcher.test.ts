import { updateLocalUnprocessedInputs } from '../js/diary/timelineHelper';
import * as logger from '../js/plugin/logger';
import { EnketoUserInputEntry } from '../js/survey/enketo/enketoHelper';
import {
  fmtTs,
  printUserInput,
  validUserInputForDraftTrip,
  validUserInputForTimelineEntry,
  getNotDeletedCandidates,
  getUserInputForTimelineEntry,
  getAdditionsForTimelineEntry,
  getUniqueEntries,
  mapInputsToTimelineEntries,
} from '../js/survey/inputMatcher';
import { AppConfig } from '../js/types/appConfigTypes';
import { CompositeTrip, TimelineEntry, UserInputEntry } from '../js/types/diaryTypes';

describe('input-matcher', () => {
  let userTrip: UserInputEntry;
  let trip: TimelineEntry;
  let nextTrip: TimelineEntry;

  beforeEach(() => {
    /* 
        Create a valid userTrip and trip object before each test case.
        The trip data is from the 'real_examples' data (shankari_2015-07-22) on the server.
        For some test cases, I need to generate fake data, such as labels, keys, and origin_keys. 
        In such cases, I referred to 'TestUserInputFakeData.py' on the server.
        */
    userTrip = {
      data: {
        end_ts: 1437604764,
        start_ts: 1437601247,
        label: 'FOO',
        status: 'ACTIVE',
      },
      metadata: {
        time_zone: 'America/Los_Angeles',
        plugin: 'none',
        write_ts: 1695921991,
        platform: 'ios',
        read_ts: 0,
        key: 'manual/mode_confirm',
      },
      key: 'manual/place',
    } as UserInputEntry;
    trip = {
      key: 'FOO',
      origin_key: 'FOO',
      start_ts: 1437601000,
      end_ts: 1437605000,
      enter_ts: 1437605000,
      exit_ts: 1437605000,
      duration: 100,
    } as unknown as CompositeTrip;
    nextTrip = {
      key: 'BAR',
      origin_key: 'BAR',
      start_ts: 1437606000,
      end_ts: 1437607000,
      enter_ts: 1437607000,
      exit_ts: 1437607000,
      duration: 100,
    } as unknown as CompositeTrip;
    // mock Logger
    window['Logger'] = { log: console.log };
  });

  it('tests fmtTs with valid input', () => {
    const pstTime = fmtTs(1437601247.8459613, 'America/Los_Angeles');
    const estTime = fmtTs(1437601247.8459613, 'America/New_York');

    // Check if it contains correct year-mm-dd hr:mm
    expect(pstTime).toContain('2015-07-22T14:40');
    expect(estTime).toContain('2015-07-22T17:40');
  });

  it('tests fmtTs with invalid input', () => {
    const formattedTime = fmtTs(0, '');
    expect(formattedTime).toBeFalsy();
  });

  it('tests printUserInput prints the trip log correctly', () => {
    const userTripLog = printUserInput(userTrip);
    expect(userTripLog).toContain('1437604764');
    expect(userTripLog).toContain('1437601247');
    expect(userTripLog).toContain('FOO');
  });

  it('tests validUserInputForDraftTrip with valid trip input', () => {
    const validTrp = {
      end_ts: 1437604764,
      start_ts: 1437601247,
    } as CompositeTrip;
    const validUserInput = validUserInputForDraftTrip(validTrp, userTrip, false);
    expect(validUserInput).toBeTruthy();
  });

  it('tests validUserInputForDraftTrip with invalid trip input', () => {
    const invalidTrip = {
      end_ts: 0,
      start_ts: 0,
    } as CompositeTrip;
    const invalidUserInput = validUserInputForDraftTrip(invalidTrip, userTrip, false);
    expect(invalidUserInput).toBeFalsy();
  });

  it('tests validUserInputForTimelineEntry with valid trip object', () => {
    // we need valid key and origin_key for validUserInputForTimelineEntry test
    trip['key'] = 'analysis/confirmed_place';
    trip['origin_key'] = 'analysis/confirmed_place';
    const validTimelineEntry = validUserInputForTimelineEntry(trip, nextTrip, userTrip, false);
    expect(validTimelineEntry).toBeTruthy();
  });

  it('tests validUserInputForTimelineEntry with tlEntry with invalid key and origin_key', () => {
    const invalidTlEntry = trip;
    const invalidTimelineEntry = validUserInputForTimelineEntry(
      invalidTlEntry,
      null,
      userTrip,
      false,
    );
    expect(invalidTimelineEntry).toBeFalsy();
  });

  it('tests validUserInputForTimelineEntry with tlEntry with invalie start & end time', () => {
    const invalidTlEntry: TimelineEntry = {
      key: 'analysis/confirmed_place',
      origin_key: 'analysis/confirmed_place',
      start_ts: 1,
      end_ts: 1,
      enter_ts: 1,
      exit_ts: 1,
      duration: 1,
    } as unknown as TimelineEntry;
    const invalidTimelineEntry = validUserInputForTimelineEntry(
      invalidTlEntry,
      null,
      userTrip,
      false,
    );
    expect(invalidTimelineEntry).toBeFalsy();
  });

  it('tests getNotDeletedCandidates called with 0 candidates', () => {
    jest.spyOn(logger, 'logDebug');
    const candidates = getNotDeletedCandidates([]);

    // check if the log printed collectly with
    expect(logger.logDebug).toHaveBeenCalledWith(
      'getNotDeletedCandidates called with 0 candidates',
    );
    expect(candidates).toStrictEqual([]);
  });

  it('tests getNotDeletedCandidates called with multiple candidates', () => {
    const activeTrip = userTrip;
    const deletedTrip = {
      data: {
        end_ts: 1437604764,
        start_ts: 1437601247,
        label: 'FOO',
        status: 'DELETED',
        match_id: 'FOO',
      },
      metadata: {
        time_zone: 'America/Los_Angeles',
        plugin: 'none',
        write_ts: 1695921991,
        platform: 'ios',
        read_ts: 0,
        key: 'manual/mode_confirm',
      },
      key: 'manual/place',
    } as UserInputEntry;
    const candidates = [activeTrip, deletedTrip];
    const validCandidates = getNotDeletedCandidates(candidates);

    // check if the result has only 'ACTIVE' data
    expect(validCandidates).toHaveLength(1);
    expect(validCandidates[0]).toMatchObject(userTrip);
  });

  it('tests getUserInputForTrip with valid userInputList', () => {
    const userInputWriteFirst = {
      data: {
        end_ts: 1437607732,
        label: 'bus',
        start_ts: 1437606026,
      },
      metadata: {
        time_zone: 'America/Los_Angeles',
        plugin: 'none',
        write_ts: 1695830232,
        platform: 'ios',
        read_ts: 0,
        key: 'manual/mode_confirm',
        type: 'message',
      },
    } as unknown as UserInputEntry;
    const userInputWriteSecond = {
      data: {
        end_ts: 1437598393,
        label: 'e-bike',
        start_ts: 1437596745,
      },
      metadata: {
        time_zone: 'America/Los_Angeles',
        plugin: 'none',
        write_ts: 1695838268,
        platform: 'ios',
        read_ts: 0,
        key: 'manual/mode_confirm',
        type: 'message',
      },
    } as unknown as UserInputEntry;
    const userInputWriteThird = {
      data: {
        end_ts: 1437604764,
        label: 'e-bike',
        start_ts: 1437601247,
      },
      metadata: {
        time_zone: 'America/Los_Angeles',
        plugin: 'none',
        write_ts: 1695921991,
        platform: 'ios',
        read_ts: 0,
        key: 'manual/mode_confirm',
        type: 'message',
      },
    } as unknown as UserInputEntry;

    // make the linst unsorted and then check if userInputWriteThird(latest one) is return output
    const userInputList = [userInputWriteSecond, userInputWriteThird, userInputWriteFirst];
    const mostRecentEntry = getUserInputForTimelineEntry(trip, nextTrip, userInputList);
    expect(mostRecentEntry).toMatchObject(userInputWriteThird);
  });

  it('tests getUserInputForTrip with invalid userInputList', () => {
    const userInputList = undefined as unknown as UserInputEntry[];
    const mostRecentEntry = getUserInputForTimelineEntry(trip, nextTrip, userInputList);
    expect(mostRecentEntry).toBe(undefined);
  });

  it('tests getAdditionsForTimelineEntry with valid additionsList', () => {
    const additionsList = new Array(5).fill(userTrip);
    trip['key'] = 'analysis/confirmed_place';
    trip['origin_key'] = 'analysis/confirmed_place';

    // check if the result keep the all valid userTrip items
    const matchingAdditions = getAdditionsForTimelineEntry(trip, nextTrip, additionsList);
    expect(matchingAdditions).toHaveLength(5);
  });

  it('tests getAdditionsForTimelineEntry with invalid additionsList', () => {
    const additionsList = undefined as unknown as EnketoUserInputEntry[];
    const matchingAdditions = getAdditionsForTimelineEntry(trip, nextTrip, additionsList);
    expect(matchingAdditions).toMatchObject([]);
  });

  it('tests getUniqueEntries with valid combinedList', () => {
    const combinedList = new Array(5).fill(userTrip);

    // check if the result keeps only unique userTrip items
    const uniqueEntires = getUniqueEntries(combinedList);
    expect(uniqueEntires).toHaveLength(1);
  });

  it('tests getUniqueEntries with empty combinedList', () => {
    const uniqueEntires = getUniqueEntries([]);
    expect(uniqueEntires).toMatchObject([]);
  });
});

describe('mapInputsToTimelineEntries on a MULTILABEL configuration', () => {
  const fakeConfigMultilabel = {
    intro: {},
    survey_info: {
      'trip-labels': 'MULTILABEL',
    },
  } as AppConfig;

  const timelineEntriesMultilabel = [
    {
      _id: { $oid: 'trip1' },
      origin_key: 'analysis/confirmed_trip',
      start_ts: 1000,
      end_ts: 3000,
      user_input: {
        mode_confirm: 'walk',
      },
    },
    {
      _id: { $oid: 'placeA' },
      origin_key: 'analysis/confirmed_place',
      enter_ts: 3000,
      exit_ts: 5000,
      // no user input
      additions: [{ data: 'foo', metadata: 'bar' }],
    },
    {
      _id: { $oid: 'trip2' },
      origin_key: 'analysis/confirmed_trip',
      start_ts: 5000,
      end_ts: 7000,
      // no user input
    },
  ] as any as TimelineEntry[];
  it('creates a map that has the processed labels and notes', () => {
    const [labelMap, notesMap] = mapInputsToTimelineEntries(
      timelineEntriesMultilabel,
      fakeConfigMultilabel,
    );
    expect(labelMap).toMatchObject({
      trip1: {
        MODE: { data: { label: 'walk' } },
      },
    });
  });
  it('creates a map that combines processed and unprocessed labels and notes', async () => {
    // insert some unprocessed data
    await window['cordova'].plugins.BEMUserCache.putMessage('manual/purpose_confirm', {
      label: 'recreation',
      start_ts: 1000,
      end_ts: 3000,
    });
    await window['cordova'].plugins.BEMUserCache.putMessage('manual/mode_confirm', {
      label: 'bike',
      start_ts: 5000,
      end_ts: 7000,
    });
    await updateLocalUnprocessedInputs({ start_ts: 1000, end_ts: 5000 }, fakeConfigMultilabel);

    // check that both processed and unprocessed data are returned
    const [labelMap, notesMap] = mapInputsToTimelineEntries(
      timelineEntriesMultilabel,
      fakeConfigMultilabel,
    );

    expect(labelMap).toMatchObject({
      trip1: {
        MODE: { data: { label: 'walk' } },
        PURPOSE: { data: { label: 'recreation' } },
      },
      trip2: {
        MODE: { data: { label: 'bike' } },
      },
    });
  });
});

describe('mapInputsToTimelineEntries on an ENKETO configuration', () => {
  const fakeConfigEnketo = {
    intro: {},
    survey_info: {
      'trip-labels': 'ENKETO',
      buttons: {
        'trip-notes': { surveyName: 'TimeSurvey' },
      },
      surveys: { TripConfirmSurvey: { compatibleWith: 1 } },
    },
  } as any as AppConfig;
  const timelineEntriesEnketo = [
    {
      _id: { $oid: 'trip1' },
      origin_key: 'analysis/confirmed_trip',
      start_ts: 1000,
      end_ts: 3000,
      user_input: {
        trip_user_input: {
          data: {
            name: 'MyCustomSurvey',
            version: 1,
            xmlResponse: '<processed MyCustomSurvey response>',
            start_ts: 1000,
            end_ts: 3000,
          },
          metadata: 'foo',
        },
      },
      additions: [
        {
          data: {
            name: 'TimeSurvey',
            xmlResponse: '<processed TimeSurvey response>',
            start_ts: 1000,
            end_ts: 2000,
          },
          metadata: 'foo',
        },
      ],
    },
    {
      _id: { $oid: 'trip2' },
      origin_key: 'analysis/confirmed_trip',
      start_ts: 5000,
      end_ts: 7000,
      // no user input
      additions: [
        {
          data: {
            name: 'TimeSurvey',
            xmlResponse: '<processed TimeSurvey response>',
            match_id: 'foo',
            start_ts: 5000,
            end_ts: 7000,
          },
          metadata: 'foo',
        },
      ],
    },
  ] as any as TimelineEntry[];

  // reset local unprocessed inputs to ensure MUTLILABEL inputs don't leak into ENKETO tests
  beforeAll(async () => {
    await updateLocalUnprocessedInputs({ start_ts: 1000, end_ts: 5000 }, fakeConfigEnketo);
  });

  it('creates a map that has the processed responses and notes', () => {
    const [labelMap, notesMap] = mapInputsToTimelineEntries(
      timelineEntriesEnketo,
      fakeConfigEnketo,
    );
    expect(labelMap).toMatchObject({
      trip1: {
        MyCustomSurvey: {
          data: { xmlResponse: '<processed MyCustomSurvey response>' },
        },
      },
    });
    expect(notesMap['trip1'].length).toBe(1);
    expect(notesMap['trip1'][0]).toMatchObject({
      data: { xmlResponse: '<processed TimeSurvey response>' },
    });
  });
  it('creates a map that combines processed and unprocessed responses and notes', async () => {
    // insert some unprocessed data
    await window['cordova'].plugins.BEMUserCache.putMessage('manual/trip_user_input', {
      name: 'TripConfirmSurvey',
      version: 1,
      xmlResponse: '<unprocessed TripConfirmSurvey response>',
      start_ts: 5000,
      end_ts: 7000,
    });
    await window['cordova'].plugins.BEMUserCache.putMessage('manual/trip_addition_input', {
      name: 'TimeSurvey',
      xmlResponse: '<unprocessed TimeSurvey response>',
      match_id: 'bar',
      start_ts: 6000,
      end_ts: 7000,
    });
    await updateLocalUnprocessedInputs({ start_ts: 1000, end_ts: 5000 }, fakeConfigEnketo);

    // check that both processed and unprocessed data are returned
    const [labelMap, notesMap] = mapInputsToTimelineEntries(
      timelineEntriesEnketo,
      fakeConfigEnketo,
    );

    expect(labelMap).toMatchObject({
      trip1: {
        MyCustomSurvey: {
          data: { xmlResponse: '<processed MyCustomSurvey response>' },
        },
      },
      trip2: {
        TripConfirmSurvey: {
          data: { xmlResponse: '<unprocessed TripConfirmSurvey response>' },
        },
      },
    });

    expect(notesMap['trip1'].length).toBe(1);
    expect(notesMap['trip1'][0]).toMatchObject({
      data: { xmlResponse: '<processed TimeSurvey response>' },
    });

    expect(notesMap['trip2'].length).toBe(2);
    expect(notesMap['trip2'][0]).toMatchObject({
      data: { xmlResponse: '<unprocessed TimeSurvey response>' },
    });
    expect(notesMap['trip2'][1]).toMatchObject({
      data: { xmlResponse: '<processed TimeSurvey response>' },
    });
  });
});
