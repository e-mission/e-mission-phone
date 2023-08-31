import React from 'react';
import { SegmentedButtons, SegmentedButtonsProps, useTheme } from "react-native-paper";

type Props = Omit<SegmentedButtonsProps, 'buttons'|'value'|'multiSelect'> & {
  onValueChange: (value: string) => void,
  value: string,
  options: { icon: string, value: string }[],
}
const ToggleSwitch = ({ options, onValueChange, value, ...rest }: Props) => {

  const { colors} = useTheme();

  return (
    <SegmentedButtons onValueChange={onValueChange} value={value}
      buttons={options.map(o => ({
        value: o.value,
        icon: o.icon,
        uncheckedColor: colors.onSurfaceDisabled,
        showSelectedCheck: true,
        style: {
          minWidth: 0,
          borderTopWidth: rest.density == 'high' ? 0 : 1,
          borderBottomWidth: rest.density == 'high' ? 0 : 1,
          backgroundColor: value == o.value ? colors.elevation.level2 : colors.surfaceDisabled,
        },
      }))} {...rest} />
  )
}

export default ToggleSwitch;
