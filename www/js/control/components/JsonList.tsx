import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

const JsonList = ({ data }) => {
  return Object.entries(data).map(([key, value]) => (
    <View key={key} style={{ gap: 10, paddingVertical: 5 }}>
      <Text style={styles.key}>{key}</Text>
      <Text style={styles.value}>{JSON.stringify(value, null, 2)}</Text>
      <Divider />
    </View>
  ));
};

const styles = StyleSheet.create({
  key: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  value: {
    fontFamily: 'monospace',
  },
});

export default JsonList;
