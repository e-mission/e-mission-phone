import React from 'react';
import { Card, List, Text, Button, useTheme } from 'react-native-paper';
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

  async function fakeMonitorCallback(state: String) {
    // If we don't do this, the results start accumulating in the device object
    // first call, we put a result into the device
    // second call, the device already has a result, so we put another one in...
    const deviceWithoutResult = { ...device };
    deviceWithoutResult.monitorResult = undefined;
    deviceWithoutResult.rangeResult = undefined;
    window['cordova'].plugins.locationManager.getDelegate().didDetermineStateForRegion({
      region: deviceWithoutResult,
      eventType: 'didDetermineStateForRegion',
      state: state,
    });
  }

  async function fakeRangeCallback() {
    const deviceWithBeacons = { ...device };
    deviceWithBeacons.monitorResult = undefined;
    deviceWithBeacons.rangeResult = undefined;
    const beacons = [
      {
        uuid: device.uuid,
        major: device.major | 4567,
        minor: device.minor | 1945,
        proximity: 'ProximityNear',
        accuracy: Math.random() * 1.33,
        rssi: Math.random() * -62,
      },
    ];
    deviceWithBeacons.minor = device.minor | 4567;
    deviceWithBeacons.minor = device.minor | 4567;
    window['cordova'].plugins.locationManager.getDelegate().didRangeBeaconsInRegion({
      region: deviceWithBeacons,
      beacons: beacons,
      eventType: 'didRangeBeaconsInRegion',
      state: 'CLRegionStateInside',
    });
  }

  return (
    <Card style={{ backgroundColor: bgColor, ...cardStyles.card }}>
      <Card.Title
        title={`UUID: ${device.uuid}`}
        titleVariant="titleSmall"
        subtitle={`Configured major ${device.major} and minor ${device.minor}`} // e.g.,
        left={() => <List.Icon icon={device.in_range ? 'access-point' : 'access-point-off'} />}
      />
      <Card.Content>
        <Text style={{ backgroundColor: colors.primaryContainer }} variant="bodyMedium">
          {device.monitorResult}
        </Text>
        <Text style={{ backgroundColor: colors.secondaryContainer }} variant="bodyMedium">
          {device.rangeResult}
        </Text>
        <Text
          style={{ backgroundColor: colors.danger, color: colors.background }}
          variant="bodyLarge">
          Simulate by sending UI transitions
        </Text>
        <Card.Actions style={{ backgroundColor: colors.danger, color: colors.background }}>
          <Button mode="elevated" onPress={() => fakeMonitorCallback('CLRegionStateInside')}>
            Region Enter
          </Button>
          <Button mode="elevated" onPress={fakeRangeCallback}>
            Range
          </Button>
          <Button mode="elevated" onPress={() => fakeMonitorCallback('CLRegionStateOutside')}>
            Region Exit
          </Button>
        </Card.Actions>
      </Card.Content>
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
