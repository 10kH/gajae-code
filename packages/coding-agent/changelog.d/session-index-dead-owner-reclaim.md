### Fixed

- SDK broker startup reclaims a same-host `sessions/index.jsonl.lock` whose owner process is provably dead, including a leftover `.lock.removing` directory. A live same-host owner and a lock attributed to another host stay in place.
