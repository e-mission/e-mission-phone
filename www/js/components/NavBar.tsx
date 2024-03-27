import React from 'react';
import { View, StyleSheet } from 'react-native';
import color from 'color';
import { Appbar, Button, ButtonProps, Icon, useTheme } from 'react-native-paper';

const NavBar = ({ children }) => {
  const { colors } = useTheme();
  return (
    <Appbar.Header statusBarHeight={0} elevated={true} style={s.navBar(colors.surface)}>
      {children}
    </Appbar.Header>
  );
};

export default NavBar;

// NavBarButton, a greyish button with outline, to be used inside a NavBar

type Props = ButtonProps & { icon?: string; iconSize?: number };
export const NavBarButton = ({ children, icon, iconSize, ...rest }: Props) => {
  const { colors } = useTheme();
  const buttonColor = color(colors.onBackground).alpha(0.07).rgb().string();
  const outlineColor = color(colors.onBackground).alpha(0.2).rgb().string();

  return (
    <>
      <Button
        mode="outlined"
        buttonColor={buttonColor}
        textColor={colors.onBackground}
        contentStyle={[s.btnContent, rest.contentStyle]}
        style={[s.btn(outlineColor), rest.style]}
        labelStyle={[s.btnLabel, rest.labelStyle]}
        {...rest}>
        <View style={s.textWrapper}>{children}</View>
        {icon && (
          <View style={{ justifyContent: 'center' }}>
            <Icon source={icon} color={colors.onBackground} size={iconSize || 20} />
          </View>
        )}
      </Button>
    </>
  );
};

const s = StyleSheet.create({
  navBar: (backgroundColor) => ({
    backgroundColor,
    height: 56,
    paddingHorizontal: 8,
    gap: 5,
  }),
  btn: (borderColor) => ({
    borderColor,
    borderRadius: 10,
  }),
  btnContent: {
    height: 44,
    flexDirection: 'row',
    paddingHorizontal: 2,
  },
  btnLabel: {
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
