'use strict';

angular.module('emission.services.email', ['emission.plugin.logger'])

    .service('EmailHelper', function ($cordovaEmailComposer, $translate, $http, Logger) {

        var getEmailConfig = function () {
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

        this.sendEmail = function (database) {
            getEmailConfig().then(function (address) {
                var parentDir = "unknown";

                $cordovaEmailComposer.isAvailable().then(function () {
                    // is available
                }, function () {
                    alert($translate.instant('email-service.email-account-not-configured'));
                    return;
                });

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

                $cordovaEmailComposer.open(email).then(function () {
                    window.Logger.log(window.Logger.LEVEL_DEBUG,
                        "Email queued successfully");
                },
                    function () {
                        // user cancelled email. in this case too, we want to remove the file
                        // so that the file creation earlier does not fail.
                        window.Logger.log(window.Logger.LEVEL_INFO,
                            "Email cancel reported, seems to be an error on android");
                    });
            }).catch(function (err) {
                alert($translate.instant('email-service.no-email-address-configured') + err);
                return;
            });
        };
    });
