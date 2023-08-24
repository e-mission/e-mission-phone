import React from 'react';
import { SegmentedButtons, useTheme } from "react-native-paper";

type Props = {
  value: string,
  setValue: (value: string) => void,
  options: { icon: string, value: string }[],
}
const ToggleSwitch = ({ value, setValue, options }) => {

  const { colors} = useTheme();

  return (
    <SegmentedButtons value={value}
      onValueChange={(v) => setValue(v)}
      density='high'
      buttons={options.map(o => ({
        value: o.value,
        icon: o.icon,
        uncheckedColor: colors.onSurfaceDisabled,
        showSelectedCheck: true,
        style: {
          minWidth: 0,
          borderTopWidth: 0,
          borderBottomWidth: 0,
          backgroundColor: value == o.value ? colors.elevation.level2 : colors.surfaceDisabled,
        },
      }))} />
  )
}

export default ToggleSwitch;
