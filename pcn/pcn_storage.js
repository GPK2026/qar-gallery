// ─────────────────────────────────────────────────────────────────────────────
// PCN Data Layer — Storage Abstraction
// ─────────────────────────────────────────────────────────────────────────────
//
// ARCHITECTURE: All data access goes through this module.
// To switch from localStorage → Supabase: change BACKEND constant and
// add Supabase credentials. Zero changes needed in the app itself.
//
// MIGRATION PATH:
//   Phase 1 (now):    BACKEND = "local"    → localStorage
//   Phase 2 (soon):   BACKEND = "supabase" → Supabase REST API
//   Phase 3 (later):  BACKEND = "api"      → Own REST API / Serverless
//
// ─────────────────────────────────────────────────────────────────────────────

const PCN_STORAGE = (() => {

  // ── CONFIG ─────────────────────────────────────────────────────────────────
  // Change this to switch backends
  const BACKEND = "local"; // "local" | "supabase" | "api"

  // Supabase credentials (fill in when ready)
  const SUPABASE_URL  = ""; // e.g. "https://xxxx.supabase.co"
  const SUPABASE_KEY  = ""; // anon/public key from Supabase dashboard

  // API endpoint (for custom backend)
  const API_BASE      = ""; // e.g. "https://api.qar.gallery/v1"

  // Local storage key
  const LS_KEY = "pcn_v1";

  // ── HELPERS ────────────────────────────────────────────────────────────────
  const uid = () => Math.random().toString(36).slice(2,10).toUpperCase();
  const now = () => new Date().toISOString();

  // ── LOCAL STORAGE BACKEND ──────────────────────────────────────────────────
  const local = {
    _load: () => {
      try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
      catch { return {}; }
    },
    _save: (data) => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); return true; }
      catch { return false; }
    },
    _get: (key) => { const d = local._load(); return d[key] ?? null; },
    _set: (key, val) => {
      const d = local._load();
      d[key] = val;
      return local._save(d);
    },

    // ── Auth ──
    async register(name, email, clubCode) {
      const users = local._get("users") || {};
      if(users[email]) return { error: "E-Mail bereits registriert" };
      const user = {
        id: uid(), name, email, clubCode,
        role: "member",
        memberNr: "PCN-" + Math.floor(1000 + Math.random()*8999),
        createdAt: now(), lastSeen: now(),
      };
      users[email] = user;
      local._set("users", users);
      local._set("session", user);
      return { data: user };
    },

    async login(email) {
      const users = local._get("users") || {};
      const user = users[email];
      if(!user) return { error: "Kein Account mit dieser E-Mail gefunden" };
      user.lastSeen = now();
      users[email] = user;
      local._set("users", users);
      local._set("session", user);
      return { data: user };
    },

    async getSession() {
      const s = local._get("session");
      return { data: s };
    },

    async logout() {
      local._set("session", null);
      return { data: true };
    },

    // ── Vehicles ──
    async getVehicles(userId) {
      const all = local._get("vehicles") || {};
      return { data: Object.values(all).filter(v => v.userId === userId) };
    },

    async saveVehicle(vehicle) {
      const all = local._get("vehicles") || {};
      const v = { ...vehicle, updatedAt: now() };
      if(!v.id) { v.id = "V" + uid(); v.createdAt = now(); }
      all[v.id] = v;
      local._set("vehicles", all);
      return { data: v };
    },

    async deleteVehicle(vehicleId) {
      const all = local._get("vehicles") || {};
      delete all[vehicleId];
      local._set("vehicles", all);
      return { data: true };
    },

    async getPublicVehicle(qarId) {
      const all = local._get("vehicles") || {};
      const v = Object.values(all).find(v => v.qarId === qarId);
      return { data: v || null };
    },

    // ── Logbook ──
    async getLogbook(vehicleId) {
      const all = local._get("logbook") || {};
      return { data: (all[vehicleId] || []).sort((a,b) => new Date(b.date) - new Date(a.date)) };
    },

    async addLogEntry(vehicleId, entry) {
      const all = local._get("logbook") || {};
      const e = { ...entry, id: uid(), vehicleId, createdAt: now() };
      all[vehicleId] = [...(all[vehicleId] || []), e];
      local._set("logbook", all);
      return { data: e };
    },

    // ── Reminders ──
    async getReminders(userId) {
      const all = local._get("reminders") || {};
      return { data: (all[userId] || []).filter(r => !r.done) };
    },

    async saveReminder(userId, reminder) {
      const all = local._get("reminders") || {};
      const r = { ...reminder, id: reminder.id || uid(), userId };
      const list = (all[userId] || []);
      const idx = list.findIndex(x => x.id === r.id);
      if(idx >= 0) list[idx] = r; else list.push(r);
      all[userId] = list;
      local._set("reminders", all);
      return { data: r };
    },

    async doneReminder(userId, reminderId) {
      const all = local._get("reminders") || {};
      const list = (all[userId] || []).map(r => r.id === reminderId ? {...r, done: true, doneAt: now()} : r);
      all[userId] = list;
      local._set("reminders", all);
      return { data: true };
    },

    // ── Events ──
    async getEvents() {
      const all = local._get("events") || {};
      return { data: Object.values(all).sort((a,b) => new Date(a.date) - new Date(b.date)) };
    },

    async getParticipants(eventId) {
      const all = local._get("participants") || {};
      return { data: all[eventId] || [] };
    },

    async joinEvent(eventId, userId, vehicleId, cls) {
      const all = local._get("participants") || {};
      const list = all[eventId] || [];
      if(list.find(p => p.userId === userId && p.vehicleId === vehicleId))
        return { error: "Bereits angemeldet" };
      const p = { id: uid(), eventId, userId, vehicleId, class: cls,
        startNr: String(list.length + 1).padStart(2,"0"),
        status: "confirmed", registeredAt: now() };
      all[eventId] = [...list, p];
      local._set("participants", all);
      return { data: p };
    },

    // ── Threads (Messenger) ──
    async getThreads(userId) {
      const all = local._get("threads") || {};
      return { data: Object.values(all).filter(t => t.participants.includes(userId)) };
    },

    async getThread(threadId) {
      const all = local._get("threads") || {};
      return { data: all[threadId] || null };
    },

    async createThread(participants, vehicleId, vehicleName) {
      const all = local._get("threads") || {};
      const t = { id: uid(), participants, vehicleId, vehicleName,
        anonymous: true, messages: [], createdAt: now() };
      all[t.id] = t;
      local._set("threads", all);
      return { data: t };
    },

    async sendMessage(threadId, fromId, text) {
      const all = local._get("threads") || {};
      const t = all[threadId];
      if(!t) return { error: "Thread nicht gefunden" };
      const msg = { id: uid(), from: fromId, text, ts: new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}), read: false, createdAt: now() };
      t.messages = [...t.messages, msg];
      all[threadId] = t;
      local._set("threads", all);
      return { data: msg };
    },

    async markRead(threadId, userId) {
      const all = local._get("threads") || {};
      const t = all[threadId];
      if(!t) return { data: false };
      t.messages = t.messages.map(m => m.from !== userId ? {...m, read: true} : m);
      all[threadId] = t;
      local._set("threads", all);
      return { data: true };
    },

    // ── Event History ──
    async getEventHistory(vehicleId) {
      const all = local._get("eventHistory") || {};
      return { data: (all[vehicleId] || []).sort((a,b) => new Date(b.date)-new Date(a.date)) };
    },

    // ── Stats ──
    async getStats(userId) {
      const [v, r] = await Promise.all([local.getVehicles(userId), local.getReminders(userId)]);
      const vehicles = v.data || [];
      const logbookTotal = (await Promise.all(vehicles.map(v => local.getLogbook(v.id))))
        .reduce((s, res) => s + (res.data||[]).length, 0);
      const threads = await local.getThreads(userId);
      return { data: {
        vehicles: vehicles.length,
        logbook: logbookTotal,
        reminders: (r.data||[]).length,
        threads: (threads.data||[]).length,
      }};
    },
  };

  // ── SUPABASE BACKEND ────────────────────────────────────────────────────────
  // TODO: implement when Supabase credentials are available
  // Schema mirrors the local structure:
  //
  //   users(id, name, email, club_code, role, member_nr, created_at)
  //   vehicles(id, user_id, qar_id, data jsonb, privacy jsonb, created_at)
  //   logbook(id, vehicle_id, date, type, km, notes, workshop, created_at)
  //   reminders(id, user_id, vehicle_id, title, date, done, done_at)
  //   events(id, name, subtitle, date, location, category, data jsonb)
  //   participants(id, event_id, user_id, vehicle_id, class, start_nr, status)
  //   threads(id, participants text[], vehicle_id, anonymous bool, created_at)
  //   messages(id, thread_id, from_id, text, read bool, created_at)
  //
  // Migration command (run once):
  //   supabase db push
  //
  const supabase = {
    _headers: () => ({
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    }),
    _fetch: async (path, opts={}) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...opts, headers: { ...supabase._headers(), ...(opts.headers||{}) }
      });
      if(!r.ok) return { error: await r.text() };
      return { data: await r.json() };
    },
    // All methods follow same signature as local.*
    // TODO: implement each method
    async register() { return { error: "Supabase not configured" }; },
    async login()    { return { error: "Supabase not configured" }; },
    async getSession() { return { data: null }; },
    async logout()   { return { data: true }; },
    // ... rest follows same pattern
  };

  // ── API BACKEND ─────────────────────────────────────────────────────────────
  const api = {
    _fetch: async (path, opts={}) => {
      const r = await fetch(`${API_BASE}/${path}`, {
        ...opts, headers: { "Content-Type": "application/json", ...(opts.headers||{}) }
      });
      if(!r.ok) return { error: await r.text() };
      return { data: await r.json() };
    },
    // TODO: implement when API is ready
    async register() { return { error: "API not configured" }; },
    async login()    { return { error: "API not configured" }; },
    async getSession() { return { data: null }; },
    async logout()   { return { data: true }; },
  };

  // ── SELECTOR ───────────────────────────────────────────────────────────────
  const backends = { local, supabase, api };
  const db = backends[BACKEND] || local;

  // ── PUBLIC API ─────────────────────────────────────────────────────────────
  return {
    // Info
    backend: BACKEND,
    isConfigured: () => {
      if(BACKEND === "supabase") return !!(SUPABASE_URL && SUPABASE_KEY);
      if(BACKEND === "api")      return !!API_BASE;
      return true; // local always works
    },

    // Proxy all methods to selected backend
    auth: {
      register: (name, email, code) => db.register(name, email, code),
      login:    (email)             => db.login(email),
      session:  ()                  => db.getSession(),
      logout:   ()                  => db.logout(),
    },
    vehicles: {
      list:       (uid)    => db.getVehicles(uid),
      save:       (v)      => db.saveVehicle(v),
      delete:     (id)     => db.deleteVehicle(id),
      getPublic:  (qarId)  => db.getPublicVehicle(qarId),
    },
    logbook: {
      list:  (vid)         => db.getLogbook(vid),
      add:   (vid, entry)  => db.addLogEntry(vid, entry),
    },
    reminders: {
      list:  (uid)         => db.getReminders(uid),
      save:  (uid, r)      => db.saveReminder(uid, r),
      done:  (uid, id)     => db.doneReminder(uid, id),
    },
    events: {
      list:         ()              => db.getEvents(),
      participants: (eid)           => db.getParticipants(eid),
      join:         (eid, uid, vid, cls) => db.joinEvent(eid, uid, vid, cls),
      history:      (vid)           => db.getEventHistory(vid),
    },
    threads: {
      list:   (uid)                       => db.getThreads(uid),
      get:    (tid)                       => db.getThread(tid),
      create: (participants, vid, vname)  => db.createThread(participants, vid, vname),
      send:   (tid, uid, text)            => db.sendMessage(tid, uid, text),
      read:   (tid, uid)                  => db.markRead(tid, uid),
    },
    stats: (uid) => db.getStats(uid),
  };
})();

window.PCN_DB = PCN_STORAGE;
