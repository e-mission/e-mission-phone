import { logDebug, logInfo, logError, displayError, displayErrorMsg } from "../plugin/logger";
import i18next from "i18next";

/**
 * @returns A promise that resolves with an upload URL or rejects with an error
 */
async function getUploadConfig() {
    return new Promise<string[]>(async function (resolve, reject) {
        logInfo( "About to get email config");
        let url = [];
        try {
            let response = await fetch("json/uploadConfig.json");
            let uploadConfig = await response.json();
            logDebug("uploadConfigString = " + JSON.stringify(uploadConfig['url']));
            url.push(uploadConfig["url"]);
            resolve(url);
        } catch (err) {
            try{
                let response = await fetch("json/uploadConfig.json.sample");
                let uploadConfig = await response.json();
                logDebug("default uploadConfigString = " + JSON.stringify(uploadConfig['url']));
                console.log("default uploadConfigString = " + JSON.stringify(uploadConfig['url']))
                url.push(uploadConfig["url"]);
                resolve(url);
            } catch (err) {
                logError("Error while reading default upload config" + err);
                reject(err);
            }
        } 
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
            console.log("resolving file system as ", fs);
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
                    console.log("Successful file read with " + this.result['byteLength'] +" characters");
                    resolve(new DataView(this.result as ArrayBuffer));
                  }

                  reader.readAsArrayBuffer(file);
                }, reject);
            }, reject);
        });
    });
}

const sendToServer = function upload(url, binArray, params) {
    //this was the best way I could find to contact the database, 
    //had to modify the way it gets handled on the other side
    //the original way it could not find "reason"
    return fetch(url, {
        method: 'POST',
        headers: {'Content-Type': undefined },
        body: binArray
    } )
}

//only export of this file, used in ProfileSettings and passed the argument (""loggerDB"")
export async function uploadFile(database, reason) {
    try {
        let uploadConfig = await getUploadConfig();
        var parentDir = "unknown";

        if (window['cordova'].platformId.toLowerCase() == "android") {
            parentDir = window['cordova'].file.applicationStorageDirectory+"/databases";
        }
        else if (window['cordova'].platformId.toLowerCase() == "ios") {
            parentDir = window['cordova'].file.dataDirectory + "../LocalDatabase";
        } else {
            alert("parentDir unexpectedly = " + parentDir + "!")
        }

        logInfo("Going to upload " + database);
        try {
            let binString = await readDBFile(parentDir, database, undefined);
            console.log("Uploading file of size "+binString['byteLength']);
            const params = {
                reason: reason,
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
            uploadConfig.forEach(async (url) => {
                //have alert for starting upload, but not progress
                window.alert(i18next.t("upload-service.upload-database", {db: database}));

                try {
                    let response = await sendToServer(url, binString, params);
                    window.alert(i18next.t("upload-service.upload-details", 
                        {filesizemb: binString['byteLength'] / (1000 * 1000), serverURL: url})
                        + i18next.t("upload-service.upload-success"));
                    return response;
                } catch (error) {
                    onUploadError(error);
                }
            });
        }
        catch (error){
            onReadError(error);
        }
    } catch (error) {
        onReadError(error);
    }
};