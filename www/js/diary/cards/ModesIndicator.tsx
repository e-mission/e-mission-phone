import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import color from "color";
import { LabelTabContext } from '../LabelTab';
import { logDebug } from '../../plugin/logger';
import { baseModeOf } from '../diaryHelper';
import { Icon } from '../../components/Icon';
import { Text, useTheme } from 'react-native-paper';

const ModesIndicator = ({ trip, detectedModes, }) => {

  // if there are no detected modes, or the only detected mode is UNKNOWN, return early
  if (!detectedModes?.length) return;
  if (detectedModes.length == 1 && detectedModes[0].mode == 'UNKNOWN') return;

  const { labelOptions } = useContext(LabelTabContext);
  const { colors } = useTheme();

  const indicatorBackgroundColor = color(colors.onPrimary).alpha(.8).rgb().string();
  let indicatorBorderColor = color('black').alpha(.5).rgb().string();

  let modeViews;
  if (trip.userInput.MODE) {
    const modeKey = trip.userInput.MODE.value;
    const modeOption = labelOptions.MODE.find(opt => opt.value == modeKey);
    const baseMode = baseModeOf(modeOption.baseMode);
    indicatorBorderColor = baseMode.color;
    logDebug(`TripCard: got baseMode = ${JSON.stringify(baseMode)}`);
    modeViews = (
      <View style={s.mode}>
        <Icon icon={baseMode.icon} iconColor={baseMode.color} size={15} />
        <Text accessibilityLabel={`Labeled mode: ${baseMode.icon}`}
          style={{color: baseMode.color, fontSize: 12, fontWeight: '500', textDecorationLine:'underline'}}>
          {trip.userInput.MODE.text}
        </Text>
      </View>
    );
  } else {
    modeViews = (<>
      <Text style={{fontSize: 12, fontWeight: '500'}}>Detected:</Text>
      {detectedModes?.map?.((pct, i) => (
        <View key={i} style={s.mode}>
          <Icon icon={pct.icon} iconColor={pct.color} size={15} />
          {/* show percents if there are more than one detected modes */}
          {detectedModes?.length > 1 &&
            <Text accessibilityLabel={`${pct.icon}, ${pct.pct}%`} style={{color: pct.color, fontSize: 12}}>{pct.pct}%</Text>
          }
        </View>
      ))}
    </>);
  }

  return (
    <View style={{position: 'absolute', width: '100%'}}>
      <View style={[s.modesIndicator, {backgroundColor: indicatorBackgroundColor, borderColor: indicatorBorderColor}]}>
        {modeViews}
      </View>
    </View>
  )
};

const s = StyleSheet.create({
  modesIndicator: {
    marginVertical: 5,
    marginHorizontal: 'auto',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
  },
  mode: {
    flexDirection: 'row',
    gap: 2,
  },
});

export default ModesIndicator;
