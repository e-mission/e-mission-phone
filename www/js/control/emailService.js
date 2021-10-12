'use strict';

angular.module('emission.services.email', ['emission.plugin.logger'])

    .service('EmailHelper', function ($window, $translate, $http, Logger) {

        const getEmailConfig = function () {
            return new Promise(function (resolve, reject) {
                window.Logger.log(window.Logger.LEVEL_INFO, "About to get email config");
                var address = [];
                $http.get("json/emailConfig.json").then(function (emailConfig) {
                    window.Logger.log(window.Logger.LEVEL_DEBUG, "emailConfigString = " + JSON.stringify(emailConfig.data));
                    address.push(emailConfig.data.address)
                    resolve(address);
                }).catch(function (err) {
                    $http.get("json/emailConfig.json.sample").then(function (emailConfig) {
                        window.Logger.log(window.Logger.LEVEL_DEBUG, "default emailConfigString = " + JSON.stringify(emailConfig.data));
                        address.push(emailConfig.data.address)
                        resolve(address);
                    }).catch(function (err) {
                        window.Logger.log(window.Logger.LEVEL_ERROR, "Error while reading default email config" + err);
                        reject(err);
                    });
                });
            });
        }

        const hasAccount = function() {
            return new Promise(function(resolve, reject) {
                $window.cordova.plugins.email.hasAccount(function (hasAct) {
                  resolve(hasAct);
                });
            });
        }

        this.sendEmail = function (database) {
            Promise.all([getEmailConfig(), hasAccount()]).then(function([address, hasAct]) {
                var parentDir = "unknown";

                // Check this only for ios, since for android, the check always fails unless
                // the user grants the "GET_ACCOUNTS" dynamic permission
                // without the permission, we only see the e-mission account which is not valid
                //
                //  https://developer.android.com/reference/android/accounts/AccountManager#getAccounts()
                //
                //  Caller targeting API level below Build.VERSION_CODES.O that
                //  have not been granted the Manifest.permission.GET_ACCOUNTS
                //  permission, will only see those accounts managed by
                //  AbstractAccountAuthenticators whose signature matches the
                //  client. 
                // and on android, if the account is not configured, the gmail app will be launched anyway
                // on iOS, nothing will happen. So we perform the check only on iOS so that we can
                // generate a reasonably relevant error message

                if (ionic.Platform.isIOS() && !hasAct) {
                    alert($translate.instant('email-service.email-account-not-configured'));
                    return;
                }

                if (ionic.Platform.isAndroid()) {
                    parentDir = "app://databases";
                }
                if (ionic.Platform.isIOS()) {
                    alert($translate.instant('email-service.email-account-mail-app'));
                    parentDir = cordova.file.dataDirectory + "../LocalDatabase";
                }

                if (parentDir == "unknown") {
                    alert("parentDir unexpectedly = " + parentDir + "!")
                }

                window.Logger.log(window.Logger.LEVEL_INFO, "Going to email " + database);
                parentDir = parentDir + "/" + database;
                /*
                window.Logger.log(window.Logger.LEVEL_INFO,
                    "Going to export logs to "+parentDir);
                 */
                alert($translate.instant('email-service.going-to-email', { parentDir: parentDir }));
                var email = {
                    to: address,
                    attachments: [
                        parentDir
                    ],
                    subject: $translate.instant('email-service.email-log.subject-logs'),
                    body: $translate.instant('email-service.email-log.body-please-fill-in-what-is-wrong')
                }

                $window.cordova.plugins.email.open(email, function () {
                  Logger.log("email app closed while sending, "+JSON.stringify(email)+" not sure if we should do anything");
                  // alert($translate.instant('email-service.no-email-address-configured') + err);
                  return;
                });
            });
        };
});
