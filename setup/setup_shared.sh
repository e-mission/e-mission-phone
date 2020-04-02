export NVM_VERSION=0.35.3
export NODE_VERSION=13.12.0
export NPM_VERSION=6.14.4

echo "Is this in a CI environment? $CI"
export CI="true"

echo "Installing the correct version of nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh | bash

echo "Setting up the variables to run nvm"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

echo "Installing the correct node version"
nvm install $NODE_VERSION

echo "Check the version of npm"
CURR_NPM_VERSION=`npm --version`
if [ $CURR_NPM_VERSION != $NPM_VERSION ];
then
    echo "Invalid npm version, expected $NPM_VERSION, got $CURR_NPM_VERSION"
    exit 1
fi

git remote add upstream https://github.com/covid19database/phone-app.git
