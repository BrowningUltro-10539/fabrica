default:
    @just --list cache

alias gc := collect-garbage

# Remove expired files from the cache.
collect-garbage:
    node dev/collect-garbage.ts

# Remove all manifest files within the cache. DO NOT RUN UNLESS YOU'RE SURE WHAT YOU'RE DOING!
[confirm("Are you sure you want to delete ALL manifest files from the cache?")]
purge-files:
    rm cache/files -rf

# Remove all blob files within the cache. DO NOT RUN UNLESS YOU'RE SURE WHAT YOU'RE DOING!
[confirm("Are you sure you want to delete ALL blobs from the cache?")]
purge-blobs:
    rm cache/blobs -rf

alias purge := purge-all

# Remove all files within the cache. DO NOT RUN UNLESS YOU'RE SURE WHAT YOU'RE DOING!
[confirm("Are you sure you want to delete ALL files from the cache?")]
purge-all:
    rm cache/** -rf
