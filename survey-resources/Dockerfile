FROM node:8-alpine

WORKDIR /usr/app
COPY package.json package-lock.json index.js ./
RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python && \
  npm install --quiet node-gyp -g &&\
  npm ci &&\
  apk del native-deps

ENTRYPOINT node .
