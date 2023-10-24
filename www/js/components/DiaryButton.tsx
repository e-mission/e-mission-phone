import React from "react";
import { StyleSheet } from 'react-native';
import { Button, ButtonProps, useTheme } from 'react-native-paper';
import color from 'color';
import { Icon } from "./Icon";

type Props = ButtonProps & { fillColor?: string, borderColor?: string };
const DiaryButton = ({ children, fillColor, borderColor, icon, ...rest } : Props) => {

  const { colors } = useTheme();
  const textColor = rest.textColor || (fillColor ? colors.onPrimary : colors.primary);

  return (
    <Button mode="elevated"
      textColor={textColor}
      buttonColor={fillColor || colors.onPrimary}
      style={s.button(borderColor, fillColor, colors)}
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

const blackAlpha15 = color('black').alpha(0.15).rgb().string();
const s = StyleSheet.create({
  button: ((borderColor, fillColor, colors) => ({
    width: '100%',
    maxWidth: 200,
    margin: 'auto',
    borderColor: borderColor || (fillColor ? blackAlpha15 : colors.primary),
    borderWidth: 1.5,
  })) as any,
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
