'use strict';

angular.module('emission.splash.notifscheduler',
                    ['emission.services',
                    'emission.plugin.logger',
                    'emission.stats.clientstats',
                    'emission.config.dynamic'])

.factory('NotificationScheduler', function($http, $window, $ionicPlatform, $translate,
                                            ClientStats, DynamicConfig, CommHelper, Logger) {

    const scheduler = {};
    let _config;

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

    const setUpActions = () => {
        const actions = [
            { id: 'action', title: 'Change Time' }
        ];
        return new Promise((rs) => {
            cordova.plugins.notification.local.addActions('reminder-actions', actions, rs);
        });
    }
    
    // schedules the notifications using the cordova plugin
    const scheduleNotifs = (scheme, notifTimes) => {
        const nots = notifTimes.map((n) => {
            const nDate = n.toDate();
            const seconds = nDate.getTime() / 1000;
            return {
                id: seconds,
                title: scheme.title,
                text: scheme.text,
                trigger: {at: nDate},
                actions: 'reminder-actions'
            }
        });
        cordova.plugins.notification.local.cancelAll();
        cordova.plugins.notification.local.schedule(nots);
    }

    // determines when notifications are needed, and schedules them if not already scheduled
    const update = async () => {
        const { reminder_assignment,
                reminder_join_date,
                reminder_time_of_day} = await scheduler.getReminderPrefs();
        const scheme = _config.reminderSchemes[reminder_assignment];
        const notifTimes = calcNotifTimes(scheme, reminder_join_date, reminder_time_of_day);
        cordova.plugins.notification.local.getScheduled((notifs) => {
            Logger.log(`There are ${notifs.length} scheduled notifications`);
            if (areAlreadyScheduled(notifs, notifTimes)) {
                Logger.log("Already scheduled, not scheduling again");
            } else {
                scheduleNotifs(scheme, notifTimes);
            }
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
        const user = await CommHelper.getUser();
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
        await CommHelper.updateUser(newPrefs);
        update();
    }

    $ionicPlatform.ready().then(async () => {
        _config = await DynamicConfig.configReady();
        setUpActions();
        update();
    });

    return scheduler;
});
