export const mockFileSystem = () => {
    window['resolveLocalFileSystemURL'] = function (parentDir, handleFS) {
        return new DataView({byteLength: 100} as ArrayBuffer)
    }
  }