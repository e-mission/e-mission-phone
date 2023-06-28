import React from "react";
import { angularize } from "../angular-react-helper";
import { StyleSheet } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

const DiaryButton = ({ text, fillColor, ...buttonProps } : Props) => {

  const { colors } = useTheme();
  const style = fillColor ? { color: colors.onPrimary }
                          : { borderColor: colors.primary, borderWidth: 1.5 };

  return (
    <Button mode="elevated"
      buttonColor={fillColor || "white"} style={style}
      labelStyle={fillColor ? {color: 'white', ...buttonStyles.label} : buttonStyles.label}
      contentStyle={buttonStyles.buttonContent}
      {...buttonProps}>
      {text}
    </Button>
  );
};
interface Props {
  text: string,
  fillColor?: string,
  [key: string]: any,
}

const buttonStyles = StyleSheet.create({
  buttonContent: {
    height: 25,
  },
  label: {
    marginHorizontal: 4,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    placeItems: 'center',
    whiteSpace: 'nowrap',
  }
});

export default DiaryButton;
