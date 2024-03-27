import React from 'react';
import { StyleSheet } from 'react-native';
import { List, Switch, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

type Props = {
  textKey: string;
  iconName?: string;
  action: any;
  desc?: string;
  switchValue?: boolean;
  descStyle?: any;
};
const SettingRow = ({ textKey, iconName, action, desc, switchValue, descStyle }: Props) => {
  const { t } = useTranslation(); // Access translations
  const { colors } = useTheme(); // Get theme colors

  let rightComponent;
  if (iconName) {
    rightComponent = <List.Icon icon={iconName} aria-hidden={true} />;
  } else {
    rightComponent = (
      <Switch
        value={switchValue}
        accessibilityLabel={t(textKey as any)}
        accessibilityHint={switchValue ? t('Currently enabled') : t('Currently disabled')}
      />
    );
  }

  return (
    <List.Item
      style={styles.item(colors.surface)}
      title={t(textKey as any)}
      titleStyle={styles.title}
      description={desc}
      descriptionStyle={descStyle ? descStyle : styles.description}
      descriptionNumberOfLines={4}
      accessible={true}
      accessibilityLabel={t(textKey as any)}
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
