export NVM_VERSION=0.39.3
export NODE_VERSION=19.5.0
export NPM_VERSION=9.3.1
# make sure that this is a stable version from
# so that https://github.com/postmodern/ruby-versions
# ideally, this would be the same version as the CI
# Looks like brew supports only major and minor, not patch version
export RUBY_VERSION=3.0
export COCOAPODS_VERSION=1.11.3
export GRADLE_VERSION=7.6
export OSX_EXP_VERSION=12

export NVM_DIR="$HOME/.nvm"
export RUBY_PATH=$HOME/.gem/ruby/$RUBY_VERSION.0/bin
