/**
 * Convert a File/Blob to a base64-encoded string (without the data URL prefix).
 *
 * Uses FileReader internally — handles arbitrarily large files. The naive
 * `btoa(String.fromCharCode(...new Uint8Array(buf)))` approach blows the
 * call stack for anything past ~100KB because the spread operator passes
 * each byte as a separate argument.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned unexpected result type'));
        return;
      }
      // result format: "data:<mimeType>;base64,<base64data>"
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}
