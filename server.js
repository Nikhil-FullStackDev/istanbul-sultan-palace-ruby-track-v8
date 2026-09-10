/* Istanbul — static file server + tiny multiplayer relay (SSE + POST, zero deps).
 *
 * The relay is a dumb switchboard: it never runs game rules. The room creator's
 * browser is the authority ("host"); it broadcasts state snapshots, guests send
 * their inputs back, the host applies them and re-broadcasts.
 *
 *   POST /mp/create            -> { code, clientId }         (make a room, you are host)
 *   GET  /mp/events?room&client&host=0|1                      (SSE stream for that client)
 *   POST /mp/msg   { room, client, type, ... }               (send a message into the room)
 *
 * SSE events sent to clients: hello, roster, start, state, input, prompt, promptReply,
 *                             host-left, room-closed, ping
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

// ---- rooms -----------------------------------------------------------------
// code -> { hostId, started, lastState, seq, clients: Map(id -> client) }
// client: { id, res, name, color, ready, isHost, seat }
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SEAT_COLORS = ['red', 'blue', 'green', 'yellow'];
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); }
  while (rooms.has(c));
  return c;
}
function sse(res, event, data) {
  try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
}
function roster(room) {
  return [...room.clients.values()]
    .sort((a, b) => a.seat - b.seat)
    .map(c => ({ id: c.id, name: c.name, color: c.color, ready: c.ready, isHost: c.isHost }));
}
function toAll(room, event, data, exceptId) {
  for (const [id, c] of room.clients) if (id !== exceptId) sse(c.res, event, data);
}
function toHost(room, event, data) {
  const h = room.clients.get(room.hostId);
  if (h) sse(h.res, event, data);
}
function toClient(room, id, event, data) {
  const c = room.clients.get(id);
  if (c) sse(c.res, event, data);
}
function pushRoster(room) {
  toAll(room, 'roster', { roster: roster(room), started: room.started });
}
function freeSeat(room) {
  const taken = new Set([...room.clients.values()].map(c => c.seat));
  for (let i = 0; i < SEAT_COLORS.length; i++) if (!taken.has(i)) return i;
  return -1;
}
function dropRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  toAll(room, 'room-closed', {});
  for (const c of room.clients.values()) { try { c.res.end(); } catch (_) {} }
  rooms.delete(code);
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.touched > ROOM_TTL_MS || room.clients.size === 0) dropRoom(code);
    else for (const c of room.clients.values()) sse(c.res, 'ping', { t: now });
  }
}, 20000).unref?.();

// ---- request body helper -------------------------------------------------
function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', d => { b += d; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (_) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
function json(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(s) });
  res.end(s);
}

// ---- multiplayer endpoints ---------------------------------------------
async function handleMp(req, res, u) {
  const p = u.pathname;

  if (p === '/mp/create' && req.method === 'POST') {
    const body = await readBody(req);
    const code = newCode();
    const clientId = crypto.randomUUID();
    rooms.set(code, { hostId: clientId, started: false, lastState: null, seq: 0, touched: Date.now(), clients: new Map() });
    const room = rooms.get(code);
    room.pendingHost = { id: clientId, name: (body.name || 'Host').slice(0, 24) };
    return json(res, 200, { code, clientId });
  }

  if (p === '/mp/events' && req.method === 'GET') {
    const code = (u.searchParams.get('room') || '').toUpperCase();
    const clientId = u.searchParams.get('client') || crypto.randomUUID();
    const wantHost = u.searchParams.get('host') === '1';
    const room = rooms.get(code);
    if (!room) { res.writeHead(404); return res.end('no such room'); }

    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.write('retry: 3000\n\n');

    let client = room.clients.get(clientId);
    if (client) {
      client.res = client.res; try { client.res.end(); } catch (_) {}
      client.res = res;
    } else {
      const isHost = wantHost && clientId === room.hostId;
      const seat = isHost ? 0 : freeSeat(room);
      if (seat < 0) { sse(res, 'room-closed', { reason: 'full' }); return res.end(); }
      client = {
        id: clientId, res, isHost, seat,
        color: SEAT_COLORS[seat],
        name: isHost ? (room.pendingHost?.name || 'Host') : `Player ${seat + 1}`,
        ready: isHost,
      };
      room.clients.set(clientId, client);
    }
    room.touched = Date.now();

    sse(res, 'hello', { clientId, code, color: client.color, isHost: client.isHost, started: room.started });
    pushRoster(room);
    if (room.started && room.lastState) sse(res, 'state', room.lastState);

    req.on('close', () => {
      const still = room.clients.get(clientId);
      if (still && still.res === res) {
        room.clients.delete(clientId);
        if (clientId === room.hostId) toAll(room, 'host-left', {});
        else pushRoster(room);
        if (room.clients.size === 0) setTimeout(() => { if (rooms.get(code)?.clients.size === 0) dropRoom(code); }, 45000);
      }
    });
    return;
  }

  if (p === '/mp/msg' && req.method === 'POST') {
    const m = await readBody(req);
    const room = rooms.get((m.room || '').toUpperCase());
    if (!room) return json(res, 404, { error: 'no room' });
    const me = room.clients.get(m.client);
    if (!me) return json(res, 403, { error: 'not in room' });
    room.touched = Date.now();
    const isHost = m.client === room.hostId;

    switch (m.type) {
      case 'setName':
        me.name = String(m.name || me.name).slice(0, 24); pushRoster(room); break;
      case 'ready':
        if (!isHost) me.ready = !!m.ready; pushRoster(room); break;
      case 'start':
        if (isHost && !room.started) {
          room.started = true;
          toAll(room, 'start', { roster: roster(room) });
        }
        break;
      case 'state':
        if (isHost) {
          room.seq = (room.seq || 0) + 1;
          room.lastState = { ...m.snap, seq: room.seq };
          toAll(room, 'state', room.lastState, room.hostId);
        }
        break;
      case 'input':
        if (!isHost) toHost(room, 'input', { from: me.color, action: m.action });
        break;
      case 'promptReply':
        if (!isHost) toHost(room, 'promptReply', { from: me.color, id: m.id, value: m.value });
        break;
      case 'end':
        if (isHost) dropRoom((m.room || '').toUpperCase());
        break;
    }
    return json(res, 200, { ok: true });
  }

  res.writeHead(404); res.end('not found');
}

// ---- static files ------------------------------------------------------
function serveStatic(req, res, u) {
  let rel = decodeURIComponent(u.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      // SPA-ish fallback so /?room=CODE etc. still load index.html
      const idx = path.join(ROOT, 'index.html');
      return fs.readFile(idx, (e2, buf) => {
        if (e2) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'content-type': MIME['.html'] });
        res.end(buf);
      });
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(full).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname.startsWith('/mp/')) return handleMp(req, res, u).catch(() => { try { res.writeHead(500); res.end('err'); } catch (_) {} });
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end('method not allowed'); }
  serveStatic(req, res, u);
});

server.listen(PORT, () => console.log(`Istanbul server listening on :${PORT}`));
