#!/bin/bash

npx greenlock init --config-dir ./greenlock.d --maintainer-email jon@joncloudgeek.com
npx greenlock add --subject bookshelf-greenlock.joncloudgeek.com --altnames bookshelf-greenlock.joncloudgeek.com
node server.js