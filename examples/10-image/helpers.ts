import { deflateSync } from "node:zlib";

/**
 * Creates a minimal single-color PNG buffer.
 */
export function createMinimalPng(r: number, g: number, b: number, w = 1, h = 1): Buffer {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(w, 0);
	ihdrData.writeUInt32BE(h, 4);
	ihdrData[8] = 8;
	ihdrData[9] = 2;
	ihdrData[10] = 0;
	ihdrData[11] = 0;
	ihdrData[12] = 0;
	const ihdr = createPngChunk("IHDR", ihdrData);

	const rawData = Buffer.alloc(h * (1 + w * 3));
	for (let y = 0; y < h; y++) {
		const offset = y * (1 + w * 3);
		rawData[offset] = 0;
		for (let x = 0; x < w; x++) {
			rawData[offset + 1 + x * 3] = r;
			rawData[offset + 2 + x * 3] = g;
			rawData[offset + 3 + x * 3] = b;
		}
	}
	const idat = createPngChunk("IDAT", deflateSync(rawData));
	const iend = createPngChunk("IEND", Buffer.alloc(0));

	return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Creates a horizontal + vertical gradient PNG buffer.
 */
export function createGradientPng(w: number, h: number): Buffer {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(w, 0);
	ihdrData.writeUInt32BE(h, 4);
	ihdrData[8] = 8;
	ihdrData[9] = 2;
	ihdrData[10] = 0;
	ihdrData[11] = 0;
	ihdrData[12] = 0;
	const ihdr = createPngChunk("IHDR", ihdrData);

	const rawData = Buffer.alloc(h * (1 + w * 3));
	for (let y = 0; y < h; y++) {
		const offset = y * (1 + w * 3);
		rawData[offset] = 0;
		for (let x = 0; x < w; x++) {
			rawData[offset + 1 + x * 3] = Math.floor((x / w) * 255);
			rawData[offset + 2 + x * 3] = Math.floor((y / h) * 255);
			rawData[offset + 3 + x * 3] = 128;
		}
	}
	const idat = createPngChunk("IDAT", deflateSync(rawData));
	const iend = createPngChunk("IEND", Buffer.alloc(0));

	return Buffer.concat([signature, ihdr, idat, iend]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const typeBuffer = Buffer.from(type, "ascii");
	const crcData = Buffer.concat([typeBuffer, data]);

	let crc = 0xffffffff;
	for (let i = 0; i < crcData.length; i++) {
		crc ^= crcData[i];
		for (let j = 0; j < 8; j++) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}
	crc = (crc ^ 0xffffffff) >>> 0;
	const crcBuffer = Buffer.alloc(4);
	crcBuffer.writeUInt32BE(crc, 0);

	return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}
