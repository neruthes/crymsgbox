#!/bin/bash

case $1 in
    cf)
        wrangler pages deploy "src" --project-name="crymsgbox" --commit-dirty=true --branch=master
        ;;
esac
