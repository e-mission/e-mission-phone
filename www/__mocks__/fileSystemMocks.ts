export const mockFileSystem = () => {
  window['resolveLocalFileSystemURL'] = function (parentDir, handleFS) {
    const fs = {
      filesystem:
      {
        root:
        {
          getFile: (path, options, onSuccess) => {
            let fileEntry = {
              file: (handleFile) => {
                let file = new File(["this is a mock"], "loggerDB");
                handleFile(file);
              },
              nativeURL: 'file:///Users/Jest/test/URL/',
              isFile: true,
              createWriter: (handleWriter) => {
                const mockFileWriter = {
                  fileWriter: {
                    write: (myObect) => {
                      console.log(`Wrote: ${myObect}`)
                    },
                    onwriteend: () => {},
                    onerror: (error) => { return error; }
                  }
                }
              },
            }
            onSuccess(fileEntry);
          }
        }
      }
    }
    console.log("in mock, fs is ", fs, " get File is ", fs.filesystem.root.getFile);
    handleFS(fs);
  }
}