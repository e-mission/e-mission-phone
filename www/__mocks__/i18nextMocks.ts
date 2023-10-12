const i18next = jest.createMockFromModule('i18next');

let resolvedLanugage;

function  _setUpLanguage(language) {
    console.log("setting resolved language to ", language, " for testing");
    resolvedLanugage = language;
}
