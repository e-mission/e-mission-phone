angular.module('emission.plugin.kvstore', ['emission.plugin.logger',
                                           'angularLocalStorage'])

.factory('KVStore', function($window, Logger, storage, $ionicPopup) {
    var logger = Logger;
    var kvstoreJs = {}
    /*
     * Sets in both localstorage and native storage
     * If the message is not a JSON object, wrap it in an object with the key
     * "value" before storing it.
     */
    var getNativePlugin = function() {
        return $window.cordova.plugins.BEMUserCache;
    }

    kvstoreJs.set = function(key, value) {
        // add checks for data type
        var store_val = value;
        if (typeof value != "object") {
            // Should this be {"value": value} or {key: value}?
            store_val = {};
            store_val[key] = value;
        }
        /*
         * How should we deal with consistency here? Have the threads be
         * independent so that there is greater chance that one will succeed,
         * or the local only succeed if native succeeds. I think parallel is
         * better for greater robustness.
         */
        storage.set(key, store_val);
        return getNativePlugin().putLocalStorage(key, store_val);
    }

    var getUnifiedValue = function(key) {
        var ls_stored_val = storage.get(key, undefined);
        return getNativePlugin().getLocalStorage(key, false).then(function(uc_stored_val) {
            logger.log("uc_stored_val = "+JSON.stringify(uc_stored_val)+" ls_stored_val = "+JSON.stringify(ls_stored_val));
            if (angular.equals(ls_stored_val, uc_stored_val)) {
                logger.log("local and native values match, already synced");
                return uc_stored_val;
            } else {
                // the values are different
                if (ls_stored_val == null) {
                    console.assert(uc_stored_val != null, "uc_stored_val should be non-null");
                    logger.log("uc_stored_val = "+JSON.stringify(uc_stored_val)+
                                " ls_stored_val = "+JSON.stringify(ls_stored_val)+
                                " copying native "+key+" to local...");
                    storage.set(key, uc_stored_val);
                    return uc_stored_val;
                } else if (uc_stored_val == null) {
                    console.assert(ls_stored_val != null);
                    $ionicPopup.alert({template: "Local "+key+" found, native "
                        +key+" missing, writing "+key+" to native"})
                    logger.log("uc_stored_val = "+JSON.stringify(uc_stored_val)+
                                " ls_stored_val = "+JSON.stringify(ls_stored_val)+
                                " copying local "+key+" to native...");
                    return getNativePlugin().putLocalStorage(key, ls_stored_val).then(function() {
                        // we only return the value after we have finished writing
                        return ls_stored_val;
                    });
                }
                console.assert(ls_stored_val != null && uc_stored_val != null,
                "ls_stored_val ="+JSON.stringify(ls_stored_val)+
                "uc_stored_val ="+JSON.stringify(uc_stored_val));
                $ionicPopup.alert({template: "Local "+key+" found, native "
                    +key+" found, but different, writing "+key+" to local"})
                logger.log("uc_stored_val = "+JSON.stringify(uc_stored_val)+
                            " ls_stored_val = "+JSON.stringify(ls_stored_val)+
                            " copying native "+key+" to local...");
                storage.set(key, uc_stored_val);
                return uc_stored_val;
            }
        });
    }

    kvstoreJs.get = function(key) {
        return getUnifiedValue(key).then(function(retData) {
            if((retData != null) && (angular.isDefined(retData[key]))) {
                // it must have been a simple data type that we munged upfront
                return retData[key];
            } else {
                // it must have been an object
                return retData;
            }
        });
    }

    kvstoreJs.remove = function(key) {
        storage.remove(key);
        return getNativePlugin().removeLocalStorage(key);
    }

    return kvstoreJs;
});
