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
        yarn
        rsync -av --delete www/ CryMsgBox/www/
        ;;
    ios)
        bash "$0" www cordova
        cd CryMsgBox || exit 1
        ../node_modules/cordova/bin/cordova build ios
        ;;
    android)
        bash "$0" www cordova
        cd CryMsgBox || exit 1
        ../node_modules/cordova/bin/cordova build android
        cd "$REPODIR" || exit 1
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
