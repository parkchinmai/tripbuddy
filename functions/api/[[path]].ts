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

function json(data: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extra },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.trip_buddy_db;
  const url = new URL(request.url);
  const path = url.pathname; // e.g. /api/trips, /api/trips/xxx, /api/expenses

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // ---- Trips ----
  // GET /api/trips
  if (request.method === 'GET' && path === '/api/trips') {
    const { results } = await db.prepare('SELECT * FROM trips ORDER BY created_at DESC').all();
    return json(results, 200, cors);
  }

  // GET /api/trips/:id
  if (request.method === 'GET' && path.match(/^\/api\/trips\/[\w-]+$/)) {
    const id = path.split('/')[3];
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').bind(id).first();
    if (!trip) return json({ error: 'ไม่พบทริป' }, 404, cors);
    const { results: expenses } = await db.prepare(
      'SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC'
    ).bind(id).all();
    return json({ ...trip, expenses }, 200, cors);
  }

  // POST /api/trips
  if (request.method === 'POST' && path === '/api/trips') {
    const body = await request.json();
    const id = body.id || `t-${Date.now()}`;
    const status = deriveTripStatus(body.dates);

    await db.prepare(
      `INSERT INTO trips (id, title, destination, country, dates, budget, cover_img_url, description, status, days, member_count, budget_per_person, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, body.title, body.destination, body.country || '',
           body.dates, body.budget, body.coverImgUrl || '', body.description || null,
           status, body.days || null, body.memberCount || null, body.budgetPerPerson || null, body.createdBy || null
    ).run();

    if (body.memberIds && Array.isArray(body.memberIds)) {
      const stmt = db.prepare('INSERT OR IGNORE INTO trip_members (trip_id, member_id) VALUES (?, ?)');
      for (const mid of body.memberIds) {
        await stmt.bind(id, mid).run();
      }
    }

    return json({ id, status }, 201, cors);
  }

  // PUT /api/trips/:id
  if (request.method === 'PUT' && path.match(/^\/api\/trips\/[\w-]+$/)) {
    const id = path.split('/')[3];
    const body = await request.json();
    const updates: string[] = [];
    const params: unknown[] = [];

    for (const [k, v] of Object.entries(body)) {
      if (k === 'id' || k === 'expenses' || k === 'memberIds') continue;
      const col = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
      updates.push(`${col} = ?`);
      params.push(v);
    }

    if (body.dates) {
      updates.push(`status = ?`);
      params.push(deriveTripStatus(body.dates));
    }

    if (updates.length === 0) return json({ error: 'no fields' }, 400, cors);
    params.push(id);
    await db.prepare(
      `UPDATE trips SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).bind(...params).run();

    return json({ ok: true }, 200, cors);
  }

  // DELETE /api/trips/:id
  if (request.method === 'DELETE' && path.match(/^\/api\/trips\/[\w-]+$/)) {
    const id = path.split('/')[3];
    await db.prepare('DELETE FROM expenses WHERE trip_id = ?').bind(id).run();
    await db.prepare('DELETE FROM trip_members WHERE trip_id = ?').bind(id).run();
    await db.prepare('DELETE FROM trips WHERE id = ?').bind(id).run();
    return json({ ok: true }, 200, cors);
  }

  // ---- Expenses ----
  // POST /api/expenses
  if (request.method === 'POST' && path === '/api/expenses') {
    const body = await request.json();
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

  // DELETE /api/expenses/:id
  if (request.method === 'DELETE' && path.match(/^\/api\/expenses\/[\w-]+$/)) {
    const id = path.split('/')[3];
    await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
    return json({ ok: true }, 200, cors);
  }

  // ---- Members ----
  // GET /api/members
  if (request.method === 'GET' && path === '/api/members') {
    const { results } = await db.prepare('SELECT * FROM members ORDER BY join_date DESC').all();
    return json(results, 200, cors);
  }

  // POST /api/members
  if (request.method === 'POST' && path === '/api/members') {
    const body = await request.json();
    const id = body.id || `m-${Date.now()}`;
    await db.prepare(
      `INSERT INTO members (id, name, phone, avatar_url, bank_account, status, access_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, body.name, body.phone, body.avatarUrl || '',
           body.bankAccount || '', body.status || 'pending', body.accessLevel || 'user'
    ).run();
    return json({ id }, 201, cors);
  }

  // PUT /api/members/:id
  if (request.method === 'PUT' && path.match(/^\/api\/members\/[\w-]+$/)) {
    const id = path.split('/')[3];
    const body = await request.json();
    const updates: string[] = [];
    const params: unknown[] = [];
    for (const [k, v] of Object.entries(body)) {
      if (k === 'id') continue;
      const col = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
      updates.push(`${col} = ?`);
      params.push(v);
    }
    if (updates.length === 0) return json({ error: 'no fields' }, 400, cors);
    params.push(id);
    await db.prepare(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    return json({ ok: true }, 200, cors);
  }

  // ---- Profile ----
  // GET /api/profile/:phone
  if (request.method === 'GET' && path.match(/^\/api\/profile\/.+/)) {
    const phone = path.split('/')[3];
    const profile = await db.prepare('SELECT * FROM profiles WHERE phone = ?').bind(phone).first();
    if (!profile) return json({ error: 'ไม่พบโปรไฟล์' }, 404, cors);
    return json(profile, 200, cors);
  }

  // PUT /api/profile/:phone
  if (request.method === 'PUT' && path.match(/^\/api\/profile\/.+/)) {
    const phone = path.split('/')[3];
    const body = await request.json();
    const existing = await db.prepare('SELECT id FROM profiles WHERE phone = ?').bind(phone).first();

    if (existing) {
      const updates: string[] = [];
      const params: unknown[] = [];
      for (const [k, v] of Object.entries(body)) {
        if (k === 'phone') continue;
        const col = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        updates.push(`${col} = ?`);
        params.push(v);
      }
      updates.push("updated_at = datetime('now')");
      params.push(phone);
      await db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE phone = ?`).bind(...params).run();
    } else {
      const id = body.id || `p-${Date.now()}`;
      await db.prepare(
        `INSERT INTO profiles (id, name, phone, bank_account, avatar_url, is_admin)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, body.name, phone, body.bankAccount || '', body.avatarUrl || '', body.isAdmin ? 1 : 0).run();
    }

    return json({ ok: true }, 200, cors);
  }

  // GET /api/health
  if (request.method === 'GET' && path === '/api/health') {
    return json({ ok: true }, 200, cors);
  }

  // ---- Images (proxy from R2) ----
  // GET /api/images/:key
  if (request.method === 'GET' && path.startsWith('/api/images/')) {
    const key = path.slice(12);
    const object = await env.TRIP_IMAGES.get(key);
    if (!object) return json({ error: 'not found' }, 404, cors);
    const headers: Record<string, string> = {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...cors,
    };
    return new Response(object.body, { headers });
  }

  return json({ error: 'Not found' }, 404, cors);
}
