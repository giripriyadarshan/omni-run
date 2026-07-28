import { OPFSManager } from '../entrypoints/storage/opfs';

async function runBenchmark() {
  console.log('--- OPFS Benchmark Suite ---');
  const opfs = new OPFSManager();
  const testFileSize = 50 * 1024 * 1024; // 50MB
  const testFileName = 'benchmark_test_50mb.bin';

  console.log(`Generating ${testFileSize / 1024 / 1024}MB random binary payload...`);
  const buffer = new ArrayBuffer(testFileSize);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < testFileSize; i += 4096) {
    view[i] = Math.floor(Math.random() * 256);
  }

  console.log('Testing Write Speed...');
  const writeStart = performance.now();
  await opfs.storeAsset(testFileName, buffer);
  const writeEnd = performance.now();
  console.log(`Write Latency: ${(writeEnd - writeStart).toFixed(2)}ms`);

  console.log('Testing Read Speed (Warm Boot simulation)...');
  const readStart = performance.now();
  const readBuffer = await opfs.getAsset(testFileName);
  const readEnd = performance.now();
  console.log(`Read Latency: ${(readEnd - readStart).toFixed(2)}ms`);
  
  if (readBuffer && readBuffer.byteLength === testFileSize) {
    console.log('Integrity check: PASS');
  } else {
    console.log('Integrity check: FAIL');
  }

  // Cleanup
  console.log('Cleaning up...');
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(testFileName, { recursive: false }).catch(() => {});
  console.log('Benchmark Complete.');
}

if (typeof window !== 'undefined') {
    (window as any).runOPFSBenchmark = runBenchmark;
    console.log('Run window.runOPFSBenchmark() in DevTools to start.');
} else {
    runBenchmark();
}
