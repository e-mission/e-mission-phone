import React from "react";
import { StyleSheet } from 'react-native';
import { Button, ButtonProps, useTheme } from 'react-native-paper';
import color from 'color';
import { Icon } from "./Icon";

type Props = ButtonProps & { fillColor?: string, borderColor?: string };
const DiaryButton = ({ children, fillColor, borderColor, icon, ...rest } : Props) => {

  const { colors } = useTheme();

  const blackAlpha15 = color('black').alpha(0.15).rgb().string();
  const style = {
    borderColor: borderColor || (fillColor ? blackAlpha15 : colors.primary),
    borderWidth: 1.5,
  };
  const textColor = rest.textColor || (fillColor ? colors.onPrimary : colors.primary);

  return (
    <Button mode="elevated"
      textColor={textColor}
      buttonColor={fillColor || colors.onPrimary} style={style}
      labelStyle={[s.label, {color: textColor}]}
      contentStyle={s.buttonContent}
      {...rest}>
      <>
        {icon &&
          <Icon icon={icon} iconColor={textColor}
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
