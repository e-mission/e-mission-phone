export const mockFileSystem = () => {
  type MockFileWriter = {
    onreadend: any;
    onerror: (e: any) => void;
    write: (obj: Blob) => void;
  };
  window['resolveLocalFileSystemURL'] = (parentDir, handleFS) => {
    const fs = {
      filesystem: {
        root: {
          getFile: (path, options, onSuccess) => {
            let fileEntry = {
              file: (handleFile) => {
                let file = new File(['this is a mock'], 'loggerDB');
                handleFile(file);
              },
              nativeURL: 'file:///Users/Jest/test/URL/',
              isFile: true,
            };
            onSuccess(fileEntry);
          },
        },
      },
    };
    console.log('in mock, fs is ', fs, ' get File is ', fs.filesystem.root.getFile);
    handleFS(fs);
  };
};
