import React from 'react';
import { Card, List, useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';

type Props = any;
const BluetoothCard = ({ device, isClassic, isScanningBLE }: Props) => {
  const { colors } = useTheme();
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

  let bgColor = colors.onPrimary; // 'rgba(225,225,225,1)'
  if (isScanningBLE) {
    bgColor = device.in_range ? `rgba(200,250,200,1)` : `rgba(250,200,200,1)`;
  }

  return (
    <Card style={{ backgroundColor: bgColor, ...cardStyles.card }}>
      <Card.Title
        title={`UUID: ${device.uuid}`}
        titleVariant="titleSmall"
        subtitle={`Configured major ${device.major} and minor ${device.minor}`} // e.g.,
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
