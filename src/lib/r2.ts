const API_BASE = '';

export interface UploadResult {
  key: string;
  url: string;
}

const MAX_BYTES = 1_000_000;

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      let quality = 0.85;

      const tryCompress = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('ไม่สามารถบีบอัดรูปภาพได้')); return; }
            if (blob.size <= MAX_BYTES) { resolve(blob); }
            else if (quality > 0.2) { quality -= 0.15; tryCompress(); }
            else if (width > 800 || height > 800) {
              width = Math.round(width * 0.75);
              height = Math.round(height * 0.75);
              quality = 0.85;
              tryCompress();
            } else { resolve(blob); }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้'));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadImage(file: File, folder: string = 'trips'): Promise<UploadResult> {
  const compressed = await compressImage(file);
  const ext = file.name.match(/\.\w+$/) ? file.name.replace(/\.[^.]+$/, '.jpg') : `${file.name}.jpg`;
  const compressedFile = new File([compressed], ext, { type: 'image/jpeg' });

  const form = new FormData();
  form.append('file', compressedFile);
  form.append('folder', folder);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: form,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'อัพโหลดไฟล์ไม่สำเร็จ');
  }

  return {
    key: data.key,
    url: `${API_BASE}/api/images/${data.key}`,
  };
}

export interface CropPosition {
  x: number;
  y: number;
}

export async function cropSquare(file: File, pos: CropPosition, size = 512): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const min = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - min) * ((pos.x || 50) / 100);
      const sy = (img.naturalHeight - min) * ((pos.y || 50) / 100);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('ไม่สามารถสร้างรูปโปรไฟล์ได้')); return; }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9
      );
    };
    img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้'));
    img.src = URL.createObjectURL(file);
  });
}
