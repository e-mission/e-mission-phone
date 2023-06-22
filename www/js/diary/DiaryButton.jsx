import React from "react";
import { StyleSheet } from "react-native";
import { angularize } from "../angular-react-helper";
import { Button } from 'react-native-paper';
import { string } from "prop-types";

const DiaryButton = ({ text }) => {
  return (
    <Button mode="elevated"
      buttonColor="white"
      style={buttonStyles.button}
      contentStyle={buttonStyles.buttonContent}>
      {text}
    </Button>
  );
};
DiaryButton.propTypes = {
  text: string
}

const buttonStyles = StyleSheet.create({
  button: {
    borderColor: '#0088ce',
    borderWidth: 1.5,
  },
  buttonContent: {
    height: 25,
  },
});

angularize(DiaryButton, 'emission.main.diary.button');
export default DiaryButton;

// diaryButton: {
//   flex: 1,
//   paddingHorizontal: 14,
//   paddingVertical: 5,
//   alignItems: 'center',
//   justifyContent: 'center',
//   minWidth: 100,
//   maxHeight: 40,
//   margin: 2,
//   borderRadius: 50,
//   fontSize: 12,
//   fontWeight: 500,
//   elevation: 1,
//   shadowColor: '#171717',
//   shadowOffset: { width: -2, height: 4 },
//   shadowOpacity: 0.2,
//   shadowRadius: 3,
//   backgroundColor: 'white',
//   border: '1px solid #171717',
// },
