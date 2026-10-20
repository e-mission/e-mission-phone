set -a
source setup/dependencies.env
set +a

echo "Ensure that we fail on error"
set -e

echo "Initializing translation submodule"
git submodule update --init --recursive locales

echo "Installing the correct version of nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh | bash

echo "Setting up the variables to run nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

echo "Installing the correct node version"
nvm install $NODE_VERSION

# This has to be installed with `-g` so that the install doesn't try to install all local
# packages as well. Without `-g`, npm install tries to install
# `phantomjs-prebuilt` locally as well, which fails.
# `-g` installs globally, and the new 12+ version supports allowScripts in package.json
# which allows us to exclude scripts for this deprecated package alone
echo "Update npm to a version that supports overrides"
npm install -g npm@$NPM_VERSION

# Since allow-git is default false on npm 12+ and many of our plugins are installed from git,
# let's return to the old "allow from git" behavior
# https://github.com/e-mission/e-mission-phone/pull/1307#issuecomment-6298469009
echo "Installing npm dependencies"
npm install
