import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, SafeAreaView, Modal } from "react-native";
import { useTheme, Text, Appbar, IconButton } from "react-native-paper";
import { getAngularService } from "../angular-react-helper";
import { useTranslation } from "react-i18next";
import { FlashList } from '@shopify/flash-list';
import moment from "moment";
import AlertBar from "./AlertBar";

type loadStats = { currentStart: number, gotMaxIndex: boolean, reachedEnd: boolean };

const LogPage = ({pageVis, setPageVis}) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const EmailHelper = getAngularService('EmailHelper');

    const [ loadStats, setLoadStats ] = useState<loadStats>();
    const [ entries, setEntries ] = useState([]);
    const [ maxErrorVis, setMaxErrorVis ] = useState<boolean>(false);
    const [ logErrorVis, setLogErrorVis ] = useState<boolean>(false);
    const [ maxMessage, setMaxMessage ] = useState<string>("");
    const [ logMessage, setLogMessage ] = useState<string>("");
    const [ isFetching, setIsFetching ] = useState<boolean>(false);

    var RETRIEVE_COUNT = 100;

    //when opening the modal, load the entries
    useEffect(() => {
        refreshEntries();
    }, [pageVis]);

    async function refreshEntries() {
        try {
            let maxIndex = await window.Logger.getMaxIndex();
            console.log("maxIndex = "+maxIndex);
            let tempStats = {} as loadStats;
            tempStats.currentStart = maxIndex;
            tempStats.gotMaxIndex = true;
            tempStats.reachedEnd = false;
            setLoadStats(tempStats);
            setEntries([]);
        } catch(error) {
            let errorString = t('errors.while-max-index')+JSON.stringify(error, null, 2);
            console.log(errorString);
            setMaxMessage(errorString);
            setMaxErrorVis(true);
        } finally {
            addEntries();
        }
    }

    const moreDataCanBeLoaded = useMemo(() => {
        return loadStats?.gotMaxIndex && !loadStats?.reachedEnd;
    }, [loadStats])

    const clear = function() {
        window?.Logger.clearAll();
        window?.Logger.log(window.Logger.LEVEL_INFO, "Finished clearing entries from unified log");
        refreshEntries();
    }

    async function addEntries() {
        console.log("calling addEntries");
        setIsFetching(true);
        let start = loadStats.currentStart ? loadStats.currentStart : 0; //set a default start to prevent initial fetch error
        try {
            let entryList = await window.Logger.getMessagesFromIndex(start, RETRIEVE_COUNT);
            processEntries(entryList);
            console.log("entry list size = "+ entries.length);
            setIsFetching(false);
        } catch(error) {
            let errStr = t('errors.while-log-messages')+JSON.stringify(error, null, 2);
            console.log(errStr);
            setLogMessage(errStr);
            setLogErrorVis(true);
            setIsFetching(false);
        }
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
    const logItem = ({item: logItem}) => (<View style={styles.entry(colors.elevation.level1)}>
                                            <Text style={styles.date(colors.elevation.level4)} variant="labelLarge">{logItem.fmt_time}</Text>
                                            <Text style={styles.details} variant="bodyMedium">{logItem.ID + "|" + logItem.level + "|" + logItem.message}</Text>
                                        </View>);

    return (
        <Modal visible={pageVis} onDismiss={() => setPageVis(false)}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header statusBarHeight={0} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
                    <Appbar.BackAction onPress={() => {setPageVis(false)}}/>
                    <Appbar.Content title={t('control.log-title')} />
                </Appbar.Header>   

                <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <IconButton icon="refresh" onPress={() => refreshEntries()}/>
                    <IconButton icon="delete" onPress={() => clear()}/>
                    <IconButton icon="email" onPress={() => emailLog()}/>
                </View>

                <FlashList
                    data={entries}
                    renderItem={logItem}
                    estimatedItemSize={75}
                    keyExtractor={(item) => item.ID}
                    ItemSeparatorComponent={separator} 
                    onEndReachedThreshold={0.5}
                    refreshing={isFetching}
                    onRefresh={() => {if(moreDataCanBeLoaded){addEntries()}}}
                    onEndReached={() => {if(moreDataCanBeLoaded){addEntries()}}}
                    />
            </SafeAreaView>

        <AlertBar visible={maxErrorVis} setVisible={setMaxErrorVis} messageKey={""} messageAddition={maxMessage}></AlertBar>
        <AlertBar visible={logErrorVis} setVisible={setLogErrorVis} messageKey={""} messageAddition={logMessage}></AlertBar>
        </Modal>
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
    
export default LogPage;
