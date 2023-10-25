import React from "react";
import { StyleSheet } from 'react-native';
import { List, Switch, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";

const SettingRow = ({textKey, iconName=undefined, action, desc=undefined, switchValue=undefined, descStyle=undefined}) => {
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
        descriptionStyle={descStyle ? descStyle : styles.description}
        descriptionNumberOfLines={4}
        onPress={(e) => action(e)}
        right={() => rightComponent}
        />
    );
};
export const styles = StyleSheet.create({
    item: (surfaceColor) => ({
        justifyContent: 'space-between',
        alignContent: 'center',
        backgroundColor: surfaceColor,
        margin: 1,
    }),
    title: {
        fontSize: 14,
        marginVertical: 2,
    },
    description: {
        fontSize: 12,
    },
  });

export default SettingRow;
