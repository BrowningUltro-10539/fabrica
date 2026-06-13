default:
    @just --list cache

alias gc := collect-garbage

# Remove expired files from the cache.
collect-garbage:
    node dev/collect-garbage.ts

# Remove all files within the cache. DO NOT RUN UNLESS YOU'RE SURE WHAT YOU'RE DOING!
[confirm("Are you sure you want to delete ALL files from the cache?")]
purge:
    rm cache -rf
