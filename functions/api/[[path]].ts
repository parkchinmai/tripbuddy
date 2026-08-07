function bangkokToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function deriveTripStatus(dates: string): string {
  const parts = dates.split(' - ');
  if (parts.length !== 2) return 'active';
  const today = bangkokToday();
  if (today < parts[0]) return 'upcoming';
  if (today > parts[1]) return 'past';
  return 'active';
}

function json(data: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extra },
  });
}

async function getUserByPhone(db: any, phone: string | null): Promise<{ id: string; is_admin: number } | null> {
  if (!phone) return null;
  const profile = await db.prepare('SELECT id, is_admin FROM profiles WHERE phone = ?').bind(phone).first();
  return profile || null;
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.trip_buddy_db;
  const url = new URL(request.url);
  const path = url.pathname;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    return await handle(request, env, db, url, path, cors);
  } catch (err: any) {
    console.error('HANDLER ERROR:', err);
    return json({ error: 'internal', message: String(err?.message || err), stack: String(err?.stack || '') }, 500, cors);
  }
}

async function handle(request: Request, env: any, db: any, url: URL, path: string, cors: Record<string, string>): Promise<Response> {

  // ---- Trips ----
  // GET /api/trips?user=<phone>
  if (request.method === 'GET' && path === '/api/trips') {
    const viewer = await getUserByPhone(db, url.searchParams.get('user'));
    const isAdmin = viewer ? viewer.is_admin === 1 : false;

    let rows: any[];
    if (isAdmin) {
      rows = (await db.prepare('SELECT * FROM trips ORDER BY created_at DESC').all()).results as any[];
    } else if (viewer) {
      rows = (await db.prepare(
        'SELECT t.* FROM trips t JOIN trip_members tm ON tm.trip_id = t.id WHERE tm.member_id = ? ORDER BY t.created_at DESC'
      ).bind(viewer.id).all()).results as any[];
    } else {
      rows = [];
    }

    // Attach member names for each trip (for visibility in UI)
    const enriched = [];
    for (const trip of rows) {
      try {
        const { results: members } = await db.prepare(
          'SELECT p.name FROM trip_members tm JOIN profiles p ON tm.member_id = p.id WHERE tm.trip_id = ?'
        ).bind(trip.id).all();
        enriched.push({ ...trip, member_names: (members as any[]).map(m => m.name) });
      } catch {
        enriched.push({ ...trip, member_names: [] });
      }
    }
    return json(enriched, 200, cors);
  }

  // GET /api/trips/:id?user=<phone>
  if (request.method === 'GET' && path.match(/^\/api\/trips\/[\w-]+$/)) {
    const id = path.split('/')[3];
    const viewer = await getUserByPhone(db, url.searchParams.get('user'));
    const isAdmin = viewer ? viewer.is_admin === 1 : false;
    if (!isAdmin) {
      if (!viewer) return json({ error: 'ไม่ได้รับสิทธิ์เข้าถึงทริปนี้' }, 403, cors);
      const memberCheck = await db.prepare(
        'SELECT 1 FROM trip_members WHERE trip_id = ? AND member_id = ?'
      ).bind(id, viewer.id).first();
      if (!memberCheck) return json({ error: 'ไม่ได้รับสิทธิ์เข้าถึงทริปนี้' }, 403, cors);
    }
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').bind(id).first();
    if (!trip) return json({ error: 'ไม่พบทริป' }, 404, cors);
    const { results: rawExpenses } = await db.prepare(
      'SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC'
    ).bind(id).all();

    // Resolve profile IDs → names for paid_by and split_with
    const expenses = [];
    for (const e of rawExpenses as any[]) {
      // Resolve paid_by
      let paidBy = e.paid_by || '';
      let paidById = '';
      if (paidBy.startsWith('p-')) {
        paidById = paidBy;
        const profile = await db.prepare('SELECT name FROM profiles WHERE id = ?').bind(paidBy).first();
        paidBy = profile ? (profile as any).name : paidBy;
      }

      // Resolve split_with (JSON array of profile IDs or names)
      const splitRaw = e.split_with ? JSON.parse(e.split_with) : [];
      const splitWithIds: string[] = [];
      const splitWithNames: string[] = [];
      for (const s of splitRaw) {
        if (typeof s === 'string' && s.startsWith('p-')) {
          splitWithIds.push(s);
          const profile = await db.prepare('SELECT name FROM profiles WHERE id = ?').bind(s).first();
          splitWithNames.push(profile ? (profile as any).name : s);
        } else {
          splitWithNames.push(s);
        }
      }

      expenses.push({
        ...e,
        paid_by: paidBy,
        paid_by_id: paidById,
        split_with: JSON.stringify(splitWithNames),
        split_with_ids: JSON.stringify(splitWithIds),
        split_with_names: splitWithNames,
      });
    }

    const { results: tripMembers } = await db.prepare(
      'SELECT p.* FROM trip_members tm JOIN profiles p ON tm.member_id = p.id WHERE tm.trip_id = ?'
    ).bind(id).all();
    return json({ ...trip, expenses, memberDetails: tripMembers || [] }, 200, cors);
  }

  // POST /api/trips
  if (request.method === 'POST' && path === '/api/trips') {
    const body = await request.json();
    const id = body.id || `t-${Date.now()}`;
    const status = deriveTripStatus(body.dates);

    await db.prepare(
      `INSERT INTO trips (id, title, destination, country, dates, budget, cover_img_url, description, cover_position, status, days, member_count, budget_per_person, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
    ).bind(id, body.title, body.destination, body.country || '',
           body.dates, body.budget, body.coverImgUrl || '', body.description || null,
           body.coverPosition || '50% 50%',
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

  // PUT /api/trips/:id/members  — replace trip members
  if (request.method === 'PUT' && path.match(/^\/api\/trips\/[\w-]+\/members$/)) {
    const id = path.split('/')[3];
    const body = await request.json();
    if (!Array.isArray(body.memberIds)) {
      return json({ error: 'memberIds must be an array' }, 400, cors);
    }
    await db.prepare('DELETE FROM trip_members WHERE trip_id = ?').bind(id).run();
    const stmt = db.prepare('INSERT OR IGNORE INTO trip_members (trip_id, member_id) VALUES (?, ?)');
    for (const mid of body.memberIds) {
      await stmt.bind(id, mid).run();
    }
    return json({ ok: true }, 200, cors);
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
      `UPDATE trips SET ${updates.join(', ')}, updated_at = datetime('now', '+7 hours') WHERE id = ?`
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
    const paidBy = body.paidById || body.paidBy || '';
    const splitWith = (body.splitWithIds && body.splitWithIds.length > 0) ? body.splitWithIds : (body.splitWith || []);
    try {
      await db.prepare(
        `INSERT INTO expenses (id, trip_id, title, amount, category, date, paid_by, split_with, custom_shares, slip_url, mode, split_items, fee_mode, fee_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
      ).bind(id, body.tripId, body.title, body.amount, body.category || 'Other',
             body.date, paidBy, JSON.stringify(splitWith),
             body.customShares ? JSON.stringify(body.customShares) : null,
             body.slipUrl || null,
             body.mode || 'simple',
             body.splitItems ? JSON.stringify(body.splitItems) : null,
             body.feeMode || 'none',
             body.feeOrder || 'sc_then_vat'
      ).run();
    } catch (err: any) {
      return json({ error: 'insert_failed', message: String(err?.message || err) }, 500, cors);
    }
    return json({ id }, 201, cors);
  }

  // PUT /api/expenses/:id
  if (request.method === 'PUT' && path.match(/^\/api\/expenses\/[\w-]+$/)) {
    const id = path.split('/')[3];
    const body = await request.json();
    const updates: string[] = [];
    const params: unknown[] = [];
    for (const [k, v] of Object.entries(body)) {
      if (k === 'id' || k === 'tripId') continue;
      let col = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
      // Normalize paidById → paid_by, paidBy → paid_by, splitWithIds → split_with, splitWith → split_with
      if (col === 'paid_by_id') col = 'paid_by';
      if (col === 'split_with_ids') col = 'split_with';
      if (col === 'split_with') {
        updates.push(`${col} = ?`);
        params.push(JSON.stringify(v));
      } else if (col === 'custom_shares' || col === 'split_items') {
        updates.push(`${col} = ?`);
        params.push(v ? JSON.stringify(v) : null);
      } else {
        updates.push(`${col} = ?`);
        params.push(v);
      }
    }
    if (updates.length === 0) return json({ error: 'no fields' }, 400, cors);
    params.push(id);
    await db.prepare(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();
    return json({ ok: true }, 200, cors);
  }

  // DELETE /api/expenses/:id
  if (request.method === 'DELETE' && path.match(/^\/api\/expenses\/[\w-]+$/)) {
    const id = path.split('/')[3];
    await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
    return json({ ok: true }, 200, cors);
  }

  // ---- Members / Profiles ----
  // GET /api/members
  if (request.method === 'GET' && path === '/api/members') {
    const { results } = await db.prepare('SELECT * FROM profiles ORDER BY join_date DESC').all();
    return json(results, 200, cors);
  }

  // POST /api/members
  if (request.method === 'POST' && path === '/api/members') {
    const body = await request.json();
    const id = body.id || `p-${Date.now()}`;
    await db.prepare(
      `INSERT INTO profiles (id, name, phone, avatar_url, bank_account, status, access_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
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
    await db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    return json({ ok: true }, 200, cors);
  }

  // DELETE /api/members/:id  —  delete member + all related data
  if (request.method === 'DELETE' && path.match(/^\/api\/members\/[\w-]+$/)) {
    const id = path.split('/')[3];
    const profile = await db.prepare('SELECT id, is_admin, avatar_url FROM profiles WHERE id = ?').bind(id).first();
    if (!profile) return json({ error: 'ไม่พบสมาชิก' }, 404, cors);
    if (profile.is_admin === 1) return json({ error: 'ไม่สามารถลบผู้ดูแลระบบได้' }, 400, cors);

    await db.prepare('DELETE FROM trip_members WHERE member_id = ?').bind(id).run();
    await db.prepare('DELETE FROM expenses WHERE paid_by = ?').bind(id).run();
    await db.prepare('DELETE FROM profiles WHERE id = ?').bind(id).run();

    // Delete avatar image from R2 if it was uploaded
    try {
      const avatar = profile.avatar_url || '';
      const m = avatar.match(/\/api\/images\/(.+)$/);
      if (m && env.TRIP_IMAGES) {
        await env.TRIP_IMAGES.delete(m[1]).catch(() => {});
      }
    } catch {}

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
    const isAdmin = body.isAdmin ? 1 : 0;
    if (existing) {
      await db.prepare(
        'UPDATE profiles SET name = ?, bank_account = ?, avatar_url = ?, is_admin = ?, updated_at = datetime(\'now\') WHERE phone = ?'
      ).bind(body.name ?? '', body.bankAccount ?? '', body.avatarUrl ?? '', isAdmin, phone).run();
    } else {
      const id = body.id || `p-${Date.now()}`;
      await db.prepare(
        'INSERT INTO profiles (id, name, phone, bank_account, avatar_url, is_admin, status, access_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, body.name || '', phone, body.bankAccount || '', body.avatarUrl || '', isAdmin, isAdmin ? 'approved' : 'pending', isAdmin ? 'admin' : 'user').run();
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

  // DELETE /api/images/:key — remove an image from R2
  if (request.method === 'DELETE' && path.startsWith('/api/images/')) {
    const key = path.slice(12);
    await env.TRIP_IMAGES.delete(key);
    return json({ ok: true }, 200, cors);
  }

  // ---- Notes (trip noticeboard) ----
  const ensureNoteTables = async () => {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        text TEXT,
        images TEXT,
        created_at TEXT DEFAULT (datetime('now', '+7 hours'))
      )`
    ).run();
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS note_reactions (
        note_id TEXT NOT NULL,
        member_name TEXT NOT NULL,
        reaction TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', '+7 hours')),
        PRIMARY KEY (note_id, member_name)
      )`
    ).run();
  };

  const loadNoteReactions = async (noteIds: string[]) => {
    const map: Record<string, Record<string, string[]>> = {};
    if (noteIds.length === 0) return map;
    const placeholders = noteIds.map(() => '?').join(',');
    const { results } = await db.prepare(
      `SELECT * FROM note_reactions WHERE note_id IN (${placeholders})`
    ).bind(...noteIds).all();
    for (const r of (results as any[])) {
      if (!map[r.note_id]) map[r.note_id] = {};
      if (!map[r.note_id][r.reaction]) map[r.note_id][r.reaction] = [];
      map[r.note_id][r.reaction].push(r.member_name);
    }
    return map;
  };

  // GET /api/trips/:id/notes
  if (request.method === 'GET' && path.match(/^\/api\/trips\/[^/]+\/notes$/)) {
    const id = path.split('/')[3];
    const viewer = await getUserByPhone(db, url.searchParams.get('user'));
    const isAdmin = viewer ? viewer.is_admin === 1 : false;
    if (!isAdmin) {
      if (!viewer) return json({ error: 'ไม่ได้รับสิทธิ์เข้าถึงทริปนี้' }, 403, cors);
      const memberCheck = await db.prepare(
        'SELECT 1 FROM trip_members WHERE trip_id = ? AND member_id = ?'
      ).bind(id, viewer.id).first();
      if (!memberCheck) return json({ error: 'ไม่ได้รับสิทธิ์เข้าถึงทริปนี้' }, 403, cors);
    }
    await ensureNoteTables();
    const { results: notes } = await db.prepare(
      'SELECT * FROM notes WHERE trip_id = ? ORDER BY created_at DESC, id DESC'
    ).bind(id).all();
    const reactionMap = await loadNoteReactions((notes as any[]).map(n => n.id));
    const enriched = (notes as any[]).map(n => ({
      ...n,
      text: n.text || '',
      images: n.images ? (JSON.parse(n.images) as string[]) : [],
      reactions: reactionMap[n.id] || {},
    }));
    return json(enriched, 200, cors);
  }

  // POST /api/trips/:id/notes
  if (request.method === 'POST' && path.match(/^\/api\/trips\/[^/]+\/notes$/)) {
    const id = path.split('/')[3];
    const viewer = await getUserByPhone(db, url.searchParams.get('user'));
    if (!viewer) return json({ error: 'ไม่ได้รับสิทธิ์' }, 401, cors);
    const profile = await db.prepare('SELECT name FROM profiles WHERE id = ?').bind(viewer.id).first();
    if (!profile) return json({ error: 'ไม่พบผู้ใช้' }, 401, cors);
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const images = Array.isArray(body.images) ? (body.images as string[]).filter((s: string) => typeof s === 'string') : [];
    if (!text && images.length === 0) return json({ error: 'กรุณาพิมพ์ข้อความหรือแนบรูปภาพ' }, 400, cors);
    await ensureNoteTables();
    const noteId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.prepare(
      `INSERT INTO notes (id, trip_id, author_name, text, images, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
    ).bind(noteId, id, (profile as any).name, text, images.length ? JSON.stringify(images) : null).run();
    return json({ id: noteId }, 201, cors);
  }

  // DELETE /api/trips/:id/notes/:noteId
  if (request.method === 'DELETE' && path.match(/^\/api\/trips\/[^/]+\/notes\/[^/]+$/)) {
    const parts = path.split('/');
    const id = parts[3];
    const noteId = parts[5];
    const viewer = await getUserByPhone(db, url.searchParams.get('user'));
    if (!viewer) {
      const directLookup = await db.prepare('SELECT id, is_admin FROM profiles WHERE phone = ?').bind(url.searchParams.get('user') || '').first().catch(() => 'THREW');
      return json({ error: 'ไม่ได้รับสิทธิ์', debug: { user: url.searchParams.get('user'), directLookup, noteId, path } }, 401, cors);
    }
    const profile = await db.prepare('SELECT name FROM profiles WHERE id = ?').bind(viewer.id).first();
    const note = await db.prepare('SELECT * FROM notes WHERE id = ? AND trip_id = ?').bind(noteId, id).first();
    if (!note) return json({ error: 'ไม่พบโน้ต' }, 404, cors);
    if (viewer.is_admin !== 1 && (!profile || note.author_name !== profile.name)) {
      return json({ error: 'ไม่ได้รับสิทธิ์ลบโน้ตนี้' }, 403, cors);
    }
    try {
      const images: string[] = note.images ? JSON.parse(note.images) : [];
      for (const img of images) {
        const m = String(img).match(/\/api\/images\/(.+)$/);
        if (m && env.TRIP_IMAGES) await env.TRIP_IMAGES.delete(m[1]).catch(() => {});
      }
    } catch {}
    await db.prepare('DELETE FROM note_reactions WHERE note_id = ?').bind(noteId).run();
    await db.prepare('DELETE FROM notes WHERE id = ?').bind(noteId).run();
    return json({ ok: true }, 200, cors);
  }

  // PUT /api/trips/:id/notes/:noteId
  if (request.method === 'PUT' && path.match(/^\/api\/trips\/[^/]+\/notes\/[^/]+$/)) {
    const parts = path.split('/');
    const id = parts[3];
    const noteId = parts[5];
    const viewer = await getUserByPhone(db, url.searchParams.get('user'));
    if (!viewer) return json({ error: 'ไม่ได้รับสิทธิ์' }, 401, cors);
    const profile = await db.prepare('SELECT name FROM profiles WHERE id = ?').bind(viewer.id).first();
    const note = await db.prepare('SELECT * FROM notes WHERE id = ? AND trip_id = ?').bind(noteId, id).first();
    if (!note) return json({ error: 'ไม่พบโน้ต' }, 404, cors);
    if (viewer.is_admin !== 1 && (!profile || note.author_name !== profile.name)) {
      return json({ error: 'ไม่ได้รับสิทธิ์แก้ไขโน้ตนี้' }, 403, cors);
    }
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const images = Array.isArray(body.images) ? (body.images as string[]).filter((s: string) => typeof s === 'string') : [];
    if (!text && images.length === 0) return json({ error: 'กรุณาพิมพ์ข้อความหรือแนบรูปภาพ' }, 400, cors);
    let prevImages: string[] = [];
    try { prevImages = note.images ? (JSON.parse(note.images) as string[]) : []; } catch {}
    const removed = prevImages.filter((img) => !images.includes(img));
    try {
      for (const img of removed) {
        const m = String(img).match(/\/api\/images\/(.+)$/);
        if (m && env.TRIP_IMAGES) await env.TRIP_IMAGES.delete(m[1]).catch(() => {});
      }
    } catch {}
    await db.prepare(
      'UPDATE notes SET text = ?, images = ? WHERE id = ?'
    ).bind(text, images.length ? JSON.stringify(images) : null, noteId).run();
    return json({ ok: true }, 200, cors);
  }

  // POST /api/notes/:noteId/reactions  — toggle reaction for current member
  if (request.method === 'POST' && path.match(/^\/api\/notes\/[^/]+\/reactions$/)) {
    const noteId = path.split('/')[3];
    const viewer = await getUserByPhone(db, url.searchParams.get('user'));
    if (!viewer) return json({ error: 'ไม่ได้รับสิทธิ์' }, 401, cors);
    const profile = await db.prepare('SELECT name FROM profiles WHERE id = ?').bind(viewer.id).first();
    if (!profile) return json({ error: 'ไม่พบผู้ใช้' }, 401, cors);
    const memberName = (profile as any).name;
    const body = await request.json();
    const reaction = String(body.reaction || '');
    if (!reaction) return json({ error: 'reaction is required' }, 400, cors);
    await ensureNoteTables();
    const note = await db.prepare('SELECT id FROM notes WHERE id = ?').bind(noteId).first();
    if (!note) return json({ error: 'ไม่พบโน้ต' }, 404, cors);
    const existing = await db.prepare(
      'SELECT reaction FROM note_reactions WHERE note_id = ? AND member_name = ?'
    ).bind(noteId, memberName).first();
    if (existing) {
      if ((existing as any).reaction === reaction) {
        await db.prepare('DELETE FROM note_reactions WHERE note_id = ? AND member_name = ?').bind(noteId, memberName).run();
      } else {
        await db.prepare('UPDATE note_reactions SET reaction = ? WHERE note_id = ? AND member_name = ?').bind(reaction, noteId, memberName).run();
      }
    } else {
      await db.prepare('INSERT INTO note_reactions (note_id, member_name, reaction) VALUES (?, ?, ?)').bind(noteId, memberName, reaction).run();
    }
    const reactionMap = await loadNoteReactions([noteId]);
    return json({ reactions: reactionMap[noteId] || {}, me: memberName }, 200, cors);
  }

  // ---- Settlements ----
  if (path.match(/^\/api\/trips\/[\w-]+\/settlements$/)) {
    // Ensure settlements table exists
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS settlements (
        trip_id TEXT NOT NULL,
        settlement_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        slip_url TEXT,
        confirmed_by TEXT,
        settled_amount REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', '+7 hours')),
        updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
        PRIMARY KEY (trip_id, settlement_key)
      )`
    ).run();
    // Migrate: add settled_amount if not exists (idempotent)
    try {
      await db.prepare(`ALTER TABLE settlements ADD COLUMN settled_amount REAL DEFAULT 0`).run();
    } catch { /* column already exists */ }
  }

  // GET /api/trips/:id/settlements
  if (request.method === 'GET' && path.match(/^\/api\/trips\/[\w-]+\/settlements$/)) {
    const tripId = path.split('/')[3];
    const { results } = await db.prepare(
      'SELECT * FROM settlements WHERE trip_id = ? ORDER BY created_at ASC'
    ).bind(tripId).all();
    const map: Record<string, { isSettled: boolean; slipUrl?: string; confirmedBy?: string; settledAmount?: number }> = {};
    for (const row of results as any[]) {
      map[row.settlement_key] = {
        isSettled: row.status === 'confirmed',
        slipUrl: row.slip_url || undefined,
        confirmedBy: row.confirmed_by || undefined,
        settledAmount: row.settled_amount || 0,
      };
    }
    return json(map, 200, cors);
  }

  // PUT /api/trips/:id/settlements
  if (request.method === 'PUT' && path.match(/^\/api\/trips\/[\w-]+\/settlements$/)) {
    const tripId = path.split('/')[3];
    const body = await request.json();
    const { settlement_key, status, slip_url, confirmed_by, settled_amount } = body;
    if (!settlement_key) return json({ error: 'settlement_key is required' }, 400, cors);

    // Upsert
    const existing = await db.prepare(
      'SELECT * FROM settlements WHERE trip_id = ? AND settlement_key = ?'
    ).bind(tripId, settlement_key).first();

    if (existing) {
      // When confirming, accumulate settled_amount (add newly confirmed amount to existing total)
      let newSettledAmount = (existing as any).settled_amount || 0;
      if (settled_amount != null) {
        newSettledAmount = status === 'confirmed'
          ? newSettledAmount + settled_amount  // accumulate on confirm
          : newSettledAmount;                  // keep existing when just uploading slip
      }
      await db.prepare(
        `UPDATE settlements SET status = ?, slip_url = COALESCE(?, slip_url), confirmed_by = COALESCE(?, confirmed_by), settled_amount = ?, updated_at = datetime('now', '+7 hours')
         WHERE trip_id = ? AND settlement_key = ?`
      ).bind(status || 'pending', slip_url || null, confirmed_by || null, newSettledAmount, tripId, settlement_key).run();
    } else {
      await db.prepare(
        `INSERT INTO settlements (trip_id, settlement_key, status, slip_url, confirmed_by, settled_amount)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(tripId, settlement_key, status || 'pending', slip_url || null, confirmed_by || null, settled_amount || 0).run();
    }
    return json({ ok: true }, 200, cors);
  }

  return json({ error: 'Not found' }, 404, cors);
}
