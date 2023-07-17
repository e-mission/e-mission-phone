import React from "react";
import { angularize} from "../angular-react-helper";
import { StyleSheet } from 'react-native';
import { List, Switch, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, bool} from "prop-types";

const SettingRow = ({textKey, iconName, action, desc, switchValue}) => {
    const { t } = useTranslation(); //this accesses the translations
    const { colors } = useTheme(); // use this to get the theme colors instead of hardcoded #hex colors

    let rightComponent;
    if (iconName) {
        rightComponent = <List.Icon icon={iconName}/>;
    } else {
        rightComponent = <Switch value={switchValue} />;
    }
    let descriptionText;
    if(desc) {
        descriptionText = {desc};
    } else {
        descriptionText = "";
    }

    return (
        <List.Item 
        style={styles.item(colors.surface)}
        title={t(textKey)}
        titleStyle={styles.title}
        description={desc}
        onPress={(e) => action(e)}
        right={() => rightComponent}
        />
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
SettingRow.propTypes = {
    textKey: string,
    iconName: string,
    action: func,
    desc: string,
    switchValue: bool
}

angularize(SettingRow, 'SettingRow', 'emission.main.control.settingRow'); 
export default SettingRow;
