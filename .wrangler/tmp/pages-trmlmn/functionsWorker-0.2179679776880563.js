var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/[[path]].ts
function bangkokToday() {
  return new Date(Date.now() + 7 * 3600 * 1e3).toISOString().slice(0, 10);
}
__name(bangkokToday, "bangkokToday");
function deriveTripStatus(dates) {
  const parts = dates.split(" - ");
  if (parts.length !== 2) return "active";
  const today = bangkokToday();
  if (today < parts[0]) return "upcoming";
  if (today > parts[1]) return "past";
  return "active";
}
__name(deriveTripStatus, "deriveTripStatus");
function json(data, status, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...extra }
  });
}
__name(json, "json");
async function getUserByPhone(db, phone) {
  if (!phone) return null;
  const profile = await db.prepare("SELECT id, is_admin FROM profiles WHERE phone = ?").bind(phone).first();
  return profile || null;
}
__name(getUserByPhone, "getUserByPhone");
async function onRequest(context) {
  const { request, env } = context;
  const db = env.trip_buddy_db;
  const url = new URL(request.url);
  const path = url.pathname;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  try {
    return await handle(request, env, db, url, path, cors);
  } catch (err) {
    console.error("HANDLER ERROR:", err);
    return json({ error: "internal", message: String(err?.message || err), stack: String(err?.stack || "") }, 500, cors);
  }
}
__name(onRequest, "onRequest");
async function handle(request, env, db, url, path, cors) {
  if (request.method === "GET" && path === "/api/trips") {
    const viewer = await getUserByPhone(db, url.searchParams.get("user"));
    const isAdmin = viewer ? viewer.is_admin === 1 : false;
    let rows;
    if (isAdmin) {
      rows = (await db.prepare("SELECT * FROM trips ORDER BY created_at DESC").all()).results;
    } else if (viewer) {
      rows = (await db.prepare(
        "SELECT t.* FROM trips t JOIN trip_members tm ON tm.trip_id = t.id WHERE tm.member_id = ? ORDER BY t.created_at DESC"
      ).bind(viewer.id).all()).results;
    } else {
      rows = [];
    }
    const enriched = [];
    for (const trip of rows) {
      try {
        const { results: members } = await db.prepare(
          "SELECT p.name FROM trip_members tm JOIN profiles p ON tm.member_id = p.id WHERE tm.trip_id = ?"
        ).bind(trip.id).all();
        enriched.push({ ...trip, member_names: members.map((m) => m.name) });
      } catch {
        enriched.push({ ...trip, member_names: [] });
      }
    }
    return json(enriched, 200, cors);
  }
  if (request.method === "GET" && path.match(/^\/api\/trips\/[\w-]+$/)) {
    const id = path.split("/")[3];
    const viewer = await getUserByPhone(db, url.searchParams.get("user"));
    const isAdmin = viewer ? viewer.is_admin === 1 : false;
    if (!isAdmin) {
      if (!viewer) return json({ error: "\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E17\u0E23\u0E34\u0E1B\u0E19\u0E35\u0E49" }, 403, cors);
      const memberCheck = await db.prepare(
        "SELECT 1 FROM trip_members WHERE trip_id = ? AND member_id = ?"
      ).bind(id, viewer.id).first();
      if (!memberCheck) return json({ error: "\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E17\u0E23\u0E34\u0E1B\u0E19\u0E35\u0E49" }, 403, cors);
    }
    const trip = await db.prepare("SELECT * FROM trips WHERE id = ?").bind(id).first();
    if (!trip) return json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E17\u0E23\u0E34\u0E1B" }, 404, cors);
    const { results: rawExpenses } = await db.prepare(
      "SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC"
    ).bind(id).all();
    const expenses = [];
    for (const e of rawExpenses) {
      let paidBy = e.paid_by || "";
      let paidById = "";
      if (paidBy.startsWith("p-")) {
        paidById = paidBy;
        const profile = await db.prepare("SELECT name FROM profiles WHERE id = ?").bind(paidBy).first();
        paidBy = profile ? profile.name : paidBy;
      }
      const splitRaw = e.split_with ? JSON.parse(e.split_with) : [];
      const splitWithIds = [];
      const splitWithNames = [];
      for (const s of splitRaw) {
        if (typeof s === "string" && s.startsWith("p-")) {
          splitWithIds.push(s);
          const profile = await db.prepare("SELECT name FROM profiles WHERE id = ?").bind(s).first();
          splitWithNames.push(profile ? profile.name : s);
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
        split_with_names: splitWithNames
      });
    }
    const { results: tripMembers } = await db.prepare(
      "SELECT p.* FROM trip_members tm JOIN profiles p ON tm.member_id = p.id WHERE tm.trip_id = ?"
    ).bind(id).all();
    return json({ ...trip, expenses, memberDetails: tripMembers || [] }, 200, cors);
  }
  if (request.method === "POST" && path === "/api/trips") {
    const body = await request.json();
    const id = body.id || `t-${Date.now()}`;
    const status = deriveTripStatus(body.dates);
    await db.prepare(
      `INSERT INTO trips (id, title, destination, country, dates, budget, cover_img_url, description, cover_position, status, days, member_count, budget_per_person, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
    ).bind(
      id,
      body.title,
      body.destination,
      body.country || "",
      body.dates,
      body.budget,
      body.coverImgUrl || "",
      body.description || null,
      body.coverPosition || "50% 50%",
      status,
      body.days || null,
      body.memberCount || null,
      body.budgetPerPerson || null,
      body.createdBy || null
    ).run();
    if (body.memberIds && Array.isArray(body.memberIds)) {
      const stmt = db.prepare("INSERT OR IGNORE INTO trip_members (trip_id, member_id) VALUES (?, ?)");
      for (const mid of body.memberIds) {
        await stmt.bind(id, mid).run();
      }
    }
    return json({ id, status }, 201, cors);
  }
  if (request.method === "PUT" && path.match(/^\/api\/trips\/[\w-]+\/members$/)) {
    const id = path.split("/")[3];
    const body = await request.json();
    if (!Array.isArray(body.memberIds)) {
      return json({ error: "memberIds must be an array" }, 400, cors);
    }
    await db.prepare("DELETE FROM trip_members WHERE trip_id = ?").bind(id).run();
    const stmt = db.prepare("INSERT OR IGNORE INTO trip_members (trip_id, member_id) VALUES (?, ?)");
    for (const mid of body.memberIds) {
      await stmt.bind(id, mid).run();
    }
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "PUT" && path.match(/^\/api\/trips\/[\w-]+$/)) {
    const id = path.split("/")[3];
    const body = await request.json();
    const updates = [];
    const params = [];
    for (const [k, v] of Object.entries(body)) {
      if (k === "id" || k === "expenses" || k === "memberIds") continue;
      const col = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      updates.push(`${col} = ?`);
      params.push(v);
    }
    if (body.dates) {
      updates.push(`status = ?`);
      params.push(deriveTripStatus(body.dates));
    }
    if (updates.length === 0) return json({ error: "no fields" }, 400, cors);
    params.push(id);
    await db.prepare(
      `UPDATE trips SET ${updates.join(", ")}, updated_at = datetime('now', '+7 hours') WHERE id = ?`
    ).bind(...params).run();
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "DELETE" && path.match(/^\/api\/trips\/[\w-]+$/)) {
    const id = path.split("/")[3];
    await db.prepare("DELETE FROM expenses WHERE trip_id = ?").bind(id).run();
    await db.prepare("DELETE FROM trip_members WHERE trip_id = ?").bind(id).run();
    await db.prepare("DELETE FROM trips WHERE id = ?").bind(id).run();
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "POST" && path === "/api/expenses") {
    const body = await request.json();
    const id = body.id || `e-${Date.now()}`;
    const paidBy = body.paidById || body.paidBy || "";
    const splitWith = body.splitWithIds && body.splitWithIds.length > 0 ? body.splitWithIds : body.splitWith || [];
    try {
      await db.prepare(
        `INSERT INTO expenses (id, trip_id, title, amount, category, date, paid_by, split_with, custom_shares, slip_url, mode, split_items, fee_mode, fee_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
      ).bind(
        id,
        body.tripId,
        body.title,
        body.amount,
        body.category || "Other",
        body.date,
        paidBy,
        JSON.stringify(splitWith),
        body.customShares ? JSON.stringify(body.customShares) : null,
        body.slipUrl || null,
        body.mode || "simple",
        body.splitItems ? JSON.stringify(body.splitItems) : null,
        body.feeMode || "none",
        body.feeOrder || "sc_then_vat"
      ).run();
    } catch (err) {
      return json({ error: "insert_failed", message: String(err?.message || err) }, 500, cors);
    }
    return json({ id }, 201, cors);
  }
  if (request.method === "PUT" && path.match(/^\/api\/expenses\/[\w-]+$/)) {
    const id = path.split("/")[3];
    const body = await request.json();
    const updates = [];
    const params = [];
    for (const [k, v] of Object.entries(body)) {
      if (k === "id" || k === "tripId") continue;
      let col = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      if (col === "paid_by_id") col = "paid_by";
      if (col === "split_with_ids") col = "split_with";
      if (col === "split_with") {
        updates.push(`${col} = ?`);
        params.push(JSON.stringify(v));
      } else if (col === "custom_shares" || col === "split_items") {
        updates.push(`${col} = ?`);
        params.push(v ? JSON.stringify(v) : null);
      } else {
        updates.push(`${col} = ?`);
        params.push(v);
      }
    }
    if (updates.length === 0) return json({ error: "no fields" }, 400, cors);
    params.push(id);
    await db.prepare(
      `UPDATE expenses SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "DELETE" && path.match(/^\/api\/expenses\/[\w-]+$/)) {
    const id = path.split("/")[3];
    await db.prepare("DELETE FROM expenses WHERE id = ?").bind(id).run();
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "GET" && path === "/api/members") {
    const { results } = await db.prepare("SELECT * FROM profiles ORDER BY join_date DESC").all();
    return json(results, 200, cors);
  }
  if (request.method === "POST" && path === "/api/members") {
    const body = await request.json();
    const id = body.id || `p-${Date.now()}`;
    await db.prepare(
      `INSERT INTO profiles (id, name, phone, avatar_url, bank_account, status, access_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
    ).bind(
      id,
      body.name,
      body.phone,
      body.avatarUrl || "",
      body.bankAccount || "",
      body.status || "pending",
      body.accessLevel || "user"
    ).run();
    return json({ id }, 201, cors);
  }
  if (request.method === "PUT" && path.match(/^\/api\/members\/[\w-]+$/)) {
    const id = path.split("/")[3];
    const body = await request.json();
    const updates = [];
    const params = [];
    for (const [k, v] of Object.entries(body)) {
      if (k === "id") continue;
      const col = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      updates.push(`${col} = ?`);
      params.push(v);
    }
    if (updates.length === 0) return json({ error: "no fields" }, 400, cors);
    params.push(id);
    await db.prepare(`UPDATE profiles SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "DELETE" && path.match(/^\/api\/members\/[\w-]+$/)) {
    const id = path.split("/")[3];
    const profile = await db.prepare("SELECT id, is_admin, avatar_url FROM profiles WHERE id = ?").bind(id).first();
    if (!profile) return json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01" }, 404, cors);
    if (profile.is_admin === 1) return json({ error: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49" }, 400, cors);
    await db.prepare("DELETE FROM trip_members WHERE member_id = ?").bind(id).run();
    await db.prepare("DELETE FROM expenses WHERE paid_by = ?").bind(id).run();
    await db.prepare("DELETE FROM profiles WHERE id = ?").bind(id).run();
    try {
      const avatar = profile.avatar_url || "";
      const m = avatar.match(/\/api\/images\/(.+)$/);
      if (m && env.TRIP_IMAGES) {
        await env.TRIP_IMAGES.delete(m[1]).catch(() => {
        });
      }
    } catch {
    }
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "GET" && path.match(/^\/api\/profile\/.+/)) {
    const phone = path.split("/")[3];
    const profile = await db.prepare("SELECT * FROM profiles WHERE phone = ?").bind(phone).first();
    if (!profile) return json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E1B\u0E23\u0E44\u0E1F\u0E25\u0E4C" }, 404, cors);
    return json(profile, 200, cors);
  }
  if (request.method === "PUT" && path.match(/^\/api\/profile\/.+/)) {
    const phone = path.split("/")[3];
    const body = await request.json();
    const existing = await db.prepare("SELECT id FROM profiles WHERE phone = ?").bind(phone).first();
    const isAdmin = body.isAdmin ? 1 : 0;
    if (existing) {
      await db.prepare(
        "UPDATE profiles SET name = ?, bank_account = ?, avatar_url = ?, is_admin = ?, updated_at = datetime('now') WHERE phone = ?"
      ).bind(body.name ?? "", body.bankAccount ?? "", body.avatarUrl ?? "", isAdmin, phone).run();
    } else {
      const id = body.id || `p-${Date.now()}`;
      await db.prepare(
        "INSERT INTO profiles (id, name, phone, bank_account, avatar_url, is_admin, status, access_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(id, body.name || "", phone, body.bankAccount || "", body.avatarUrl || "", isAdmin, isAdmin ? "approved" : "pending", isAdmin ? "admin" : "user").run();
    }
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "GET" && path === "/api/health") {
    return json({ ok: true }, 200, cors);
  }
  if (request.method === "GET" && path.startsWith("/api/images/")) {
    const key = path.slice(12);
    const object = await env.TRIP_IMAGES.get(key);
    if (!object) return json({ error: "not found" }, 404, cors);
    const headers = {
      "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      ...cors
    };
    return new Response(object.body, { headers });
  }
  if (path.match(/^\/api\/trips\/[\w-]+\/settlements$/)) {
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
    try {
      await db.prepare(`ALTER TABLE settlements ADD COLUMN settled_amount REAL DEFAULT 0`).run();
    } catch {
    }
  }
  if (request.method === "GET" && path.match(/^\/api\/trips\/[\w-]+\/settlements$/)) {
    const tripId = path.split("/")[3];
    const { results } = await db.prepare(
      "SELECT * FROM settlements WHERE trip_id = ? ORDER BY created_at ASC"
    ).bind(tripId).all();
    const map = {};
    for (const row of results) {
      map[row.settlement_key] = {
        isSettled: row.status === "confirmed",
        slipUrl: row.slip_url || void 0,
        confirmedBy: row.confirmed_by || void 0,
        settledAmount: row.settled_amount || 0
      };
    }
    return json(map, 200, cors);
  }
  if (request.method === "PUT" && path.match(/^\/api\/trips\/[\w-]+\/settlements$/)) {
    const tripId = path.split("/")[3];
    const body = await request.json();
    const { settlement_key, status, slip_url, confirmed_by, settled_amount } = body;
    if (!settlement_key) return json({ error: "settlement_key is required" }, 400, cors);
    const existing = await db.prepare(
      "SELECT * FROM settlements WHERE trip_id = ? AND settlement_key = ?"
    ).bind(tripId, settlement_key).first();
    if (existing) {
      let newSettledAmount = existing.settled_amount || 0;
      if (settled_amount != null) {
        newSettledAmount = status === "confirmed" ? newSettledAmount + settled_amount : newSettledAmount;
      }
      await db.prepare(
        `UPDATE settlements SET status = ?, slip_url = COALESCE(?, slip_url), confirmed_by = COALESCE(?, confirmed_by), settled_amount = ?, updated_at = datetime('now', '+7 hours')
         WHERE trip_id = ? AND settlement_key = ?`
      ).bind(status || "pending", slip_url || null, confirmed_by || null, newSettledAmount, tripId, settlement_key).run();
    } else {
      await db.prepare(
        `INSERT INTO settlements (trip_id, settlement_key, status, slip_url, confirmed_by, settled_amount)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(tripId, settlement_key, status || "pending", slip_url || null, confirmed_by || null, settled_amount || 0).run();
    }
    return json({ ok: true }, 200, cors);
  }
  return json({ error: "Not found" }, 404, cors);
}
__name(handle, "handle");

// upload.ts
var MAX_FILE_SIZE = 5 * 1024 * 1024;
var ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
function generateKey(fileName, folder) {
  const ext = fileName.split(".").pop() || "jpg";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${folder}/${ts}-${rand}.${ext}`;
}
__name(generateKey, "generateKey");
async function onRequest2(context) {
  const request = context.request;
  const env = context.env;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return new Response(JSON.stringify({ error: "\u0E15\u0E49\u0E2D\u0E07\u0E2A\u0E48\u0E07\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E1B\u0E47\u0E19 multipart/form-data" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  const folder = formData.get("folder") || "trips";
  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E44\u0E1F\u0E25\u0E4C\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E21\u0E32" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
  if (file.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: "\u0E44\u0E1F\u0E25\u0E4C\u0E21\u0E35\u0E02\u0E19\u0E32\u0E14\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E01\u0E34\u0E19 5 MB" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: "\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E44\u0E1F\u0E25\u0E4C JPG, PNG, WebP, GIF" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
  const key = generateKey(file.name, folder);
  const arrayBuffer = await file.arrayBuffer();
  await env.TRIP_IMAGES.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" }
  });
  return new Response(JSON.stringify({ key, url: key }), {
    status: 201,
    headers: { "Content-Type": "application/json", ...cors }
  });
}
__name(onRequest2, "onRequest");

// ../.wrangler/tmp/pages-trmlmn/functionsRoutes-0.9016673501484164.mjs
var routes = [
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/upload",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  }
];

// ../../../AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
