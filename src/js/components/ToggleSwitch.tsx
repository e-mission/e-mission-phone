import React from 'react';
import { SegmentedButtons, SegmentedButtonsProps, useTheme } from 'react-native-paper';

const ToggleSwitch = ({ value, buttons, ...rest }: SegmentedButtonsProps) => {
  const { colors } = useTheme();

  return (
    <SegmentedButtons
      value={value as any}
      buttons={buttons.map((o) => ({
        icon: o.icon,
        accessibilityLabel: o.value,
        uncheckedColor: colors.onSurfaceDisabled,
        showSelectedCheck: true,
        style: {
          minWidth: 0,
          backgroundColor: value == o.value ? colors.elevation.level1 : colors.surfaceDisabled,
        },
        ...o,
      }))}
      {...rest}
    />
  );
};

export default ToggleSwitch;
