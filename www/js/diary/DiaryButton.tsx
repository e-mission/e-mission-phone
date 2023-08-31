import React from "react";
import { StyleSheet } from 'react-native';
import { Button, ButtonProps, useTheme } from 'react-native-paper';
import { Icon } from "../components/Icon";

type Props = ButtonProps & { fillColor?: string };
const DiaryButton = ({ children, fillColor, icon, ...rest } : Props) => {

  const { colors } = useTheme();
  const style = fillColor ? { color: colors.onPrimary }
                          : { borderColor: colors.primary, borderWidth: 1.5 };

  return (
    <Button mode="elevated"
      buttonColor={fillColor || "white"} style={style}
      labelStyle={fillColor ? {color: 'white', ...s.label} : s.label}
      contentStyle={s.buttonContent}
      {...rest}>
      <>
        {icon &&
          <Icon icon={icon} iconColor={fillColor ? 'white' : colors.primary}
            size={18} style={s.icon} />
        }
        {children}
      </>
    </Button>
  );
};

const s = StyleSheet.create({
  buttonContent: {
    height: 25,
  },
  label: {
    marginHorizontal: 5,
    marginVertical: 0,
    fontSize: 13,
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  icon: {
    marginRight: 4,
    verticalAlign: 'middle',
  }
});

export default DiaryButton;
