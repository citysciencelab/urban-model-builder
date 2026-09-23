const UTF8_BOM = '\uFEFF';

export async function readUtf8Json(file: File): Promise<unknown> {
  const bytes = await file.arrayBuffer();
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

export function downloadUtf8Json(payload: unknown, fileName: string) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([UTF8_BOM, new TextEncoder().encode(json)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
