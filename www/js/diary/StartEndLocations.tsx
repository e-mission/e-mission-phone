import React from 'react';
import { View, Text } from 'react-native';
import { Icon } from '../components/Icon';
import { Divider, useTheme } from 'react-native-paper';
import { cardStyles } from './cards/DiaryCard';

type Props = {
  displayStartTime?: string, displayStartName: string,
  displayEndTime?: string, displayEndName?: string,
  centered?: boolean,
  fontSize?: number,
};

const StartEndLocations = (props: Props) => {
  
  const { colors } = useTheme();
  const fontSize = props.fontSize || 12;

  return (<>
    <View style={s.location(props.centered)}>
      {props.displayStartTime &&
        <Text style={{ padding: 10, minWidth: 'fit-content' }}>
          {props.displayStartTime}
        </Text>
      }
      <View style={s.locationIcon(colors, fontSize, true)}>
        <Icon icon='map-marker-star' iconColor={colors.onPrimary} size={fontSize} />
      </View>
      <Text numberOfLines={2} style={{fontSize: fontSize, lineHeight: fontSize}}>
        {props.displayStartName}
      </Text>
    </View>
    {(props.displayEndName != undefined) && <>
      <Divider style={{ marginVertical: 4 }} />
      <View style={s.location(props.centered)}>
        {props.displayEndTime &&
          <Text style={{ padding: 10, minWidth: 'fit-content' }}>
            {props.displayEndTime}
          </Text>
        }
        <View style={s.locationIcon(colors, fontSize)}>
          <Icon icon='flag' iconColor={colors.primary} size={fontSize} />
        </View>
        <Text numberOfLines={2} style={{fontSize: fontSize, lineHeight: fontSize}}>
          {props.displayEndName}
        </Text>
      </View>
    </>}
  </>);
}

const s = {
  location: (centered) => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: centered ? 'center' : 'flex-start',
  }),
  locationIcon: (colors, iconSize, filled?) => ({
    border: `2px solid ${colors.primary}`,
    borderRadius: 50,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: iconSize * 1.5,
    height: iconSize * 1.5,
    backgroundColor: filled ? colors.primary : colors.onPrimary,
    marginRight: 6,
  })
}

export default StartEndLocations;
