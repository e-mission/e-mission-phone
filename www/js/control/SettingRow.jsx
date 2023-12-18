import React from 'react';
import { StyleSheet } from 'react-native';
import { List, Switch, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';


const SettingRow = ({
  textKey,
  iconName = undefined,
  action,
  desc = undefined,
  switchValue = undefined,
  descStyle = undefined,
}) => {
  const { t } = useTranslation(); // Access translations
  const { colors } = useTheme(); // Get theme colors


  let rightComponent;
  if (iconName) {
    rightComponent = (
      <List.Icon
        icon={iconName}
        accessibilityLabel={iconName}
      />
    );
  } else {
    rightComponent = (
      <Switch
        value={switchValue}
        accessibilityLabel={t(textKey)}
        accessibilityHint={
          switchValue ? t('Currently enabled') : t('Currently disabled')
        }
      />
    );
  }
  let descriptionText;
  if (desc) {
    descriptionText = desc;
  } else {
    descriptionText = '';
  }


  return (
    <List.Item
      style={styles.item(colors.surface)}
      title={t(textKey)}
      titleStyle={styles.title}
      description={descriptionText}
      descriptionStyle={descStyle ? descStyle : styles.description}
      descriptionNumberOfLines={4}
      accessibilityLabel={t(textKey)} 
      accessibilityRole="button"
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
