#!/usr/bin/env node
/**
 * Health-Check für die PCN-Plattform
 *
 * Prüft mit echten Schreibvorgängen, ob alle Operationen funktionieren,
 * die die App braucht — und räumt hinterher auf.
 *
 * WICHTIG: Das Repo ist öffentlich, die Logs sind für jeden lesbar.
 * Deshalb werden NIEMALS Inhalte ausgegeben — nur "funktioniert / kaputt".
 * Keine Namen, keine E-Mails, keine Kennzeichen, keine IDs.
 */

const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_KEY;
const H = {
  apikey: SB_KEY,
  Authorization: "Bearer " + SB_KEY,
  "Content-Type": "application/json",
};

let failed = 0, passed = 0;
const results = [];

function ok(label) { passed++; results.push(`✓ ${label}`); }
function bad(label, err) {
  failed++;
  // Fehlercode übersetzen, aber keine Daten ausgeben
  const s = typeof err === "string" ? err : JSON.stringify(err || "");
  let hint = "unbekannter Fehler";
  if (s.includes("PGRST204")) hint = "Spalte fehlt in der DB";
  else if (s.includes("42501") || /policy/i.test(s)) hint = "RLS-Policy blockiert";
  else if (s.includes("42710")) hint = "Policy existiert bereits";
  else if (s.includes("22P02")) hint = "ungültiges Format (UUID?)";
  else if (s.includes("23502")) hint = "Pflichtfeld fehlt";
  else if (s.includes("23503")) hint = "Fremdschlüssel-Verletzung";
  else if (s.includes("23505")) hint = "Datensatz existiert bereits";
  else if (/fetch failed|ENOTFOUND|ECONNREFUSED|network|timeout/i.test(s)) hint = "Datenbank nicht erreichbar (Netzwerk/DNS)";
  else if (s.includes("401") || /JWT|apikey/i.test(s)) hint = "Zugangsdaten falsch — Secrets prüfen";
  else if (s.includes("404")) hint = "Tabelle nicht gefunden";
  else if (s.includes("PGRST")) hint = "PostgREST-Fehler " + (s.match(/PGRST\d+/) || [""])[0];
  else if (s) hint = s.slice(0, 60);   // Rest: Rohtext gekürzt, statt "unbekannt"
  results.push(`✗ ${label} — ${hint}`);
}

async function q(path, opts = {}) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...opts, headers: H });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { error: t || `HTTP ${r.status}` };
    }
    if (r.status === 204) return { data: null };
    return { data: await r.json().catch(() => null) };
  } catch (e) {
    return { error: e.message };
  }
}

(async () => {
  console.log("Health-Check gestartet\n");

  // ── 0. Verbindung überhaupt möglich? ──
  const ping = await q("users?select=id&limit=1");
  const pingErr = String(ping.error || "");
  if (ping.error) {
    // Proxy/Firewall blockiert (kein DB-Problem)
    if (/not in allowlist|egress|proxy/i.test(pingErr)) {
      console.log("✗ Zugriff durch Netzwerk-Proxy blockiert");
      console.log("\n::error::Der Runner darf supabase.co nicht erreichen.");
      process.exit(1);
    }
    if (/fetch failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(pingErr)) {
      console.log("✗ Datenbank nicht erreichbar");
      console.log("\n::error::Keine Verbindung zu Supabase — SUPABASE_URL prüfen.");
      process.exit(1);
    }
    if (/401|JWT|apikey|Invalid API key/i.test(pingErr)) {
      console.log("✗ Zugangsdaten abgelehnt");
      console.log("\n::error::SUPABASE_ANON_KEY falsch oder abgelaufen.");
      process.exit(1);
    }
  }

  // ── 1. Lesen: sind alle Tabellen erreichbar? ──
  for (const t of ["users", "vehicles", "events", "participants", "threads", "messages", "news"]) {
    const r = await q(`${t}?select=id&limit=1`);
    r.error ? bad(`Lesen: ${t}`, r.error) : ok(`Lesen: ${t}`);
  }

  // ── 2. Schreibtest an einem Wegwerf-Datensatz ──
  // Kein echter Nutzer wird angefasst.
  const testId = "HC" + Date.now().toString(36).toUpperCase();
  const testMail = `healthcheck-${Date.now()}@qar.invalid`;

  const uIns = await q("users", {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({
      name: "Health Check", email: testMail, club_code: "PCN2026",
      role: "guest", member_nr: "HC-0000", beitrag_bezahlt: false,
      created_at: new Date().toISOString(),
    }),
  });

  let uid = null;
  if (uIns.error) {
    bad("Mitglied anlegen (users INSERT)", uIns.error);
  } else {
    ok("Mitglied anlegen (users INSERT)");
    uid = Array.isArray(uIns.data) ? uIns.data[0]?.id : uIns.data?.id;
  }

  if (uid) {
    // Profil ändern
    const uUpd = await q(`users?id=eq.${uid}`, {
      method: "PATCH", body: JSON.stringify({ city: "Testort" }),
    });
    uUpd.error ? bad("Profil speichern (users UPDATE)", uUpd.error) : ok("Profil speichern (users UPDATE)");

    // Fahrzeug anlegen
    const vIns = await q("vehicles", {
      method: "POST",
      body: JSON.stringify({
        id: testId, qar_id: "QAR-" + testId.slice(-8).padStart(8, "0"),
        user_id: uid, hersteller: "Healthcheck", modell: "Test",
        images: [], phone: null, privacy: {},
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }),
    });
    vIns.error ? bad("Fahrzeug anlegen (vehicles INSERT)", vIns.error) : ok("Fahrzeug anlegen (vehicles INSERT)");

    if (!vIns.error) {
      // Logbuch
      const lIns = await q("logbook", {
        method: "POST",
        body: JSON.stringify({
          vehicle_id: testId, date: new Date().toISOString().slice(0, 10),
          type: "Healthcheck", km: "1", created_at: new Date().toISOString(),
        }),
      });
      lIns.error ? bad("Logbuch-Eintrag (logbook INSERT)", lIns.error) : ok("Logbuch-Eintrag (logbook INSERT)");
      if (!lIns.error) await q(`logbook?vehicle_id=eq.${testId}`, { method: "DELETE" });

      // Live-Status
      const sIns = await q("vehicle_status", {
        method: "POST",
        body: JSON.stringify({
          vehicle_id: testId, text: "Healthcheck", icon: "🔧",
          expires_at: new Date(Date.now() + 60000).toISOString(),
          set_at: new Date().toISOString(),
        }),
      });
      sIns.error ? bad("Live-Status setzen (vehicle_status)", sIns.error) : ok("Live-Status setzen (vehicle_status)");
      if (!sIns.error) await q(`vehicle_status?vehicle_id=eq.${testId}`, { method: "DELETE" });

      // Löschen + verifizieren (RLS blockiert still mit 204!)
      await q(`vehicles?id=eq.${testId}`, { method: "DELETE" });
      const gone = await q(`vehicles?id=eq.${testId}&select=id`);
      (gone.data && gone.data.length)
        ? bad("Fahrzeug löschen (vehicles DELETE)", "42501 Löschung wirkungslos")
        : ok("Fahrzeug löschen (vehicles DELETE)");
    }

    // Thread + Nachricht
    const tid = `ad000000-0000-4000-8000-${String(uid).replace(/-/g, "").slice(-12)}`;
    const tIns = await q("threads", {
      method: "POST",
      body: JSON.stringify({
        id: tid, participants: [uid, "00000000-0000-0000-0000-000000000000"],
        vehicle_name: "Healthcheck", anonymous: false, created_at: new Date().toISOString(),
      }),
    });
    tIns.error ? bad("Chat anlegen (threads INSERT)", tIns.error) : ok("Chat anlegen (threads INSERT)");

    if (!tIns.error) {
      const mIns = await q("messages", {
        method: "POST",
        body: JSON.stringify({
          thread_id: tid, from_id: "00000000-0000-0000-0000-000000000000",
          text: "Healthcheck", is_system: true, created_at: new Date().toISOString(),
        }),
      });
      mIns.error ? bad("Nachricht senden (messages INSERT)", mIns.error) : ok("Nachricht senden (messages INSERT)");

      // Löschen + verifizieren
      await q(`messages?thread_id=eq.${tid}`, { method: "DELETE" });
      await q(`threads?id=eq.${tid}`, { method: "DELETE" });
      const tGone = await q(`threads?id=eq.${tid}&select=id`);
      (tGone.data && tGone.data.length)
        ? bad("Chat löschen (threads DELETE)", "42501 Löschung wirkungslos")
        : ok("Chat löschen (threads DELETE)");
    }

    // Aufräumen
    await q(`users?id=eq.${uid}`, { method: "DELETE" });
    const uGone = await q(`users?id=eq.${uid}&select=id`);
    if (uGone.data && uGone.data.length) {
      results.push("⚠ Testnutzer konnte nicht gelöscht werden — bitte manuell entfernen");
    }
  }

  // ── 3. Sicherheit: liegt ein service_role-Key im Client? ──
  try {
    const admin = await fetch("https://qar.gallery/pcn/admin.html").then(r => r.text());
    if (/service_role/.test(admin) && /atob\(/.test(admin)) {
      bad("Sicherheit: service_role-Key im Browser", "kritisch");
    } else {
      ok("Sicherheit: kein erhöhter Schlüssel im Client");
    }
  } catch (e) {
    results.push("⚠ admin.html nicht prüfbar");
  }

  // ── 4. Datenbestand (nur Zahlen, keine Inhalte) ──
  const counts = {};
  for (const t of ["users", "vehicles", "events"]) {
    const r = await fetch(`${SB_URL}/rest/v1/${t}?select=id`, {
      headers: { ...H, Prefer: "count=exact", Range: "0-0" },
    });
    counts[t] = (r.headers.get("content-range") || "").split("/")[1] || "?";
  }

  // ── Ausgabe ──
  console.log(results.join("\n"));
  console.log(`\nBestand: ${counts.users} Mitglieder · ${counts.vehicles} Fahrzeuge · ${counts.events} Events`);
  console.log(`\n${passed} von ${passed + failed} Prüfungen bestanden`);

  if (failed) {
    console.log("\n::error::Health-Check fehlgeschlagen — siehe Liste oben");
    process.exit(1);
  }
  console.log("Alles in Ordnung ✓");
})();
