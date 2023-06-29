import React from "react";
import { angularize} from "../angular-react-helper";
import { StyleSheet } from 'react-native';
import { List, IconButton, Switch} from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, bool} from "prop-types";

const SettingRow = ({textKey, iconName, action, desc, switchValue}) => {
    const { t } = useTranslation(); //this accesses the translations

    let rightComponent;
    if (iconName) {
        rightComponent = <IconButton icon={iconName} onPress={(e) => action(e)}/>;
    } else {
        //when toggled from OFF to ON, the switch display does not update
        //update takes when screen is "refreshed" - by tabbing btwn screens, showing policy...
        //works just fine when going from ON to OFF
        rightComponent = <Switch value={switchValue} onValueChange={(e) => action(e)}/>;
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
        justifyContent: 'space-between',
        alignContent: 'center',
        backgroundColor: '#fff',
        height: 60,
        margin: 5,
    },
    title: {
        fontSize: 16,
        marginVertical: 2,
    },
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