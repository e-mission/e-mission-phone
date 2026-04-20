module.exports = function (api) {
    api.cache(true);
    const presets = ['babel-preset-expo'];
    const plugins = [];

    console.log("Running in environment " + process.env.ENV);

    return { presets, plugins };
}
