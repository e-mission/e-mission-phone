import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme, Text, Appbar, IconButton } from "react-native-paper";
import { angularize, getAngularService } from "../angular-react-helper";
import { useTranslation } from "react-i18next";
import { FlashList } from '@shopify/flash-list';
import useAppConfig from "../useAppConfig";
import moment from "moment";
import AlertBar from "./AlertBar";

type loadStats = { currentStart: number, gotMaxIndex: boolean, reachedEnd: boolean };

//any pure functions can go outside
const LogPage = () => {
    // anything that mutates must go in --- depend on props or state... 
    const { t } = useTranslation();
    const { colors } = useTheme();
    const EmailHelper = getAngularService('EmailHelper');
    const $state = getAngularService('$state');
    const { appConfig, loading } = useAppConfig();

    const [ loadStats, setLoadStats ] = useState<loadStats>();
    const [ entries, setEntries ] = useState([]);
    const [ maxErrorVis, setMaxErrorVis ] = useState<boolean>(false);
    const [ logErrorVis, setLogErrorVis ] = useState<boolean>(false);

    const [ maxMessage, setMaxMessage ] = useState<string>("");
    const [ logMessage, setLogMessage ] = useState<string>("");

    var RETRIEVE_COUNT = 100;

    useEffect(() => {
        if(!loading) {
            refreshEntries();
        }
    }, [appConfig]);

    const refreshEntries = function() {
        window?.Logger.getMaxIndex().then(function(maxIndex) {
            console.log("maxIndex = "+maxIndex);
            let tempStats = {} as loadStats;
            tempStats.currentStart = maxIndex;
            tempStats.gotMaxIndex = true;
            tempStats.reachedEnd = false;
            setLoadStats(tempStats);
            setEntries([]);
            addEntries();
        }, function(error) {
            let errorString = "While getting max index "+JSON.stringify(error, null, 2);
            console.log(errorString);
            setMaxMessage(errorString);
            setMaxErrorVis(true);
        })
    }

    const moreDataCanBeLoaded = useMemo(() => {
        return loadStats?.gotMaxIndex && loadStats?.reachedEnd;
    }, [loadStats])

    const clear = function() {
        window?.Logger.clearAll();
        window?.Logger.log(window.Logger.LEVEL_INFO, "Finished clearing entries from unified log");
        refreshEntries();
    }

    async function addEntries() {
        console.log("calling addEntries");
        window.Logger.getMessagesFromIndex(loadStats?.currentStart, RETRIEVE_COUNT)
            .then(function(entryList) {
                processEntries(entryList);
                console.log("entry list size = "+ entries.length);
                //$scope.$broadcast('scroll.infiniteScrollComplete') //do I still need this?
            }, function(error) {
                let errStr = "While getting messages from the log "+JSON.stringify(error, null, 2);
                console.log(errStr);
                setLogMessage(errStr);
                setLogErrorVis(true);
                //$scope.$broadcast('scroll.infiniteScrollComplete') //do I still need this?
            })
    }

    const processEntries = function(entryList) {
        let tempEntries = [];
        let tempLoadStats = {...loadStats};
        entryList.forEach(e => {
            e.fmt_time = moment.unix(e.ts).format("llll");
            tempEntries.push(e);
        });
        if (entryList.length == 0) {
            console.log("Reached the end of the scrolling");
            tempLoadStats.reachedEnd = true;
        } else {
            tempLoadStats.currentStart =  entryList[entryList.length-1].ID;
            console.log("new start index = "+loadStats.currentStart);
        }
        setEntries([...entries].concat(tempEntries)); //push the new entries onto the list
        setLoadStats(tempLoadStats);
    }

    const emailLog = function () {
        EmailHelper.sendEmail("loggerDB");
    }

    const separator = () => <View style={{ height: 8 }} />
    const logItem = ({item: logItem}) => <View style={styles.entry(colors.elevation.level1)}>
                                            <Text style={styles.date(colors.elevation.level4)} variant="labelLarge">{logItem.fmt_time}</Text>
                                            <Text style={styles.details} variant="bodyMedium">{logItem.ID + "|" + logItem.level + "|" + logItem.message}</Text>
                                        </View>

    return (
        <>
        {/* //appbar across the top with back to profile and "log" page title */}
        <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
            <Appbar.BackAction onPress={() => {$state.go("root.main.control");}}/>
            <Appbar.Content title="Log" />
        </Appbar.Header>   

        {/* //row of buttons to refresh, delete, or email */}
        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
            <IconButton icon="refresh" onPress={() => refreshEntries()}/>
            <IconButton icon="delete" onPress={() => clear()}/>
            <IconButton icon="email" onPress={() => emailLog()}/>
        </View>

        {/* //list of dates and times, each with some data associated */}
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <FlashList inverted
            data={entries}
            renderItem={logItem}
            estimatedItemSize={75}
            keyExtractor={(item) => item.ID}
            ItemSeparatorComponent={separator} 
            onScroll={e => {if(moreDataCanBeLoaded){addEntries()}}}/>
        </ScrollView>

        <AlertBar visible={maxErrorVis} setVisible={setMaxErrorVis} messageKey={"While getting messages from the log "} messageAddition={maxMessage}></AlertBar>
        <AlertBar visible={logErrorVis} setVisible={setLogErrorVis} messageKey={"While getting max index "} messageAddition={logMessage}></AlertBar>
        </>
    );
};
const styles = StyleSheet.create({
    date: (surfaceColor) => ({
        backgroundColor: surfaceColor,
    }),
    details: {
        fontFamily: "monospace",
    },
    entry: (surfaceColor) => ({
        backgroundColor: surfaceColor,
        marginLeft: 5,
    }),
  });
   
angularize(LogPage, 'LogPage', 'emission.main.log.logPage'); 
export default LogPage;