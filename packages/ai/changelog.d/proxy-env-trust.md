### Fixed

- `getProxyForUrl` ignores `PI_PROXY`, `PI_PROXY_<PROVIDER>`, `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY` (and their lowercase aliases) when the project dotenv declares that value. A different shell value is still used only when that declaration is a comparable static value. A dynamic or incomparable declaration (expansion, quoted inner whitespace, or an escape the snapshot will not compare) drops the shell value as well.
