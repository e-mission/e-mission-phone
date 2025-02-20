module.exports = function(api) {
    api.cache(true);
    const presets = ['@babel/preset-env',
        '@babel/preset-typescript',
        '@babel/preset-react'];
    const plugins = ['@babel/plugin-transform-flow-strip-types'];

    if (process.env.ENV !== "production") {
        presets.push('module:@react-native/babel-preset');
    }
    console.log("Running in environment "+process.env.ENV);

    return {presets, plugins};
}
