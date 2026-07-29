export interface Env {
  TRIP_IMAGES: R2Bucket;
  trip_buddy_db: D1Database;
  ALLOWED_ORIGINS: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function corsHeaders(origin: string, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

function deriveTripStatus(dates: string): string {
  const parts = dates.split(' - ');
  if (parts.length !== 2) return 'active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(parts[0]);
  const end = new Date(parts[1]);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (today < start) return 'upcoming';
  if (today > end) return 'past';
  return 'active';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    const db = env.trip_buddy_db;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ---- R2 Image Upload ----
    if (request.method === 'POST' && path === '/upload') {
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
        httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
      });
      return json({ key, url: key }, 201, cors);
    }

    // ---- GET image from R2 ----
    if (request.method === 'GET' && path.startsWith('/images/')) {
      const key = path.slice(8);
      const object = await env.TRIP_IMAGES.get(key);
      if (!object) return json({ error: 'ไม่พบรูปภาพ' }, 404, cors);
      const headers: Record<string, string> = {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...cors,
      };
      return new Response(object.body, { headers });
    }

    // ---- Trips CRUD ----
    // GET /trips — list all trips (optionally?profile_id=xxx to filter)
    if (request.method === 'GET' && path === '/trips') {
      const { results } = await db.prepare(
        'SELECT * FROM trips ORDER BY created_at DESC'
      ).all();
      return json(results, 200, cors);
    }

    // GET /trips/:id
    if (request.method === 'GET' && path.match(/^\/trips\/[\w-]+$/)) {
      const id = path.split('/')[2];
      const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').bind(id).first();
      if (!trip) return json({ error: 'ไม่พบทริป' }, 404, cors);
      const expenses = await db.prepare(
        'SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC'
      ).bind(id).all();
      return json({ ...trip, expenses: expenses.results }, 200, cors);
    }

    // POST /trips — create trip
    if (request.method === 'POST' && path === '/trips') {
      const body = await request.json() as any;
      const id = body.id || `t-${Date.now()}`;
      const dates = body.dates;
      const status = deriveTripStatus(dates);
      const days = body.days || null;
      const memberCount = body.memberCount || null;
      const budgetPerPerson = body.budgetPerPerson || null;
      const description = body.description || null;

      await db.prepare(
        `INSERT INTO trips (id, title, destination, country, dates, budget, cover_img_url, description, status, days, member_count, budget_per_person, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, body.title, body.destination, body.country || '',
             dates, body.budget, body.coverImgUrl || '', description,
             status, days, memberCount, budgetPerPerson, body.createdBy || null
      ).run();

      // Link members if provided
      if (body.memberIds && Array.isArray(body.memberIds)) {
        const stmt = db.prepare('INSERT OR IGNORE INTO trip_members (trip_id, member_id) VALUES (?, ?)');
        for (const mid of body.memberIds) {
          await stmt.bind(id, mid).run();
        }
      }

      return json({ id, status }, 201, cors);
    }

    // PUT /trips/:id
    if (request.method === 'PUT' && path.match(/^\/trips\/[\w-]+$/)) {
      const id = path.split('/')[2];
      const body = await request.json() as any;
      const dates = body.dates;
      const status = dates ? deriveTripStatus(dates) : undefined;

      const updates: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(body)) {
        if (k === 'id' || k === 'expenses' || k === 'memberIds') continue;
        const col = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        updates.push(`${col} = ?`);
        params.push(v);
      }
      if (updates.length === 0) return json({ error: 'ไม่มีข้อมูลให้อัปเดต' }, 400, cors);
      params.push(id);
      await db.prepare(
        `UPDATE trips SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`
      ).bind(...params).run();

      return json({ ok: true }, 200, cors);
    }

    // DELETE /trips/:id
    if (request.method === 'DELETE' && path.match(/^\/trips\/[\w-]+$/)) {
      const id = path.split('/')[2];
      await db.prepare('DELETE FROM expenses WHERE trip_id = ?').bind(id).run();
      await db.prepare('DELETE FROM trip_members WHERE trip_id = ?').bind(id).run();
      await db.prepare('DELETE FROM trips WHERE id = ?').bind(id).run();
      return json({ ok: true }, 200, cors);
    }

    // ---- Expenses CRUD ----
    // POST /expenses — add expense to a trip
    if (request.method === 'POST' && path === '/expenses') {
      const body = await request.json() as any;
      const id = body.id || `e-${Date.now()}`;
      await db.prepare(
        `INSERT INTO expenses (id, trip_id, title, amount, category, date, paid_by, split_with, custom_shares, slip_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, body.tripId, body.title, body.amount, body.category || 'Other',
             body.date, body.paidBy, JSON.stringify(body.splitWith || []),
             body.customShares ? JSON.stringify(body.customShares) : null,
             body.slipUrl || null
      ).run();
      return json({ id }, 201, cors);
    }

    // DELETE /expenses/:id
    if (request.method === 'DELETE' && path.match(/^\/expenses\/[\w-]+$/)) {
      const id = path.split('/')[2];
      await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
      return json({ ok: true }, 200, cors);
    }

    // ---- Members CRUD ----
    // GET /members
    if (request.method === 'GET' && path === '/members') {
      const { results } = await db.prepare('SELECT * FROM members ORDER BY join_date DESC').all();
      return json(results, 200, cors);
    }

    // POST /members
    if (request.method === 'POST' && path === '/members') {
      const body = await request.json() as any;
      const id = body.id || `m-${Date.now()}`;
      await db.prepare(
        `INSERT INTO members (id, name, phone, avatar_url, bank_account, status, access_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, body.name, body.phone, body.avatarUrl || '',
             body.bankAccount || '', body.status || 'pending',
             body.accessLevel || 'user'
      ).run();
      return json({ id }, 201, cors);
    }

    // PUT /members/:id
    if (request.method === 'PUT' && path.match(/^\/members\/[\w-]+$/)) {
      const id = path.split('/')[2];
      const body = await request.json() as any;
      const updates: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(body)) {
        if (k === 'id') continue;
        const col = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        updates.push(`${col} = ?`);
        params.push(v);
      }
      if (updates.length === 0) return json({ error: 'ไม่มีข้อมูลให้อัปเดต' }, 400, cors);
      params.push(id);
      await db.prepare(
        `UPDATE members SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...params).run();
      return json({ ok: true }, 200, cors);
    }

    // ---- Profile CRUD ----
    // GET /profile/:phone
    if (request.method === 'GET' && path.match(/^\/profile\/.+$/)) {
      const phone = path.split('/')[2];
      const profile = await db.prepare('SELECT * FROM profiles WHERE phone = ?').bind(phone).first();
      if (!profile) return json({ error: 'ไม่พบโปรไฟล์' }, 404, cors);
      return json(profile, 200, cors);
    }

    // PUT /profile/:phone
    if (request.method === 'PUT' && path.match(/^\/profile\/.+$/)) {
      const phone = path.split('/')[2];
      const body = await request.json() as any;
      const existing = await db.prepare('SELECT id FROM profiles WHERE phone = ?').bind(phone).first();
      if (existing) {
        const updates: string[] = [];
        const params: any[] = [];
        for (const [k, v] of Object.entries(body)) {
          if (k === 'phone') continue;
          const col = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
          updates.push(`${col} = ?`);
          params.push(v);
        }
        updates.push("updated_at = datetime('now')");
        params.push(phone);
        await db.prepare(
          `UPDATE profiles SET ${updates.join(', ')} WHERE phone = ?`
        ).bind(...params).run();
      } else {
        const id = body.id || `p-${Date.now()}`;
        await db.prepare(
          `INSERT INTO profiles (id, name, phone, bank_account, avatar_url, is_admin)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(id, body.name, phone, body.bankAccount || '',
               body.avatarUrl || '', body.isAdmin ? 1 : 0
        ).run();
      }
      return json({ ok: true }, 200, cors);
    }

    // GET /health
    if (request.method === 'GET' && path === '/health') {
      return json({ ok: true }, 200, cors);
    }

    return json({ error: 'Not found' }, 404, cors);
  },
};
