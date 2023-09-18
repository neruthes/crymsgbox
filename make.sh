#!/bin/bash

REPODIR="$PWD"
source .env

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
        bash $0 cordova
        cd CryMsgBox || exit 1
        ../node_modules/cordova/bin/cordova build android
        # du -h "$(realpath platforms/android/app/build/outputs/apk/debug/app-debug.apk)"
        cd "$REPODIR"
        find -name "*.apk" | while read -r fn; do realpath "$fn"; done
        cp CryMsgBox/platforms/android/app/build/outputs/apk/debug/app-debug.apk _dist/CryMsgBox.apk
        ;;
    up|upload)
        WRITE_OSSLIST=y minoss _dist/CryMsgBox.apk
        cfoss _dist/CryMsgBox.apk
        ;;
    android_install|adb)
        scp CryMsgBox/platforms/android/app/build/outputs/apk/debug/app-debug.apk NDLT6G:/tmp/CryMsgBox.apk
        cp CryMsgBox/platforms/android/app/build/outputs/apk/debug/app-debug.apk _dist/CryMsgBox.apk
        adb install /tmp/CryMsgBox.apk
        ;;
    cf)
        wrangler pages deploy "www" --project-name="crymsgbox" --commit-dirty=true --branch=master
        ;;
esac
