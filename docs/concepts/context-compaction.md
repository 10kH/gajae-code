# Context Compaction

GJC compacts conversation context when the current context token count crosses the configured compaction threshold. By default, adaptive compaction is off and the legacy threshold behavior is preserved.

## Static Threshold Tuning

Use `compaction.thresholdPercent` to compact earlier or later:

```bash
gjc config set compaction.thresholdPercent 70
```

Or set the same value in `config.yml`:

```yaml
compaction:
  thresholdPercent: 70
```

`compaction.thresholdTokens` takes priority over `compaction.thresholdPercent` when it is greater than zero. The default percentage sentinel is `-1`, which uses the legacy reserve-based threshold: roughly `contextWindow - reserve`, commonly near 85% of the model context window.

## Adaptive Compaction

Adaptive compaction lowers the effective threshold when context is already large and many calls happen in a short window. This targets long sessions where a 150K-230K context can otherwise be resent many times before hitting the static threshold.

Recommended local starting point for long, tool-heavy sessions:

```yaml
compaction:
  adaptive:
    enabled: true
    baseThresholdPercent: 75
    aggression: 0.2
    turnWindow: 15
    minThresholdPercent: 50
```

The adaptive threshold uses both context fill and call rate. When context is in the high band and recent calls are dense, `aggression` lowers the threshold toward `minThresholdPercent`. Immediately after a compaction, the threshold returns to the base level for three turns to avoid repeated re-compaction.

Leave `compaction.adaptive.enabled` as `false` for exact legacy behavior. The shipped default remains off for backward compatibility.
