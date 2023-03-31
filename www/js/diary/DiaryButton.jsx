import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { react2angular } from 'react2angular'
import { Provider as PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { Button, Chip } from 'react-native-paper';

// Use prebuilt version of RNVI in dist folder
import Icon from 'react-native-vector-icons/dist/FontAwesome';

// Generate required css
import iconFont from 'react-native-vector-icons/Fonts/FontAwesome.ttf';
const iconFontStyles = `@font-face {
  src: url(${iconFont});
  font-family: FontAwesome;
}`;

// Create stylesheet
const style = document.createElement('style');
style.type = 'text/css';
if (style.styleSheet) {
  style.styleSheet.cssText = iconFontStyles;
} else {
  style.appendChild(document.createTextNode(iconFontStyles));
}

// Inject stylesheet
document.head.appendChild(style);

export const pad = (a, b, c, d) => ({
  paddingTop: a,
  paddingRight: b ?? a,
  paddingBottom: c ?? a,
  paddingLeft: d ?? b ?? a,
})

const theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0088ce',
    primaryContainer: '#80D0FF',
    secondary: '#0088ce',
    secondaryContainer: '#80D0FF',
    
  },
  width: 2
};

const DiaryButton = ({ text }) => {
  return (
    <PaperProvider theme={theme}>
      <Button mode="elevated" buttonColor="white" style={buttonStyles.button} contentStyle={buttonStyles.buttonContent}>{text}</Button>
      {/* <Pressable style={buttonStyles.diaryButton}>
        <Text>{text}</Text>
      </Pressable> */}
    </PaperProvider>
  );
};

const buttonStyles = StyleSheet.create({
  button: {
    borderColor: '#0088ce',
    borderWidth: 1.5,
  },
  buttonContent: {
    height: 30,
  },
  diaryButton: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    maxHeight: 40,
    margin: 2,
    borderRadius: 50,
    fontSize: 12,
    fontWeight: 500,
    elevation: 1,
    shadowColor: '#171717',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    backgroundColor: 'white',
    border: '1px solid #171717',
  },
});

angular
  .module('emission.main.diary.button', [])
  .component('diaryButton', react2angular(DiaryButton, ['text']));

export default DiaryButton;