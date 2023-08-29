import React, {useMemo} from 'react';
import { View } from 'react-native';
import { useTheme, Text } from "react-native-paper";
import { useTranslation } from 'react-i18next';
import { formatForDisplay } from '../config/useImperialConfig';
import { Colors } from 'chart.js';

type Props = {
    change: number[],
}

const ChangeIndicator = ({ change }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const changeSign = function(changeNum) {
        if(changeNum > 0) {
            return "+";
        } else {
            return "-";
        }
    };

    const changeText = useMemo(() => {
        console.log("testing what change is", change);
        if(change) {
            if(change.length == 1)
            {
                let text = changeSign(change[0]) + formatForDisplay(change[0]);
                return text;
            } else {
                let text = changeSign(change[0]) + formatForDisplay(change[0]) + " / " + changeSign(change[1]) + formatForDisplay(change[1]);
                return text;
            }
        }
    },[change])
  
    return (
        (change[0]) ?
        <View style={styles.view(change[0] > 0 ? colors.danger : colors.success)}>
            <Text style={styles.importantText(colors)}>
                {`${changeText} \n`}
            </Text>
            <Text style={styles.text(colors)}>
                {`${t("% this week")}`}
            </Text>
        </View>
        :
        <></>
    )
}

const styles: any = {
    text: (colors) => ({
        color: colors.onPrimary,
        fontWeight: '400',
        textAlign: 'center'
    }),
    importantText: (colors) => ({
        color: colors.onPrimary,
        fontWeight: '500',
        textAlign: 'center',
        fontSize: 16,
    }),
    view: (color) => ({
        backgroundColor: color,
        padding: 4,
        borderStyle: 'solid',
        borderWidth: 2,
        borderRadius: 5,
    }),

  }
  
export default ChangeIndicator;