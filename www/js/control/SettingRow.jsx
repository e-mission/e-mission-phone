import React from "react";
import { angularize} from "../angular-react-helper";
import { StyleSheet } from 'react-native';
import { List, IconButton, Switch} from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, bool} from "prop-types";

const SettingRow = ({textKey, iconName, action, desc, switchValue}) => {
    const { t } = useTranslation(); //this accesses the translations

    let rightComponent;
    // will using switchValue here only render when the value is true?
    if (switchValue) {
        rightComponent = <Switch value={switchValue} onValueChange={(e) => action(e)}/>;
    } else {
        rightComponent = <IconButton icon={iconName} onPress={(e) => action(e)} style={styles.icon}/>;
    }
    let descriptionText;
    if(desc) {
        descriptionText = {desc};
    } else {
        descriptionText = "";
    }

    return (
        <List.Item 
        style={styles.item}
        title={t(textKey)}
        titleStyle={styles.title}
        description={desc}
        onPress={() => console.log("empty")}
        right={() => rightComponent}
        />
    );
};
const styles = StyleSheet.create({
    item:{
        flex: .75,
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 5,
        margin: 5,
    },
    title: {
        fontSize: 16,
        marginVertical: 2,
    },
    icon: {
        marginVertical: 2,
        color: "#99FF66",
    }
  });
SettingRow.propTypes = {
    textKey: string,
    iconName: string,
    action: func,
    desc: string,
    switchValue: bool
}

angularize(SettingRow, 'SettingRow', 'emission.main.control.settingRow'); 
export default SettingRow;