./bin/configure_xml_and_json.js cordovabuild

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
