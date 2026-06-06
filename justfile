mod partdb

default:
    @just --list --list-submodules

alias fmt := format

format:
    ./node_modules/.bin/oxfmt

lint:
    ./node_modules/.bin/oxlint
