import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-native';
import { TimePickerModal } from 'react-native-paper-dates';
import SettingRow from './components/SettingRow';
import { AppContext } from '../App';
import { DateTime } from 'luxon';
import { initReminderPrefs, updateScheduledNotifs } from '../splash/notifScheduler';
import { logDebug } from '../plugin/logger';

const ReminderTimeSettingRow = () => {
  const { appConfig, userProfile, updateUserProfile } = useContext(AppContext);
  const [pickTimeVis, setPickTimeVis] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    if (!userProfile?.reminder_assignment) {
      logDebug('No reminder_assignment in profile, initializing reminder prefs');
      const prefs = initReminderPrefs(appConfig.reminderSchemes);
      updateUserProfile(prefs);
      return;
    }
    const scheme = appConfig.reminderSchemes[userProfile.reminder_assignment];
    if (!scheme) {
      logDebug('No reminder scheme found for assignment: ' + userProfile.reminder_assignment);
      return;
    }
    updateScheduledNotifs(scheme, userProfile);
  }, [userProfile]);

  function onConfirm({ hours, minutes }) {
    const d = new Date();
    d.setHours(hours, minutes);
    const dt = DateTime.fromJSDate(d);
    updateUserProfile({ reminder_time_of_day: dt.toFormat('HH:mm') });
  }

  const reminderDt = DateTime.fromFormat(userProfile.reminder_time_of_day, 'HH:mm');
  const reminderJsDate = reminderDt.toJSDate();

  return (
    <>
      <SettingRow
        textKey="control.reminders-time-of-day"
        desc={reminderDt.toFormat('t')}
        iconName="clock"
        action={() => setPickTimeVis(true)}
      />
      <Modal visible={pickTimeVis} onDismiss={() => setPickTimeVis(false)} transparent={true}>
        <TimePickerModal
          visible={pickTimeVis}
          onDismiss={() => setPickTimeVis(false)}
          onConfirm={onConfirm}
          hours={reminderJsDate.getHours()}
          minutes={reminderJsDate.getMinutes()}
        />
      </Modal>
    </>
  );
};

export default ReminderTimeSettingRow;
