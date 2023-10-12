import { 
    TlEntry, 
    Trip, 
    UserInputForTrip, 
    fmtTs, 
    printUserInput, 
    validUserInputForDraftTrip, 
    validUserInputForTimelineEntry,
    getNotDeletedCandidates
} from '../js/survey/input-matcher';

describe('input-matcher', () => {
    let userTrip: UserInputForTrip;

    beforeEach(() => {
        // create a userTrip object before each test case.
        userTrip  = { 
            data: {
                end_ts: 1437604764,
                start_ts: 1437601247,
                label: "FOO"
            },
            metadata: {
                time_zone: "America/Los_Angeles",
                plugin: "none",
                write_ts: 1695921991.013001,
                platform: "ios",
                read_ts: 0,
                key: "manual/mode_confirm"
            },
            key: "manual/place"
        }
    });

    it('tests fmtTs with valid input', () => {
        const pstTime = fmtTs(1437601247.8459613, "America/Los_Angeles");
        const estTime = fmtTs(1437601247.8459613, "America/New_York");
        // Check if it contains correct year-mm-dd hr:mm 
        expect(pstTime).toContain("2015-07-22T14:40");
        expect(estTime).toContain("2015-07-22T17:40");
    });

    it('tests fmtTs with invalid input', () => {
        const formattedTeim = fmtTs(0, "");
        // Check if it contains correct year-mm-dd hr:mm 
        expect(formattedTeim).toBeFalsy();
    });

    it('tests printUserInput prints the trip log correctly', () => {
        const userTripLog = printUserInput(userTrip);
        expect(userTripLog).toContain("1437604764");
        expect(userTripLog).toContain("1437601247");
        expect(userTripLog).toContain("FOO");
    });

    it('tests validUserInputForDraftTrip with valid trip', () => {
        const validTrp = {   
            end_ts: 1437604764,
            start_ts: 1437601247
        }
        const validUserInput = validUserInputForDraftTrip(validTrp, userTrip, false);
        expect(validUserInput).toBeTruthy();
    });

    it('tests validUserInputForDraftTrip with invalid trip', () => {
        const invalidTrip = {
            end_ts: 0,
            start_ts: 0
        }
        const invalidUserInput = validUserInputForDraftTrip(invalidTrip, userTrip, false);
        expect(invalidUserInput).toBeFalsy();
    });

    it('tests validUserInputForTimelineEntry with valid tlEntry object', () => {
        const tlEntry: TlEntry = {
            key: "analysis/confirmed_place",
            origin_key: "analysis/confirmed_place",
            start_ts: 1437601000,
            end_ts: 1437605000,
            enter_ts: 1437605000,
            exit_ts: 1437605000,
            duration: 100,
            getNextEntry: jest.fn()
        }

        const validTimelineEntry = validUserInputForTimelineEntry(tlEntry, userTrip, false);
        expect(validTimelineEntry).toBeTruthy();
    });

    it('tests validUserInputForTimelineEntry with invalid tlEntry key', () => {
        const tlEntry: TlEntry = {
            key: "FOO",
            origin_key: "FOO",
            start_ts: 1437601000,
            end_ts: 1437605000,
            enter_ts: 1437605000,
            exit_ts: 1437605000,
            duration: 100,
            getNextEntry: jest.fn()
        }

        const invalidTimelineEntry = validUserInputForTimelineEntry(tlEntry, userTrip, false);
        expect(invalidTimelineEntry).toBeFalsy();
    });

    it('tests validUserInputForTimelineEntry with invalid tlEntry start & end time', () => {
        const tlEntry: TlEntry = {
            key: "analysis/confirmed_place",
            origin_key: "analysis/confirmed_place",
            start_ts: 1,
            end_ts: 1,
            enter_ts: 1,
            exit_ts: 1,
            duration: 1,
            getNextEntry: jest.fn()
        }

        const invalidTimelineEntry = validUserInputForTimelineEntry(tlEntry, userTrip, false);
        expect(invalidTimelineEntry).toBeFalsy();
    });

    it('tests getNotDeletedCandidates called with 0 candidates', () => {
        jest.spyOn(console, 'log');
        const candidates = getNotDeletedCandidates([]);
        
        // check if the log printed collectly with 
        expect(console.log).toHaveBeenCalledWith('getNotDeletedCandidates called with 0 candidates');
        expect(candidates).toStrictEqual([]);

    });

    it('tests getUserInputForTrip', () => {
        
    });

    it('tests getAdditionsForTimelineEntry', () => {

    });

    it('tests getUniqueEntries', () => {

    });
})