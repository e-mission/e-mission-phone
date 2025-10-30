import { DateTime } from 'luxon';
import {
  getScheduledNotifs,
  updateScheduledNotifs,
  initReminderPrefs,
} from '../js/splash/notifScheduler';
import { mockReminders } from '../__mocks__/cordovaMocks';

const weeklyScheme = {
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
};
const weekQuarterlyScheme = {
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
};
const passiveScheme = {
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

describe('notifScheduler', () => {
  describe('initReminderPrefs', () => {
    beforeEach(() => {
      mockReminders();
      jest.mock('../js/services/commHelper', () => {
        const _commHelperUser = {};
        return {
          getUser: function () {
            return Promise.resolve(_commHelperUser);
          },
          updateUser: function (user) {
            Object.assign(_commHelperUser, user);
            return Promise.resolve();
          },
        };
      });
    });

    it('initializes a new user to a random reminder scheme with prefs', async () => {
      const prefs = await initReminderPrefs({
        ...weeklyScheme,
        ...weekQuarterlyScheme,
        ...passiveScheme,
      });

      expect(prefs.reminder_join_date).toEqual(DateTime.now().toFormat('yyyy-MM-dd'));
      if (prefs.reminder_assignment === 'weekly') {
        expect(prefs.reminder_time_of_day).toEqual('21:00');
      } else if (prefs.reminder_assignment === 'week-quarterly') {
        expect(prefs.reminder_time_of_day).toEqual('22:00');
      } else if (prefs.reminder_assignment === 'passive') {
        expect(prefs.reminder_time_of_day).toEqual('23:00');
      } else {
        fail(`Unexpected reminder assignment: ${prefs.reminder_assignment}`);
      }
    });
  });

  describe('updateScheduledNotifs', () => {
    it('schedules correct notifications for weekly scheme', async () => {
      await updateScheduledNotifs(weeklyScheme['weekly'], {
        reminder_assignment: 'weekly',
        reminder_join_date: DateTime.now().toFormat('yyyy-MM-dd'),
        reminder_time_of_day: '21:00',
      });

      const scheduledNotifs = await getScheduledNotifs();
      expect(scheduledNotifs).toHaveLength(4); // 4 notifications for weekly scheme
    });
  });
});
