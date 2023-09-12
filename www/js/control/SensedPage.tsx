import React, { useState, useEffect } from "react";
import { View, StyleSheet, SafeAreaView, Text, Modal } from "react-native";
import { useTheme, Appbar, IconButton } from "react-native-paper";
import { getAngularService } from "../angular-react-helper";
import { useTranslation } from "react-i18next";
import { FlashList } from '@shopify/flash-list';
import useAppConfig from "../useAppConfig";
import moment from "moment";
import ActionMenu from "../components/ActionMenu";

type configObject = { key_data_mapping: object, keys: string[], keyMap: {}[] };

const SensedPage = ({pageVis, setPageVis}) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const EmailHelper = getAngularService('EmailHelper');
    const { appConfig, loading } = useAppConfig();

    /* Let's keep a reference to the database for convenience */
    const [ DB, setDB ]= useState();

    const [ config, setConfig ] = useState<configObject>();
    const [ selectedKey, setSelectedKey ] = useState<string>("");
    const [ keysVisible, setKeysVisible ] = useState<boolean>(false);
    const [ entries, setEntries ] = useState([]);

    const setup = function() {
        setDB(window?.cordova.plugins.BEMUserCache);
        
        if(DB) {
            let tempConfig = {} as configObject;
            tempConfig.key_data_mapping = {
                "Transitions": {
                    fn: DB.getAllMessages,
                    key: "statemachine/transition"
                },
                "Locations": {
                    fn: DB.getAllSensorData,
                    key: "background/location"
                },
                "Motion Type": {
                    fn: DB.getAllSensorData,
                    key: "background/motion_activity"
                },
            }

            tempConfig.keys = [];
            for (let key in tempConfig.key_data_mapping) {
                tempConfig.keys.push(key);
            }

            tempConfig.keyMap = mapForActionMenu(tempConfig.keys);

            setSelectedKey(tempConfig.keys[0]);
            setConfig(tempConfig);
            updateEntries();
        }
    }

    const emailCache = function() {
        EmailHelper.sendEmail("userCacheDB");
    }

    const setSelected = function(newVal) {
        setSelectedKey(newVal);
    }

    const updateEntries = function() {
        let userCacheFn, userCacheKey;
        if(selectedKey == "") {
            userCacheFn = DB.getAllMessages;
            userCacheKey = "statemachine/transition";
        } else {
            userCacheFn = config.key_data_mapping[selectedKey]["fn"];
            userCacheKey = config.key_data_mapping[selectedKey]["key"];
        }

        userCacheFn(userCacheKey, true).then(function(entryList) {
            let tempEntries = [];
            entryList.forEach(entry => {
                entry.metadata.write_fmt_time = moment.unix(entry.metadata.write_ts)
                                                    .tz(entry.metadata.time_zone)
                                                    .format("llll");
                entry.data = JSON.stringify(entry.data, null, 2);
                tempEntries.push(entry);
            });
            setEntries(tempEntries);
            // This should really be within a try/catch/finally block
            //$scope.$broadcast('scroll.refreshComplete'); //---> what to do instead?
        }, function(error) {
            window.Logger.log(window.Logger.LEVEL_ERROR, "Error updating entries"+ error);
        })
    }

    //update entries anytime the selected key changes
    useEffect(() => {
        if(DB){
            updateEntries();
        }
    }, [selectedKey])

    const mapForActionMenu = function(keys) {
        let map = [];
        keys.forEach(key => {
          map.push({text: key});  
        });
        return map;
    }

    useEffect(() => {
        setup();
    }, [appConfig]);

    const separator = () => <View style={{ height: 8 }} />
    const cacheItem = ({item: cacheItem}) => (<View style={styles.entry(colors.elevation.level1)}>
                                                <Text style={styles.date(colors.elevation.level4)} variant="labelLarge">{cacheItem.metadata.write_fmt_time}</Text>
                                                <Text style={styles.details} variant="bodyMedium">{cacheItem.data}</Text>
                                            </View>);

    return (
        <Modal visible={pageVis} onDismiss={() => setPageVis(false)}>
            <SafeAreaView style={{flex: 1}}>
                <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
                    <Appbar.BackAction onPress={() => setPageVis(false)}/>
                    <Appbar.Content title={"Sensed Data" + ": " + selectedKey}/>
                </Appbar.Header>   

                <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <IconButton icon="refresh" onPress={() => updateEntries()}/>
                    <IconButton icon="email" onPress={() => emailCache()}/>
                    <IconButton icon="menu" onPress={() => setKeysVisible(true)}/>
                </View>
            
                <FlashList
                    data={entries}
                    renderItem={cacheItem}
                    estimatedItemSize={75}
                    keyExtractor={(item) => item.metadata.write_ts}
                    ItemSeparatorComponent={separator} 
                />
            </SafeAreaView>
            
            <ActionMenu vis={keysVisible} setVis={setKeysVisible} title={"Choose:"} actionSet={config?.keyMap} onAction={(key) => setSelected(key.text)} onExit={() => {}}></ActionMenu>
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

export default SensedPage;