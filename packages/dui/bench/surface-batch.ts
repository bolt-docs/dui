#!/usr/bin/env node
/**
 * Micro-benchmark — batch.ts + surface.ts pipeline throughput.
 *
 * Renders N random frames and measures:
 *   - Surface.write() / fill()  — writing content to cells
 *   - Surface.flush() (pure)    — diff→ANSI generation, zero writes
 *   - Surface.flush() (dirty)   — diff→ANSI after small write
 *   - Surface.render()          — full→ANSI (every cell)
 *   - Batch.write() / flush()   — buffer + emit
 *   - Direct stream.write()     — baseline (no batching)
 *   - Pipeline (write→flush→batch→flush)  — end to end
 *
 * Reports:
 *   - Mean, min, max, p50, p95, p99 latency
 *   - Ops/sec throughput
 *   - Mean ANSI output size per frame (bytes)
 *
 * Run: npx tsx bench/surface-batch.ts
 */

/* eslint-disable no-console */

// ── Imports ───────────────────────────────────────────────────

import { createBatch, RenderSurface } from "../src/index.ts";
import { Writable } from "node:stream";

// ── Config ─────────────────────────────────────────────────────

const CONFIG = {
  /** Number of frames to render */
  frames: 1000,
  /** Surface dimensions (cols × rows) */
  width: 80,
  height: 24,
  /** Random cell density per frame (fraction of all cells touched) */
  density: 0.3,
  /** Maximum string length for random writes */
  maxWriteLen: 16,
  /** Warmup frames before measurement */
  warmup: 50,
};

// ── Helpers ────────────────────────────────────────────────────

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .:-_#@";
const HEX = "0123456789abcdef";

function randomString(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++)
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

function randomHex(): string {
  let h = "#";
  for (let i = 0; i < 6; i++) h += HEX[Math.floor(Math.random() * 16)];
  return h;
}

/**
 * Generate one random frame on the given surface.
 */
function genFrame(surface: RenderSurface, frameIdx: number): void {
  const w = surface.width;
  const h = surface.height;

  // Every ~20 frames do a full clear (simulates external overwrites)
  if (frameIdx > 0 && frameIdx % 20 === 0) {
    surface.clear();
  }

  // Fill random regions
  const fills = Math.floor(w * h * CONFIG.density * 0.3);
  for (let i = 0; i < fills; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const rw = Math.min(Math.floor(Math.random() * 20) + 1, w - x);
    const rh = Math.min(Math.floor(Math.random() * 3) + 1, h - y);
    surface.fill(x, y, rw, rh, " ", { bg: randomHex(), fg: randomHex() });
  }

  // Write styled text at random positions
  const writes = Math.floor(w * h * CONFIG.density * 0.5);
  for (let i = 0; i < writes; i++) {
    const x = Math.floor(Math.random() * (w - 5));
    const y = Math.floor(Math.random() * h);
    const len = Math.floor(Math.random() * CONFIG.maxWriteLen) + 1;
    surface.write(x, y, randomString(len), {
      fg: randomHex(),
      bold: Math.random() > 0.7,
      italic: Math.random() > 0.85,
      underline: Math.random() > 0.9,
    });
  }

  // Write a few unstyled strings
  const plain = Math.floor(w * h * CONFIG.density * 0.2);
  for (let i = 0; i < plain; i++) {
    const x = Math.floor(Math.random() * (w - 5));
    const y = Math.floor(Math.random() * h);
    surface.write(x, y, randomString(Math.floor(Math.random() * 8) + 1));
  }
}

// ── Benchmark runner ───────────────────────────────────────────

interface BenchResult {
  label: string;
  meanMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSec: number;
  totalMs: number;
  meanFrameBytes?: number;
}

function runBench(
  label: string,
  count: number,
  fn: (i: number) => string | void,
): BenchResult {
  const times: number[] = [];
  const sizes: number[] = [];
  const totalStart = performance.now();

  for (let i = 0; i < count + CONFIG.warmup; i++) {
    const t0 = performance.now();
    const result = fn(i);
    const t1 = performance.now();

    if (i >= CONFIG.warmup) {
      times.push(t1 - t0);
      if (typeof result === "string") sizes.push(result.length);
    }
  }

  const totalMs = performance.now() - totalStart;
  const sorted = [...times].sort((a, b) => a - b);
  const n = sorted.length;
  const meanMs = sorted.reduce((a, b) => a + b, 0) / n;
  const opsPerSec = 1000 / meanMs;

  const p50Ms = sorted[Math.floor(n * 0.5)];
  const p95Ms = sorted[Math.floor(n * 0.95)];
  const p99Ms = sorted[Math.floor(n * 0.99)];

  return {
    label,
    meanMs,
    minMs: sorted[0],
    maxMs: sorted[n - 1],
    p50Ms,
    p95Ms,
    p99Ms,
    opsPerSec,
    totalMs,
    meanFrameBytes:
      sizes.length > 0
        ? sizes.reduce((a, b) => a + b, 0) / sizes.length
        : undefined,
  };
}

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function pad(s: string, w: number): string {
  while (s.length < w) s = " " + s;
  return s;
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  console.log("═".repeat(72));
  console.log("  DUI Pipeline Benchmark");
  console.log("═".repeat(72));
  console.log();
  console.log(`  Surface size : ${CONFIG.width} × ${CONFIG.height} (${CONFIG.width * CONFIG.height} cells)`);
  console.log(`  Cell density : ${(CONFIG.density * 100).toFixed(0)} %`);
  console.log(`  Frames       : ${CONFIG.frames}  (warmup: ${CONFIG.warmup})`);
  console.log();

  // ── 1. Surface.write() / fill() only (no flush) ─────────────

  const s1 = new RenderSurface({ width: CONFIG.width, height: CONFIG.height });
  const r1 = runBench("surface.write() / fill()", CONFIG.frames, (i) => {
    genFrame(s1, i);
  });

  // ── 2. Surface.flush() — PURE (zero writes, just scan dirty) ─

  const s2 = new RenderSurface({ width: CONFIG.width, height: CONFIG.height });
  genFrame(s2, 0);
  s2.flush(); // flush initial content so next flush is a fresh diff

  const r2 = runBench("surface.flush() (pure, no writes)", CONFIG.frames, (i) => {
    // Every 20th frame: add one dot so flush has something to do
    if (i % 20 === 0) s2.write(0, 0, ".", { bold: true });
    return s2.flush();
  });

  // ── 3. Surface.flush() — with small write each frame ────────

  const s3 = new RenderSurface({ width: CONFIG.width, height: CONFIG.height });
  genFrame(s3, 0);
  s3.flush();

  const r3 = runBench("surface.flush() (write + diff)", CONFIG.frames, (i) => {
    const x = Math.floor(Math.random() * (CONFIG.width - 5));
    const y = Math.floor(Math.random() * CONFIG.height);
    s3.write(x, y, randomString(8), {
      fg: randomHex(),
      bold: Math.random() > 0.7,
    });
    return s3.flush();
  });

  // ── 4. Surface.render() — full redraw every frame ──────────

  const s4 = new RenderSurface({ width: CONFIG.width, height: CONFIG.height });
  const r4 = runBench("surface.render() (full→ANSI)", CONFIG.frames, (i) => {
    s4.clear();
    genFrame(s4, i);
    return s4.render();
  });

  // ── 5. Batch: write raw text ───────────────────────────────

  const nullStream = new Writable({ write(chunk, _enc, cb) { cb(); } });
  const b1 = createBatch({ stream: nullStream as unknown as NodeJS.WriteStream, maxSize: 65536 });

  const r5 = runBench("batch.write() (raw text)", CONFIG.frames, (i) => {
    b1.write(randomString(256));
  });

  b1.destroy();

  // ── 6. Batch: flush (with preceding write) ──────────────────

  const nullStream2 = new Writable({ write(chunk, _enc, cb) { cb(); } });
  const b2 = createBatch({ stream: nullStream2 as unknown as NodeJS.WriteStream, maxSize: 65536 });

  const r6 = runBench("batch.write() + flush()", CONFIG.frames, (i) => {
    b2.write(randomString(256));
    b2.flush();
  });

  b2.destroy();

  // ── 7. Baseline: direct stream.write (no batch) ────────────

  const nullStream3 = new Writable({ write(chunk, _enc, cb) { cb(); } });

  const r7 = runBench("direct stream.write() (baseline)", CONFIG.frames, (i) => {
    nullStream3.write(randomString(256));
  });

  // ── 8. Pipeline: surface → flush → batch → flush ──────────

  const nullStream4 = new Writable({ write(chunk, _enc, cb) { cb(); } });
  const b4 = createBatch({ stream: nullStream4 as unknown as NodeJS.WriteStream, maxSize: 65536 });
  const s5 = new RenderSurface({ width: CONFIG.width, height: CONFIG.height });
  genFrame(s5, 0);

  const r8 = runBench(
    "pipeline (write→flush→batch→flush)",
    CONFIG.frames,
    (i) => {
      genFrame(s5, i);
      const diff = s5.flush();
      b4.write(diff);
      b4.flush();
      return diff;
    },
  );
  b4.destroy();

  // ── Results table ────────────────────────────────────────────

  const results = [r1, r2, r3, r4, r5, r6, r7, r8];

  console.log(`  ${"\u2500".repeat(70)}`);
  console.log(
    `  ${pad("Operation", 42)} ${pad("Mean", 8)} ${pad("p50", 8)} ${pad("p95", 8)} ${pad("Ops/s", 8)} ${pad("Bytes", 8)}`,
  );
  console.log(`  ${"\u2500".repeat(70)}`);
  for (const r of results) {
    const bytes = r.meanFrameBytes !== undefined ? fmt(r.meanFrameBytes, 0) : "—";
    console.log(
      `  ${pad(r.label, 42)} ${pad(fmt(r.meanMs, 4), 8)} ${pad(fmt(r.p50Ms, 3), 8)} ${pad(fmt(r.p95Ms, 3), 8)} ${pad(fmt(r.opsPerSec, 1), 8)} ${pad(bytes, 8)}`,
    );
  }
  console.log(`  ${"\u2500".repeat(70)}`);
  console.log();

  // ── Summary analysis ─────────────────────────────────────────

  const flushPure = results.find((r) => r.label === "surface.flush() (pure, no writes)")!;
  const flushDirty = results.find((r) => r.label === "surface.flush() (write + diff)")!;
  const writeOnly = results.find((r) => r.label === "surface.write() / fill()")!;
  const pipeline = results.find((r) => r.label === "pipeline (write\u2192flush\u2192batch\u2192flush)")!;

  console.log("  Key ratios:");
  console.log(
    `    Surface flush (pure)           ${fmt(flushPure.meanMs, 3)} ms  (${fmt(flushPure.opsPerSec, 0)} ops/sec)`,
  );
  console.log(
    `    Surface flush (dirty)          ${fmt(flushDirty.meanMs, 3)} ms  (${fmt(flushDirty.opsPerSec, 0)} ops/sec)`,
  );
  console.log(
    `    Surface write (30% density)    ${fmt(writeOnly.meanMs, 3)} ms  (${fmt(writeOnly.opsPerSec, 0)} ops/sec)`,
  );
  console.log(
    `    Pipeline (write+flush+batch)   ${fmt(pipeline.meanMs, 3)} ms  (${fmt(pipeline.opsPerSec, 0)} ops/sec)`,
  );
  if (pipeline.meanFrameBytes !== undefined) {
    console.log(
      `    Mean ANSI output per frame    ${fmt(pipeline.meanFrameBytes, 0)} bytes`,
    );
    const bytesPerSec = (pipeline.meanFrameBytes! * pipeline.opsPerSec) / 1000;
    console.log(`    Pipeline throughput           ~${fmt(bytesPerSec, 0)} KB/s`);
  }
  console.log();

  // ── JSON output for CI ──────────────────────────────────────

  const json = {
    config: CONFIG,
    results: results.map((r) => ({
      label: r.label,
      meanMs: r.meanMs,
      minMs: r.minMs,
      maxMs: r.maxMs,
      p50Ms: r.p50Ms,
      p95Ms: r.p95Ms,
      p99Ms: r.p99Ms,
      opsPerSec: r.opsPerSec,
      totalMs: r.totalMs,
      meanFrameBytes: r.meanFrameBytes,
    })),
  };

  console.log(JSON.stringify(json, null, 2));
}

main();
