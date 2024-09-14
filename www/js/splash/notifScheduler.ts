import { addStatReading } from '../plugin/clientStats';
import { getUser, updateUser } from '../services/commHelper';
import { displayErrorMsg, logDebug } from '../plugin/logger';
import { DateTime } from 'luxon';
import i18next from 'i18next';
import { ReminderSchemesConfig } from '../types/appConfigTypes';

// like python range()
function range(start, stop, step) {
  let a = [start],
    b = start;
  while (b < stop) a.push((b += step || 1));
  return a;
}

// returns an array of DateTime objects, for all times that notifications should be sent
function calcNotifTimes(scheme, dayZeroDate, timeOfDay): DateTime[] {
  const notifTimes: DateTime[] = [];
  for (const s of scheme.schedule) {
    // the days to send notifications, as integers, relative to day zero
    const notifDays = range(s.start, s.end, s.intervalInDays);
    for (const d of notifDays) {
      const date = DateTime.fromFormat(dayZeroDate, 'yyyy-MM-dd')
        .plus({ days: d })
        .toFormat('yyyy-MM-dd');
      const notifTime = DateTime.fromFormat(date + ' ' + timeOfDay, 'yyyy-MM-dd HH:mm');
      if (notifTime.isValid) {
        notifTimes.push(notifTime);
      } else {
        displayErrorMsg('Cannot schedule notifs with invalid time of day: ' + timeOfDay);
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

//new method to fetch notifications
export function getScheduledNotifs(isScheduling: boolean, scheduledPromise: Promise<any>) {
  return new Promise<ScheduledNotif[]>((resolve, reject) => {
    /* if the notifications are still in active scheduling it causes problems
        anywhere from 0-n of the scheduled notifs are displayed 
        if actively scheduling, wait for the scheduledPromise to resolve before fetching prevents such errors
        */
    if (isScheduling) {
      logDebug('requesting fetch while still actively scheduling, waiting on scheduledPromise');
      scheduledPromise.then(() => {
        getNotifs().then((notifs) => {
          resolve(notifs);
        });
      });
    } else {
      getNotifs().then((notifs) => {
        resolve(notifs);
      });
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
function scheduleNotifs(scheme, notifTimes: DateTime[], setIsScheduling: Function) {
  return new Promise<void>((rs) => {
    setIsScheduling(true);
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
        setIsScheduling(false);
        rs(); //scheduling promise resolved here
      });
    });
  });
}

const removeEmptyObjects = (list: any[]): any[] => list.filter((n) => Object.keys(n).length !== 0);

// determines when notifications are needed, and schedules them if not already scheduled
export async function updateScheduledNotifs(
  reminderSchemes: ReminderSchemesConfig,
  isScheduling: boolean,
  setIsScheduling: Function,
  scheduledPromise: Promise<any>,
): Promise<void> {
  const { reminder_assignment, reminder_join_date, reminder_time_of_day } = await getReminderPrefs(
    reminderSchemes,
    isScheduling,
    setIsScheduling,
    scheduledPromise,
  );
  const scheme = reminderSchemes[reminder_assignment];
  if (scheme === undefined) {
    logDebug('Error: Reminder scheme not found');
    return;
  }
  const notifTimes = calcNotifTimes(scheme, reminder_join_date, reminder_time_of_day);
  return new Promise<void>((resolve, reject) => {
    window['cordova'].plugins.notification.local.getScheduled((notifs: any[]) => {
      // some empty objects slip through, remove them from notifs
      notifs = removeEmptyObjects(notifs);
      if (areAlreadyScheduled(notifs, notifTimes)) {
        logDebug('Already scheduled, not scheduling again');
        resolve();
      } else {
        // to ensure we don't overlap with the last scheduling() request,
        // we'll wait for the previous one to finish before scheduling again
        scheduledPromise.then(() => {
          if (isScheduling) {
            logDebug('ERROR: Already scheduling notifications, not scheduling again');
            resolve();
          } else {
            scheduledPromise = scheduleNotifs(scheme, notifTimes, setIsScheduling);
            //enforcing end of scheduling to conisder update through
            scheduledPromise.then(() => {
              resolve();
            });
          }
        });
      }
    });
  });
}

/* Randomly assign a scheme, set the join date to today,
    and use the default time of day from config (or noon if not specified)
   This is only called once when the user first joins the study
*/
function initReminderPrefs(reminderSchemes: object): object {
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

/* EXAMPLE VALUES - present in user profile object
    reminder_assignment: 'passive',
    reminder_join_date: '2023-05-09',
    reminder_time_of_day: '21:00',
*/

interface User {
  reminder_assignment: string;
  reminder_join_date: string;
  reminder_time_of_day: string;
}

export async function getReminderPrefs(
  reminderSchemes: ReminderSchemesConfig,
  isScheduling: boolean,
  setIsScheduling: Function,
  scheduledPromise: Promise<any>,
): Promise<User> {
  const userPromise = getUser();
  const user = (await userPromise) as User;
  if (user?.reminder_assignment && user?.reminder_join_date && user?.reminder_time_of_day) {
    logDebug('User already has reminder prefs, returning them: ' + JSON.stringify(user));
    return user;
  }
  // if no prefs, user just joined, so initialize them
  logDebug('User just joined, Initializing reminder prefs');
  const initPrefs = initReminderPrefs(reminderSchemes);
  logDebug('Initialized reminder prefs: ' + JSON.stringify(initPrefs));
  await setReminderPrefs(
    initPrefs,
    reminderSchemes,
    isScheduling,
    setIsScheduling,
    scheduledPromise,
  );
  return { ...user, ...initPrefs }; // user profile + the new prefs
}

export async function setReminderPrefs(
  newPrefs: object,
  reminderSchemes: ReminderSchemesConfig,
  isScheduling: boolean,
  setIsScheduling: Function,
  scheduledPromise: Promise<any>,
): Promise<void> {
  await updateUser(newPrefs);
  const updatePromise = new Promise<void>((resolve, reject) => {
    //enforcing update before moving on
    updateScheduledNotifs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise).then(
      () => {
        resolve();
      },
    );
  });
  // record the new prefs in client stats
  getReminderPrefs(reminderSchemes, isScheduling, setIsScheduling, scheduledPromise).then(
    (prefs) => {
      // extract only the relevant fields from the prefs,
      // and add as a reading to client stats
      const { reminder_assignment, reminder_join_date, reminder_time_of_day } = prefs;
      addStatReading('set_reminder_prefs', {
        reminder_assignment,
        reminder_join_date,
        reminder_time_of_day,
      }).then(logDebug('Added reminder prefs to client stats'));
    },
  );
  return updatePromise;
}
