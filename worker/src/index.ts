export interface Env {
  TRIP_IMAGES: R2Bucket;
  ALLOWED_ORIGINS: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function corsHeaders(origin: string, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function generateKey(fileName: string): string {
  const ext = fileName.split('.').pop() || 'jpg';
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `trips/${ts}-${rand}.${ext}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // POST /upload — multipart/form-data with field "file"
    if (request.method === 'POST' && url.pathname === '/upload') {
      const contentType = request.headers.get('Content-Type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return json({ error: 'ต้องส่งไฟล์เป็น multipart/form-data' }, 400, cors);
      }

      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return json({ error: 'ไม่พบไฟล์ที่ส่งมา' }, 400, cors);
      }

      if (file.size > MAX_FILE_SIZE) {
        return json({ error: 'ไฟล์มีขนาดใหญ่เกิน 5 MB' }, 400, cors);
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF' }, 400, cors);
      }

      const key = generateKey(file.name);
      const arrayBuffer = await file.arrayBuffer();

      await env.TRIP_IMAGES.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });

      // Return the key; frontend will build the full URL from R2 public domain
      return json({ key, url: key }, 201, cors);
    }

    // GET /health
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true }, 200, cors);
    }

    return json({ error: 'Not found' }, 404, cors);
  },
};
