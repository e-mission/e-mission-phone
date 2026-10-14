set -a
source setup/dependencies.env
set +a

if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh" --no-use
    nvm deactivate >/dev/null 2>&1 || true
    nvm uninstall "$NODE_VERSION" || true
fi

echo "Removing all the node modules"
rm -rf ./node_modules

echo "Reset the submodule to the checked-in version"
git submodule update --init --recursive locales
