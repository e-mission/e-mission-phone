import React from 'react';
import { View, StyleSheet } from 'react-native';
import color from 'color';
import {
  Appbar,
  AppbarHeaderProps,
  Button,
  ButtonProps,
  Icon,
  ProgressBar,
  useTheme,
} from 'react-native-paper';

type NavBarProps = AppbarHeaderProps & { isLoading?: boolean };
const NavBar = ({ children, isLoading, ...rest }: NavBarProps) => {
  const { colors } = useTheme();
  return (
    <Appbar.Header {...rest} statusBarHeight={0} style={[s.navBar, rest.style]}>
      {children}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 }}>
        <ProgressBar
          visible={Boolean(isLoading)}
          indeterminate={true}
          color={colors.primary}
          style={{ height: 2 }}
        />
      </View>
    </Appbar.Header>
  );
};

export default NavBar;

// NavBarButton, a greyish button with outline, to be used inside a NavBar

type NavBarButtonProps = ButtonProps & { icon?: string; iconSize?: number };
export const NavBarButton = ({ children, icon, iconSize, ...rest }: NavBarButtonProps) => {
  const { colors } = useTheme();
  const buttonColor = color(colors.onBackground).alpha(0.05).rgb().string();
  const borderColor = color(colors.onBackground).alpha(0.1).rgb().string();

  return (
    <>
      <Button
        mode="outlined"
        buttonColor={buttonColor}
        textColor={colors.onBackground}
        contentStyle={[s.btnContent, rest.contentStyle]}
        style={[rest.style, { borderColor }]}
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
  navBar: {
    height: 60,
    paddingHorizontal: 8,
    gap: 5,
  },
  btnContent: {
    height: 40,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  btnLabel: {
    fontSize: 12.5,
    fontWeight: '400',
    height: '100%',
    marginHorizontal: 'auto',
    marginVertical: 'auto',
    display: 'flex',
    gap: 5,
  },
  icon: {
    margin: 'auto',
    width: 'auto',
    height: 'auto',
  },
  textWrapper: {
    lineHeight: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
});
