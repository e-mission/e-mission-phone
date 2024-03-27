import { logDebug, logInfo, displayError } from '../plugin/logger';
import i18next from 'i18next';

/**
 * @returns A promise that resolves with an upload URL or rejects with an error
 */
async function getUploadConfig() {
  return new Promise<string[]>(async (resolve, reject) => {
    logInfo('About to get email config');
    let url: string[] = [];
    try {
      let response = await fetch('json/uploadConfig.json');
      let uploadConfig = await response.json();
      logDebug('uploadConfigString = ' + JSON.stringify(uploadConfig['url']));
      url.push(uploadConfig['url']);
      resolve(url);
    } catch (err) {
      try {
        let response = await fetch('json/uploadConfig.json.sample');
        let uploadConfig = await response.json();
        logDebug('default uploadConfigString = ' + JSON.stringify(uploadConfig['url']));
        url.push(uploadConfig['url']);
        resolve(url);
      } catch (err) {
        displayError(err, 'Error while reading default upload config');
        reject(err);
      }
    }
  });
}

function onReadError(err) {
  displayError(err, 'Error while reading log');
}

function onUploadError(err) {
  displayError(err, 'Error while uploading log');
}

function readDBFile(parentDir, database, callbackFn) {
  return new Promise((resolve, reject) => {
    window['resolveLocalFileSystemURL'](parentDir, (fs) => {
      logDebug('resolving file system as ' + JSON.stringify(fs));
      fs.filesystem.root.getFile(
        fs.fullPath + database,
        null,
        (fileEntry) => {
          logDebug('fileEntry = ' + JSON.stringify(fileEntry));
          fileEntry.file((file) => {
            logDebug('file = ' + JSON.stringify(file));
            const reader = new FileReader();

            reader.onprogress = (report) => {
              logDebug('Current progress is ' + JSON.stringify(report));
              if (callbackFn != undefined) {
                callbackFn((report.loaded * 100) / report.total);
              }
            };

            reader.onerror = (error) => {
              logDebug('Error while reading file ' + JSON.stringify(reader.error));
              reject({ error: { message: reader.error } });
            };

            reader.onload = () => {
              logDebug(`Successful file read with ${reader.result?.['byteLength']} characters`);
              resolve(new DataView(reader.result as ArrayBuffer));
            };

            reader.readAsArrayBuffer(file);
          }, reject);
        },
        reject,
      );
    });
  });
}

const sendToServer = function upload(url, binArray, params) {
  //use url encoding to pass additional params in the post
  const urlParams = '?reason=' + params.reason + '&tz=' + params.tz;
  return fetch(url + urlParams, {
    method: 'POST',
    // headers: { 'Content-Type': undefined },
    body: binArray,
  });
};

//only export of this file, used in ProfileSettings and passed the argument (""loggerDB"")
export async function uploadFile(database, reason) {
  try {
    let uploadConfig = await getUploadConfig();
    let parentDir = 'unknown';

    if (window['cordova'].platformId.toLowerCase() == 'android') {
      parentDir = window['cordova'].file.applicationStorageDirectory + '/databases';
    } else if (window['cordova'].platformId.toLowerCase() == 'ios') {
      parentDir = window['cordova'].file.dataDirectory + '../LocalDatabase';
    } else {
      alert('parentDir unexpectedly = ' + parentDir + '!');
    }

    logInfo('Going to upload ' + database);
    try {
      let binString: any = await readDBFile(parentDir, database, undefined);
      logDebug('Uploading file of size ' + binString['byteLength']);
      const params = {
        reason: reason,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      uploadConfig.forEach(async (url) => {
        //have alert for starting upload, but not progress
        window.alert(i18next.t('upload-service.upload-database', { db: database }));

        try {
          let response = await sendToServer(url, binString, params);
          window.alert(
            i18next.t('upload-service.upload-details', {
              filesizemb: binString['byteLength'] / (1000 * 1000),
              serverURL: url,
            }) + i18next.t('upload-service.upload-success'),
          );
          return response;
        } catch (error) {
          onUploadError(error);
        }
      });
    } catch (error) {
      onReadError(error);
    }
  } catch (error) {
    onReadError(error);
  }
}
