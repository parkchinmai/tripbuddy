// API_BASE: Cloudflare Worker URL — hardcoded for Cloudflare Pages (no runtime env vars)
const API_BASE = import.meta.env.VITE_API_URL || 'https://trip-buddy-api.park-chinmai.workers.dev';

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

  return data as UploadResult;
}
