
import React, { useEffect, useState, useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme} from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardMargin, cardStyles, METRIC_LIST } from './MetricsTab';
import { formatForDisplay } from '../config/useImperialConfig';
import { filterToRecentWeeks, secondsToMinutes } from './metricsHelper';
import { useTranslation } from 'react-i18next';
import BarChart from '../components/BarChart';
import { getAngularService } from '../angular-react-helper';

//modes considered on foot for carbon calculation, expandable as needed
const ON_FOOT_MODES = ['WALKING', 'RUNNING', 'ON_FOOT'] as const;
// type ActiveMode = typeof ACTIVE_MODES[number];

type Props = { userMetrics: MetricsData, aggMetrics: MetricsData }
const CarbonFootprintCard = ({ userMetrics, aggMetrics }: Props) => {
    const FootprintHelper = getAngularService("FootprintHelper");
    const { colors } = useTheme();
    const { t } = useTranslation();

    console.log("metrics in carbon", userMetrics, aggMetrics);

    const [userCarbonData, setUserCarbonData] = useState([]);

    /*
     * metric2val is a function that takes a metric entry and a field and returns
     * the appropriate value.
     * for regular data (user-specific), this will return the field value
     * for avg data (aggregate), this will return the field value/nUsers
     */
    const metricToValue = function(population:'user'|'aggreagte', metric, field) {
        if(population == "user"){
            return metric[field];
        }
        else{
            return metric[field]/metric.nUsers;
        }
    }

    //testing agains global list of what is "on foot"
    //returns true | false
    const isOnFoot = function(mode: string) {
        for (let ped_mode in ON_FOOT_MODES) {
            if (mode === ped_mode) {
                return true;
            }
        }
        return false;
    }

    const parseDataFromMetrics = function(metrics, population) {
        console.log("Called parseDataFromMetrics on ", metrics);
        let mode_bins = {};
        metrics.forEach(function(metric) {
            let onFootVal = 0;

            for (let field in metric) {
                /*For modes inferred from sensor data, we check if the string is all upper case 
                by converting it to upper case and seeing if it is changed*/
                if(field == field.toUpperCase()) {
                    /*sum all possible on foot modes: see https://github.com/e-mission/e-mission-docs/issues/422 */
                    if (isOnFoot(field)) {
                        onFootVal += metricToValue(population, metric, field);
                        field = 'ON_FOOT';
                    }
                    if (!(field in mode_bins)) {
                        mode_bins[field] = [];
                    }
                    //for all except onFoot, add to bin - could discover mult onFoot modes
                    if (field != "ON_FOOT") {
                        mode_bins[field].push([metric.ts, metricToValue(population, metric, field), metric.fmt_time]);
                    }
                }
                //this section handles user lables, assuming 'label_' prefix
                if(field.startsWith('label_')) {
                    let actualMode = field.slice(6, field.length); //remove prefix
                    console.log("Mapped field "+field+" to mode "+actualMode);
                    if (!(actualMode in mode_bins)) {
                        mode_bins[actualMode] = [];
                    }
                    mode_bins[actualMode].push([metric.ts, Math.round(metricToValue(population, metric, field)), moment(metric.fmt_time).format()]);
                }
            }
            //handle the ON_FOOT modes once all have been summed
            if ("ON_FOOT" in mode_bins) {
                mode_bins["ON_FOOT"].push([metric.ts, Math.round(onFootVal), metric.fmt_time]);
            }
        });

        console.log("testing metrics mode bins", mode_bins);

        let return_val = [];
        for (let mode in mode_bins) {
            return_val.push({key: mode, values: mode_bins[mode]});
        }

        return return_val;
    }

    const generateSummaryFromData = function(modeMap, metric) {
        console.log("Invoked getSummaryDataRaw on ", modeMap, "with", metric);

        let summaryMap = [];

        for (let i=0; i < modeMap.length; i++){
            let summary = {};
            summary['key'] = modeMap[i].key; 
            let sumVals = 0;

            for (let j = 0; j < modeMap[i].values.length; j++)
            {
                sumVals += modeMap[i].values[j][1]; //2nd item of array is value
            }
            if (metric === 'mean_speed'){ 
                //we care about avg speed, sum for other metrics
                summary['values'] = Math.round(sumVals / modeMap[i].values.length);
            } else {
                summary['values'] = Math.round(sumVals);
            }

            summaryMap.push(summary);
        }

        return summaryMap;
    }

    const calculatePercentChange = function(pastWeekRange, previousWeekRange) {
       let greaterLesserPct = {
            low: (pastWeekRange.low/previousWeekRange.low) * 100 - 100,
            high: (pastWeekRange.high/previousWeekRange.high) * 100 - 100,
        }
        return greaterLesserPct;
    }

    const createOrCollapseRange = function(low, high) {
        let range = [];
        if(high == low) {
            range.push(low);
        }
        else {
            range.push(low);
            range.push(high);
        }
        return range;
    }

    const userCarbonRecords = useMemo(() => {
        if(userMetrics) {
            console.log("before testing metrics", userMetrics);

            let thisWeekDistance = filterToRecentWeeks(userMetrics?.distance)[0];
            let lastWeekDistance = filterToRecentWeeks(userMetrics?.distance)[1];
            let userThisWeekModeMap = parseDataFromMetrics(thisWeekDistance, 'user');
            let userThisWeekSummaryMap = generateSummaryFromData(userThisWeekModeMap, 'distance');
            let worstDistance = userThisWeekSummaryMap.reduce((prevDistance, currModeSummary) => prevDistance + currModeSummary.values, 0);

            let userLastWeekModeMap = {};
            let userLastWeekSummaryMap = {};
            if(lastWeekDistance) {
                userLastWeekModeMap = parseDataFromMetrics(lastWeekDistance, 'user');
                userLastWeekSummaryMap = generateSummaryFromData(userLastWeekModeMap, 'distance');

                console.log("testing metric map here",  userThisWeekModeMap, userLastWeekModeMap);
                console.log("testing summary data!!", userThisWeekSummaryMap, userLastWeekSummaryMap);
            }
            
            //setting up data to be displayed //TODO i18n for labels
            let tempUserCarbon = [];

            //calculate low-high and format range for past week
            let userPastWeek = {
                low: FootprintHelper.getFootprintForMetrics(userThisWeekSummaryMap, 0), 
                high: FootprintHelper.getFootprintForMetrics(userThisWeekSummaryMap, FootprintHelper.getHighestFootprint()), 
            };
            let valueArray = createOrCollapseRange(userPastWeek.low, userPastWeek.high);
            let value = valueArray[1] ? valueArray[0] + '-' + valueArray[1] : valueArray[0];
            tempUserCarbon.push({label: "past week", value: value});
           
            //calculate low-high and format range for prev week, if exists
            if(userLastWeekSummaryMap[0]) {
                let userPrevWeek = {
                    low: FootprintHelper.getFootprintForMetrics(userLastWeekSummaryMap, 0), 
                    high: FootprintHelper.getFootprintForMetrics(userLastWeekSummaryMap, FootprintHelper.getHighestFootprint())
                };
                valueArray = createOrCollapseRange(userPrevWeek.low, userPrevWeek.high);
                value = valueArray[1] ? valueArray[0] + '-' + valueArray[1] : valueArray[0];
                tempUserCarbon.push({label: "previous week", value: value});

                let pctChange = calculatePercentChange(userPastWeek, userPrevWeek);
                let changeRange = createOrCollapseRange(pctChange.low, pctChange.high);
                setEmissionsChange(changeRange[1] ? changeRange[0] + '-' + changeRange[1] : changeRange[0]);
            }
            
            //calculate worst-case carbon footprint
            let worstCarbon = FootprintHelper.getHighestFootprintForDistance(worstDistance);
            
            tempUserCarbon.push({label: "if all taxi", value: worstCarbon});

            //push in goals
            tempUserCarbon.push({label: "US 2030 goal", value: 54});
            tempUserCarbon.push({label: "US 2050 goal", value: 14});

            console.log("testing, the data is: ", tempUserCarbon);
            
            return tempUserCarbon;
        }
    }, [userMetrics?.distance])

    let changeSection;
    if(emissionsChange) {
        changeSection = <View style={{ width: '50%', paddingHorizontal: 8 }}>
            <Text variant='titleSmall'>{"change in emissions"}</Text>
            <Text>{`${formatForDisplay(emissionsChange)} ${t("% this week")}`}</Text>
        </View>;
    }

    return (
        <Card style={{overflow: 'hidden', minHeight: 300, margin: cardMargin}}
        contentStyle={{flex: 1}}>
        <Card.Title 
            title={t('main-metrics.footprint')}
            titleVariant='titleLarge'
            titleStyle={cardStyles.titleText(colors)}
            titleNumberOfLines={2}
            style={cardStyles.title(colors)} />
        <Card.Content style={cardStyles.content}>
        { userCarbonRecords?.map((dataPoint) => (
          <View style={{ width: '50%', paddingHorizontal: 8 }}>
            <Text variant='titleSmall'>{dataPoint.label}</Text>
            <Text>{`${formatForDisplay(dataPoint.value)} ${t("kg Co2")}`}</Text>
          </View>
        ))}
        </Card.Content>
        </Card>
    )
}

export default CarbonFootprintCard;
