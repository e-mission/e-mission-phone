//call signature MessageFormat.compile(templage)(vars);
//in - template an vars -- {... pca: 0, ...}
//out - 1 Personal Care,

export default class MessageFormat {
  constructor(locale: string) {}

  compile(message: string) {
    return (vars: {}) => {
      let label = '';
      const brokenList = message.split('}{');
      console.log(brokenList);

      for (let key in vars) {
        brokenList.forEach((item) => {
          let brokenItem = item.split(',');
          if (brokenItem[0] == key) {
            let getLabel = brokenItem[2].split('#');
            console.log(getLabel);
            label = vars[key] + ' ' + getLabel[1];
            return label;
          }
        });
      }
    };
  }
}

exports.MessageFormat = MessageFormat;
