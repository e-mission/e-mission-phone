import { logDebug, logInfo, logError, displayError, displayErrorMsg } from "../plugin/logger";
import { useTranslation } from "react-i18next";

/**
 * @returns A promise that resolves with an upload URL or rejects with an error
 */
function getUploadConfig() {
    return new Promise<string[]>(function (resolve, reject) {
        //logInfo( "About to get email config");
        let url = [];
        fetch("json/uploadConfig.json").then( function (uploadConfig) {
            //logDebug("uploadConfigString = " + JSON.stringify(uploadConfig['data']));
            url.push(uploadConfig["data"].url);
            resolve(url);
        }).catch(function (err) {
            fetch("json/uploadConfig.json.sample"). then(function (uploadConfig) {
                //logDebug("default uploadConfigString = " + JSON.stringify(uploadConfig['data']));
                console.log("default uploadConfigString = " + JSON.stringify(uploadConfig['data']))
                url.push(uploadConfig["data"].url);
                resolve(url);
            }).catch(function (err) {
                //logError("Error while reading default upload config" + err);
                reject(err);
            })
        })
    })
}

function onReadError(err) {
    displayError(err, "Error while reading log");
}

function onUploadError(err) {
    displayError(err, "Error while uploading log");
}

function readDBFile(parentDir, database, callbackFn) {
    return new Promise(function(resolve, reject) {
        window['resolveLocalFileSystemURL'](parentDir, function(fs) {
            fs.filesystem.root.getFile(fs.fullPath+database, null, (fileEntry) => {
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
                    console.log("Successful file read with " + this.result.byteLength +" characters");
                    resolve(new DataView(this.result));
                  }

                  reader.readAsArrayBuffer(file);
                }, reject);
            }, reject);
        });
    });
}

const sendToServer = function upload(url, binArray, params) {
    //attempting to replace angular.identity
    var identity = function() {
        return arguments[0];
    }
    
    var config = {
        method: "POST",
        body: binArray,
        headers: {'Content-Type': undefined },
        transformRequest: identity,
        params: params
    };
    return fetch (url, config);
}


//only export of this file, used in ProfileSettings and passed the argument (""loggerDB"")
export function uploadFile(database) {
    const { t } = useTranslation();
    getUploadConfig().then((uploadConfig) => {
      var parentDir = "unknown";

      if (window['cordova'].platformId.toLowerCase() == "android") {
          parentDir = window['cordova'].file.applicationStorageDirectory+"/databases";
      }
      else if (window['cordova'].platformId.toLowerCase() == "ios") {
          parentDir = window['cordova'].file.dataDirectory + "../LocalDatabase";
      } else {
          alert("parentDir unexpectedly = " + parentDir + "!")
      }

      const newScope = {};
      newScope["data"] = {};
      newScope["fromDirText"] = t('upload-service.upload-from-dir',  {parentDir: parentDir});
      newScope["toServerText"] = t('upload-service.upload-to-server',  {serverURL: uploadConfig});

      let didCancel = true;
      let detailsPopup = () => console.log("I need a popup");

    //   const detailsPopup = $ionicPopup.show({
    //     title: i18next.t("upload-service.upload-database", { db: database }),
    //     template: newScope.toServerText
    //         + '<input type="text" ng-model="data.reason"'
    //         +' placeholder="{{ \'upload-service.please-fill-in-what-is-wrong \' | translate}}">',
    //     scope: newScope,
    //     buttons: [
    //       { 
    //         text: 'Cancel',
    //         onTap: function(e) {
    //             didCancel = true;
    //             detailsPopup.close();
    //         }
    //       },
    //       {
    //         text: '<b>Upload</b>',
    //         type: 'button-positive',
    //         onTap: function(e) {
    //           if (!newScope.data.reason) {
    //             //don't allow the user to close unless he enters wifi password
    //             didCancel = false;
    //             e.preventDefault();
    //           } else {
    //             didCancel = false;
    //             return newScope.data.reason;
    //           }
    //         }
    //       }
    //     ]
    // });

      logInfo("Going to upload " + database);
      const readFileAndInfo = [readDBFile(parentDir, database, detailsPopup)];
      Promise.all(readFileAndInfo).then(([binString, reason]) => {
        if(!didCancel)
        {  
          console.log("Uploading file of size "+binString['byteLength']);
          const progressScope = {...newScope}; //make a child copy of the current scope
          const params = {
              reason: reason,
              tz: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
          uploadConfig.forEach((url) => {
            alert(t("upload-service.upload-database", {db: database})
                + "\n"
                + t("upload-service.upload-progress", {filesizemb: binString['byteLength'] / (1000 * 1000), serverURL: uploadConfig})
            );
            //   const progressPopup = $ionicPopup.show({
            //       title: t("upload-service.upload-database",
            //           {db: database}),
            //       template: t("upload-service.upload-progress",
            //           {filesizemb: binString['byteLength'] / (1000 * 1000),
            //            serverURL: uploadConfig})
            //           + '<center><ion-spinner></ion-spinner></center>',
            //       scope: progressScope,
            //       buttons: [
            //           { text: '<b>Cancel</b>', type: 'button-cancel',  },
            //       ]
            //   });
              sendToServer(url, binString, params).then((response) => {
                console.log(response);
                //progressPopup.close();
                displayErrorMsg(t("upload-service.upload-details", 
                    {filesizemb: binString['byteLength'] / (1000 * 1000), serverURL: uploadConfig}), 
                    t("upload-service.upload-success"));
              }).catch(onUploadError);
          });
        }
      }).catch(onReadError);
    }).catch(onReadError);
  };