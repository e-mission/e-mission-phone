import React from 'react';
import { Card, List } from 'react-native-paper';
import { StyleSheet } from 'react-native';

type Props = any;
const BluetoothCard = ({ device, isClassic }: Props) => {
  if (isClassic) {
    return (
      <Card style={cardStyles.card}>
        <Card.Title
          title={`Name: ${device.name}`}
          titleVariant="titleLarge"
          subtitle={`ID: ${device.id}`}
          left={() => <List.Icon icon={device.is_paired ? 'bluetooth' : 'bluetooth-off'} />}
        />
      </Card>
    );
  }
  return (
    <Card style={cardStyles.card}>
      <Card.Title
        title={`Name: ${device.identifier}`}
        titleVariant="titleLarge"
        subtitle={`UUID: ...${device.uuid.slice(-13)}`} // e.g.,
        left={() => <List.Icon icon={device.in_range ? 'access-point' : 'access-point-off'} />}
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
