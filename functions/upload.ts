const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function generateKey(fileName: string, folder: string): string {
  const ext = fileName.split('.').pop() || 'jpg';
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${folder}/${ts}-${rand}.${ext}`;
}

export async function onRequest(context) {
  const request = context.request;
  const env = context.env;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({ error: 'ต้องส่งไฟล์เป็น multipart/form-data' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const folder = formData.get('folder') || 'trips';

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'ไม่พบไฟล์ที่ส่งมา' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: 'ไฟล์มีขนาดใหญ่เกิน 5 MB' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const key = generateKey(file.name, folder as string);
  const arrayBuffer = await file.arrayBuffer();

  await env.TRIP_IMAGES.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
  });

  return new Response(JSON.stringify({ key, url: key }), {
    status: 201, headers: { 'Content-Type': 'application/json', ...cors },
  });
}
