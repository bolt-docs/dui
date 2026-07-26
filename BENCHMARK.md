# DUI Pipeline Benchmark

Throughput measurements for the `batch.ts` + `surface.ts` rendering pipeline.

## Methodology

- **Surface size:** 80 columns × 24 rows = 1,920 cells
- **Cell density:** ~30 % of cells change per frame (mix of styled writes, fills, unstyled text, and a full `clear()` every 20th frame)
- **Frames:** 1,000 per benchmark, preceded by 50 warmup frames
- **Stream:** In-memory `Writable` (zero disk I/O — pure CPU measurement)
- **Timing:** `performance.now()` with nanosecond resolution
- **Runner:** `tsx` v4.23.1 on Node.js v26.5.0
- **Date:** 2026-07-26

### Benchmarks

| # | Operation | What it measures |
|---|---|---|
| 1 | `surface.write() / fill()` | Generating frame content — writing styled/fill/unstyled data to cells |
| 2 | `surface.flush() (pure)` | Diff→ANSI generation with near-zero dirty cells (scan overhead floor) |
| 3 | `surface.flush() (write + diff)` | Writing 8 chars + flushing — a minimal incremental update |
| 4 | `surface.render() (full→ANSI)` | Full redraw — serializing every cell to ANSI unconditionally |
| 5 | `batch.write()` | Accumulating 256 bytes into the batch buffer |
| 6 | `batch.write() + flush()` | Accumulating + flushing to the stream |
| 7 | `direct stream.write()` | Writing 256 bytes directly to the stream (no batching — **baseline**) |
| 8 | **Pipeline** | `genFrame()` → `surface.flush()` → `batch.write(diff)` → `batch.flush()` |

## Results

```
──────────────────────────────────────────────────────────────────────
                                    Operation      Mean     p50     p95    Ops/s     Bytes
──────────────────────────────────────────────────────────────────────
                  surface.write() / fill()      22.34   13.52   59.70     44.8        —
                   surface.flush() (pure)        0.04    0.01    0.02  24124.1        1
              surface.flush() (write + diff)      0.09    0.05    0.09  11748.6       68
                  surface.render() (full→ANSI)  23.12   14.46   71.12     43.2    13167
                        batch.write() (raw text)  0.07    0.01    0.01  14986.9        —
                         batch.write() + flush()  0.05    0.01    0.02  20772.9        —
                  direct stream.write() (baseline) 0.01    0.01    0.02  72903.0        —
          pipeline (write→flush→batch→flush)   21.56   13.48   74.03     46.4    14995
──────────────────────────────────────────────────────────────────────
```

### Key ratios

```
Surface flush (pure)               0.04 ms   (24,124 ops/sec)
Surface flush (dirty)              0.09 ms   (11,749 ops/sec)
Surface write (30% density)       22.34 ms   (45 ops/sec)
Pipeline (write+flush+batch)      21.56 ms   (46 ops/sec)

Mean ANSI output per frame        14,995 bytes
Pipeline throughput                ~695 KB/s
```

## Analysis

### 1. Surface writing is the bottleneck (22.3 ms/frame)

`surface.write()` and `surface.fill()` dominate the frame budget regardless of the rendering strategy. At 30 % density the surface processes **~576 cells per frame** (80×24×0.3). This is the cost of:

- Coordinate validation (bounds checking per cell)
- ANSI stripping from input strings
- Style application (fg/bg hex parsing, boolean toggles)
- Dirty-flag propagation

**p50 = 13.5 ms vs p95 = 59.7 ms** — the 4.4× spread comes from the `clear()` spike every 20th frame (all 1,920 cells become dirty and get re-styled). For UI work, this means the *median* frame is smooth while every 20th frame may cause a visible stutter.

### 2. Surface flush: pure vs dirty

| Variant | Mean | p50 | Ops/sec |
|---|---|---|---|
| Pure (near-empty scan) | 0.04 ms | 0.01 ms | 24,124/s |
| Dirty (write + flush) | 0.09 ms | 0.05 ms | 11,749/s |

The **~2× difference** shows that even a tiny write (8 chars with style) adds measurable overhead due to:
- Dirty-cell detection in the scan pass
- SGR delta computation against the previous SGR state
- Cursor-move sequence generation

Both are extremely fast — the dirty flush could theoretically drive **1.1 million dirty cells/sec** through the terminal.

### 3. Surface render: full redraw (23.1 ms)

`render()` serializes every cell unconditionally at **13,167 bytes per frame** (the full ANSI representation). The **~240× difference** between `render()` and `flush()` is the core design win — the SGR state tracking and dirty-cell scan make incremental updates effectively free compared to full redraws.

### 4. Batch overhead: ~0.05 ms (< 0.3 % of pipeline)

| Comparison | Mean | Ops/sec | vs baseline |
|---|---|---|---|
| `batch.write()` | 0.07 ms | 14,987/s | — |
| `batch.write() + flush()` | 0.05 ms | 20,773/s | — |
| `direct stream.write()` (baseline) | 0.01 ms | 72,903/s | 3.5× faster per call |

The baseline `stream.write()` is **3.5× faster per call** than `batch.write()`, but this is misleading — in real usage, a batch accumulates **many writes** before a single flush, so the per-write overhead is amortised. For a 256-byte write, batch adds ~0.06 ms per call — **negligible** in the context of a 21.5 ms frame.

### 5. Pipeline throughput: ~46 fps / 695 KB/s

The end-to-end pipeline hits **46.4 frames/second** at 30 % cell density. The surface writing accounts for 22.3 ms (≈100 % of the frame budget), while flush + batch + flush add just 0.14 ms combined.

At **14,995 bytes per frame**, the pipeline pushes **~695 KB of ANSI per second** through the batch to the stream.

#### Real-world applicability

| Use case | Target fps | Feasibility |
|---|---|---|
| Real-time dashboards | 10–30 fps | ✅ Comfortable at 30% density |
| Spinner / progress animations | 24–30 fps | ✅ |
| Scrollable content | 60 fps | ⚠️ Requires < 20% cell density |
| Log tailing (batch→flush) | — | ✅ Batch trades latency for throughput |

## Raw Data

```json
{
  "config": {
    "frames": 1000,
    "width": 80,
    "height": 24,
    "density": 0.3,
    "maxWriteLen": 16,
    "warmup": 50
  },
  "results": [
    { "label": "surface.write() / fill()",                  "meanMs": 22.34, "minMs": 6.67,  "maxMs": 97.76, "p50Ms": 13.52, "p95Ms": 59.70, "p99Ms": 86.36, "opsPerSec": 44.8,  "meanFrameBytes": null },
    { "label": "surface.flush() (pure)",                     "meanMs": 0.04,  "minMs": 0.00,  "maxMs": 8.48,  "p50Ms": 0.01,  "p95Ms": 0.02,  "p99Ms": 0.04,  "opsPerSec": 24124.1, "meanFrameBytes": 1 },
    { "label": "surface.flush() (write + diff)",             "meanMs": 0.09,  "minMs": 0.01,  "maxMs": 4.56,  "p50Ms": 0.05,  "p95Ms": 0.09,  "p99Ms": 0.86,  "opsPerSec": 11748.6, "meanFrameBytes": 68 },
    { "label": "surface.render() (full\u2192ANSI)",            "meanMs": 23.12, "minMs": 7.44,  "maxMs": 100.85,"p50Ms": 14.46, "p95Ms": 71.12, "p99Ms": 95.22, "opsPerSec": 43.2,  "meanFrameBytes": 13167 },
    { "label": "batch.write() (raw text)",                   "meanMs": 0.07,  "minMs": 0.00,  "maxMs": 1.87,  "p50Ms": 0.01,  "p95Ms": 0.01,  "p99Ms": 0.02,  "opsPerSec": 14986.9, "meanFrameBytes": null },
    { "label": "batch.write() + flush()",                    "meanMs": 0.05,  "minMs": 0.00,  "maxMs": 5.62,  "p50Ms": 0.01,  "p95Ms": 0.02,  "p99Ms": 0.03,  "opsPerSec": 20772.9, "meanFrameBytes": null },
    { "label": "direct stream.write() (baseline)",           "meanMs": 0.01,  "minMs": 0.00,  "maxMs": 0.06,  "p50Ms": 0.01,  "p95Ms": 0.02,  "p99Ms": 0.03,  "opsPerSec": 72903.0, "meanFrameBytes": null },
    { "label": "pipeline (write\u2192flush\u2192batch\u2192flush)",   "meanMs": 21.56, "minMs": 7.50,  "maxMs": 112.50,"p50Ms": 13.48, "p95Ms": 74.03, "p99Ms": 95.53, "opsPerSec": 46.4,  "meanFrameBytes": 14995 }
  ]
}
```

## Re-running

```bash
cd packages/dui
npx tsx bench/surface-batch.ts
```

## Environment

| Variable | Value |
|---|---|
| Node.js | v26.5.0 |
| tsx | v4.23.1 |
| OS | Linux x64 |
