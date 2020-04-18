export COCOAPODS_VERSION=1.7.5
export NODE_VERSION=9.4.0

echo "Removing .nvm since we installed it"
rm -rf ~/.nvm/$NODE_VERSION

echo "Removing all the node modules"
rm -rf ./node_modules
