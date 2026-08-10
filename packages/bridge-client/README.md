# Internal SDK transport client

This workspace package is private implementation code for GJC SDK core. It is not a public attachment surface.

Only Broker, `SessionRouter`, and trusted in-process runtime adapters may use it. External integrations must use Router-owned opaque capabilities and must never receive endpoint URL/token credentials.
