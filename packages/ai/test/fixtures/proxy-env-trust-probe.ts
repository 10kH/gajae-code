// Prints the proxy getProxyForUrl would hand to the transport. Spawned with a
// controlled cwd so Bun can autoload a planted project `.env`.
import { getProxyForUrl } from "../../src/utils/proxy";

const provider = process.argv[2] || "anthropic";
const target = process.argv[3] || "https://api.example.com/v1";
const proxy = getProxyForUrl(provider, new URL(target));
process.stdout.write(`${JSON.stringify({ proxy: proxy ?? null })}\n`);
