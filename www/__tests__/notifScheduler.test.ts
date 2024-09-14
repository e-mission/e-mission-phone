import { logDebug } from '../js/plugin/logger';
import { DateTime } from 'luxon';
import { getUser, updateUser } from '../js/services/commHelper';
import { addStatReading } from '../js/plugin/clientStats';
import {
  getScheduledNotifs,
  updateScheduledNotifs,
  getReminderPrefs,
  setReminderPrefs,
} from '../js/splash/notifScheduler';

const exampleReminderSchemes = {
  weekly: {
    title: {
      en: 'Please take a moment to label your trips',
      es: 'Por favor, tómese un momento para etiquetar sus viajes',
    },
    text: {
      en: 'Click to open the app and view unlabeled trips',
      es: 'Haga clic para abrir la aplicación y ver los viajes sin etiquetar',
    },
    schedule: [
      { start: 0, end: 1, intervalInDays: 1 },
      { start: 3, end: 5, intervalInDays: 2 },
    ],
    defaultTime: '21:00',
  },
  'week-quarterly': {
    title: {
      en: 'Please take a moment to label your trips',
      es: 'Por favor, tómese un momento para etiquetar sus viajes',
    },
    text: {
      en: 'Click to open the app and view unlabeled trips',
      es: 'Haga clic para abrir la aplicación y ver los viajes sin etiquetar',
    },
    schedule: [
      { start: 0, end: 1, intervalInDays: 1 },
      { start: 3, end: 5, intervalInDays: 2 },
    ],
    defaultTime: '22:00',
  },
  passive: {
    title: {
      en: 'Please take a moment to label your trips',
      es: 'Por favor, tómese un momento para etiquetar sus viajes',
    },
    text: {
      en: 'Click to open the app and view unlabeled trips',
      es: 'Haga clic para abrir la aplicación y ver los viajes sin etiquetar',
    },
    schedule: [
      { start: 0, end: 1, intervalInDays: 1 },
      { start: 3, end: 5, intervalInDays: 2 },
    ],
    defaultTime: '23:00',
  },
};

jest.mock('i18next', () => ({
  resolvedLanguage: 'en',
}));

jest.mock('../js/services/commHelper', () => ({
  getUser: jest.fn(),
  updateUser: jest.fn(),
}));
const mockGetUser = getUser as jest.Mock;
const mockUpdateUser = updateUser as jest.Mock;

jest.mock('../js/plugin/clientStats', () => ({
  ...jest.requireActual('../js/plugin/clientStats'),
  addStatReading: jest.fn(),
}));

jest.mock('../js/plugin/logger', () => ({
  ...jest.requireActual('../js/plugin/logger'),
  logDebug: jest.fn(),
}));

jest.mock('../js/splash/notifScheduler', () => ({
  ...jest.requireActual('../js/splash/notifScheduler'),
  // for getScheduledNotifs
  getNotifs: jest.fn(),
  // for updateScheduledNotifs
  calcNotifTimes: jest.fn(),
  removeEmptyObjects: jest.fn(),
  areAlreadyScheduled: jest.fn(),
  scheduleNotifs: jest.fn(),
}));

jest.mock('../js/plugin/clientStats');

describe('getScheduledNotifs', () => {
  it('should resolve with notifications while not actively scheduling', async () => {
    // getScheduledNotifs arguments
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    // create the mock notifs from cordova plugin
    const mockNotifs = [{ trigger: { at: DateTime.now().toJSDate() } }];
    // create the expected result
    const expectedResult = [
      {
        key: DateTime.fromJSDate(mockNotifs[0].trigger.at).toFormat('DDD'),
        val: DateTime.fromJSDate(mockNotifs[0].trigger.at).toFormat('t'),
      },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the function
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should resolve with notifications if actively scheduling', async () => {
    // getScheduledNotifs arguments
    const isScheduling = true;
    const scheduledPromise = Promise.resolve();
    // create the mock notifs from cordova plugin
    const mockNotifs = [{ trigger: { at: DateTime.now().toJSDate() } }];
    // create the expected result
    const expectedResult = [
      {
        key: DateTime.fromJSDate(mockNotifs[0].trigger.at).toFormat('DDD'),
        val: DateTime.fromJSDate(mockNotifs[0].trigger.at).toFormat('t'),
      },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the funciton
    const scheduledNotifs = await getScheduledNotifs(isScheduling, scheduledPromise);

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should handle case where no notifications are present', async () => {
    // getScheduledNotifs arguments
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    // create the mock notifs from cordova plugin
    const mockNotifs = [];
    // create the expected result
    const expectedResult = [];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the funciton
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should handle the case where greater than 5 notifications are present', async () => {
    // getScheduledNotifs arguments
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    // create the mock notifs from cordova plugin (greater than 5 notifications)
    const mockNotifs = [
      { trigger: { at: DateTime.now().toJSDate() } },
      { trigger: { at: DateTime.now().plus({ weeks: 1 }).toJSDate() } },
      { trigger: { at: DateTime.now().plus({ weeks: 2 }).toJSDate() } },
      { trigger: { at: DateTime.now().plus({ weeks: 3 }).toJSDate() } },
      { trigger: { at: DateTime.now().plus({ weeks: 4 }).toJSDate() } },
      { trigger: { at: DateTime.now().plus({ weeks: 5 }).toJSDate() } },
      { trigger: { at: DateTime.now().plus({ weeks: 6 }).toJSDate() } },
      { trigger: { at: DateTime.now().plus({ weeks: 7 }).toJSDate() } },
    ];
    // create the expected result (only the first 5 notifications)
    const expectedResult = [
      {
        key: DateTime.fromJSDate(mockNotifs[0].trigger.at as Date).toFormat('DDD'),
        val: DateTime.fromJSDate(mockNotifs[0].trigger.at as Date).toFormat('t'),
      },
      {
        key: DateTime.fromJSDate(mockNotifs[1].trigger.at as Date).toFormat('DDD'),
        val: DateTime.fromJSDate(mockNotifs[1].trigger.at as Date).toFormat('t'),
      },
      {
        key: DateTime.fromJSDate(mockNotifs[2].trigger.at as Date).toFormat('DDD'),
        val: DateTime.fromJSDate(mockNotifs[2].trigger.at as Date).toFormat('t'),
      },
      {
        key: DateTime.fromJSDate(mockNotifs[3].trigger.at as Date).toFormat('DDD'),
        val: DateTime.fromJSDate(mockNotifs[3].trigger.at as Date).toFormat('t'),
      },
      {
        key: DateTime.fromJSDate(mockNotifs[4].trigger.at as Date).toFormat('DDD'),
        val: DateTime.fromJSDate(mockNotifs[4].trigger.at as Date).toFormat('t'),
      },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the funciton
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });
});

describe('updateScheduledNotifs', () => {
  afterEach(() => {
    jest.restoreAllMocks(); // Restore mocked functions after each test
  });

  beforeEach(() => {
    // mock the getUser function
    mockGetUser.mockImplementation(() =>
      Promise.resolve({
        // These values are **important**...
        //   reminder_assignment: must match a key from the reminder scheme above,
        //   reminder_join_date: must match the first day of the mocked notifs below in the tests,
        //   reminder_time_of_day: must match the defaultTime from the chosen reminder_assignment in the reminder scheme above
        reminder_assignment: 'weekly',
        reminder_join_date: '2023-11-14',
        reminder_time_of_day: '21:00',
      }),
    );
  });

  it('should resolve after scheduling notifications', async () => {
    // updateScheduleNotifs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = false;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create an empty array of mock notifs from cordova plugin
    let mockNotifs: any[] = [];
    // create the expected result
    const expectedResultcheduleNotifs = [
      { key: 'November 19, 2023', val: '9:00 PM' },
      { key: 'November 17, 2023', val: '9:00 PM' },
      { key: 'November 15, 2023', val: '9:00 PM' },
      { key: 'November 14, 2023', val: '9:00 PM' },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'cancelAll')
      .mockImplementation((callback) => {
        mockNotifs = [];
        callback();
      });
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'schedule')
      .mockImplementation((arg, callback) => {
        arg.forEach((notif) => {
          mockNotifs.push(notif);
        });
        console.log('called mockNotifs.concat(arg)', mockNotifs);
        callback(arg);
      });
    // call the function
    await updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);
    const scheduledNotifs = await getScheduledNotifs(isScheduling, scheduledPromise);

    expect(scheduledNotifs).toHaveLength(4);
    expect(scheduledNotifs[0].key).toEqual(expectedResultcheduleNotifs[0].key);
    expect(scheduledNotifs[1].key).toEqual(expectedResultcheduleNotifs[1].key);
    expect(scheduledNotifs[2].key).toEqual(expectedResultcheduleNotifs[2].key);
    expect(scheduledNotifs[3].key).toEqual(expectedResultcheduleNotifs[3].key);
  });

  it('should resolve without scheduling if notifications are already scheduled', async () => {
    // updateScheduleNotifs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = false;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create the mock notifs from cordova plugin (must match the notifs that will generate from the reminder scheme above...
    // in this case: exampleReminderSchemes.weekly, because getUser is mocked to return reminder_assignment: 'weekly')
    const mockNotifs = [
      { trigger: { at: DateTime.fromFormat('2023-11-14 21:00', 'yyyy-MM-dd HH:mm').toJSDate() } },
      { trigger: { at: DateTime.fromFormat('2023-11-15 21:00', 'yyyy-MM-dd HH:mm').toJSDate() } },
      { trigger: { at: DateTime.fromFormat('2023-11-17 21:00', 'yyyy-MM-dd HH:mm').toJSDate() } },
      { trigger: { at: DateTime.fromFormat('2023-11-19 21:00', 'yyyy-MM-dd HH:mm').toJSDate() } },
    ];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the function
    await updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(logDebug).toHaveBeenCalledWith('Already scheduled, not scheduling again');
  });

  it('should wait for the previous scheduling to finish if isScheduling is true', async () => {
    // updateScheduleNotifs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = true;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create an empty array of mock notifs from cordova plugin
    const mockNotifs = [];

    // mock the cordova plugin
    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifs));
    // call the function
    await updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(logDebug).toHaveBeenCalledWith(
      'ERROR: Already scheduling notifications, not scheduling again',
    );
  });

  it('should log an error message if the reminder scheme is missing', async () => {
    // updateScheduleNotifs arguments
    let reminderSchemes: any = exampleReminderSchemes;
    delete reminderSchemes.weekly; // delete the weekly reminder scheme, to create a missing reminder scheme error
    let isScheduling: boolean = false;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // call the function
    await updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(logDebug).toHaveBeenCalledWith('Error: Reminder scheme not found');
  });
});

describe('getReminderPrefs', () => {
  afterEach(() => {
    jest.restoreAllMocks(); // Restore mocked functions after each test
  });

  it('should resolve with newly initialilzed reminder prefs when user does not exist', async () => {
    // getReminderPrefs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = true;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create the expected result
    const expectedResult = {
      reminder_assignment: 'weekly',
      reminder_join_date: '2023-11-14',
      reminder_time_of_day: '21:00',
    };

    // mock the getUser function to return a user that does not exist:
    // first, as undefined to get the not-yet-created user behavior,
    // then, as a user with reminder prefs to prevent infinite looping (since updateUser does not update the user)
    mockGetUser
      .mockImplementation(() =>
        Promise.resolve({
          reminder_assignment: 'weekly',
          reminder_join_date: '2023-11-14',
          reminder_time_of_day: '21:00',
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          reminder_assignment: undefined,
          reminder_join_date: undefined,
          reminder_time_of_day: undefined,
        }),
      );
    // mock addStatReading for the setReminderPrefs portion of getReminderPrefs
    // typescript causes us to need to use "... as jest.Mock" to mock funcitons that are imported from other files
    (addStatReading as jest.Mock).mockImplementation(() => Promise.resolve());

    // call the function
    const { reminder_assignment, reminder_join_date, reminder_time_of_day } =
      await getReminderPrefs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(logDebug).toHaveBeenCalledWith('User just joined, Initializing reminder prefs');
    expect(logDebug).toHaveBeenCalledWith('Added reminder prefs to client stats');
  });

  it('should resolve with reminder prefs when user exists', async () => {
    // getReminderPrefs arguments
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = true;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();
    // create the expected result
    const expectedResult = {
      reminder_assignment: 'weekly',
      reminder_join_date: '2023-11-14',
      reminder_time_of_day: '21:00',
    };

    // mock the getUser function
    mockGetUser.mockImplementation(() =>
      Promise.resolve({
        // These values are **important**...
        //   reminder_assignment: must match a key from the reminder scheme above,
        //   reminder_join_date: must match the first day of the mocked notifs below in the tests,
        //   reminder_time_of_day: must match the defaultTime from the chosen reminder_assignment in the reminder scheme above
        reminder_assignment: 'weekly',
        reminder_join_date: '2023-11-14',
        reminder_time_of_day: '21:00',
      }),
    );

    // call the function
    const { reminder_assignment, reminder_join_date, reminder_time_of_day } =
      await getReminderPrefs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise);

    expect(reminder_assignment).toEqual(expectedResult.reminder_assignment);
    expect(reminder_join_date).toEqual(expectedResult.reminder_join_date);
    expect(reminder_time_of_day).toEqual(expectedResult.reminder_time_of_day);
  });
});

describe('setReminderPrefs', () => {
  afterEach(() => {
    jest.restoreAllMocks(); // Restore mocked functions after each test
  });

  beforeEach(() => {
    // mock the getUser function
    mockGetUser.mockImplementation(() =>
      Promise.resolve({
        // These values are **important**...
        //   reminder_assignment: must match a key from the reminder scheme above,
        //   reminder_join_date: must match the first day of the mocked notifs below in the tests,
        //   reminder_time_of_day: must match the defaultTime from the chosen reminder_assignment in the reminder scheme above
        reminder_assignment: 'weekly',
        reminder_join_date: '2023-11-14',
        reminder_time_of_day: '21:00',
      }),
    );
  });

  it('should resolve with promise that calls updateScheduledNotifs', async () => {
    // setReminderPrefs arguments
    const newPrefs: any = {
      reminder_time_of_day: '21:00',
    };
    const reminderSchemes: any = exampleReminderSchemes;
    let isScheduling: boolean = true;
    const setIsScheduling: Function = jest.fn((val: boolean) => (isScheduling = val));
    const scheduledPromise: Promise<any> = Promise.resolve();

    // mock the updateUser function
    mockUpdateUser.mockImplementation(() => Promise.resolve());

    // call the function
    setReminderPrefs(
      newPrefs,
      reminderSchemes,
      isScheduling,
      setIsScheduling,
      scheduledPromise,
    ).then(() => {
      // in the implementation in ProfileSettings.jsx,
      // refresNotificationSettings();
      // would be called next
    });

    expect(logDebug).toBeCalledWith('Added reminder prefs to client stats');
  });
});
