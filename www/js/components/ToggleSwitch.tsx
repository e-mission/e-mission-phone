import React from 'react';
import { SegmentedButtons, SegmentedButtonsProps, useTheme } from 'react-native-paper';

const ToggleSwitch = ({ value, buttons, ...rest }: SegmentedButtonsProps) => {
  const { colors } = useTheme();

  return (
    <SegmentedButtons
      value={value as any}
      buttons={buttons.map((o) => ({
        icon: o.icon,
        uncheckedColor: colors.onSurfaceDisabled,
        showSelectedCheck: true,
        style: {
          minWidth: 0,
          borderTopWidth: rest.density == 'high' ? 0 : 1,
          borderBottomWidth: rest.density == 'high' ? 0 : 1,
          backgroundColor: value == o.value ? colors.elevation.level1 : colors.surfaceDisabled,
        },
        ...o,
      }))}
      {...rest}
    />
  );
};

export default ToggleSwitch;
