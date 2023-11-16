import { mockReminders } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import { DateTime } from 'luxon';
import {
  getScheduledNotifs,
  updateScheduledNotifs,
  getReminderPrefs,
  setReminderPrefs,
} from '../js/splash/notifScheduler';

mockLogger();
mockReminders();

jest.mock('../js/splash/notifScheduler', () => ({
  ...jest.requireActual('../js/splash/notifScheduler'),
  getNotifs: jest.fn(),
}));

describe('getScheduledNotifs', () => {
  it('should resolve with notifications while not actively scheduling', async () => {
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    const mockNotifications = [{ trigger: { at: DateTime.now().toMillis() } }];
    const expectedResult = [
      {
        key: DateTime.fromMillis(mockNotifications[0].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifications[0].trigger.at).toFormat('t'),
      },
    ];

    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifications));
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should resolve with notifications if actively scheduling', async () => {
    const isScheduling = true;
    const scheduledPromise = Promise.resolve();
    const mockNotifications = [{ trigger: { at: DateTime.now().toMillis() } }];
    const expectedResult = [
      {
        key: DateTime.fromMillis(mockNotifications[0].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifications[0].trigger.at).toFormat('t'),
      },
    ];

    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifications));
    const scheduledNotifs = await getScheduledNotifs(isScheduling, scheduledPromise);

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should handle case where no notifications are present', async () => {
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    const mockNotifications = [];
    const expectedResult = [];

    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifications));
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });

  it('should handle the case where greater than 5 notifications are present', async () => {
    const isScheduling = false;
    const scheduledPromise = Promise.resolve();
    const mockNotifications = [
      { trigger: { at: DateTime.now().toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 1 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 2 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 3 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 4 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 5 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 6 }).toMillis() } },
      { trigger: { at: DateTime.now().plus({ weeks: 7 }).toMillis() } },
    ];
    const expectedResult = [
      {
        key: DateTime.fromMillis(mockNotifications[0].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifications[0].trigger.at).toFormat('t'),
      },
      {
        key: DateTime.fromMillis(mockNotifications[1].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifications[1].trigger.at).toFormat('t'),
      },
      {
        key: DateTime.fromMillis(mockNotifications[2].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifications[2].trigger.at).toFormat('t'),
      },
      {
        key: DateTime.fromMillis(mockNotifications[3].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifications[3].trigger.at).toFormat('t'),
      },
      {
        key: DateTime.fromMillis(mockNotifications[4].trigger.at).toFormat('DDD'),
        val: DateTime.fromMillis(mockNotifications[4].trigger.at).toFormat('t'),
      },
    ];

    jest
      .spyOn(window['cordova'].plugins.notification.local, 'getScheduled')
      .mockImplementation((callback) => callback(mockNotifications));
    const scheduledNotifs = await getScheduledNotifs(isScheduling, Promise.resolve());

    expect(scheduledNotifs).toEqual(expectedResult);
  });
});
