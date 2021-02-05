'use strict';

angular.module('emission.services.upload', ['emission.plugin.logger'])

    .service('UploadHelper', function ($window, $translate, $http, $rootScope, $ionicPopup, Logger) {
        const getUploadConfig = function () {
            return new Promise(function (resolve, reject) {
                window.Logger.log(window.Logger.LEVEL_INFO, "About to get email config");
                var url = [];
                $http.get("json/uploadConfig.json").then(function (uploadConfig) {
                    window.Logger.log(window.Logger.LEVEL_DEBUG, "uploadConfigString = " + JSON.stringify(uploadConfig.data));
                    url.push(uploadConfig.data.url)
                    resolve(url);
                }).catch(function (err) {
                    $http.get("json/uploadConfig.json.sample").then(function (uploadConfig) {
                        window.Logger.log(window.Logger.LEVEL_DEBUG, "default uploadConfigString = " + JSON.stringify(uploadConfig.data));
                        url.push(uploadConfig.data.url)
                        resolve(url);
                    }).catch(function (err) {
                        window.Logger.log(window.Logger.LEVEL_ERROR, "Error while reading default upload config" + err);
                        reject(err);
                    });
                });
            });
        }

        const onReadError = function(err) {
            Logger.displayError("Error while reading log", err);
        }

        const onUploadError = function(err) {
            Logger.displayError("Error while uploading log", err);
        }

        const readDBFile = function(database, callbackFn) {
            return new Promise(function(resolve, reject) {
                const storageRoot = cordova.file.applicationStorageDirectory;
                window.resolveLocalFileSystemURL(storageRoot, function(fs) {
                    fs.filesystem.root.getFile(fs.fullPath+"databases/"+database, null, (fileEntry) => {
                        console.log(fileEntry);
                        fileEntry.file(function(file) {
                          console.log(file);
                          var reader = new FileReader();

                          reader.onprogress = function(report) {
                            console.log("Current progress is "+JSON.stringify(report));
                            if (callbackFn != undefined) {
                                callbackFn(report.loaded * 100 / report.total);
                            }
                          }

                          reader.onerror = function(error) {
                            console.log(this.error);
                            reject({"error": {"message": this.error}});
                          }

                          reader.onload = function() {
                            console.log("Successful file read with " + this.result.length +" characters");
                            resolve(this.result);
                          }

                          reader.readAsBinaryString(file);
                        }, reject);
                    }, reject);
                });
            });
        }

        const sendToServer = function upload(url, formData) {
            var config = {
                headers: {'Content-Type': "undefined"},
                transformRequest: []
            };
            return $http.post(url, formData, config);
        }

        this.uploadFile = function (database) {
          getUploadConfig().then((uploadConfig) => {
            var parentDir = "unknown";

            if (ionic.Platform.isAndroid()) {
                parentDir = cordova.file.applicationStorageDirectory+"/databases";
            }
            if (ionic.Platform.isIOS()) {
                alert($translate.instant('email-service.email-account-mail-app'));
                parentDir = cordova.file.dataDirectory + "../LocalDatabase";
            }

            if (parentDir === "unknown") {
                alert("parentDir unexpectedly = " + parentDir + "!")
            }

            const newScope = $rootScope.$new();
            newScope.data = {};

            const detailsPopup = $ionicPopup.show({
                title: $translate.instant("upload-service.upload-from-dir", { parentDir: parentDir }),
                template: '<input type="text" ng-model="data.reason"'
                    +' placeholder="{{ \'upload-service.please-fill-in-what-is-wrong \' | translate}}">',
                scope: newScope,
                buttons: [
                  { text: 'Cancel' },
                  {
                    text: '<b>Upload</b>',
                    type: 'button-positive',
                    onTap: function(e) {
                      if (!newScope.data.reason) {
                        //don't allow the user to close unless he enters wifi password
                        e.preventDefault();
                      } else {
                        return newScope.data.reason;
                      }
                    }
                  }
                ]
            });

            window.Logger.log(window.Logger.LEVEL_INFO, "Going to upload " + database);
            const readFileAndInfo = [readDBFile(database), detailsPopup];
            Promise.all(readFileAndInfo).then((binString, reason) => {
                const fd = new FormData();
                fd.append("reason", reason);
                fd.append("rawFile", binString);
                uploadConfig.forEach((url) => {
                    sendToServer(url, fd).then((response) => {
                        console.log(response);
                    }).catch(onUploadError);
                });
            }).catch(onReadError);
          }).catch(onReadError);
        };
});
