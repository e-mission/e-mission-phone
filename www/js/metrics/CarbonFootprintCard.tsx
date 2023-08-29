
import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme} from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardMargin, cardStyles } from './MetricsTab';
import { filterToRecentWeeks, formatDateRangeOfDays } from './metricsHelper';
import { useTranslation } from 'react-i18next';
import BarChart from '../components/BarChart';
import { getAngularService } from '../angular-react-helper';
import ChangeIndicator from './ChangeIndicator';

//modes considered on foot for carbon calculation, expandable as needed
const ON_FOOT_MODES = ['WALKING', 'RUNNING', 'ON_FOOT'] as const;

type Props = { userMetrics: MetricsData, aggMetrics: MetricsData }
const CarbonFootprintCard = ({ userMetrics, aggMetrics }: Props) => {
    const FootprintHelper = getAngularService("FootprintHelper");
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [emissionsChange, setEmissionsChange] = useState([]);

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

    //from two weeks fo low and high values, calculates low and high change
    const calculatePercentChange = function(pastWeekRange, previousWeekRange) {
       let greaterLesserPct = {
            low: (pastWeekRange.low/previousWeekRange.low) * 100 - 100,
            high: (pastWeekRange.high/previousWeekRange.high) * 100 - 100,
        }
        return greaterLesserPct;
    }

    //digests low - high values to an array of 1 or 2 items (detects 0 diff)
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
            let graphRecords = [];

            //calculate low-high and format range for past week
            let userPastWeek = {
                low: FootprintHelper.getFootprintForMetrics(userThisWeekSummaryMap, 0), 
                high: FootprintHelper.getFootprintForMetrics(userThisWeekSummaryMap, FootprintHelper.getHighestFootprint()), 
            };
            let valueArray = createOrCollapseRange(userPastWeek.low, userPastWeek.high);
            let value = valueArray[1] ? valueArray[0] + '-' + valueArray[1] : valueArray[0];
            graphRecords.push({label: 'certain', x: valueArray[0], y: `${t('main-metrics.past-week')}\n(${formatDateRangeOfDays(thisWeekDistance)})`});
            graphRecords.push({label: "uncertain",  x: userPastWeek.high - userPastWeek.low, y: `${t('main-metrics.past-week')}\n(${formatDateRangeOfDays(thisWeekDistance)})`})
           
            //calculate low-high and format range for prev week, if exists
            if(userLastWeekSummaryMap[0]) {
                let userPrevWeek = {
                    low: FootprintHelper.getFootprintForMetrics(userLastWeekSummaryMap, 0), 
                    high: FootprintHelper.getFootprintForMetrics(userLastWeekSummaryMap, FootprintHelper.getHighestFootprint())
                };
                valueArray = createOrCollapseRange(userPrevWeek.low, userPrevWeek.high);
                value = valueArray[1] ? valueArray[0] + '-' + valueArray[1] : valueArray[0];
                graphRecords.push({label: 'certain', x: valueArray[0], y: `${t('main-metrics.prev-week')}\n(${formatDateRangeOfDays(lastWeekDistance)})`});
                graphRecords.push({label: "uncertain",  x: userPrevWeek.high - userPrevWeek.low, y: `${t('main-metrics.prev-week')}\n(${formatDateRangeOfDays(lastWeekDistance)})`})

                let pctChange = calculatePercentChange(userPastWeek, userPrevWeek);
                let changeRange = createOrCollapseRange(pctChange.low, pctChange.high);
                setEmissionsChange(changeRange);
            }
            
            //calculate worst-case carbon footprint
            let worstCarbon = FootprintHelper.getHighestFootprintForDistance(worstDistance);
            graphRecords.push({label: 'certain', x: worstCarbon, y: `${t('main-metrics.worst-case')}`});

            return graphRecords;
        }
    }, [userMetrics?.distance])

    const groupCarbonRecords = useMemo(() => {
        if(aggMetrics) 
        {
            //separate data into weeks
            let thisWeekDistance = filterToRecentWeeks(aggMetrics?.distance)[0];
            console.log("testing agg metrics" , aggMetrics, thisWeekDistance);
            //let lastWeekDistance = filterToRecentWeeks(aggMetrics?.distance)[1];

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

            let aggCarbon = {
                low: FootprintHelper.getFootprintForMetrics(aggCarbonData, 0),
                high: FootprintHelper.getFootprintForMetrics(aggCarbonData, FootprintHelper.getHighestFootprint()),
            }
            let aggRange = createOrCollapseRange(aggCarbon.low, aggCarbon.high);

            let groupRecords = [];
            groupRecords.push({label: 'certain', x: aggRange[0], y: `${t('main-metrics.average')}\n(${formatDateRangeOfDays(thisWeekDistance)})`});
            groupRecords.push({label: "uncertain",  x: aggCarbon.high - aggCarbon.low, y: `${t('main-metrics.average')}\n(${formatDateRangeOfDays(thisWeekDistance)})`})

            return groupRecords;
        }
    }, [aggMetrics])

    //hardcoded here, could be read from config at later customization?
    let carbonGoals = [{label: t('main-metrics.us-2030-goal'), value: 54}, {label: t('main-metrics.us-2050-goal'), value: 14}];

    return (
        <Card style={{overflow: 'hidden', minHeight: 300, margin: cardMargin}}
        contentStyle={{flex: 1}}>
        <Card.Title 
            title={t('main-metrics.footprint')}
            titleVariant='titleLarge'
            titleStyle={cardStyles.titleText(colors)}
            titleNumberOfLines={2}
            // {(props) => <IconButton {...props} icon="dots-vertical" onPress={() => {}} />}
            right={(props) => <ChangeIndicator change={emissionsChange}></ChangeIndicator>}
            style={cardStyles.title(colors)} />
        <Card.Content style={cardStyles.content}>
           { userCarbonRecords?.length ?
           <BarChart records={userCarbonRecords.concat(groupCarbonRecords?.length ? groupCarbonRecords : [])} axisTitle={t('main-metrics.footprint')+' (kg C02)'}
           isHorizontal={true} timeAxis={false} stacked={true} lineAnnotations={carbonGoals}/>
        :
          <View style={{flex: 1, justifyContent: 'center'}}>
            <Text variant='labelMedium' style={{textAlign: 'center'}}>
              {t('metrics.chart-no-data')}
            </Text>
          </View>
        }
        </Card.Content>
        </Card>
    )
}

export default CarbonFootprintCard;
