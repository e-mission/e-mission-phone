'use strict';

angular.module('emission.splash.notifscheduler',
                    ['emission.plugin.kvstore',,
                    'emission.plugin.logger',
                    'emission.stats.clientstats'])

.factory('NotificationScheduler', function($http, $window, $ionicPlatform,
                                            ClientStats, KVStore, Logger) {

    const scheduler = {};

    const sampleScheme = {
        title: '** Please take a moment to label your trips',
        text: 'Click here to open the app and view unlabeled trips',
        schedule: [
            { start: '2023-05-06', end: '2023-05-13', intervalInDays: 1 /* daily */ },
        ],
        defaultTime: '21:00' // user can override this to their preference
    }

    const momentRange = (startDate, stopDate, step) => {
        const startM = moment(startDate);
        const stopM = moment(stopDate);
        const diff = stopM.diff(startM, 'days');
        const range = [];
        for (let i = 0; i < diff; i+=step) {
            range.push(moment(startDate).add(i, 'days'));
        }
        return range;
    };

    const calcNotifTimes = (scheme, timeOfDay) => {
        const notifTimes = [];
        for (const s of scheme.schedule) {
            const notifDays = momentRange(s.start, s.end, s.intervalInDays);
            for (const d of notifDays) {
                const notifTime = moment(d.format('YYYY-MM-DD')+' '+timeOfDay, 'YYYY-MM-DD HH:mm');
                notifTimes.push(notifTime);
            }
        }
        return notifTimes;
    }

    const areAlreadyScheduled = (notifs, notifTimes) => {
        for (const t of notifTimes) {
            if (!notifs.some((n) => moment(n.at).isSame(t))) {
                return false;
            }
        }
        return true;
    }

    const scheduleNotifs = (notifTimes) => {
        cordova.plugins.notification.local.addActions('reminder-actions', [
            { id: 'action', title: 'Change Time' }
        ]);

        const nots = notifTimes.map((n) => {
            const nDate = n.toDate();
            const seconds = nDate.getTime() / 1000;
            return {
                id: seconds,
                title: sampleScheme.title,
                text: sampleScheme.text,
                trigger: {at: nDate},
                actions: 'reminder-actions'
            }
        });
        cordova.plugins.notification.local.schedule(nots);

        cordova.plugins.notification.local.getScheduled((notifs) => {
            // Logger.log(`Got ${notifs.length} scheduled notifications: ${JSON.stringify(notifs)}`);
        });
    }

    scheduler.getUserPrefReminderTime = () => {
        return KVStore.get('userPrefReminderTime').then((result) => {
            if (result == null) {
                return sampleScheme.defaultTime;
            } else {
                return result;
            }
        });
    }

    scheduler.update = () => {
        scheduler.getUserPrefReminderTime().then((prefTimeOfDay) => {
            const notifTimes = calcNotifTimes(sampleScheme, prefTimeOfDay);
            Logger.log("Notif times = "+JSON.stringify(notifTimes));

            cordova.plugins.notification.local.getScheduled((notifs) => {
                Logger.log(`Got ${notifs.length} scheduled notifications: ${JSON.stringify(notifs)}`);
                if (areAlreadyScheduled(notifs, notifTimes)) {
                    Logger.log("Already scheduled, not scheduling again");
                } else {
                    cordova.plugins.notification.local.cancelAll();
                    Logger.log("Not already scheduled, scheduling now");
                    scheduleNotifs(notifTimes);
                }
            });
        });
    }

    $ionicPlatform.ready().then(() => {
        scheduler.update();
    });

    return scheduler;
});
