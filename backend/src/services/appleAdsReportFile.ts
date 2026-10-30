import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const unzip = promisify(gunzip);
const MAX_BYTES = 1_000_000;
/** Detect gzip by its signature, independent of the filename or MIME type. */
export async function readKeywordReportFile(encoded: unknown): Promise<string> {
  if (typeof encoded !== 'string' || encoded.length > 4 * Math.ceil(MAX_BYTES / 3) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('CSV : fichier absent, invalide ou trop volumineux (1 Mo maximum).');
  }
  let bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('CSV : fichier absent ou trop volumineux (1 Mo maximum).');
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try { bytes = await unzip(bytes, { maxOutputLength: MAX_BYTES }); }
    catch { throw new Error('CSV : archive gzip invalide ou contenu décompressé supérieur à 1 Mo.'); }
  }
  try {
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
      : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch { throw new Error('CSV : encodage du fichier non reconnu. Utilisez UTF-8 ou UTF-16.'); }
}
