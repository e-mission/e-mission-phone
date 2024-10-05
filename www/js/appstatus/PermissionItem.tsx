import React from 'react';
import { List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { colors } from '../appTheme';

function iconAndColorForCheck(check) {
  if (check.status) return ['check-circle', colors.success];
  if (!check.isOptional) return ['alert-circle', colors.error];
  return [check.wasRequested ? 'minus-circle-off' : 'minus-circle-off-outline', colors.warn];
}

const PermissionItem = ({ check }) => {
  const { t } = useTranslation();
  const [icon, color] = iconAndColorForCheck(check);

  return (
    <List.Item
      onPress={() => check.fix()}
      title={t(check.name)}
      description={!check.status ? t(check.desc) : null}
      descriptionNumberOfLines={5}
      left={() => <List.Icon icon={icon} color={color} />}
      right={() => <List.Icon icon="chevron-right" />}
      style={{ paddingHorizontal: 0 }}
      contentStyle={{ paddingHorizontal: 16 }}
    />
  );
};

export default PermissionItem;
