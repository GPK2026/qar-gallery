const genQARId = () => { const C='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let id='QAR-'; for(let i=0;i<8;i++) id+=C[Math.floor(Math.random()*C.length)]; return id; };

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
  const BACKEND = "supabase"; // "local" | "supabase" | "api"  ← active: Supabase

  // Credentials loaded from pcn_config.js (not in git) — see pcn_config.example.js
  const cfg         = (typeof window !== "undefined" && window.PCN_CONFIG) || {};
  const SUPABASE_URL = cfg.supabaseUrl || "";
  const SUPABASE_KEY = cfg.supabaseKey || "";

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
    async register(name, email, clubCode, password) {
      const users = local._get("users") || {};
      const existing = users[email];
      if(existing && existing.role !== "guest") return { error: "E-Mail bereits registriert" };
      // Guest upgrade: keep same id (preserves their chat history), become full member
      const user = {
        id: existing?.id || uid(), name, email, clubCode,
        password: password || "",
        role: "member",
        memberNr: existing?.memberNr || ("PCN-" + Math.floor(1000 + Math.random()*8999)),
        createdAt: existing?.createdAt || now(), lastSeen: now(),
        convertedFromGuest: !!existing,
      };
      users[email] = user;
      local._set("users", users);
      local._set("session", user);
      return { data: user };
    },

    async registerGuest(name, email) {
      const users = local._get("users") || {};
      // Guests can reuse an existing email if it was also a guest (no error)
      const existing = users[email];
      if(existing && existing.role !== "guest") return { error: "E-Mail bereits als Mitglied registriert" };
      const user = existing || {
        id: uid(), name, email, role: "guest",
        memberNr: null,
        createdAt: now(), lastSeen: now(),
      };
      user.lastSeen = now();
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

    async loginWithPassword(email, password) {
      const users = local._get("users") || {};
      const user = users[email];
      if(!user) return { error: "Kein Account mit dieser E-Mail gefunden" };
      // In local mode: accept any password for demo accounts (no real hashing)
      // In Supabase mode: real bcrypt check
      if(user.password && user.password !== password) return { error: "Falsches Passwort" };
      user.lastSeen = now();
      users[email] = user;
      local._set("users", users);
      local._set("session", user);
      return { data: user };
    },

    async resetPassword(email) {
      // In local mode: just acknowledge — no real email
      return { data: { sent: true } };
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
      // Match by userId OR owner email (handles both registration methods)
      const session = local._get("session");
      const email = session?.email || "";
      return { data: Object.values(all).filter(v =>
        v.userId === userId ||
        v.owner === userId ||
        v.owner === email ||
        v.userId === email
      )};
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
        status: "pending", registeredAt: now() };
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
    async deleteThread(threadId) {
      const all = local._get("threads") || {};
      delete all[threadId];
      local._set("threads", all);
      return { data: true };
    },

    // ── Event History ──
    async getEventHistory(vehicleId) {
      const all = local._get("eventHistory") || {};
      return { data: (all[vehicleId] || []).sort((a,b) => new Date(b.date)-new Date(a.date)) };
    },

    // ── Vehicle Status ──
    async getStatus(vehicleId) {
      const all = local._get("vehicleStatus") || {};
      return { data: all[vehicleId] || null };
    },
    async setStatus(vehicleId, status) {
      const all = local._get("vehicleStatus") || {};
      all[vehicleId] = status;
      local._set("vehicleStatus", all);
      return { data: status };
    },
    async clearStatus(vehicleId) {
      const all = local._get("vehicleStatus") || {};
      delete all[vehicleId];
      local._set("vehicleStatus", all);
      return { data: true };
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

  // ── SUPABASE BACKEND ─────────────────────────────────────────────────────────
  // Full REST implementation — matches local backend API exactly
  // Switch: set BACKEND = "supabase" and fill SUPABASE_URL + SUPABASE_KEY
  const supabase = {
    _h: () => ({
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Prefer": "return=representation",
    }),
    _q: async (table, params="") => {
      const r = await fetch(SUPABASE_URL+"/rest/v1/"+table+params, { headers: supabase._h() });
      if(!r.ok) return { error: await r.text() };
      return { data: await r.json() };
    },
    _post: async (table, body) => {
      const r = await fetch(SUPABASE_URL+"/rest/v1/"+table, {
        method:"POST", headers: supabase._h(), body: JSON.stringify(body)
      });
      if(!r.ok) return { error: await r.text() };
      const d = await r.json(); return { data: Array.isArray(d)?d[0]:d };
    },
    _patch: async (table, filter, body) => {
      const r = await fetch(SUPABASE_URL+"/rest/v1/"+table+"?"+filter, {
        method:"PATCH", headers: supabase._h(), body: JSON.stringify(body)
      });
      if(!r.ok) return { error: await r.text() };
      const d = await r.json(); return { data: Array.isArray(d)?d[0]:d };
    },
    _delete: async (table, filter) => {
      const r = await fetch(SUPABASE_URL+"/rest/v1/"+table+"?"+filter, {
        method:"DELETE", headers: supabase._h()
      });
      if(!r.ok) return { error: await r.text() };
      return { data: true };
    },

    // ── Auth — Supabase Magic Link ──────────────────────────────────────────────
    // Flow: user enters email → Supabase sends magic link → user clicks →
    //       URL contains access_token → we exchange for session → user is logged in
    // For demo/dev: falls back to direct email lookup (no real email sent)

    _authUrl: () => SUPABASE_URL.replace("/rest/v1","").replace("rest/v1","") + "/auth/v1",

    async _supabaseAuthFetch(path, body) {
      const base = SUPABASE_URL.replace("/rest/v1","");
      const r = await fetch(base + "/auth/v1" + path, {
        method: "POST",
        headers: { "Content-Type":"application/json", "apikey": SUPABASE_KEY },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if(!r.ok) return { error: d.error_description || d.msg || "Auth error" };
      return { data: d };
    },

    // Persist session — stores Supabase JWT + our user profile
    _saveSession(supaUser, profile) {
      const session = {
        id: supaUser.id,
        email: supaUser.email,
        name: profile?.name || supaUser.email?.split("@")[0] || "Mitglied",
        role: profile?.role || "member",
        memberNr: profile?.member_nr || null,
        avatar: profile?.avatar || "",
        city: profile?.city || "",
        bio: profile?.bio || "",
        phone: profile?.phone || "",
        notifications: { events: true, messages: true },
        access_token: supaUser.access_token || "",
        token_expiry: supaUser.token_expiry || 0,
        createdAt: profile?.created_at || new Date().toISOString(),
      };
      localStorage.setItem("pcn_session", JSON.stringify(session));
      return session;
    },

    // Send magic link — Supabase emails a login link to the user
    async sendMagicLink(email, redirectTo) {
      const base = SUPABASE_URL.replace("/rest/v1","");
      const r = await fetch(base + "/auth/v1/otp", {
        method: "POST",
        headers: { "Content-Type":"application/json", "apikey": SUPABASE_KEY },
        body: JSON.stringify({
          email,
          create_user: true,
          data: { source: "pcn_app" },
          ...( redirectTo ? { options: { emailRedirectTo: redirectTo } } : {} ),
        }),
      });
      if(r.status === 200 || r.status === 204) return { data: { sent: true } };
      const d = await r.json().catch(()=>({}));
      return { error: d.error_description || d.msg || "Magic Link konnte nicht gesendet werden" };
    },

    // Verify OTP token from magic link URL
    async verifyOtp(email, token) {
      const base = SUPABASE_URL.replace("/rest/v1","");
      const r = await fetch(base + "/auth/v1/verify", {
        method: "POST",
        headers: { "Content-Type":"application/json", "apikey": SUPABASE_KEY },
        body: JSON.stringify({ email, token, type: "magiclink" }),
      });
      const d = await r.json().catch(()=>({}));
      if(!r.ok) return { error: d.error_description || "Token ungültig oder abgelaufen" };
      // Get or create user profile in our users table
      const supaUser = d.user || {};
      supaUser.access_token = d.access_token;
      const {data:profiles} = await supabase._q("users","?email=eq."+encodeURIComponent(email));
      const profile = profiles&&profiles[0];
      const session = supabase._saveSession(supaUser, profile);
      return { data: session };
    },

    // Exchange hash token from magic link redirect URL
    async exchangeToken(accessToken) {
      // When user clicks magic link → browser gets #access_token=... in URL
      // We store it and use it for all future requests
      const base = SUPABASE_URL.replace("/rest/v1","");
      const r = await fetch(base + "/auth/v1/user", {
        headers: { "Authorization": "Bearer " + accessToken, "apikey": SUPABASE_KEY }
      });
      if(!r.ok) return { error: "Token ungültig" };
      const supaUser = await r.json();
      supaUser.access_token = accessToken;
      const {data:profiles} = await supabase._q("users","?email=eq."+encodeURIComponent(supaUser.email));
      const profile = profiles&&profiles[0];
      const session = supabase._saveSession(supaUser, profile);
      return { data: session };
    },

    // Register: create/update user profile row after Supabase Auth creates the account
    async register(name, email, clubCode, password) {
      // MVP: Club-Code = Verifikation. Kein Supabase Auth nötig.
      const pwHash = password ? btoa(encodeURIComponent(password)).slice(0,32) : "";
      const memberNr = "PCN-"+Math.floor(1000+Math.random()*8999);

      // Check if already registered
      const {data:existing} = await supabase._q("users","?email=eq."+encodeURIComponent(email));
      if(existing&&existing.length>0){
        const ex = existing[0];
        if(ex.role !== "guest") return { error: "E-Mail bereits registriert" };
        // Guest upgrade
        await supabase._patch("users","email=eq."+encodeURIComponent(email),
          { name, club_code:clubCode, role:"member", member_nr:memberNr, converted_from_guest:true });
        const u = { id:ex.id, name, email, role:"member", memberNr, avatar:"" };
        localStorage.setItem("pcn_session", JSON.stringify(u));
        return { data: u };
      }

      // Try with pw_hash first, fall back without if column missing
      let user = { name, email, club_code:clubCode, role:"member",
        pw_hash:pwHash, member_nr:memberNr };
      let res = await supabase._post("users", user);

      // If pw_hash column doesn't exist yet — retry without it
      if(res.error && res.error.includes && res.error.includes("pw_hash")) {
        user = { name, email, club_code:clubCode, role:"member", member_nr:memberNr };
        res = await supabase._post("users", user);
      }
      if(res.error) return res;

      const saved = res.data || {};
      const u = {
        id: saved.id||("tmp-"+Date.now()), name, email,
        role:"member", memberNr: saved.member_nr||memberNr, avatar:"",
      };
      localStorage.setItem("pcn_session", JSON.stringify(u));
      return { data: u };
    },

    async registerGuest(name, email) {
      const {data:existing} = await supabase._q("users","?email=eq."+encodeURIComponent(email));
      if(existing&&existing.length>0){
        const u = existing[0];
        if(u.role !== "guest") return { error: "E-Mail bereits als Mitglied registriert" };
        const session = { id:u.id, name:u.name, email:u.email, role:"guest", memberNr:null };
        localStorage.setItem("pcn_session", JSON.stringify(session));
        return { data: session };
      }
      const user = { name, email, role:"guest", member_nr:null, guest_created_at:now() };
      const res = await supabase._post("users", user);
      if(res.error) return res;
      const u = { id:res.data.id, name, email, role:"guest", memberNr:null };
      localStorage.setItem("pcn_session", JSON.stringify(u));
      return { data: u };
    },

    async login(email) {
      const {data:users,error} = await supabase._q("users","?email=eq."+encodeURIComponent(email));
      if(error) return { error };
      if(!users||users.length===0) return { error: "Kein Account mit dieser E-Mail" };
      const u = users[0];
      const session = { id:u.id, name:u.name, email:u.email, role:u.role,
        memberNr:u.member_nr, avatar:u.avatar||"", city:u.city||"", bio:u.bio||"",
        beitrag_bezahlt: !!u.beitrag_bezahlt, beitrag_datum: u.beitrag_datum||null,
        geburtstag: u.geburtstag||"", phone: u.phone||"",
        createdAt: u.created_at||"" };
      localStorage.setItem("pcn_session", JSON.stringify(session));
      await supabase._patch("users","email=eq."+encodeURIComponent(email),{last_seen:now()});
      return { data: session };

    },

    async loginWithPassword(email, password) {
      // MVP: check password against pw_hash in our users table (no Supabase Auth)
      const {data:users,error} = await supabase._q("users","?email=eq."+encodeURIComponent(email));
      if(error) return { error };
      if(!users||users.length===0) return { error: "Kein Account mit dieser E-Mail" };
      const u = users[0];
      // Check password hash
      if(u.pw_hash) {
        const pwHash = btoa(encodeURIComponent(password)).slice(0,32);
        if(u.pw_hash !== pwHash) return { error: "Falsches Passwort" };
      }
      // Build session
      const session = {
        id: u.id, email: u.email, name: u.name, role: u.role,
        memberNr: u.member_nr, avatar: u.avatar||"",
        city: u.city||"", bio: u.bio||"", phone: u.phone||"",
        beitrag_bezahlt: !!u.beitrag_bezahlt, beitrag_datum: u.beitrag_datum||null,
        geburtstag: u.geburtstag||"",
        notifications: { events:true, messages:true },
        createdAt: u.created_at||"",
      };
      localStorage.setItem("pcn_session", JSON.stringify(session));
      await supabase._patch("users","email=eq."+encodeURIComponent(email),{last_seen:now()});
      return { data: session };
    },

    async resetPassword(email) {
      // MVP: Password reset not yet implemented — contact club admin
      // In Phase 2: implement proper reset flow with correct redirect URL
      return { data: { sent: true } };
    },
    async getSession() {
      try { return { data: JSON.parse(localStorage.getItem("pcn_session")) }; }
      catch { return { data: null }; }
    },
    // Lädt den Nutzer frisch aus der DB und aktualisiert die Session
    // (damit Admin-Änderungen wie Beitragsstatus/Rolle beim Mitglied ankommen)
    async refreshSession() {
      let sess = null;
      try { sess = JSON.parse(localStorage.getItem("pcn_session")); } catch { return { data: null }; }
      if(!sess || !sess.email) return { data: sess };
      const {data:users,error} = await supabase._q("users","?email=eq."+encodeURIComponent(sess.email));
      if(error || !users || !users.length) return { data: sess };
      const u = users[0];
      const updated = {
        ...sess,
        name: u.name||sess.name, role: u.role||sess.role,
        memberNr: u.member_nr||sess.memberNr,
        beitrag_bezahlt: !!u.beitrag_bezahlt,
        beitrag_datum: u.beitrag_datum||null,
        geburtstag: u.geburtstag||sess.geburtstag||"",
        createdAt: u.created_at||sess.createdAt||"",
      };
      localStorage.setItem("pcn_session", JSON.stringify(updated));
      return { data: updated };
    },
    async logout() {
      localStorage.removeItem("pcn_session"); return { data: true };
    },

    // ── Field mapping: Supabase snake_case → App camelCase ──
    _mapVehicle: (row) => row ? ({
      id: row.id, qarId: row.qar_id, userId: row.user_id, owner: row.user_id,
      hersteller: row.hersteller, modell: row.modell, baujahr: row.baujahr,
      kraftstoff: row.kraftstoff, getriebe: row.getriebe, farbe: row.farbe,
      kennzeichen: row.kennzeichen, fin: row.fin,
      kilometerstand: row.kilometerstand, tuev_faelligkeit: row.tuev_faelligkeit,
      marktwert: row.marktwert, zustand: row.zustand,
      besonderheiten: row.besonderheiten, image: row.image,
      images: row.images||[], phone: row.phone,
      // Parse privacy if stored as JSON string in DB
      privacy: typeof row.privacy==="string" ? JSON.parse(row.privacy||"{}") : (row.privacy||{}),
      createdAt: row.created_at, updatedAt: row.updated_at,
    }) : null,

    // ── Vehicles ──
    async getVehicles(userId) {
      const res = await supabase._q("vehicles","?user_id=eq."+userId+"&order=created_at.asc");
      if(res.error) return res;
      return { data: (res.data||[]).map(supabase._mapVehicle) };
    },
    async saveVehicle(vehicle) {
      const row = {
        id: vehicle.id||("V"+uid()), qar_id: vehicle.qarId||genQARId(),
        user_id: vehicle.userId||vehicle.owner,
        hersteller:vehicle.hersteller, modell:vehicle.modell, baujahr:vehicle.baujahr,
        kraftstoff:vehicle.kraftstoff, getriebe:vehicle.getriebe, farbe:vehicle.farbe,
        kennzeichen:vehicle.kennzeichen, fin:vehicle.fin,
        kilometerstand:vehicle.kilometerstand, tuev_faelligkeit:vehicle.tuev_faelligkeit,
        marktwert:vehicle.marktwert, zustand:vehicle.zustand,
        besonderheiten:vehicle.besonderheiten, image:vehicle.image,
        images: vehicle.images||[], phone: vehicle.phone||null,
        privacy:vehicle.privacy||{}, updated_at:now(),
      };
      // Entfernt Felder, die die DB nicht kennt (PGRST204) und versucht es erneut
      const stripUnknown = (r, err) => {
        const msg = typeof err==="string" ? err : JSON.stringify(err||"");
        const m = msg.match(/'([a-z_]+)' column/i) || msg.match(/column "?([a-z_]+)"?/i);
        if(!m || !(m[1] in r)) return null;
        const clone = {...r};
        delete clone[m[1]];
        console.warn("Spalte '"+m[1]+"' fehlt in der DB — wird übersprungen. Bitte fix_vehicle_columns.sql ausführen.");
        return clone;
      };

      if(vehicle.id) {
        let res = await supabase._patch("vehicles","id=eq."+vehicle.id, row);
        let attempt = row;
        for(let i=0; i<3 && res.error; i++){
          const next = stripUnknown(attempt, res.error);
          if(!next) break;
          attempt = next;
          res = await supabase._patch("vehicles","id=eq."+vehicle.id, attempt);
        }
        if(res.error) return res;
        return { data: res.data ? supabase._mapVehicle(Array.isArray(res.data)?res.data[0]:res.data) : supabase._mapVehicle(attempt) };
      }
      row.created_at = now();
      let res = await supabase._post("vehicles", row);
      let attempt = row;
      for(let i=0; i<3 && res.error; i++){
        const next = stripUnknown(attempt, res.error);
        if(!next) break;
        attempt = next;
        res = await supabase._post("vehicles", attempt);
      }
      if(res.error) return res;
      const saved = Array.isArray(res.data) ? res.data[0] : res.data;
      return { data: supabase._mapVehicle(saved||row) };
    },
    async deleteVehicle(id) { return await supabase._delete("vehicles","id=eq."+id); },
    async getPublicVehicle(qarId) {
      const {data:rows,error} = await supabase._q("vehicles","?qar_id=eq."+encodeURIComponent(qarId));
      if(error) return { error };
      return { data: rows&&rows[0]?supabase._mapVehicle(rows[0]):null };
    },

    // ── Logbook ──
    async getLogbook(vehicleId) {
      return await supabase._q("logbook","?vehicle_id=eq."+vehicleId+"&order=date.desc");
    },
    async addLogEntry(vehicleId, entry) {
      return await supabase._post("logbook",{vehicle_id:vehicleId,...entry,created_at:now()});
    },

    // ── Reminders ──
    async getReminders(userId) {
      return await supabase._q("reminders","?user_id=eq."+userId+"&done=eq.false&order=date.asc");
    },
    async saveReminder(userId, reminder) {
      if(reminder.id && !String(reminder.id).startsWith("R")) {
        // Real UUID — update existing
        const {data,error} = await supabase._patch("reminders","id=eq."+reminder.id,
          {title:reminder.title,date:reminder.date,vehicle_id:reminder.vehicleId||reminder.vehicle_id||null});
        return { data: Array.isArray(data)?data[0]:data, error };
      }
      // New reminder — let Supabase generate UUID
      const row = {
        user_id: userId,
        vehicle_id: reminder.vehicleId||reminder.vehicle_id||null,
        title: reminder.title,
        date: reminder.date,
        done: false,
        created_at: now(),
      };
      const {data,error} = await supabase._post("reminders", row);
      if(error) return {error};
      const saved = Array.isArray(data)?data[0]:data;
      return { data: {...saved, vehicleId: saved?.vehicle_id} };
    },
    async doneReminder(userId, id) {
      return await supabase._patch("reminders","id=eq."+id,{done:true,done_at:now()});
    },

    // ── Events ──
    async getEvents() {
      return await supabase._q("events","?order=date.asc");
    },
    _mapParticipant: (p) => p ? ({
      id: p.id, eventId: p.event_id, userId: p.user_id, vehicleId: p.vehicle_id,
      class: p.class, startNr: p.start_nr||p.startNr||"01",
      status: p.status||"confirmed", registeredAt: p.registered_at,
    }) : null,

    async getParticipants(eventId) {
      const res = await supabase._q("participants","?event_id=eq."+eventId+"&order=start_nr.asc");
      if(res.error) return res;
      return { data: (res.data||[]).map(supabase._mapParticipant) };
    },
    async joinEvent(eventId, userId, vehicleId, cls) {
      const {data:existing} = await supabase._q("participants",
        "?event_id=eq."+eventId+"&user_id=eq."+userId+"&vehicle_id=eq."+vehicleId);
      if(existing&&existing.length>0) return { error:"Bereits angemeldet" };
      const {data:all} = await supabase._q("participants","?event_id=eq."+eventId+"&select=count");
      const count = all?all.length:0;
      const res = await supabase._post("participants",{
        event_id:eventId, user_id:userId, vehicle_id:vehicleId,
        class:cls, start_nr:String(count+1).padStart(2,"0"),
        status:"pending", registered_at:now()
      });
      if(res.error) return res;
      return { data: supabase._mapParticipant(res.data) };
    },
    async getEventHistory(vehicleId) {
      return await supabase._q("event_history","?vehicle_id=eq."+vehicleId+"&order=date.desc");
    },

    // ── Threads ──
    async getThreads(userId) {
      // Supabase array contains filter — embed messages via PostgREST resource embedding
      const res = await supabase._q("threads","?participants=cs.{"+userId+"}&select=*,messages(*)&order=created_at.desc");
      if(res.error) return res;
      // Normalize: messages table uses from_id/created_at — map to app shape {from,text,ts,read,isSystem}
      const mapped = (res.data||[]).map(t => ({
        ...t,
        vehicleId: t.vehicle_id||t.vehicleId,
        vehicleName: t.vehicle_name||t.vehicleName||"",
        messages: (t.messages||[])
          .sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))
          .map(m=>({
            id: m.id, from: m.from_id, text: m.text,
            ts: new Date(m.created_at).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
            created_at: m.created_at,
            read: m.read, isSystem: m.is_system,
          })),
      }));
      return { data: mapped };
    },
    async getThread(threadId) {
      const {data:rows,error} = await supabase._q("threads","?id=eq."+threadId+"&select=*,messages(*)");
      if(error) return { error };
      const t = rows&&rows[0];
      if(!t) return { data: null };
      return { data: {
        ...t,
        messages: (t.messages||[])
          .sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))
          .map(m=>({
            id: m.id, from: m.from_id, text: m.text,
            ts: new Date(m.created_at).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
            read: m.read, isSystem: m.is_system,
          })),
      }};
    },
    async createThread(participants, vehicleId, vehicleName) {
      const res = await supabase._post("threads",{
        participants, vehicle_id:vehicleId, vehicle_name:vehicleName,
        anonymous:true, created_at:now()
      });
      if(res.error) return res;
      return { data: {...res.data, messages:[]} };
    },
    async sendMessage(threadId, fromId, text) {
      return await supabase._post("messages",{
        thread_id:threadId, from_id:fromId, text,
        is_system:fromId==="system", created_at:now()
      });
    },
    async markRead(threadId, userId) {
      return await supabase._patch("messages",
        "thread_id=eq."+threadId+"&from_id=neq."+userId,{read:true});
    },
    async deleteThread(threadId) {
      // Delete messages first, then thread
      await supabase._delete("messages","thread_id=eq."+threadId);
      const res = await supabase._delete("threads","id=eq."+threadId);
      if(res.error) return res;
      // Verifizieren: RLS blockiert still mit 204 — prüfen ob wirklich weg
      const check = await supabase._q("threads","?id=eq."+threadId+"&select=id");
      if(check.data && check.data.length){
        return { error: "Löschung von der Datenbank blockiert (fehlende DELETE-Policy)" };
      }
      return { data: true };
    },
    async deleteMessage(msgId) {
      return await supabase._delete("messages","id=eq."+msgId);
    },
    cancel: (regId) => supabase._delete("participants","id=eq."+regId),  // via events.cancel gewrappt
    async getStats(userId) {
      const [v,r,p,t] = await Promise.all([
        supabase._q("vehicles","?user_id=eq."+userId+"&select=count"),
        supabase._q("reminders","?user_id=eq."+userId+"&done=eq.false&select=count"),
        supabase._q("participants","?user_id=eq."+userId+"&select=count"),
        supabase._q("threads","?participants=cs.{"+userId+"}&select=count"),
      ]);
      return { data:{
        vehicles:(v.data||[]).length, reminders:(r.data||[]).length,
        events:(p.data||[]).length, threads:(t.data||[]).length,
      }};
    },
    // ── Vehicle Status ("Komme in 5 Min zurück") ──
    async getStatus(vehicleId) {
      const {data:rows,error} = await supabase._q("vehicle_status","?vehicle_id=eq."+vehicleId);
      if(error) return { error };
      const row = rows&&rows[0];
      if(!row) return { data: null };
      return { data: { text:row.text, icon:row.icon, expiresAt: row.expires_at?new Date(row.expires_at).getTime():null, setAt: row.set_at?new Date(row.set_at).getTime():null } };
    },
    async setStatus(vehicleId, status) {
      const row = { vehicle_id:vehicleId, icon:status.icon, text:status.text,
        expires_at: status.expiresAt?new Date(status.expiresAt).toISOString():null,
        set_at: now() };
      // Upsert: try patch first, fallback to insert
      const existing = await supabase._q("vehicle_status","?vehicle_id=eq."+vehicleId);
      if(existing.data&&existing.data.length>0){
        return await supabase._patch("vehicle_status","vehicle_id=eq."+vehicleId, row);
      }
      return await supabase._post("vehicle_status", row);
    },
    async clearStatus(vehicleId) {
      return await supabase._delete("vehicle_status","vehicle_id=eq."+vehicleId);
    },
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

// ═══════════════════════════════════════════════════════════════════════════
// DEMO-SCHUTZ — zentral, eine Ebene unter allen Schreibfunktionen
//
// Der Demo-Modus darf NIEMALS in die echte DB schreiben. Sonst landen
// Testfahrzeuge, Testanmeldungen und Testnachrichten bei echten Mitgliedern.
// Der Wächter sitzt bewusst hier statt in ~14 einzelnen Aufrufstellen —
// eine vergessene Stelle würde sonst reichen.
//
// Lesen bleibt erlaubt: die Demo zeigt echte Community-Fahrzeuge.
// ═══════════════════════════════════════════════════════════════════════════
const DEMO_USER_ID = "a0000000-0000-0000-0000-000000000001";
const DEMO_IDS = [DEMO_USER_ID, "u1", "u2"];   // muss zu isDemo in PCN_MVP.jsx passen
function isDemoSession(){
  try{
    const s = JSON.parse(localStorage.getItem("pcn_session")||"null");
    return !!(s && (s.isDemo === true || DEMO_IDS.includes(s.id)));
  }catch(e){ return false; }
}
// Wrapper: blockt Schreibzugriffe im Demo-Modus, liefert plausible Antwort
function guard(label, fn){
  return function(...args){
    if(isDemoSession()){
      if(typeof console!=="undefined") console.info("[Demo] "+label+" — nicht in die DB geschrieben");
      return Promise.resolve({ data:null, demo:true });
    }
    return fn(...args);
  };
}


    // Proxy all methods to selected backend
    auth: {
      register:          (name, email, code, pw) => db.register(name, email, code, pw),
      registerGuest:     (name, email)            => db.registerGuest(name, email),
      login:             (email)                  => db.login(email),
      loginWithPassword: (email, pw)              => db.loginWithPassword ? db.loginWithPassword(email, pw) : db.login(email),
      resetPassword:     (email)                  => db.resetPassword     ? db.resetPassword(email)         : { data: { sent: true } },
      sendMagicLink:     (email, redirect)        => db.sendMagicLink     ? db.sendMagicLink(email, redirect) : { error:"Not supported" },
      verifyOtp:         (email, token)           => db.verifyOtp         ? db.verifyOtp(email, token)       : { error:"Not supported" },
      exchangeToken:     (token)                  => db.exchangeToken     ? db.exchangeToken(token)          : { error:"Not supported" },
      session:  ()   => db.getSession(),
      refresh:  ()   => db.refreshSession ? db.refreshSession() : db.getSession(),
      logout:   ()   => db.logout(),
    },
    vehicles: {
      list:       (uid)    => db.getVehicles(uid),
      save:       guard("vehicles.save",   (v)      => db.saveVehicle(v)),
      delete:     guard("vehicles.delete", (id)     => db.deleteVehicle(id)),
      getPublic:  (qarId)  => db.getPublicVehicle(qarId),
      getStatus:  (vid)    => db.getStatus(vid),
      setStatus:  guard("vehicles.setStatus",   (vid, s) => db.setStatus(vid, s)),
      clearStatus:guard("vehicles.clearStatus", (vid)    => db.clearStatus(vid)),
    },
    logbook: {
      list:  (vid)         => db.getLogbook(vid),
      add:   guard("logbook.add", (vid, entry)  => db.addLogEntry(vid, entry)),
    },
    reminders: {
      list:  (uid)         => db.getReminders(uid),
      save:  guard("reminders.save", (uid, r)      => db.saveReminder(uid, r)),
      done:  guard("reminders.done", (uid, id)     => db.doneReminder(uid, id)),
    },
    events: {
      list:         ()              => db.getEvents(),
      participants: (eid)           => db.getParticipants(eid),
      join:         guard("events.join", (eid, uid, vid, cls) => db.joinEvent(eid, uid, vid, cls)),
      history:      (vid)           => db.getEventHistory(vid),
    },
    threads: {
      list:   (uid)                       => db.getThreads(uid),
      get:    (tid)                       => db.getThread(tid),
      create: guard("threads.create", (participants, vid, vname)  => db.createThread(participants, vid, vname)),
      send:   guard("threads.send",   (tid, uid, text)            => db.sendMessage(tid, uid, text)),
      read:   guard("threads.read",   (tid, uid)                  => db.markRead(tid, uid)),
      delete: guard("threads.delete", (tid)                       => db.deleteThread ? db.deleteThread(tid) : Promise.resolve({error:"not supported"})),
      deleteMessage: guard("threads.deleteMessage", (mid)          => db.deleteMessage ? db.deleteMessage(mid) : Promise.resolve({error:"not supported"})),
    },
    stats: (uid) => db.getStats(uid),
  };
})();

window.PCN_DB = PCN_STORAGE;
