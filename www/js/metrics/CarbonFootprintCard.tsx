
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
import color from "color";
import moment from 'moment';

//modes considered on foot for carbon calculation, expandable as needed
const ON_FOOT_MODES = ['WALKING', 'RUNNING', 'ON_FOOT'] as const;

type Props = { userMetrics: MetricsData, aggMetrics: MetricsData }
const CarbonFootprintCard = ({ userMetrics, aggMetrics }: Props) => {
    const FootprintHelper = getAngularService("FootprintHelper");
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [emissionsChange, setEmissionsChange] = useState({});
    const [userText, setUserText] = useState([]);
    const [groupText, setGroupText] = useState([]);

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
            let textList = [];

            //calculate low-high and format range for past week
            let userPastWeek = {
                low: FootprintHelper.getFootprintForMetrics(userThisWeekSummaryMap, 0), 
                high: FootprintHelper.getFootprintForMetrics(userThisWeekSummaryMap, FootprintHelper.getHighestFootprint()), 
            };
            graphRecords.push({label: t('main-metrics.unlabeled'),  x: userPastWeek.high - userPastWeek.low, y: `${t('main-metrics.past-week')}\n(${formatDateRangeOfDays(thisWeekDistance)})`})
            graphRecords.push({label: t('main-metrics.labeled'), x: userPastWeek.low, y: `${t('main-metrics.past-week')}\n(${formatDateRangeOfDays(thisWeekDistance)})`});
            textList.push({label: `${t('main-metrics.past-week')}\n(${formatDateRangeOfDays(thisWeekDistance)})`, 
                            value: (userPastWeek.high - userPastWeek.low)==0 ? Math.round(userPastWeek.low) : Math.round(userPastWeek.low) + " - " + Math.round(userPastWeek.high)});

            //calculate low-high and format range for prev week, if exists
            if(userLastWeekSummaryMap[0]) {
                let userPrevWeek = {
                    low: FootprintHelper.getFootprintForMetrics(userLastWeekSummaryMap, 0), 
                    high: FootprintHelper.getFootprintForMetrics(userLastWeekSummaryMap, FootprintHelper.getHighestFootprint())
                };
                graphRecords.push({label: t('main-metrics.unlabeled'),  x: userPrevWeek.high - userPrevWeek.low, y: `${t('main-metrics.prev-week')}\n(${formatDateRangeOfDays(lastWeekDistance)})`})
                graphRecords.push({label: t('main-metrics.labeled'), x: userPastWeek.low, y: `${t('main-metrics.prev-week')}\n(${formatDateRangeOfDays(lastWeekDistance)})`});
                textList.push({label: `${t('main-metrics.prev-week')}\n(${formatDateRangeOfDays(lastWeekDistance)})`, 
                            value: (userPrevWeek.high - userPrevWeek.low)==0 ? Math.round(userPrevWeek.low) : Math.round(userPrevWeek.low) + " - " + Math.round(userPrevWeek.high)});
                
                let pctChange = calculatePercentChange(userPastWeek, userPrevWeek);
                setEmissionsChange(pctChange);
            } else {
                setEmissionsChange({});
            }
            
            //calculate worst-case carbon footprint
            let worstCarbon = FootprintHelper.getHighestFootprintForDistance(worstDistance);
            graphRecords.push({label: t('main-metrics.labeled'), x: worstCarbon, y: `${t('main-metrics.worst-case')}`});
            textList.push({label:t('main-metrics.worst-case'), value: Math.round(worstCarbon)});

            setUserText(textList);
            return graphRecords;
        }
    }, [userMetrics?.distance])

    const groupCarbonRecords = useMemo(() => {
        if(aggMetrics) 
        {
            //separate data into weeks
            let thisWeekDistance = filterToRecentWeeks(aggMetrics?.distance)[0];
            console.log("testing agg metrics" , aggMetrics, thisWeekDistance);

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

            let groupRecords = [];
            let groupText = [];

            let aggCarbon = {
                low: FootprintHelper.getFootprintForMetrics(aggCarbonData, 0),
                high: FootprintHelper.getFootprintForMetrics(aggCarbonData, FootprintHelper.getHighestFootprint()),
            }
            console.log("testing group past week", aggCarbon);
            groupRecords.push({label: t('main-metrics.unlabeled'),  x: aggCarbon.high - aggCarbon.low, y: `${t('main-metrics.average')}\n(${formatDateRangeOfDays(thisWeekDistance)})`});
            groupRecords.push({label: t('main-metrics.labeled'), x: aggCarbon.low, y: `${t('main-metrics.average')}\n(${formatDateRangeOfDays(thisWeekDistance)})`});
            groupText.push({label: t('main-metrics.average'), 
                value: (aggCarbon.high - aggCarbon.low)==0 ? Math.round(aggCarbon.low) : Math.round(aggCarbon.low) + " - " + Math.round(aggCarbon.high)});

            setGroupText(groupText);
            return groupRecords;
        }
    }, [aggMetrics])

    const chartData = useMemo(() => {
        let tempChartData = [];
        if(userCarbonRecords?.length) {
            tempChartData = tempChartData.concat(userCarbonRecords);
        }
        if(groupCarbonRecords?.length) {
            tempChartData = tempChartData.concat(groupCarbonRecords);
        }
        tempChartData = tempChartData.reverse();
        console.log("testing chart data", tempChartData);
        return tempChartData;
    }, [userCarbonRecords, groupCarbonRecords]);

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

    //hardcoded here, could be read from config at later customization?
    let carbonGoals = [ {label: t('main-metrics.us-2030-goal'), value: 54, color: color(colors.danger).darken(.25).rgb().toString()},
                        {label: t('main-metrics.us-2050-goal'), value: 14, color: color(colors.warn).darken(.25).rgb().toString()}];
    let meter = { dash_key: t('main-metrics.unlabeled'), high: 54, middle: 14 };

    return (
        <Card style={{overflow: 'hidden', minHeight: 300, margin: cardMargin}}
        contentStyle={{flex: 1}}>
        <Card.Title 
            title={t('main-metrics.footprint')}
            titleVariant='titleLarge'
            titleStyle={cardStyles.titleText(colors)}
            titleNumberOfLines={2}
            right={(props) => <ChangeIndicator change={emissionsChange}></ChangeIndicator>}
            style={cardStyles.title(colors)} />
        <Card.Content style={cardStyles.content}>
            { chartData?.length > 0 ?
            <View>
                <BarChart records={chartData} axisTitle={t('main-metrics.footprint-label')}
                isHorizontal={true} timeAxis={false} stacked={true} lineAnnotations={carbonGoals} meter={meter} />
                <Text variant='bodyMedium' style={{textAlign: 'center', marginTop: 10}}>
                    {/* TODO i18n */}
                    Dashed lines: US decarbonization goals scaled to per-capita travel-related emissions.
                </Text>
            </View>
            :
            <View style={{flex: 1, justifyContent: 'center'}}>
                <Text variant='labelMedium' style={{textAlign: 'center'}}>
                {t('metrics.chart-no-data')}
                </Text>
            </View> }
            { textEntries?.length > 0 &&
                <View style={{paddingHorizontal: 8, flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' }}>
                { Object.keys(textEntries).map((i) =>
                    <View style={{ width: '50%', paddingHorizontal: 8 }}>
                        <Text variant='titleSmall'>{textEntries[i].label}</Text>
                        <Text>{textEntries[i].value + ' ' + "kg Co2"}</Text>
                    </View>
                )}
                </View>
            }
        </Card.Content>
        </Card>
    )
}

export default CarbonFootprintCard;
