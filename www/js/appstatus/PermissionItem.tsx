import React from 'react';
import { List, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../appTheme';

const PermissionItem = ({ check }) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const icon = check.status ? 'check-circle-outline' : 'alpha-x-circle-outline';
  const color = check.status ? colors.success : colors.error;

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
