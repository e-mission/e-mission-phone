import React, { useState } from "react";
import { angularize} from "../angular-react-helper";
import { Modal, StyleSheet } from 'react-native';
import { Text, List, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, object, bool, func } from "prop-types";
import { TimePickerModal } from 'react-native-paper-dates';

const TimeSelect = ({ visible, setVisible, defaultTime, updateFunc }) => {

    const onDismiss = React.useCallback(() => {
        setVisible(false)
    }, [setVisible])

    const onConfirm = React.useCallback(
        ({ hours, minutes }) => {
        setVisible(false);
        const d = new Date();
        d.setHours(hours, minutes);
        updateFunc(true, d);
        },
        [setVisible, updateFunc]
    );

    return (
        <Modal visible={visible} onDismiss={() => setVisible(false)}
        transparent={true}>
            <TimePickerModal
            visible={visible}
            onDismiss={onDismiss}
            onConfirm={onConfirm}
            hours={defaultTime?.getHours()}
            minutes={defaultTime?.getMinutes()}
            />
        </Modal>
    )
}
TimeSelect.prototypes = {
    visible: bool,
    setVisible:func,
    defaultTime: object,
    updateFunc: func
}

const ReminderTime = ({ rowText, timeVar, defaultTime, updateFunc }) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [pickTimeVis, setPickTimeVis] = useState(false);

    let rightComponent = <List.Icon icon={"clock"}/>;

    return (
        <>
        <List.Item 
        style={styles.item(colors.surface)}
        title={t(rowText, {time: timeVar})}
        titleStyle={styles.title}
        onPress={(e) => setPickTimeVis(true)}
        right={() => rightComponent}
        />

        <TimeSelect visible={pickTimeVis} setVisible={setPickTimeVis} defaultTime={defaultTime} updateFunc={updateFunc}></TimeSelect>

        </>
    );
};
const styles = StyleSheet.create({
    item: (surfaceColor) => ({
        justifyContent: 'space-between',
        alignContent: 'center',
        backgroundColor: surfaceColor,
        margin: 1,
    }),
    title: {
        fontSize: 16,
        marginVertical: 2,
    },
  });
ReminderTime.propTypes = {
    rowText: string,
    timeVar: string,
    defaultTime: object,
    updateFunc: func
}

angularize(ReminderTime, 'reminderTime', 'emission.main.control.reminderTime'); 
export default ReminderTime;