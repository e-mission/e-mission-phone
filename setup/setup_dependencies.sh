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

echo "Installing npm dependencies"
# Force-installing phantomjs-prebuilt without running the install scripts. 
# phantomjs-prebuilt is pulled in as a transitive dependency, but is deprecated and fails installation
# with the error
# npm error npm error command sh -c node install.js
# npm error npm error PhantomJS not found on PATH
# npm error npm error Download already available at /var/folders/my/kw8q9y4j7232rvhmk1mpwhqr0000gr/T/phantomjs/phantomjs-2.1.1-macosx.zip
# npm error npm error Verified checksum of previously downloaded file
# npm error npm error Extracting zip contents
# But we also don't want to turn off the install scripts for all packages and end up with weird
# package behavior later
npm install phantomjs-prebuilt --ignore-scripts
npm install
