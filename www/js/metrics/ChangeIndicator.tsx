import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import colorLib from 'color';
import { useAppTheme } from '../appTheme';

export type CarbonChange = { low: number; high: number } | undefined;
type Props = { change: CarbonChange };

const ChangeIndicator = ({ change }: Props) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const changeSign = (changeNum) => (changeNum > 0 ? '+' : '-');

  const changeText = useMemo(() => {
    if (!change) return;
    let low = isFinite(change.low) ? Math.round(Math.abs(change.low)) : '∞';
    let high = isFinite(change.high) ? Math.round(Math.abs(change.high)) : '∞';

    if (Math.round(change.low) == Math.round(change.high)) {
      let text = changeSign(change.low) + low + '%';
      return text;
    } else if (!(isFinite(change.low) || isFinite(change.high))) {
      return ''; //if both are not finite, no information is really conveyed, so don't show
    } else {
      let text = `${changeSign(change.low) + low}% / ${changeSign(change.high) + high}%`;
      return text;
    }
  }, [change]);

  return changeText != '' ? (
    <View style={styles.view(change && change.low > 0 ? colors.danger : colors.success)}>
      <Text style={styles.importantText(colors)}>{changeText + '\n'}</Text>
      <Text style={styles.text(colors)}>{`${t('metrics.this-week')}`}</Text>
    </View>
  ) : (
    <></>
  );
};

const styles: any = {
  text: (colors) => ({
    color: colors.onPrimary,
    fontWeight: '400',
    textAlign: 'center',
  }),
  importantText: (colors) => ({
    color: colors.onPrimary,
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 16,
  }),
  view: (color) => ({
    backgroundColor: colorLib(color).alpha(0.85).rgb().toString(),
    padding: 2,
    borderStyle: 'solid',
    borderColor: colorLib(color).darken(0.4).rgb().toString(),
    borderWidth: 2.5,
    borderRadius: 10,
  }),
};

export default ChangeIndicator;
