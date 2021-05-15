angular.module('emission.splash.secretcheck', ['emission.plugin.logger',
                                              'emission.plugin.kvstore'])
.factory('SecretCheck', function($window, $state, $ionicPlatform, $ionicPopup, KVStore, Logger) {

    var sc = {};
    sc.SECRET_STORE_KEY = "secret_key";
    // hardcoded to highlight that this is a hack
    // eventually, we want to remove this and use channels like we do for emTripLog
    sc.SECRET = "Z5YGA79K7LH3FYZ2G7L7R8S3UPD66GTF"

    sc.handleValidateSecretURL = function(urlComponents) {
      Logger.log("handleValidateSecretURL = "+JSON.stringify(urlComponents));
      const inputSecret = urlComponents['secret'];
      Logger.log("input secret is = "+inputSecret);

      const next_state = urlComponents['next_state'] || "root.intro";

      if (sc.checkSecret(inputSecret)) {
        sc.storeInputSecret(inputSecret).then(() => {
            $state.go(next_state);
        }).catch((e) =>
            Logger.displayError("Could not store valid secret "+inputSecret, e)
        );
      } else {
        Logger.displayError("Invalid input secret",
            {message: "Input secret "+inputSecret+" does not match expected "+sc.SECRET,
            stack: "In splash/secret.js"});
      }
    }

    sc.checkSecret = function(secret) {
        const retVal = secret != null && secret.length > 0 && secret === sc.SECRET;
        if (!retVal) {
            Logger.log("Secret "+secret+" does not match expected value");
        };
        return retVal;
    }

    sc.storeInputSecret = function(secret) {
        return KVStore.set(sc.SECRET_STORE_KEY, secret);
    }

    sc.getInputSecret = function() {
      return KVStore.get(sc.SECRET_STORE_KEY).then(function(read_secret) {
        return read_secret;
      });
    }

    sc.hasValidSecret = function() {
        return sc.getInputSecret().then(sc.checkSecret);
    }

    return sc;
});