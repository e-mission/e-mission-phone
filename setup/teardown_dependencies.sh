set -a
source setup/dependencies.env
set +a

echo "Removing .nvm since we installed it"
rm -rf ~/.nvm/$NODE_VERSION

echo "Removing all the node modules"
rm -rf ./node_modules
