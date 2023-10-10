/*
 * The general structure of this code is that all the timeline information for
 * a particular day is retrieved from the Timeline factory and put into the scope.
 * For best performance, all data should be loaded into the in-memory timeline,
 * and in addition to writing to storage, the data should be written to memory.
 * All UI elements should only use $scope variables.
 */

import i18next from "i18next";
import { getAngularService } from "../../angular-react-helper";

const unlabeledCheck = (t) => {
    return typeof t.userInput[getAngularService('EnketoTripButtonService').SINGLE_KEY] === 'undefined';
}

const UNLABELED = {
    key: "unlabeled",
    text: i18next.t("diary.unlabeled"),
    filter: unlabeledCheck
}

const TO_LABEL = {
    key: "to_label",
    text: i18next.t("diary.to-label"),
    filter: unlabeledCheck
}

export const configuredFilters = [
    TO_LABEL,
    UNLABELED
];