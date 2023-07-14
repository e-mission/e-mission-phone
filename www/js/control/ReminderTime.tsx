import React from "react";
import { angularize} from "../angular-react-helper";
import { Modal, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { bool, func } from "prop-types";
import { TimePickerModal } from 'react-native-paper-dates';

const TimeSelect = ({ visible, setVisible }) => {
    // const { t } = useTranslation(); 
    // const { colors } = useTheme();
    
    const onDismiss = React.useCallback(() => {
        setVisible(false)
    }, [setVisible])

    const onConfirm = React.useCallback(
        ({ hours, minutes }) => {
        setVisible(false);
        //set settings.notification.prefReminderTimeVal to that time
        console.log({ hours, minutes });
        },
        [setVisible]
    );

    return (
        <Modal visible={visible} onDismiss={()=>setVisible(false)}>
            <Text>"hello"</Text>
            <TimePickerModal
            visible={visible}
            onDismiss={onDismiss}
            onConfirm={onConfirm}
            //would ideally get below from settings.notification.prefReminderTimeOnLoad
            hours={12}
            minutes={14}
            />
        </Modal>
    )
}
// const styles = StyleSheet.create({
//     dialog: (surfaceColor) => ({
//         backgroundColor: surfaceColor,
//         margin: 1,
//     }),
//     title:
//     {
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     content: {
//         alignItems: 'center',
//         justifyContent: 'center', 
//     },
//     button: {
//         margin: 'auto',
//     }
//   });
TimeSelect.prototypes = {
    visible: bool,
    setVisible:func
}

angularize(TimeSelect, 'timeSelect', 'emission.main.control.timeSelect'); 
export default TimeSelect;