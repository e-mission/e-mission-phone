import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme} from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardStyles } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import { filterToRecentWeeks, formatDateRangeOfDays, parseDataFromMetrics, generateSummaryFromData, calculatePercentChange } from './metricsHelper';
import { getAngularService } from '../angular-react-helper';

type Props = { userMetrics: MetricsData, aggMetrics: MetricsData }
const CarbonTextCard = ({ userMetrics, aggMetrics }: Props) => {

  const { colors } = useTheme();
  const { t } = useTranslation();
  const FootprintHelper = getAngularService("FootprintHelper");

  const userText = useMemo(() => {
    if(userMetrics?.distance?.length > 0) {
        //separate data into weeks
        let thisWeekDistance = filterToRecentWeeks(userMetrics?.distance)[0];
        let lastWeekDistance = filterToRecentWeeks(userMetrics?.distance)[1];
        
        //formatted distance data from this week
        let userThisWeekModeMap = parseDataFromMetrics(thisWeekDistance, 'user');
        let userThisWeekSummaryMap = generateSummaryFromData(userThisWeekModeMap, 'distance');
        let worstDistance = userThisWeekSummaryMap.reduce((prevDistance, currModeSummary) => prevDistance + currModeSummary.values, 0);

        //formatted data from last week
        let userLastWeekModeMap = {};
        let userLastWeekSummaryMap = {};
        if(lastWeekDistance) {
            userLastWeekModeMap = parseDataFromMetrics(lastWeekDistance, 'user');
            userLastWeekSummaryMap = generateSummaryFromData(userLastWeekModeMap, 'distance');
        }
        
        //setting up data to be displayed
        let textList = [];

        //calculate low-high and format range for past week
        let userPastWeek = {
            low: FootprintHelper.getFootprintForMetrics(userThisWeekSummaryMap, 0), 
            high: FootprintHelper.getFootprintForMetrics(userThisWeekSummaryMap, FootprintHelper.getHighestFootprint()), 
        };
        textList.push({label: `${t('main-metrics.past-week')} (${formatDateRangeOfDays(thisWeekDistance)})`, 
                        value: (userPastWeek.high - userPastWeek.low)==0 ? Math.round(userPastWeek.low) : Math.round(userPastWeek.low) + " - " + Math.round(userPastWeek.high)});

        //calculate low-high and format range for prev week, if exists
        if(userLastWeekSummaryMap[0]) {
            let userPrevWeek = {
                low: FootprintHelper.getFootprintForMetrics(userLastWeekSummaryMap, 0), 
                high: FootprintHelper.getFootprintForMetrics(userLastWeekSummaryMap, FootprintHelper.getHighestFootprint())
            };
            textList.push({label: `${t('main-metrics.prev-week')} (${formatDateRangeOfDays(lastWeekDistance)})`, 
                        value: (userPrevWeek.high - userPrevWeek.low)==0 ? Math.round(userPrevWeek.low) : Math.round(userPrevWeek.low) + " - " + Math.round(userPrevWeek.high)});
        } 
        
        //calculate worst-case carbon footprint
        let worstCarbon = FootprintHelper.getHighestFootprintForDistance(worstDistance);
        textList.push({label:t('main-metrics.worst-case'), value: Math.round(worstCarbon)});

        return textList;
    }
  }, [userMetrics]);

  const groupText = useMemo(() => {
    if(aggMetrics?.distance?.length > 0) 
    {
        //separate data into weeks
        let thisWeekDistance = filterToRecentWeeks(aggMetrics?.distance)[0];
        
        let aggThisWeekModeMap = parseDataFromMetrics(thisWeekDistance, "aggregate");
        let aggThisWeekSummary = generateSummaryFromData(aggThisWeekModeMap, "distance");

        // Issue 422:
        // https://github.com/e-mission/e-mission-docs/issues/422
        let aggCarbonData = [];
        for (var i in aggThisWeekSummary) {
            aggCarbonData.push(aggThisWeekSummary[i]);
            if (isNaN(aggCarbonData[i].values)) {
                console.warn("WARNING in calculating groupCarbonRecords: value is NaN for mode " + aggCarbonData[i].key + ", changing to 0");
                aggCarbonData[i].values = 0;
            }
        }

        let groupText = [];

        let aggCarbon = {
            low: FootprintHelper.getFootprintForMetrics(aggCarbonData, 0),
            high: FootprintHelper.getFootprintForMetrics(aggCarbonData, FootprintHelper.getHighestFootprint()),
        }
        console.log("testing group past week", aggCarbon);
        groupText.push({label: t('main-metrics.average'), 
            value: (aggCarbon.high - aggCarbon.low)==0 ? Math.round(aggCarbon.low) : Math.round(aggCarbon.low) + " - " + Math.round(aggCarbon.high)});

        return groupText;
    }
  }, [aggMetrics]);

  const textEntries = useMemo(() => {
    let tempText = []
    if(userText?.length){
        tempText = tempText.concat(userText);
    }
    if(groupText?.length) {
        tempText = tempText.concat(groupText);
    }
    return tempText;
  }, [userText, groupText]);
  
  const cardSubtitleText = useMemo(() => {
    const recentEntries = filterToRecentWeeks(aggMetrics?.distance).reverse().flat();
    const recentEntriesRange = formatDateRangeOfDays(recentEntries);
    return `${t('main-metrics.estimated-emissions')}, (${recentEntriesRange})`;
  }, [aggMetrics?.distance]);

  return (
    <Card style={cardStyles.card}
      contentStyle={{flex: 1}}>
    <Card.Title 
        title={t('main-metrics.footprint')}
        titleVariant='titleLarge'
        titleStyle={cardStyles.titleText(colors)}
        subtitle={cardSubtitleText}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        style={cardStyles.title(colors)} />
    <Card.Content style={cardStyles.content}>
    { textEntries?.length > 0 &&
        Object.keys(textEntries).map((i) =>
            <View key={textEntries[i].label} style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant='titleSmall'>{textEntries[i].label}</Text>
                <Text>{textEntries[i].value + ' ' + "kg CO₂"}</Text>
            </View>
        )
    }
        <Text variant='labelSmall' style={{textAlign: 'left', fontWeight: '400', marginTop: 'auto', paddingTop: 10}}>
            {/* TODO i18n */}
            {/* unlabeled means the mode is not labeled and the carbon footprint is uncertain, it may fall anywhere between 0 (best case) and 'taxi' (worst case) */}
            ²The carbon footprint of unlabeled trips is uncertain. Estimates may fall anywhere within the shown range.
        </Text>
    </Card.Content>
    </Card>
  )
}

export default CarbonTextCard;
