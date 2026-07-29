const API_BASE = '';

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);

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
