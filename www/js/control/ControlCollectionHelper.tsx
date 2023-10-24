import React, { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { Dialog, Button, Switch, Text, useTheme, TextInput } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import ActionMenu from "../components/ActionMenu";
import { settingStyles } from "./ProfileSettings";
import { getAngularService } from "../angular-react-helper";

type collectionConfig = { 
    is_duty_cycling: boolean, 
    simulate_user_interaction: boolean,
    accuracy: number,
    accuracy_threshold: number,
    filter_distance: number,
    filter_time: number,
    geofence_radius: number,
    ios_use_visit_notifications_for_detection: boolean,
    ios_use_remote_push_for_sync: boolean,
    android_geofence_responsiveness: number
};

export async function forceTransition(transition) {
    try {
        let result = forceTransitionWrapper(transition);
        window.alert('success -> '+result);
    } catch (err) {
        window.alert('error -> '+err);
        console.log("error forcing state", err);
    } 
}

async function accuracy2String(config) {
    var accuracy = config.accuracy;
    let accuracyOptions = await getAccuracyOptions();
    for (var k in accuracyOptions) {
        if (accuracyOptions[k] == accuracy) {
            return k;
        }
    }
    return accuracy;
}

export async function isMediumAccuracy() {
    let config = await getConfig();
    if (!config || config == null) {
        return undefined; // config not loaded when loading ui, set default as false
    } else {
        var v = await accuracy2String(config);
        console.log("window platform is", window['cordova'].platformId);
        if (window['cordova'].platformId == 'ios') {
            return v != "kCLLocationAccuracyBestForNavigation" && v != "kCLLocationAccuracyBest" && v != "kCLLocationAccuracyTenMeters";
        } else if (window['cordova'].platformId == 'android') {
            return v != "PRIORITY_HIGH_ACCURACY";
        } else {
            window.alert("Emission does not support this platform");
        }
    }
}

export async function helperToggleLowAccuracy() {
    const Logger = getAngularService("Logger");
    let tempConfig = await getConfig();
    let accuracyOptions = await getAccuracyOptions();
    let medium = await isMediumAccuracy();
    if (medium) {
        if (window['cordova'].platformId == 'ios') {
            tempConfig.accuracy = accuracyOptions["kCLLocationAccuracyBest"];
        } else if (window['cordova'].platformId == 'android') {
            tempConfig.accuracy = accuracyOptions["PRIORITY_HIGH_ACCURACY"];
        }
    } else {
        if (window['cordova'].platformId == 'ios') {
            tempConfig.accuracy = accuracyOptions["kCLLocationAccuracyHundredMeters"];
        } else if (window['cordova'].platformId == 'android') {
            tempConfig.accuracy = accuracyOptions["PRIORITY_BALANCED_POWER_ACCURACY"];
        }
    }
    try{
        let set = await setConfig(tempConfig);
        console.log("setConfig Sucess");
    } catch (err) {
        Logger.displayError("Error while setting collection config", err);
    }
}

/*
* Simple read/write wrappers
*/

export const getState = function() {
    return window['cordova'].plugins.BEMDataCollection.getState();
};

export async function getHelperCollectionSettings() {
    let promiseList = [];
    promiseList.push(getConfig());
    promiseList.push(getAccuracyOptions());
    let resultList = await Promise.all(promiseList);
    let tempConfig = resultList[0];
    let tempAccuracyOptions = resultList[1];
    return formatConfigForDisplay(tempConfig, tempAccuracyOptions);
}

const setConfig = function(config) {
    return window['cordova'].plugins.BEMDataCollection.setConfig(config);
};

const getConfig = function() {
    return window['cordova'].plugins.BEMDataCollection.getConfig();
};
const getAccuracyOptions = function() {
    return window['cordova'].plugins.BEMDataCollection.getAccuracyOptions();
};

export const forceTransitionWrapper = function(transition) {
    return window['cordova'].plugins.BEMDataCollection.forceTransition(transition);
};

const formatConfigForDisplay = function(config, accuracyOptions) {
    var retVal = [];
    for (var prop in config) {
        if (prop == "accuracy") {
            for (var name in accuracyOptions) {
                if (accuracyOptions[name] == config[prop]) {
                    retVal.push({'key': prop, 'val': name});
                }
            }
        } else {
            retVal.push({'key': prop, 'val': config[prop]});
        }
    }
    return retVal;
}

const ControlSyncHelper = ({ editVis, setEditVis }) => {
    const {colors} = useTheme();
    const Logger = getAngularService("Logger");

    const [ localConfig, setLocalConfig ] = useState<collectionConfig>();
    const [ accuracyActions, setAccuracyActions ] = useState([]);
    const [ accuracyVis, setAccuracyVis ] = useState(false);
  
    async function getCollectionSettings() {
        let promiseList = [];
        promiseList.push(getConfig());
        promiseList.push(getAccuracyOptions());
        let resultList = await Promise.all(promiseList);
        let tempConfig = resultList[0];
        setLocalConfig(tempConfig);
        let tempAccuracyOptions = resultList[1];
        setAccuracyActions(formatAccuracyForActions(tempAccuracyOptions));
        return formatConfigForDisplay(tempConfig, tempAccuracyOptions);
    }

    useEffect(() => {
        getCollectionSettings();
    }, [editVis])

    const formatAccuracyForActions = function(accuracyOptions) {
       let tempAccuracyActions = [];
        for (var name in accuracyOptions) {
                tempAccuracyActions.push({text: name, value: accuracyOptions[name]});
            }
        return tempAccuracyActions;
    }

    /* 
     * Functions to edit and save values
     */

    async function saveAndReload() {
        console.log("new config = ", localConfig);
        try{
            let set = await setConfig(localConfig);
            //TODO find way to not need control.update.complete event broadcast
        } catch(err) {
            Logger.displayError("Error while setting collection config", err);
        }
    }

    const onToggle = function(config_key) {
        let tempConfig = {...localConfig};
        tempConfig[config_key] = !localConfig[config_key];
        setLocalConfig(tempConfig);
    }

    const onChooseAccuracy = function(accuracyOption) {
        let tempConfig = {...localConfig};
        tempConfig.accuracy = accuracyOption.value;
        setLocalConfig(tempConfig);
    }

    const onChangeText = function(newText, config_key) {
        let tempConfig = {...localConfig};
        tempConfig[config_key] = parseInt(newText);
        setLocalConfig(tempConfig);
    }

    /*ios vs android*/
    let filterComponent;
    if(window['cordova'].platformId == 'ios') {
        filterComponent = <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text variant="labelMedium">Filter Distance</Text>
                            <TextInput label="Filter Distance" value={localConfig?.filter_distance?.toString()} onChangeText={text => onChangeText(text, "filter_distance")}/>
                         </View>
    } else {
        filterComponent = <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text variant="labelMedium">Filter Interval</Text>
                            <TextInput label="Filter Interval" value={localConfig?.filter_time?.toString()} onChangeText={text => onChangeText(text, "filter_time")}/>
                        </View>
    }
    let iosToggles;
    if(window['cordova'].platformId == 'ios') {
        iosToggles = <>
        {/* use visit notifications toggle NO ANDROID */}
        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="labelMedium">Use Visit Notifications</Text>
            <Switch value={localConfig?.ios_use_visit_notifications_for_detection} onValueChange={() => onToggle("ios_use_visit_notifications_for_detection")}></Switch>
        </View>
        {/* sync on remote push toggle NO ANDROID */}
        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="labelMedium">Sync on remote push</Text>
            <Switch value={localConfig?.ios_use_remote_push_for_sync} onValueChange={() => onToggle("ios_use_remote_push_for_sync}")}></Switch>
        </View>
        </>
    }
    let geofenceComponent;
    if(window['cordova'].platformId == 'android') {
        geofenceComponent = <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text variant="labelMedium">Geofence Responsiveness</Text>
                                <TextInput label="Geofence Responsiveness" value={localConfig?.android_geofence_responsiveness?.toString()} onChangeText={text => onChangeText(text, "android_geofence_responsiveness")}/>
                            </View>
    }

    return (
        <>
            <Modal visible={editVis} onDismiss={() => setEditVis(false)} transparent={true}>
                <Dialog visible={editVis} onDismiss={() => setEditVis(false)} style={settingStyles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>Edit Collection Settings</Dialog.Title>
                    <Dialog.Content style={{ padding: 15 }}>
                        {/* duty cycling toggle */}
                        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text variant="labelMedium">Duty Cycling</Text>
                            <Switch value={localConfig?.is_duty_cycling} onValueChange={() => onToggle("is_duty_cycling")}></Switch>
                        </View>
                        {/* simulate user toggle */}
                        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text variant="labelMedium">Simulate User</Text>
                            <Switch value={localConfig?.simulate_user_interaction} onValueChange={() => onToggle("simulate_user_interaction")}></Switch>
                        </View>
                        {/* accuracy */}
                        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text variant="labelMedium">Accuracy</Text>
                            <Button onPress={() => setAccuracyVis(true)}>{localConfig?.accuracy}</Button>
                        </View>
                        {/* accuracy threshold not editable*/}
                        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text variant="labelMedium">Accuracy Threshold</Text>
                            <Text variant="bodyMedium">{localConfig?.accuracy_threshold}</Text>
                        </View>
                        {filterComponent}
                        {/* geofence radius */}
                        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text variant="labelMedium">Geofence Radius</Text>
                            <TextInput label="Geofence Radius" value={localConfig?.geofence_radius?.toString()} onChangeText={text => onChangeText(text, "geofence_radius")}/>
                        </View>
                        {iosToggles}
                        {geofenceComponent}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => {saveAndReload();
                                                setEditVis(false);}}>
                            Save
                        </Button>
                        <Button onPress={() => setEditVis(false)}>Cancel</Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            <ActionMenu vis={accuracyVis} setVis={setAccuracyVis} title={"Select Accuracy"} actionSet={accuracyActions} onAction={onChooseAccuracy} onExit={() => {}}></ActionMenu>
        </>
    );
  };
  
export default ControlSyncHelper;
