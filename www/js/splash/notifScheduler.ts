import { displayErrorMsg, logDebug } from '../plugin/logger';
import { DateTime } from 'luxon';
import i18next from 'i18next';
import { ReminderScheme } from 'nrel-openpath-deploy-configs';
import { ReminderPrefs } from './userProfile';

let isScheduling = false;
let schedulingPromise;

// like python range()
function range(start, stop, step) {
  let a = [start],
    b = start;
  while (b < stop) a.push((b += step || 1));
  return a;
}

// returns an array of DateTime objects, for all times that notifications should be sent
function calcNotifTimes(scheme: ReminderScheme, prefs: ReminderPrefs): DateTime[] {
  const notifTimes: DateTime[] = [];
  for (const s of scheme.schedule) {
    // the days to send notifications, as integers, relative to day zero
    const notifDays = range(s.start, s.end, s.intervalInDays);
    for (const d of notifDays) {
      const date = DateTime.fromFormat(prefs.reminder_join_date, 'yyyy-MM-dd')
        .plus({ days: d })
        .toFormat('yyyy-MM-dd');
      const notifTime = DateTime.fromFormat(
        date + ' ' + prefs.reminder_time_of_day,
        'yyyy-MM-dd HH:mm',
      );
      if (notifTime.isValid) {
        notifTimes.push(notifTime);
      } else {
        displayErrorMsg(
          'Cannot schedule notifs with invalid time of day: ' + prefs.reminder_time_of_day,
        );
      }
    }
  }
  return notifTimes;
}

// returns true if all expected times are already scheduled
function areAlreadyScheduled(notifs: any[], expectedTimes: DateTime[]) {
  for (const t of expectedTimes) {
    if (!notifs.some((n) => DateTime.fromJSDate(n.trigger.at).equals(t))) {
      return false;
    }
  }
  return true;
}

/* remove notif actions as they do not work, can restore post routing migration */
// const setUpActions = () => {
//     const action = {
//         id: 'action',
//         title: 'Change Time',
//         launch: true
//     };
//     return new Promise((rs) => {
//         cordova.plugins.notification.local.addActions('reminder-actions', [action], rs);
//     });
// }
function debugGetScheduled(prefix) {
  window['cordova'].plugins.notification.local.getScheduled((notifs) => {
    if (!notifs?.length) return logDebug(`${prefix}, there are no scheduled notifications`);
    const time = DateTime.fromJSDate(notifs[0].trigger.at).toFormat('HH:mm');
    //was in plugin, changed to scheduler
    let scheduledNotifs: { key: string; val: string }[] = [];
    scheduledNotifs = notifs.map((n) => {
      const date = DateTime.fromJSDate(n.trigger.at).toFormat('DDD');
      const time = DateTime.fromJSDate(n.trigger.at).toFormat('t');
      return {
        key: date,
        val: time,
      };
    });
    //have the list of scheduled show up in this log
    logDebug(`${prefix}, there are ${notifs.length} scheduled notifications at ${time}; 
      first is ${scheduledNotifs[0].key} at ${scheduledNotifs[0].val}`);
  });
}

export function getScheduledNotifs() {
  return new Promise<ScheduledNotif[]>((resolve, reject) => {
    // if actively scheduling, wait for the scheduledPromise to resolve before
    // fetching the notifications
    if (isScheduling) {
      logDebug('requesting fetch while still actively scheduling, waiting on scheduledPromise');
      schedulingPromise.then(() => getNotifs().then((notifs) => resolve(notifs)));
    } else {
      getNotifs().then((notifs) => resolve(notifs));
    }
  });
}

type ScheduledNotif = { key: string; val: string };
//get scheduled notifications from cordova plugin and format them
function getNotifs() {
  return new Promise<ScheduledNotif[]>((resolve, reject) => {
    window['cordova'].plugins.notification.local.getScheduled((notifs: any[]) => {
      if (!notifs?.length) {
        logDebug('there are no notifications');
        resolve([]); //if none, return empty array
      } else {
        // some empty objects slip through, remove them from notifs
        notifs = removeEmptyObjects(notifs);
      }

      const notifSubset = notifs.slice(0, 5); //prevent near-infinite listing
      let scheduledNotifs: ScheduledNotif[] = [];
      scheduledNotifs = notifSubset.map((n) => {
        const time: string = DateTime.fromJSDate(n.trigger.at).toFormat('t');
        const date: string = DateTime.fromJSDate(n.trigger.at).toFormat('DDD');
        return {
          key: date,
          val: time,
        };
      });
      resolve(scheduledNotifs);
    });
  });
}

// schedules the notifications using the cordova plugin
function scheduleNotifs(scheme, notifTimes: DateTime[]) {
  if (isScheduling) {
    logDebug('Already scheduling notifications, not scheduling again');
    return schedulingPromise;
  } else {
    isScheduling = true;
    schedulingPromise = new Promise<void>((rs) => {
      const localeCode = i18next.resolvedLanguage || 'en';
      const nots = notifTimes.map((n) => {
        const nDate = n.toJSDate();
        const seconds = nDate.getTime() / 1000; // the id must be in seconds, otherwise the sorting won't work
        return {
          id: seconds,
          title: scheme.title[localeCode],
          text: scheme.text[localeCode],
          trigger: { at: nDate },
          // actions: 'reminder-actions',
          // data: {
          //     action: {
          //         redirectTo: 'root.main.control',
          //         redirectParams: {
          //             openTimeOfDayPicker: true
          //         }
          //     }
          // }
        };
      });
      nots.sort((a, b) => b.id - a.id); // sort notifications by id (time)
      window['cordova'].plugins.notification.local.cancelAll(() => {
        debugGetScheduled('After cancelling');
        window['cordova'].plugins.notification.local.schedule(nots, () => {
          debugGetScheduled('After scheduling');
          isScheduling = false;
          rs();
        });
      });
    });
    return schedulingPromise;
  }
}

const removeEmptyObjects = (list: any[]): any[] => list.filter((n) => Object.keys(n).length !== 0);

// determines when notifications are needed, and schedules them if not already scheduled
export async function updateScheduledNotifs(
  scheme: ReminderScheme,
  prefs: ReminderPrefs,
): Promise<void> {
  const notifTimes = calcNotifTimes(scheme, prefs);
  return new Promise<void>((resolve, reject) => {
    window['cordova'].plugins.notification.local.getScheduled((notifs: any[]) => {
      // some empty objects slip through, remove them from notifs
      notifs = removeEmptyObjects(notifs);
      if (areAlreadyScheduled(notifs, notifTimes)) {
        logDebug('Already scheduled, not scheduling again');
        resolve();
      } else {
        logDebug('Not already scheduled, scheduling now');
        scheduleNotifs(scheme, notifTimes).then(() => resolve());
      }
    });
  });
}

/* Randomly assign a scheme, set the join date to today,
    and use the default time of day from config (or noon if not specified)
   This is only called once when the user first joins the study
*/
export function initReminderPrefs(reminderSchemes: object) {
  // randomly assign from the schemes listed in config
  const schemes = Object.keys(reminderSchemes);
  const randAssignment: string = schemes[Math.floor(Math.random() * schemes.length)];
  const todayDate: string = DateTime.local().toFormat('yyyy-MM-dd');
  const defaultTime: string = reminderSchemes[randAssignment]?.defaultTime || '12:00';
  return {
    reminder_assignment: randAssignment,
    reminder_join_date: todayDate,
    reminder_time_of_day: defaultTime,
  };
}
