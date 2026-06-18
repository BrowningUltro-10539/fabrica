mod partdb
mod site

default:
    @just --list --list-submodules

alias fmt := format

format:
    ./node_modules/.bin/oxfmt

lint:
    ./node_modules/.bin/oxlint

install *ARGS:
    pnpm install {{ ARGS }}

setup: install
    ./node_modules/.bin/husky
