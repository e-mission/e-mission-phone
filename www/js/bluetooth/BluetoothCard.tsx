import React from 'react';
import { Card, List } from 'react-native-paper';
import { StyleSheet } from 'react-native';

type Props = any;
const BluetoothCard = ({ device }: Props) => {
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
