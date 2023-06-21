import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { angularize } from "../angular-react-helper";

const LoadMoreButton = ({ children, onPressFn }) => {
  const { colors } = useTheme();
  return (
    <View style={s.container}>
      <Button style={s.btn} mode='outlined' buttonColor={colors.onPrimary}
        textColor={colors.onBackground} onPress={onPressFn}>
        {children}
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    margin: 'auto',
    marginVertical: 8,
  },
  btn: {
    maxHeight: 30,
    justifyContent: 'center'
  }
});

angularize(LoadMoreButton, 'emission.main.diary.loadmorebutton');
export default LoadMoreButton;