import React from "react";
import { angularize } from "../angular-react-helper";
import { Button } from 'react-native-paper';

const DiaryButton = ({ text, fillColor, ...buttonProps } : Props) => {
  return (
    <Button mode="elevated"
      buttonColor={fillColor || "white"}
      style={fillColor ? buttonStyles.fillButton : buttonStyles.outlineButton}
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

const buttonStyles : any = {
  outlineButton: {
    borderColor: '#0088ce',
    borderWidth: 1.5,
  },
  fillButton: {
    color: '#FFFFFF',
  },
  buttonContent: {
    height: 25,
  },
  label: {
    marginHorizontal: 0,
    fontSize: 13,
    fontWeight: '500',
  }
};

angularize(DiaryButton, 'emission.main.diary.button');
export default DiaryButton;
