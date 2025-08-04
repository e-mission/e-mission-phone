import React, { useContext, useState } from 'react';
import { Modal } from 'react-native';
import { TimePickerModal } from 'react-native-paper-dates';
import SettingRow from './components/SettingRow';
import { AppContext } from '../App';
import { DateTime } from 'luxon';
import { setReminderPrefs } from '../splash/notifScheduler';

const ReminderTimeSettingRow = () => {
  const { appConfig, userProfile, updateUserProfile } = useContext(AppContext);
  const [pickTimeVis, setPickTimeVis] = useState(false);

  const reminderDt = DateTime.fromFormat(userProfile.reminder_time_of_day, 'HH:mm');
  const reminderJsDate = reminderDt.toJSDate();

  function onConfirm({ hours, minutes }) {
    const d = new Date();
    d.setHours(hours, minutes);
    const dt = DateTime.fromJSDate(d);
    setReminderPrefs(
      { reminder_time_of_day: dt.toFormat('HH:mm') },
      appConfig.reminderSchemes,
      updateUserProfile,
    );
  }

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
