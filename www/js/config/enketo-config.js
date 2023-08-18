// https://github.com/enketo/enketo-core#global-configuration

const enketoConfig = {
    swipePage: false, /* Enketo's use of swipe gestures depends on jquery-touchswipe,
                        which is a legacy package, and problematic to load in webpack.
                        Let's just turn it off. */
    experimentalOptimizations: {}, /* We aren't using any experimental optimizations,
                                    but it has to be defined to avoid errors */
}
export default enketoConfig;
