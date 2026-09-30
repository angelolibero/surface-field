/* ═══════════════════════════════════════════════════════════════════════════
 *  A PNG WRITER WITH NOTHING BUT NODE: EIGHT BIT RGBA, ONE IDAT, NO FILTER.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The harness must not add a dependency to the package, and a PNG it writes
 * is only for eyes: the numbers are compared from the raw `.rgba` files. So
 * filter type 0 on every row is enough; it costs size, not correctness.
 */
const zlib = require('zlib');

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
const crc32 = buf => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
};

/** `rgba` is straight (not premultiplied) RGBA, row major, `width * height * 4` bytes. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* Source-over of straight RGBA layers on an opaque ground, in floats and
   rounded once at the end: the same arithmetic for every run, so a composite
   differs between two runs only where a layer does. Layers are listed bottom
   first, which for the field is fabric under dots (the component's DOM order). */
function composite(width, height, ground, layers) {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    let r = ground[0], g = ground[1], b = ground[2];
    for (const layer of layers) {
      if (!layer) continue;
      const a = layer[i * 4 + 3] / 255;
      if (!a) continue;
      r = layer[i * 4] * a + r * (1 - a);
      g = layer[i * 4 + 1] * a + g * (1 - a);
      b = layer[i * 4 + 2] * a + b * (1 - a);
    }
    out[i * 4] = Math.round(r);
    out[i * 4 + 1] = Math.round(g);
    out[i * 4 + 2] = Math.round(b);
    out[i * 4 + 3] = 255;
  }
  return out;
}

module.exports = { encodePng, composite };
