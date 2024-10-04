import React from 'react';
import { List, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../appTheme';

const PermissionItem = ({ check }) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  let icon, color;
  if (check.status) {
    icon = 'check-circle';
    color = colors.success;
  } else {
    icon = check.isOptional ? 'minus-circle-off' : 'alert-circle-outline';
    color = check.isOptional ? colors.warn : colors.error;
  }

  return (
    <List.Item
      onPress={() => check.fix()}
      title={t(check.name)}
      description={t(check.desc)}
      descriptionNumberOfLines={5}
      left={() => <List.Icon icon={icon} color={color} />}
      right={() => <List.Icon icon="chevron-right" />}
      style={{ paddingHorizontal: 0 }}
      contentStyle={{ paddingHorizontal: 16 }}
    />
  );
};

export default PermissionItem;
