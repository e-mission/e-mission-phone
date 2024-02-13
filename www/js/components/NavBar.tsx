import React from 'react';
import { View, StyleSheet } from 'react-native';
import color from 'color';
import { Appbar, Button, Icon, useTheme } from 'react-native-paper';

const NavBar = ({ children }) => {
  const { colors } = useTheme();
  return (
    <Appbar.Header
      statusBarHeight={0}
      elevated={true}
      style={{ height: 56, backgroundColor: colors.surface }}>
      {children}
    </Appbar.Header>
  );
};

export default NavBar;

// NavBarButton, a greyish button with outline, to be used inside a NavBar

export const NavBarButton = ({ children, icon, onPressAction, ...otherProps }) => {
  const { colors } = useTheme();
  const buttonColor = color(colors.onBackground).alpha(0.07).rgb().string();
  const outlineColor = color(colors.onBackground).alpha(0.2).rgb().string();

  return (
    <>
      <Button
        mode="outlined"
        buttonColor={buttonColor}
        textColor={colors.onBackground}
        contentStyle={{ height: 44, flexDirection: 'row' }}
        style={[s.btn, { borderColor: outlineColor }]}
        labelStyle={s.label}
        onPress={() => onPressAction()}
        {...otherProps}>
        <View style={s.textWrapper}>{children}</View>
        {icon && (
          <View style={{ justifyContent: 'center' }}>
            <Icon source={icon} color={colors.onBackground} size={20} />
          </View>
        )}
      </Button>
    </>
  );
};

const s = StyleSheet.create({
  btn: {
    borderRadius: 10,
    marginLeft: 5,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '400',
    height: '100%',
    marginHorizontal: 'auto',
    marginVertical: 'auto',
    display: 'flex',
  },
  icon: {
    margin: 'auto',
    width: 'auto',
    height: 'auto',
  },
  textWrapper: {
    lineHeight: '100%',
    marginHorizontal: 5,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
});
