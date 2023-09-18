#!/bin/bash

REPODIR="$PWD"
source .env


if [[ -n $2 ]]; then
    for i in "$@"; do
        bash "$0" "$i" || exit 1
    done
fi

case $1 in
    www)
        ### Import JS files
        JSLIST="
            tweetnacl/nacl-fast.min
            jssha/dist/sha
            hi-base32/src/base32
            tweetnacl-util/nacl-util.min
        "
        for fn in $JSLIST; do
            cp -a "node_modules/$fn.js" src/jslib/
        done
        ### Next steps...
        rsync -av --delete src/ www/
        npx tailwindcss -i ./src/style.css -o ./www/style.css
        # ./node_modules/.bin/webpack
        ;;
    cordova)
        rsync -av --delete www/ CryMsgBox/www/
        ;;
    android)
        bash "$0" cordova
        cd CryMsgBox || exit 1
        ../node_modules/cordova/bin/cordova build android
        cd "$REPODIR" || exit 1
        # find . -name "*.apk" | while read -r fn; do realpath "$fn"; done
        cp CryMsgBox/platforms/android/app/build/outputs/apk/debug/app-debug.apk _dist/CryMsgBox.apk
        ;;
    up|upload)
        WRITE_OSSLIST=y minoss _dist/CryMsgBox.apk
        cfoss _dist/CryMsgBox.apk
        ;;
    android_install|adb)
        adb install _dist/CryMsgBox.apk
        ;;
    cf)
        wrangler pages deploy "www" --project-name="crymsgbox" --commit-dirty=true --branch=master
        ;;
esac
