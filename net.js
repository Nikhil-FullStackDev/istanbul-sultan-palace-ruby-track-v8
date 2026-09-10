/* Istanbul multiplayer — transport + lobby.
 * Loads before board.js. Sets window.NET.{role,myColor,...} and drives the
 * lobby overlay. board.js wires the actual game sync onto the NET callbacks. */
(function () {
  'use strict';

  const NET = window.NET = {
    role: 'solo',           // 'solo' | 'host' | 'guest'
    code: null,
    clientId: null,
    myColor: null,
    roster: [],
    started: false,
    hostStarted: false,
    es: null,
    // callbacks board.js fills in:
    onState: null, onInput: null, onStart: null, onHostLeft: null,
    // helpers board.js fills in:
    scheduleBroadcast: null,
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLOR_HEX = { red: '#c6443b', blue: '#2f6fb0', green: '#3f8a4c', yellow: '#d9a92e' };

  function post(type, payload) {
    return fetch('/mp/msg', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.assign({ room: NET.code, client: NET.clientId, type }, payload || {})),
    }).catch(() => {});
  }
  NET.sendState = (snap) => post('state', { snap });
  NET.sendInput = (action) => post('input', { action });
  NET.setName = (name) => post('setName', { name });
  NET.setReady = (ready) => post('ready', { ready });
  NET.startGame = () => post('start', {});

  // ---- connection ----------------------------------------------------
  function connect(code, clientId, isHost) {
    NET.code = code;
    NET.clientId = clientId;
    NET.role = isHost ? 'host' : 'guest';
    try { NET.es && NET.es.close(); } catch (_) {}
    const es = new EventSource(`/mp/events?room=${encodeURIComponent(code)}&client=${encodeURIComponent(clientId)}&host=${isHost ? 1 : 0}`);
    NET.es = es;

    es.addEventListener('hello', (e) => {
      const d = JSON.parse(e.data);
      NET.myColor = d.color;
      NET.started = d.started;
      if (NET._pendingName) { NET.setName(NET._pendingName); NET._pendingName = null; }
      renderLobby();
    });
    es.addEventListener('roster', (e) => {
      const d = JSON.parse(e.data);
      NET.roster = d.roster || [];
      const wasStarted = NET.started;
      NET.started = d.started;
      const me = NET.roster.find(r => r.id === NET.clientId);
      if (me) NET.myColor = me.color;
      if (NET.started && !wasStarted && NET.role !== 'solo') {
        // joined a game that is already running (or the start event was missed)
        hideLobby();
        document.body.classList.add('mp-live');
        NET.onStart && NET.onStart(NET.roster);
      }
      renderLobby();
    });
    es.addEventListener('start', (e) => {
      const d = JSON.parse(e.data);
      NET.roster = d.roster || NET.roster;
      NET.started = true;
      hideLobby();
      document.body.classList.add('mp-live');
      NET.onStart && NET.onStart(NET.roster);
    });
    es.addEventListener('state', (e) => {
      const s = JSON.parse(e.data);
      NET.onState && NET.onState(s);
    });
    es.addEventListener('input', (e) => {
      NET.onInput && NET.onInput(JSON.parse(e.data));
    });
    es.addEventListener('host-left', () => {
      NET.onHostLeft && NET.onHostLeft();
      lobbyError('The host disconnected. The game is paused — reopen the link when they are back.');
    });
    es.addEventListener('room-closed', (e) => {
      let reason = ''; try { reason = (JSON.parse(e.data) || {}).reason || ''; } catch (_) {}
      lobbyError(reason === 'full' ? 'That game is full.' : 'The game room has closed.');
      NET.role = 'solo';
    });
    es.onerror = () => { /* EventSource auto-reconnects */ };
  }

  async function createRoom(name) {
    const r = await fetch('/mp/create', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(x => x.json());
    connect(r.code, r.clientId, true);
    history.replaceState(null, '', `?room=${r.code}`);
  }
  function joinRoom(code) {
    const id = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
    connect(code.toUpperCase(), id, false);
  }

  // ---- lobby UI -----------------------------------------------------
  let lobbyEl = null;
  function ensureLobby() {
    if (lobbyEl) return lobbyEl;
    lobbyEl = document.createElement('div');
    lobbyEl.id = 'mp-lobby';
    document.body.appendChild(lobbyEl);
    return lobbyEl;
  }
  function hideLobby() { lobbyEl && lobbyEl.setAttribute('hidden', ''); }
  function showLobby() { ensureLobby().removeAttribute('hidden'); }
  function lobbyError(msg) { ensureLobby().dataset.error = msg; renderLobby(); }

  function renderLobby() {
    const el = ensureLobby();
    if (NET.started && NET.role !== 'solo') { hideLobby(); return; }
    showLobby();
    const err = el.dataset.error ? `<p class="mp-err">${esc(el.dataset.error)}</p>` : '';

    // --- not in a room yet ---
    if (!NET.code) {
      const pre = new URLSearchParams(location.search).get('room') || '';
      el.innerHTML = `
        <div class="mp-card">
          <h1>Istanbul <em>Multiplayer</em></h1>
          <p class="mp-sub">One player creates a game and shares the link. Everyone else opens it and plays their turns from their own device.</p>
          ${err}
          <label class="mp-field"><span>Your name</span>
            <input id="mp-name" type="text" maxlength="24" placeholder="e.g. Sam" value="${esc(localStorage.getItem('mp-name') || '')}"></label>
          <div class="mp-row">
            <button id="mp-create" type="button" class="mp-primary">Create game</button>
          </div>
          <div class="mp-or">or join with a code</div>
          <div class="mp-row">
            <input id="mp-code" type="text" maxlength="4" placeholder="ABCD" value="${esc(pre)}" style="text-transform:uppercase">
            <button id="mp-join" type="button">Join</button>
          </div>
          <button id="mp-solo" type="button" class="mp-link">Play solo instead</button>
        </div>`;
      $('#mp-create', el).onclick = () => {
        const n = ($('#mp-name', el).value || 'Host').trim().slice(0, 24);
        localStorage.setItem('mp-name', n);
        createRoom(n);
      };
      $('#mp-join', el).onclick = () => {
        const c = ($('#mp-code', el).value || '').trim().toUpperCase();
        const n = ($('#mp-name', el).value || '').trim().slice(0, 24);
        if (c.length === 4) { localStorage.setItem('mp-name', n); NET._pendingName = n || null; joinRoom(c); }
      };
      $('#mp-code', el).addEventListener('keydown', e => { if (e.key === 'Enter') $('#mp-join', el).click(); });
      $('#mp-solo', el).onclick = () => { NET.role = 'solo'; history.replaceState(null, '', location.pathname); hideLobby(); document.body.classList.add('mp-solo'); };
      return;
    }

    // --- in a room, waiting for start ---
    const meRow = NET.roster.find(r => r.id === NET.clientId);
    const isHost = !!(meRow && meRow.isHost);
    const link = `${location.origin}${location.pathname}?room=${NET.code}`;
    const readyCount = NET.roster.filter(r => r.ready).length;
    const canStart = isHost && NET.roster.length >= 2 && readyCount === NET.roster.length;
    el.innerHTML = `
      <div class="mp-card">
        <h1>Game <em>${esc(NET.code)}</em></h1>
        ${err}
        <div class="mp-linkbox">
          <input id="mp-link" type="text" readonly value="${esc(link)}">
          <button id="mp-copy-link" type="button">Copy link</button>
        </div>
        <p class="mp-sub">Send that link to the other players.</p>
        <ul class="mp-roster">
          ${NET.roster.map(r => `
            <li>
              <span class="mp-dot" style="background:${COLOR_HEX[r.color] || '#999'}"></span>
              <span class="mp-pname">${esc(r.name)}${r.isHost ? ' <em>(host)</em>' : ''}${r.id === NET.clientId ? ' <em>— you</em>' : ''}</span>
              <span class="mp-status ${r.ready ? 'is-ready' : ''}">${r.ready ? 'ready' : 'not ready'}</span>
            </li>`).join('')}
        </ul>
        ${isHost ? `
          <button id="mp-start" type="button" class="mp-primary" ${canStart ? '' : 'disabled'}>
            ${NET.roster.length < 2 ? 'Waiting for players…' : (canStart ? `Start game (${NET.roster.length} players)` : 'Waiting for everyone to be ready…')}
          </button>`
        : `
          <label class="mp-readytoggle"><input id="mp-ready" type="checkbox" ${meRow && meRow.ready ? 'checked' : ''}> I'm ready</label>
          <p class="mp-sub">Waiting for the host to start…</p>`}
      </div>`;
    $('#mp-copy-link', el).onclick = () => {
      const i = $('#mp-link', el); i.select();
      (navigator.clipboard && navigator.clipboard.writeText(link) || Promise.reject())
        .then(() => { $('#mp-copy-link', el).textContent = 'Copied!'; setTimeout(() => { const b = $('#mp-copy-link', el); if (b) b.textContent = 'Copy link'; }, 1400); })
        .catch(() => { try { document.execCommand('copy'); } catch (_) {} });
    };
    if (isHost) { const b = $('#mp-start', el); if (b) b.onclick = () => NET.startGame(); }
    else { const c = $('#mp-ready', el); if (c) c.onchange = () => NET.setReady(c.checked); }
  }

  // ---- boot -------------------------------------------------------
  const params = new URLSearchParams(location.search);
  if (params.has('solo')) {
    NET.role = 'solo';
    document.body.classList.add('mp-solo');
  } else {
    ensureLobby();
    renderLobby();   // if ?room=CODE is present the code field is pre-filled; the
                     // player enters a name and clicks Join.
  }
})();
