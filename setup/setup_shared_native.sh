echo "Ensure that we fail on error"

set -e
./bin/configure_xml_and_json.js cordovabuild

echo "Copying fake FCM configurations for android and iOS"
cp setup/GoogleService-Info.fake.for_ci.plist GoogleService-Info.plist
cp setup/google-services.fake.for_ci.json google-services.json

echo "Setting up all npm packages"
npm install

echo "Updating bower"
npx bower update

# By default, node doesn't fail if any of the steps fail. This makes it hard to
# use in a CI environment, and leads to people reporting the node error rather
# than the underlying error. One solution is to pass in a command line argument to node
# to turn off that behavior. However, the cordova script automatically invokes node
# and I don't see a .noderc to pass in the config option for all runs
# So for now, I am going to hack this by adding the command line argument to
# the cordova script. If anybody has a better option, they are welcome to share
# it with us!
echo "hack to make the local cordova fail on error"
sed -i -e "s|/usr/bin/env node|/usr/bin/env node --unhandled-rejections=strict|" node_modules/cordova/bin/cordova

npx cordova prepare

EXPECTED_COUNT=23
INSTALLED_COUNT=`npx cordova plugin list | wc -l`
echo "Found $INSTALLED_COUNT plugins, expected $EXPECTED_COUNT"
if [ $INSTALLED_COUNT -lt $EXPECTED_COUNT ];
then
    echo "Found $INSTALLED_COUNT plugins, expected $EXPECTED_COUNT, retrying" 
    sleep 5
    npx cordova prepare
elif [ $INSTALLED_COUNT -gt $EXPECTED_COUNT ];
then
    echo "Found extra plugins!"
    npx cordova plugin list
    echo "Failing for investigation"
    exit 1
else
    echo "All plugins installed successfully!"
fi

