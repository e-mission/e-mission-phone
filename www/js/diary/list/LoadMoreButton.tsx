import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

const LoadMoreButton = ({ children, onPressFn, ...otherProps }) => {
  const { colors } = useTheme();
  return (
    <View style={s.container}>
      <Button
        testID="load-button"
        style={s.btn}
        mode="outlined"
        buttonColor={colors.onPrimary}
        textColor={colors.onBackground}
        onPress={onPressFn}
        {...otherProps}>
        {children}
      </Button>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    margin: 'auto',
    marginVertical: 8,
  },
  btn: {
    maxHeight: 30,
    justifyContent: 'center',
  },
});

export default LoadMoreButton;
