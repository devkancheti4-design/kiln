// Pictures people add are resized on this device (never uploaded) so pieces stay light.

export async function readImage(file: File, max = 1800): Promise<{ dataUrl: string; ext: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read that picture'));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
    if (!keepAlpha) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    if (keepAlpha) return { dataUrl: canvas.toDataURL('image/png'), ext: 'png' };
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.86), ext: 'jpg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function pickFile(accept = 'image/*'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
