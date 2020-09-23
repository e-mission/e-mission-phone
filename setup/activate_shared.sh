source setup/export_shared_dep_versions.sh

echo "Activating nvm"

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

echo "Using version $NODE_VERSION"
nvm use $NODE_VERSION

CURR_NPM_VERSION=`npm --version`
echo "npm version = $CURR_NPM_VERSION"
