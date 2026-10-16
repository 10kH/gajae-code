### Fixed

- `getProxyForUrl` ignores `PI_PROXY`, `PI_PROXY_<PROVIDER>`, `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY` (and their lowercase aliases) when the project dotenv declares that value, including a dynamic declaration. A proxy inherited from the launching shell is still used, including when the project declaration differs.
