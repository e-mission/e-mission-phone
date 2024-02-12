import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, List } from 'react-native-paper';
import { StyleSheet } from 'react-native';

type Props = any;
const BluetoothCard = ({ deviceName, deviceData }: Props) => {
  const { t } = useTranslation();
  return (
    <Card style={cardStyles.card}>
      <Card.Title
        title={deviceName}
        titleVariant="titleLarge"
        subtitle={deviceData}
        left={() => <List.Icon icon="bluetooth" />}
      />
    </Card>
  );
};

export const cardStyles = StyleSheet.create({
  card: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 10,
  },
  cardContent: {
    flex: 1,
    width: '100%',
  },
});

export default BluetoothCard;
