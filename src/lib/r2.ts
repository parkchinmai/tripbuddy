const API_BASE = import.meta.env.VITE_API_URL || '';

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  if (!API_BASE) {
    throw new Error('VITE_API_URL ยังไม่ได้ตั้งค่า — โปรดตั้งค่าในไฟล์ .env ก่อน');
  }

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

  return data as UploadResult;
}
