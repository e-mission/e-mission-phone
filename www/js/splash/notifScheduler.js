'use strict';

import angular from 'angular';
import { getConfig } from '../config/dynamicConfig';
import { addStatReading, statKeys } from '../plugin/clientStats';
import { getUser, updateUser } from '../commHelper';

angular.module('emission.splash.notifscheduler',
                    ['emission.services',
                    'emission.plugin.logger'])

.factory('NotificationScheduler', function($http, $window, $ionicPlatform, Logger) {

    const scheduler = {};
    let _config;
    let scheduledPromise = new Promise((rs) => rs());
    let isScheduling = false;

    // like python range()
    function range(start, stop, step) {
        let a = [start], b = start;
        while (b < stop)
            a.push(b += step || 1);
        return a;
    }

    // returns an array of moment objects, for all times that notifications should be sent
    const calcNotifTimes = (scheme, dayZeroDate, timeOfDay) => {
        const notifTimes = [];
        for (const s of scheme.schedule) {
            // the days to send notifications, as integers, relative to day zero
            const notifDays = range(s.start, s.end, s.intervalInDays);
            for (const d of notifDays) {
                const date = moment(dayZeroDate).add(d, 'days').format('YYYY-MM-DD')
                const notifTime = moment(date+' '+timeOfDay, 'YYYY-MM-DD HH:mm');
                notifTimes.push(notifTime);
            }
        }
        return notifTimes;
    }

    // returns true if all expected times are already scheduled
    const areAlreadyScheduled = (notifs, expectedTimes) => {
        for (const t of expectedTimes) {
            if (!notifs.some((n) => moment(n.at).isSame(t))) {
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
        cordova.plugins.notification.local.getScheduled((notifs) => {
            if (!notifs?.length)
                return Logger.log(`${prefix}, there are no scheduled notifications`);
            const time = moment(notifs?.[0].trigger.at).format('HH:mm');
            //was in plugin, changed to scheduler
            scheduler.scheduledNotifs = notifs.map((n) => {
                const time = moment(n.trigger.at).format('LT');
                const date = moment(n.trigger.at).format('LL');
                return {
                    key: date,
                    val: time
                }
            });
            //have the list of scheduled show up in this log
            Logger.log(`${prefix}, there are ${notifs.length} scheduled notifications at ${time} first is ${scheduler.scheduledNotifs[0].key} at ${scheduler.scheduledNotifs[0].val}`);
        });
    }

    //new method to fetch notifications
    scheduler.getScheduledNotifs = function() {
        return new Promise((resolve, reject) => {
            /* if the notifications are still in active scheduling it causes problems
            anywhere from 0-n of the scheduled notifs are displayed 
            if actively scheduling, wait for the scheduledPromise to resolve before fetching prevents such errors
            */
            if(isScheduling) 
            {
                console.log("requesting fetch while still actively scheduling, waiting on scheduledPromise");
                scheduledPromise.then(() => {
                    getNotifs().then((notifs) => {
                        console.log("done scheduling notifs", notifs);
                        resolve(notifs);
                    })
                })
            }
            else{
                getNotifs().then((notifs) => {
                    resolve(notifs);
                })
            }
        })
    }

    //get scheduled notifications from cordova plugin and format them
    const getNotifs = function() {
        return new Promise((resolve, reject) => {
            cordova.plugins.notification.local.getScheduled((notifs) => {
                if (!notifs?.length){
                    console.log("there are no notifications");
                    resolve([]); //if none, return empty array
                }
                
                const notifSubset = notifs.slice(0, 5); //prevent near-infinite listing
                let scheduledNotifs = [];
                scheduledNotifs = notifSubset.map((n) => {
                    const time = moment(n.trigger.at).format('LT');
                    const date = moment(n.trigger.at).format('LL');
                    return {
                        key: date,
                        val: time
                    }
                });
                resolve(scheduledNotifs);
             });
        })
    }

    // schedules the notifications using the cordova plugin
    const scheduleNotifs = (scheme, notifTimes) => {
        return new Promise((rs) => {
            isScheduling = true;
            const localeCode = i18next.resolvedLanguage;
            const nots = notifTimes.map((n) => {
                const nDate = n.toDate();
                const seconds = nDate.getTime() / 1000;
                return {
                    id: seconds,
                    title: scheme.title[localeCode],
                    text: scheme.text[localeCode],
                    trigger: {at: nDate},
                    // actions: 'reminder-actions',
                    // data: {
                    //     action: {
                    //         redirectTo: 'root.main.control',
                    //         redirectParams: {
                    //             openTimeOfDayPicker: true
                    //         }
                    //     }
                    // }
                }
            });
            cordova.plugins.notification.local.cancelAll(() => {
                debugGetScheduled("After cancelling");
                cordova.plugins.notification.local.schedule(nots, () => {
                    debugGetScheduled("After scheduling");
                    isScheduling = false;
                    rs(); //scheduling promise resolved here
                });
            });
        });
    }

    // determines when notifications are needed, and schedules them if not already scheduled
    const update = async () => {
        const { reminder_assignment,
                reminder_join_date,
                reminder_time_of_day} = await scheduler.getReminderPrefs();
        const scheme = _config.reminderSchemes[reminder_assignment];
        const notifTimes = calcNotifTimes(scheme, reminder_join_date, reminder_time_of_day);

        return new Promise((resolve, reject) => {
            cordova.plugins.notification.local.getScheduled((notifs) => {
                if (areAlreadyScheduled(notifs, notifTimes)) {
                    Logger.log("Already scheduled, not scheduling again");
                } else {
                    // to ensure we don't overlap with the last scheduling() request,
                    // we'll wait for the previous one to finish before scheduling again
                    scheduledPromise.then(() => {
                        if (isScheduling) {
                            console.log("ERROR: Already scheduling notifications, not scheduling again")
                        } else {
                            scheduledPromise = scheduleNotifs(scheme, notifTimes);
                            //enforcing end of scheduling to conisder update through
                            scheduledPromise.then(() => {
                                resolve();
                            })
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
    const initReminderPrefs = () => {
        // randomly assign from the schemes listed in config
        const schemes = Object.keys(_config.reminderSchemes);
        const randAssignment = schemes[Math.floor(Math.random() * schemes.length)];
        const todayDate = moment().format('YYYY-MM-DD');
        const defaultTime = _config.reminderSchemes[randAssignment]?.defaultTime || '12:00';
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

    scheduler.getReminderPrefs = async () => {
        const user = await getUser();
        if (user?.reminder_assignment &&
            user?.reminder_join_date &&
            user?.reminder_time_of_day) {
            return user;
        }
        // if no prefs, user just joined, so initialize them
        const initPrefs = initReminderPrefs();
        await scheduler.setReminderPrefs(initPrefs);
        return { ...user, ...initPrefs }; // user profile + the new prefs
    }

    scheduler.setReminderPrefs = async (newPrefs) => {
        await updateUser(newPrefs)
        const updatePromise = new Promise((resolve, reject) => {
            //enforcing update before moving on
            update().then(() => {
                resolve();
            });
        });

        // record the new prefs in client stats
        scheduler.getReminderPrefs().then((prefs) => {
            // extract only the relevant fields from the prefs,
            // and add as a reading to client stats
            const { reminder_assignment,
                reminder_join_date,
                reminder_time_of_day} = prefs;
            addStatReading(statKeys.REMINDER_PREFS, {
                reminder_assignment,
                reminder_join_date,
                reminder_time_of_day
            }).then(Logger.log("Added reminder prefs to client stats"));
        });

        return updatePromise;
    }

    $ionicPlatform.ready().then(async () => {
        _config = await getConfig();
        if (!_config.reminderSchemes) {
            Logger.log("No reminder schemes found in config, not scheduling notifications");
            return;
        }
        //setUpActions();
        update();
    });

    return scheduler;
});
