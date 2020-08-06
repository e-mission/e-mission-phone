source setup/export_shared_dep_versions.sh

echo "Ensure that we fail on error"
set -e

echo "Installing the correct version of nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh | bash

echo "Setting up the variables to run nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

echo "Installing the correct node version"
nvm install $NODE_VERSION

echo "Check the version of npm"
CURR_NPM_VERSION=`npm --version`
if [ $CURR_NPM_VERSION != $NPM_VERSION ];
then
    echo "Invalid npm version, expected $NPM_VERSION, got $CURR_NPM_VERSION"
    npm install npm@$NPM_VERSION
fi
