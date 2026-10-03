/** Reads the pixel size of a PNG or JPEG from its header bytes. */
export function imageSize(buf: Uint8Array): { width: number; height: number; type: 'png' | 'jpeg' } | null {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    return { width: dv.getUint32(16), height: dv.getUint32(20), type: 'png' }
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++
        continue
      }
      const marker = buf[i + 1]
      if (marker === 0xff) {
        i++
        continue
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2
        continue
      }
      const length = (buf[i + 2] << 8) | buf[i + 3]
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      if (isSof) {
        return { height: (buf[i + 5] << 8) | buf[i + 6], width: (buf[i + 7] << 8) | buf[i + 8], type: 'jpeg' }
      }
      i += 2 + length
    }
  }
  return null
}
