import { 
    fmtTs, 
    printUserInput, 
    validUserInputForDraftTrip, 
    validUserInputForTimelineEntry,
    getNotDeletedCandidates,
    getUserInputForTrip,
    getAdditionsForTimelineEntry,
    getUniqueEntries
} from '../js/survey/inputMatcher';
import { TlEntry, UnprocessedUserInput } from '../js/types/diaryTypes';

describe('input-matcher', () => {
    let userTrip: UnprocessedUserInput;
    let trip: TlEntry;

    beforeEach(() => {
        /* 
        Create a valid userTrip and trip object before each test case.
        The trip data is from the 'real_examples' data (shankari_2015-07-22) on the server.
        For some test cases, I need to generate fake data, such as labels, keys, and origin_keys. 
        In such cases, I referred to 'TestUserInputFakeData.py' on the server.
        */
        userTrip  = { 
            data: {
                end_ts: 1437604764,
                start_ts: 1437601247,
                label: 'FOO',
                status: 'ACTIVE'
            },
            metadata: {
                time_zone: 'America/Los_Angeles',
                plugin: 'none',
                write_ts: 1695921991,
                platform: 'ios',
                read_ts: 0,
                key: 'manual/mode_confirm'
            },
            key: 'manual/place'
        }
        trip = {
            key: 'FOO',
            origin_key: 'FOO',
            start_ts: 1437601000,
            end_ts: 1437605000,
            enter_ts: 1437605000,
            exit_ts: 1437605000,
            duration: 100,
            getNextEntry: jest.fn()
        }

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
            start_ts: 1437601247
        }
        const validUserInput = validUserInputForDraftTrip(validTrp, userTrip, false);
        expect(validUserInput).toBeTruthy();
    });

    it('tests validUserInputForDraftTrip with invalid trip input', () => {
        const invalidTrip = {
            end_ts: 0,
            start_ts: 0
        }
        const invalidUserInput = validUserInputForDraftTrip(invalidTrip, userTrip, false);
        expect(invalidUserInput).toBeFalsy();
    });

    it('tests validUserInputForTimelineEntry with valid trip object', () => {
        // we need valid key and origin_key for validUserInputForTimelineEntry test
        trip['key'] = 'analysis/confirmed_place';
        trip['origin_key'] = 'analysis/confirmed_place';
        const validTimelineEntry = validUserInputForTimelineEntry(trip, userTrip, false);
        expect(validTimelineEntry).toBeTruthy();
    });

    it('tests validUserInputForTimelineEntry with tlEntry with invalid key and origin_key', () => {
        const invalidTlEntry = trip;
        const invalidTimelineEntry = validUserInputForTimelineEntry(invalidTlEntry, userTrip, false);
        expect(invalidTimelineEntry).toBeFalsy();
    });

    it('tests validUserInputForTimelineEntry with tlEntry with invalie start & end time', () => {
        const invalidTlEntry: TlEntry = {
            key: 'analysis/confirmed_place',
            origin_key: 'analysis/confirmed_place',
            start_ts: 1,
            end_ts: 1,
            enter_ts: 1,
            exit_ts: 1,
            duration: 1,
            getNextEntry: jest.fn()
        }
        const invalidTimelineEntry = validUserInputForTimelineEntry(invalidTlEntry, userTrip, false);
        expect(invalidTimelineEntry).toBeFalsy();
    });

    it('tests getNotDeletedCandidates called with 0 candidates', () => {
        jest.spyOn(console, 'log');
        const candidates = getNotDeletedCandidates([]);
        
        // check if the log printed collectly with 
        expect(console.log).toHaveBeenCalledWith('getNotDeletedCandidates called with 0 candidates');
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
                match_id: 'FOO'
            },
            metadata: {
                time_zone: 'America/Los_Angeles',
                plugin: 'none',
                write_ts: 1695921991,
                platform: 'ios',
                read_ts: 0,
                key: 'manual/mode_confirm'
            },
            key: 'manual/place'
        }
        const candidates = [ activeTrip, deletedTrip ];
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
                start_ts: 1437606026
            },
            metadata: {
                time_zone: 'America/Los_Angeles',
                plugin: 'none',
                write_ts: 1695830232,
                platform: 'ios',
                read_ts: 0,
                key:'manual/mode_confirm',
                type:'message'
            }
        }
        const userInputWriteSecond = { 
            data: {
                end_ts: 1437598393,
                label: 'e-bike',
                start_ts: 1437596745
            },
            metadata: {
                time_zone: 'America/Los_Angeles',
                plugin: 'none',
                write_ts: 1695838268,
                platform: 'ios',
                read_ts: 0,
                key:'manual/mode_confirm',
                type:'message'
            }
        }
        const userInputWriteThird = {
            data: {
                end_ts: 1437604764,
                label: 'e-bike',
                start_ts: 1437601247
            },
            metadata: {
                time_zone: 'America/Los_Angeles',
                plugin: 'none',
                write_ts: 1695921991,
                platform: 'ios',
                read_ts: 0,
                key:'manual/mode_confirm',
                type:'message'
            }
        }

        // make the linst unsorted and then check if userInputWriteThird(latest one) is return output
        const userInputList = [userInputWriteSecond, userInputWriteThird, userInputWriteFirst];
        const mostRecentEntry = getUserInputForTrip(trip, userInputList);
        expect(mostRecentEntry).toMatchObject(userInputWriteThird);
    });

    it('tests getUserInputForTrip with invalid userInputList', () => {
        const userInputList = undefined;
        const mostRecentEntry = getUserInputForTrip(trip, userInputList);
        expect(mostRecentEntry).toBe(undefined);
    });

    it('tests getAdditionsForTimelineEntry with valid additionsList', () => {
        const additionsList = new Array(5).fill(userTrip);
        trip['key'] = 'analysis/confirmed_place';
        trip['origin_key'] = 'analysis/confirmed_place';

        // check if the result keep the all valid userTrip items
        const matchingAdditions = getAdditionsForTimelineEntry(trip, additionsList);
        expect(matchingAdditions).toHaveLength(5);
    });

    it('tests getAdditionsForTimelineEntry with invalid additionsList', () => {
        const additionsList = undefined;
        const matchingAdditions = getAdditionsForTimelineEntry(trip, additionsList);
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
})
