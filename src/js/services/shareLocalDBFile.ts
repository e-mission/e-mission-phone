import i18next from 'i18next';
import { displayError, logDebug } from '../plugin/logger';
import { Alerts } from '../components/alerts';
import { getConfig } from '../config/dynamicConfig';
import { getDeploymentId, getDiagnosticInfo } from './emailHelper';

function localCopyFile(fileName: string, fileExtension: string = '.txt') {
  return new Promise<string>((resolve, reject) => {
    let pathToFile, parentDirectory;
    if (window['cordova'].platformId == 'android') {
      // parentDirectory: file:///data/user/0/edu.berkeley.eecs.emission/files/
      parentDirectory = window['cordova'].file.dataDirectory.replace('files', 'databases');
      // pathToFile: /data/user/0/edu.berkeley.eecs.emission/files/
      pathToFile = parentDirectory.replace('file://', '') + fileName;
    } else if (window['cordova'].platformId == 'ios') {
      // parentDirectory: file:///var/mobile/Containers/Data/Application/<32-hex-digit-id>/Library/NoCloud/../
      parentDirectory = window['cordova'].file.dataDirectory + '../';
      pathToFile = 'LocalDatabase/' + fileName;
    } else {
      throw new Error('Error: Unknown OS!');
    }

    window['resolveLocalFileSystemURL'](
      parentDirectory,
      (fs) => {
        // On iOS, pass in relative path to getFile https://github.com/e-mission/e-mission-phone/pull/1160#issuecomment-2192112472
        // On Android, pass in absolute path to getFile https://github.com/e-mission/e-mission-phone/pull/1160#issuecomment-2204297874
        fs.filesystem.root.getFile(
          pathToFile,
          { create: false, exclusive: false },
          (fileEntry) => {
            // logDebug(`fileEntry ${fileEntry.nativeURL} is file? ${fileEntry.isFile.toString()}`);
            logDebug(`fileEntry is: ${JSON.stringify(fileEntry, null, 2)}`);
            window['resolveLocalFileSystemURL'](
              window['cordova'].file.cacheDirectory,
              (copyDir) => {
                logDebug(`DirectoryEntry is: ${JSON.stringify(copyDir.filesystem.root, null, 2)}`);

                fileEntry.copyTo(
                  copyDir.filesystem.root,
                  fileName + fileExtension,
                  (res) => {
                    logDebug(`Res: ${res}`);
                    resolve(res.nativeURL);
                  },
                  (rej) => {
                    reject(rej);
                  },
                );
              },
              reject,
            );
          },
          reject,
        );
      },
      reject,
    );
  });
}

function localWriteTmpFile(fileName: string, contents: string) {
  const nativeWindow = window as any;
  return new Promise<string>((resolve, reject) => {
    nativeWindow.resolveLocalFileSystemURL(
      nativeWindow.cordova.file.cacheDirectory,
      (fs: any) => {
        fs.filesystem.root.getFile(
          fileName + '.txt',
          { create: true, exclusive: true },
          (fileEntry: any) => {
            fileEntry.createWriter((fileWriter: any) => {
              fileWriter.onwriteend = () => resolve(fileEntry.nativeURL);
              fileWriter.onerror = () => reject(fileWriter.error);
              fileWriter.write(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
            }, reject);
          },
          reject,
        );
      },
      reject,
    );
  });
}

function localShareFile(fileName: string, fileExtension: string = '.txt') {
  return new Promise<void>((resolve, reject) => {
    window['resolveLocalFileSystemURL'](window['cordova'].file.cacheDirectory, (fs) => {
      fs.filesystem.root.getFile(
        fileName + fileExtension,
        null,
        (fileEntry) => {
          const shareObj = {
            files: [fileEntry.nativeURL],
            message: i18next.t('shareFile-service.send-log.body-please-fill-in-what-is-wrong'),
            subject: i18next.t('shareFile-service.send-log.subject-logs'),
          };
          window['plugins'].socialsharing.shareWithOptions(
            shareObj,
            (result) => {
              logDebug(`Share Completed? ${result.completed}`); // On Android, most likely returns false
              logDebug(`Shared to app:  ${result.app}`);
              resolve();
            },
            (error) => {
              displayError(error, `Sharing failed with error`);
            },
          );
        },
        (error) => {
          displayError(error, 'Error while sharing logs');
          reject(error);
        },
      );
    });
  });
}

function localClearTmpFile(fileName: string, fileExtension: string = '.txt') {
  return new Promise<void>((resolve, reject) => {
    window['resolveLocalFileSystemURL'](
      window['cordova'].file.cacheDirectory,
      (fs) => {
        fs.filesystem.root.getFile(
          fileName + fileExtension,
          null,
          (fileEntry) => {
            logDebug(`got fileEntry: ${JSON.stringify(fileEntry, null, 2)}`);
            fileEntry.remove(
              () => {
                logDebug(`Successfully cleaned up file ${fileName}`);
                resolve();
              },
              (err) => {
                reject(err);
              },
            );
          },
          (getFileError) => {
            logDebug(`tmp file did not exist, that is fine: ${JSON.stringify(getFileError)}`);
            resolve();
          },
        );
      },
      reject,
    );
  });
}

export async function emailErrorReport(title: string, errorMsg: string) {
  const socialSharing = (window as any).plugins?.socialsharing;
  if (!socialSharing?.shareViaEmail || !socialSharing?.canShareViaEmail) {
    throw new Error(i18next.t('error-report.email-unavailable'));
  }
  await new Promise<void>((resolve, reject) => {
    socialSharing.canShareViaEmail(
      () => resolve(),
      () => reject(new Error(i18next.t('error-report.email-unavailable'))),
    );
  });

  let deploymentId = '';
  try {
    const c = await getConfig();
    deploymentId = getDeploymentId(c);
    console.log('config:', c);
    console.log('deploymentId:', deploymentId);
  } catch {
    logDebug('Deployment unavailable for error report');
  }
  const diagnosticInfo = await getDiagnosticInfo(deploymentId);
  const body = i18next.t('control.feedback-modal.feedback-email-body', { diagnosticInfo });
  const htmlBody = `<div>${body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n|\r|\n/g, '<br>')}</div>`;
  const fileName = 'loggerDB';
  const stackFileName = 'stacktrace';

  await Promise.all([localClearTmpFile(fileName), localClearTmpFile(stackFileName)]);
  try {
    const fileUrl = await localCopyFile(fileName);
    const stackFileUrl = await localWriteTmpFile(stackFileName, `${title}\n${errorMsg}`);
    await new Promise<void>((resolve, reject) => {
      socialSharing.shareViaEmail(
        htmlBody,
        i18next.t('error-report.email-subject', { title }),
        ['openpath@nlr.gov'],
        null,
        null,
        [fileUrl, stackFileUrl],
        () => resolve(),
        reject,
      );
    });
  } finally {
    await Promise.all([localClearTmpFile(fileName), localClearTmpFile(stackFileName)]);
  }
}

export async function sendLocalDBFile(dbFileName: string) {
  Alerts.addMessage({ text: i18next.t('shareFile-service.send-to') });

  try {
    // in case there is a leftover tmp file, clear it before sharing
    await localClearTmpFile(dbFileName);
    await localCopyFile(dbFileName);
    await localShareFile(dbFileName);
    // clear the tmp file after sharing
    await localClearTmpFile(dbFileName);
    logDebug(`File Shared!`);
  } catch (err) {
    displayError(err);
  }
}
