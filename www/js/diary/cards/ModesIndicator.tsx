import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import color from 'color';
import TimelineContext from '../../TimelineContext';
import { logDebug } from '../../plugin/logger';
import { getBaseModeByKey, getBaseModeByValue } from '../diaryHelper';
import { Text, Icon, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

const ModesIndicator = ({ trip, detectedModes }) => {
  const { t } = useTranslation();
  const { labelOptions, labelFor, confirmedModeFor } = useContext(TimelineContext);
  const { colors } = useTheme();

  const indicatorBackgroundColor = color(colors.onPrimary).alpha(0.8).rgb().string();
  let indicatorBorderColor = color('black').alpha(0.5).rgb().string();

  let modeViews;
  const confirmedModeForTrip = confirmedModeFor(trip);
  if (labelOptions && confirmedModeForTrip?.value) {
    const baseMode = getBaseModeByKey(confirmedModeForTrip.baseMode);
    indicatorBorderColor = baseMode.color;
    logDebug(`TripCard: got baseMode = ${JSON.stringify(baseMode)}`);
    modeViews = (
      <View style={s.mode}>
        <Icon source={baseMode.icon} color={baseMode.color} size={15} />
        <Text
          accessibilityLabel={`Labeled mode: ${baseMode.icon}`}
          style={{
            color: baseMode.color,
            fontSize: 12,
            fontWeight: '500',
            textDecorationLine: 'underline',
          }}>
          {confirmedModeForTrip.text}
        </Text>
      </View>
    );
  } else if (
    detectedModes?.length > 1 ||
    (detectedModes?.length == 1 && detectedModes[0].mode != 'UNKNOWN')
  ) {
    // show detected modes if there are more than one, or if there is only one and it's not UNKNOWN
    modeViews = (
      <>
        <Text style={{ fontSize: 12, fontWeight: '500' }}>{t('diary.detected')}</Text>
        {detectedModes?.map?.((pct, i) => (
          <View key={i} style={s.mode}>
            <Icon source={pct.icon} color={pct.color} size={15} />
            {/* show percents if there are more than one detected modes */}
            {detectedModes?.length > 1 && (
              <Text
                accessibilityLabel={`${pct.icon}, ${pct.pct}%`}
                style={{ color: pct.color, fontSize: 12 }}>
                {pct.pct}%
              </Text>
            )}
          </View>
        ))}
      </>
    );
  }

  return (
    modeViews && (
      <View style={s.indicatorWrapper}>
        <View
          style={[
            s.modesIndicator,
            { backgroundColor: indicatorBackgroundColor, borderColor: indicatorBorderColor },
          ]}>
          {modeViews}
        </View>
      </View>
    )
  );
};

const s = StyleSheet.create({
  indicatorWrapper: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: 5,
  },
  modesIndicator: {
    marginVertical: 5,
    marginHorizontal: 'auto',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 4,
  },
  mode: {
    flexDirection: 'row',
    gap: 2,
  },
});

export default ModesIndicator;
