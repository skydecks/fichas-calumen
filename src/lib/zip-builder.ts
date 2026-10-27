import "server-only";

import zlib from "node:zlib";

export type ZipFileEntry = {
  name: string;
  data: string | Buffer;
};

/**
 * Generador nativo de archivos .ZIP de alto rendimiento sin dependencias externas.
 */
export function createZipArchive(files: ZipFileEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  const now = new Date();
  const time =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const date =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name, "utf8");
    const dataBuf = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data, "utf8");
    const crc = zlib.crc32(dataBuf);
    const size = dataBuf.length;

    // Encabezado Local (30 bytes + nombre)
    const lh = Buffer.alloc(30 + filenameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // Local file header signature
    lh.writeUInt16LE(20, 4); // Version needed (2.0)
    lh.writeUInt16LE(0x0800, 6); // Flags: UTF-8 encoding (bit 11)
    lh.writeUInt16LE(0, 8); // Compression method: 0 = Store
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(size, 18); // Compressed size
    lh.writeUInt32LE(size, 22); // Uncompressed size
    lh.writeUInt16LE(filenameBuf.length, 26);
    lh.writeUInt16LE(0, 28); // Extra field length
    filenameBuf.copy(lh, 30);

    localHeaders.push(lh, dataBuf);

    // Encabezado del Directorio Central (46 bytes + nombre)
    const ch = Buffer.alloc(46 + filenameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0); // Central directory header signature
    ch.writeUInt16LE(20, 4); // Version made by
    ch.writeUInt16LE(20, 6); // Version needed
    ch.writeUInt16LE(0x0800, 8); // Flags: UTF-8
    ch.writeUInt16LE(0, 10); // Compression method: 0
    ch.writeUInt16LE(time, 12);
    ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(size, 20);
    ch.writeUInt32LE(size, 24);
    ch.writeUInt16LE(filenameBuf.length, 28);
    ch.writeUInt16LE(0, 30); // Extra field length
    ch.writeUInt16LE(0, 32); // File comment length
    ch.writeUInt16LE(0, 34); // Disk number start
    ch.writeUInt16LE(0, 36); // Internal file attributes
    ch.writeUInt32LE(0, 38); // External file attributes
    ch.writeUInt32LE(offset, 42); // Relative offset of local header
    filenameBuf.copy(ch, 46);

    centralHeaders.push(ch);
    offset += lh.length + dataBuf.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) centralDirSize += ch.length;

  // Fin del Directorio Central (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central dir signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(files.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}
