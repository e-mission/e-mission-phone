const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  resolveRequest: (context, moduleName, platform) => {
    /* enketo-transformer has 'libxslt' as an optional peer dependency.
      We don't need it since we are only doing client-side transformations via
        enketo-transformer/web (https://github.com/enketo/enketo-transformer#web).
      So, we can tell metro it's ok to ignore libxslt by aliasing it to false. */
    if (moduleName == 'libxslt') {
      return { type: 'empty' };
    }
    // Optionally, chain to the standard Metro resolver.
    return context.resolveRequest(context, moduleName, platform);
  }
};

module.exports = config;