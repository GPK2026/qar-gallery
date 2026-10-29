// ═══════════════════════════════════════════════════════════════════════════
// Club-CRM — Reiter "CRM" der Admin-Konsole
//
// Daten (Phasen, Schlagworte, Notizen, Wiedervorlagen, Partner) liegen in
// gesperrten Tabellen und laufen ausschließlich über die Edge Function
// club-crm. Zugang nur mit eigenem Admin-Login (E-Mail + Passwort über
// pcn-secure) — der Konsolen-Code allein reicht hier bewusst nicht.
// Nutzt aus admin.html: SB, KEY, toast, escapeHtml.
// ═══════════════════════════════════════════════════════════════════════════
(function(){
  const FN = SB.replace(/\/rest\/v1$/, "/functions/v1");
  const ST_KEY = "pcn_crm_st", NAME_KEY = "pcn_crm_name";
  const STAGE_LABEL = { kontakt:"Kontakt", gast:"Gast", probe_event:"Probe-Event", mitglied:"Mitglied", inaktiv:"Inaktiv", werkstatt:"Werkstatt" };
  const STAGE_CLASS = { kontakt:"b-amber", gast:"b-amber", probe_event:"b-gold", mitglied:"b-green", inaktiv:"b-gray", werkstatt:"b-gray" };
  const PIPELINE = ["kontakt","gast","probe_event","mitglied","inaktiv"];
  const CAT_LABEL = { werkstatt:"Werkstatt", versicherung:"Versicherung", kanzlei:"Kanzlei", gutachter:"Gutachter", sponsor:"Sponsor", haendler:"Händler", sonstiges:"Sonstiges" };
  const E = s => escapeHtml(s);
  const today = () => new Date().toISOString().slice(0,10);
  const inDays = n => new Date(Date.now()+n*864e5).toISOString().slice(0,10);
  const fmtD = d => d ? new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
  const isUuid = v => /^[0-9a-f-]{36}$/i.test(String(v||""));

  const S = { st: sessionStorage.getItem(ST_KEY), name: sessionStorage.getItem(NAME_KEY), data:null, view:"people",
    q:"", stage:"", tag:"", detail:null, busy:false };

  async function post(fn, body){
    const r = await fetch(`${FN}/${fn}`, { method:"POST", headers:{ "Content-Type":"application/json", apikey:KEY, Authorization:"Bearer "+KEY }, body:JSON.stringify(body) });
    const d = await r.json().catch(()=>({}));
    return { ok:r.ok, status:r.status, data:d };
  }
  async function api(action, body={}){
    const r = await post("club-crm", { action, st:S.st, ...body });
    if(r.status===401 || r.status===403){ logout(r.data.error||"Bitte neu anmelden"); throw new Error("auth"); }
    if(!r.ok) throw new Error(r.data.error || "Fehler");
    return r.data;
  }
  // Eine Sitzung für Konsole und CRM: Abmelden bzw. abgelaufenes Token
  // führt zurück zur Anmeldung der Konsole.
  function logout(msg){
    S.st=null; S.name=null; S.data=null; S.detail=null;
    if(msg) toast(msg,"err");
    if(typeof doLogout==="function") setTimeout(doLogout, msg?1500:0);
    else { try{ sessionStorage.removeItem(ST_KEY); sessionStorage.removeItem(NAME_KEY); }catch{} render(); }
  }
  const el = () => document.getElementById("tab-crm");
  function render(){ const t=el(); if(t && !t.classList.contains("hidden")) rCrm(t); }

  async function load(){
    S.busy=true;
    try{ S.data = await api("overview"); }catch(e){ if(e.message!=="auth") toast(e.message,"err"); }
    S.busy=false; render();
  }

  // ── Login ──
  function loginView(){
    return `<div class="page-title">🤝 CRM</div>
    <div class="card" style="max-width:420px">
      <div class="sec-title">Admin-Anmeldung</div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:12px">Das CRM enthält persönliche Notizen. Bitte mit deinem Admin-Konto der App anmelden.</div>
      <div class="field"><label class="lbl">E-Mail</label><input id="crm-mail" type="email" autocomplete="username"></div>
      <div class="field"><label class="lbl">Passwort</label><input id="crm-pw" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')CRM.login()"></div>
      <button class="btn" style="width:100%" onclick="CRM.login()">Anmelden</button>
    </div>`;
  }
  async function login(){
    const mail=document.getElementById("crm-mail").value.trim(), pw=document.getElementById("crm-pw").value;
    if(!mail||!pw) return toast("E-Mail und Passwort eingeben","err");
    const r = await post("pcn-secure", { action:"login", email:mail, password:pw });
    if(!r.ok) return toast(r.data.error||"Anmeldung fehlgeschlagen","err");
    if(!r.data.user?.is_admin) return toast("Dieses Konto hat keinen Admin-Zugang","err");
    S.st=r.data.st; S.name=r.data.user.name;
    try{ sessionStorage.setItem(ST_KEY,S.st); sessionStorage.setItem(NAME_KEY,S.name||""); }catch{}
    load();
  }

  // ── Bausteine ──
  const stageBadge = s => `<span class="b ${STAGE_CLASS[s]||"b-gray"}">${E(STAGE_LABEL[s]||s)}</span>`;
  const tagBadges = tags => (tags||[]).map(t=>`<span class="b b-gray" style="margin-right:4px">#${E(t)}</span>`).join("");
  const fuBadge = fu => {
    if(!fu) return "";
    const over = fu.dueDate < today(), due = fu.dueDate === today();
    return `<span class="b ${over?"b-red":due?"b-amber":"b-gray"}" title="${E(fu.text)}">⏰ ${fmtD(fu.dueDate)}</span>`;
  };
  const header = () => {
    const d=S.data, open=(d?.followups||[]).filter(f=>f.dueDate<=today()).length;
    const tabBtn=(id,l)=>`<button class="btn btn-sm ${S.view===id?"":"btn-ghost"}" onclick="CRM.view('${id}')">${l}</button>`;
    return `<div class="row" style="justify-content:space-between;margin-bottom:12px">
        <div class="page-title" style="margin:0">🤝 CRM</div>
        <div class="row"><span style="font-size:13px;color:var(--muted)">${E(S.name||"")}</span>
          <button class="btn btn-sm btn-ghost" onclick="CRM.reload()">↺</button>
          <button class="btn btn-sm btn-ghost" onclick="CRM.logout()">Abmelden</button></div>
      </div>
      <div class="row" style="margin-bottom:14px">${tabBtn("people","👥 Personen")}${tabBtn("followups",`⏰ Wiedervorlagen${open?` <span class="b b-red">${open}</span>`:""}`)}${tabBtn("partners","🤝 Partner")}</div>`;
  };

  // ── Personen ──
  function peopleView(){
    const d=S.data, people=d.people||[];
    const counts=Object.fromEntries(PIPELINE.map(s=>[s,people.filter(p=>p.stage===s).length]));
    const allTags=[...new Set(people.flatMap(p=>p.tags||[]))].sort();
    const q=S.q.toLowerCase();
    const list=people.filter(p=>(!S.stage||p.stage===S.stage)&&(!S.tag||(p.tags||[]).includes(S.tag))
      &&(!q||[p.name,p.email,p.city,p.memberNr,...(p.tags||[])].some(x=>String(x||"").toLowerCase().includes(q))));
    const pipe=PIPELINE.map(s=>`<div class="stat" style="flex:1;min-width:110px;${S.stage===s?"border-color:var(--red)":""}" onclick="CRM.stage('${s}')">
        <div class="stat-val">${counts[s]}</div><div class="stat-lbl">${E(STAGE_LABEL[s])}</div></div>`).join("");
    return `<div class="row" style="gap:8px;margin-bottom:12px;flex-wrap:wrap">${pipe}</div>
      <div class="row" style="margin-bottom:12px;flex-wrap:nowrap">
        <input id="crm-q" placeholder="Suche: Name, E-Mail, Ort, #Schlagwort" value="${E(S.q)}" oninput="CRM.search(this.value)" style="flex:2">
        <select onchange="CRM.tag(this.value)" style="flex:1"><option value="">Alle Schlagworte</option>${allTags.map(t=>`<option ${S.tag===t?"selected":""} value="${E(t)}">#${E(t)}</option>`).join("")}</select>
      </div>
      ${S.stage?`<div style="margin-bottom:8px;font-size:13px;color:var(--muted)">Filter: ${stageBadge(S.stage)} <a href="#" onclick="CRM.stage('');return false" style="color:var(--red)">aufheben</a></div>`:""}
      ${list.length?list.map(p=>`<div class="mrow" style="cursor:pointer" onclick="CRM.open('${p.id}')">
          <div class="row" style="justify-content:space-between">
            <div style="font-weight:700">${E(p.name||"—")} ${p.marketingConsent?'<span title="Einwilligung Club-Infos">✉️</span>':""}</div>
            <div class="row">${fuBadge(p.nextFollowup)}${stageBadge(p.stage)}</div>
          </div>
          <div style="font-size:13px;color:var(--muted)">${E([p.email,p.city,p.memberNr].filter(Boolean).join(" · "))}${p.notes?` · 📝 ${p.notes}`:""}</div>
          ${(p.tags||[]).length?`<div style="margin-top:4px">${tagBadges(p.tags)}</div>`:""}
        </div>`).join(""):`<div class="card" style="color:var(--muted)">Keine Treffer.</div>`}`;
  }

  // ── Detail (Person oder Partner) ──
  function notesBlock(kind, id, notes){
    return `<div class="card"><div class="sec-title">📝 Notizen</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Sachlich bleiben — keine Gesundheitsdaten, keine Wertungen. Die Person kann Auskunft und Löschung verlangen.</div>
      <textarea id="crm-note" rows="3" placeholder="z. B. Interessiert an Track-Day im Mai, Rückruf gewünscht"></textarea>
      <button class="btn btn-sm" style="margin-top:6px" onclick="CRM.addNote('${kind}','${id}')">Notiz speichern</button>
      <div style="margin-top:12px">${(notes||[]).map(n=>`<div class="mrow"><div style="white-space:pre-wrap">${E(n.text)}</div>
        <div class="row" style="justify-content:space-between;margin-top:4px"><span style="font-size:12px;color:var(--muted)">${fmtD(n.createdAt)}${n.author?" · "+E(n.author):""}</span>
        <button class="btn btn-sm btn-ghost" onclick="CRM.delNote('${n.id}')">🗑</button></div></div>`).join("")||'<div style="color:var(--muted);font-size:14px">Noch keine Notizen.</div>'}</div></div>`;
  }
  function followupsBlock(kind, id, fus){
    return `<div class="card"><div class="sec-title">⏰ Wiedervorlagen</div>
      <div class="row" style="flex-wrap:nowrap"><input id="crm-fu-date" type="date" value="${inDays(7)}" style="flex:1"><input id="crm-fu-text" placeholder="z. B. Nach Probe-Event anrufen" style="flex:2"></div>
      <button class="btn btn-sm" style="margin-top:6px" onclick="CRM.addFu('${kind}','${id}')">Wiedervorlage anlegen</button>
      <div style="margin-top:12px">${(fus||[]).map(f=>`<div class="mrow" style="${f.doneAt?"opacity:.5":""}"><div class="row" style="justify-content:space-between">
        <div>${f.doneAt?"✓":fuBadge(f)} ${E(f.text)}</div>
        <div class="row"><button class="btn btn-sm btn-ghost" onclick="CRM.doneFu('${f.id}',${!f.doneAt})">${f.doneAt?"↺":"✓ erledigt"}</button>
        <button class="btn btn-sm btn-ghost" onclick="CRM.delFu('${f.id}')">🗑</button></div></div></div>`).join("")||'<div style="color:var(--muted);font-size:14px">Keine Wiedervorlagen.</div>'}</div></div>`;
  }
  function personView(){
    const { person:p, notes, followups, timeline } = S.detail;
    return `<button class="btn btn-sm btn-ghost" style="margin-bottom:12px" onclick="CRM.back()">← Zurück</button>
      <div class="card">
        <div class="row" style="justify-content:space-between"><div class="page-title" style="margin:0">${E(p.name||"—")}</div>${stageBadge(p.stage)}</div>
        <div style="font-size:14px;color:var(--muted);margin:6px 0 12px">
          ${p.email?`<a href="mailto:${E(p.email)}" style="color:var(--white)">${E(p.email)}</a>`:""}${p.phone?` · <a href="tel:${E(p.phone)}" style="color:var(--white)">${E(p.phone)}</a>`:""}
          ${p.memberNr?" · "+E(p.memberNr):""}${p.city?" · "+E(p.city):""}<br>
          🚗 ${p.vehicles} Fahrzeug(e) · 🏁 ${p.events} Event-Anmeldung(en) · Beitrag ${p.feePaid?'<span class="b b-green">bezahlt</span>':'<span class="b b-amber">offen</span>'}
          · ${p.marketingConsent?'<span class="b b-green">✉️ Einwilligung Club-Infos</span>':'<span class="b b-gray">keine Werbe-Einwilligung</span>'}
        </div>
        <div class="g2">
          <div class="field"><label class="lbl">Phase</label><select onchange="CRM.setStage('${p.id}',this.value)">
            <option value="">Automatisch (${E(STAGE_LABEL[p.stageSet?"":p.stage]||"aus Konto")})</option>
            ${Object.keys(STAGE_LABEL).map(s=>`<option value="${s}" ${p.stageSet&&p.stage===s?"selected":""}>${E(STAGE_LABEL[s])}</option>`).join("")}</select></div>
          <div class="field"><label class="lbl">Schlagworte (mit Komma)</label>
            <div class="row" style="flex-wrap:nowrap"><input id="crm-tags" value="${E((p.tags||[]).join(", "))}" placeholder="sponsor, track-day"><button class="btn btn-sm" onclick="CRM.setTags('${p.id}')">✓</button></div></div>
        </div>
      </div>
      ${followupsBlock("user",p.id,followups)}
      ${notesBlock("user",p.id,notes)}
      <div class="card"><div class="sec-title">🕒 Kontaktverlauf</div>
        ${(timeline||[]).map(t=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)"><span>${t.icon}</span><span style="flex:1">${E(t.text)}</span><span style="font-size:12px;color:var(--muted)">${fmtD(t.at)}</span></div>`).join("")||'<div style="color:var(--muted)">Noch keine Einträge.</div>'}
        <div style="font-size:12px;color:var(--muted);margin-top:8px">Nachrichten an die Person findest du im Reiter „Nachrichten“.</div>
      </div>`;
  }
  function partnerForm(p){
    p=p||{};
    return `<div class="g2">
      <div class="field"><label class="lbl">Name *</label><input id="crm-p-name" value="${E(p.name)}"></div>
      <div class="field"><label class="lbl">Kategorie</label><select id="crm-p-cat">${Object.keys(CAT_LABEL).map(c=>`<option value="${c}" ${p.category===c?"selected":""}>${CAT_LABEL[c]}</option>`).join("")}</select></div>
      <div class="field"><label class="lbl">Ansprechpartner</label><input id="crm-p-contact" value="${E(p.contactName)}"></div>
      <div class="field"><label class="lbl">E-Mail</label><input id="crm-p-mail" type="email" value="${E(p.email)}"></div>
      <div class="field"><label class="lbl">Telefon</label><input id="crm-p-phone" value="${E(p.phone)}"></div>
      <div class="field"><label class="lbl">Website</label><input id="crm-p-web" value="${E(p.website)}"></div>
      <div class="field"><label class="lbl">Adresse</label><input id="crm-p-addr" value="${E(p.address)}"></div>
      <div class="field"><label class="lbl">Schlagworte (mit Komma)</label><input id="crm-p-tags" value="${E((p.tags||[]).join(", "))}"></div>
    </div>
    <div class="row"><button class="btn btn-sm" onclick="CRM.savePartner('${p.id||""}')">Speichern</button>
      ${p.id?`<button class="btn btn-sm btn-ghost" onclick="CRM.delPartner('${p.id}')">Partner löschen</button>`:""}</div>`;
  }
  function partnerView(){
    const { partner:p, notes, followups } = S.detail;
    return `<button class="btn btn-sm btn-ghost" style="margin-bottom:12px" onclick="CRM.back()">← Zurück</button>
      <div class="card"><div class="row" style="justify-content:space-between"><div class="page-title" style="margin:0">${E(p.name)}</div><span class="b b-gold">${E(CAT_LABEL[p.category]||p.category)}</span></div>
        <div style="margin-top:12px">${partnerForm(p)}</div></div>
      ${followupsBlock("partner",p.id,followups)}
      ${notesBlock("partner",p.id,notes)}`;
  }
  function partnersView(){
    const ps=S.data.partners||[];
    return `<details class="card" ${ps.length?"":"open"}><summary style="cursor:pointer;font-weight:700">+ Partner anlegen</summary><div style="margin-top:12px">${partnerForm(null)}</div></details>
      ${ps.map(p=>`<div class="mrow" style="cursor:pointer" onclick="CRM.openPartner('${p.id}')">
        <div class="row" style="justify-content:space-between"><div style="font-weight:700">${E(p.name)}</div><div class="row">${fuBadge(p.nextFollowup)}<span class="b b-gold">${E(CAT_LABEL[p.category]||p.category)}</span></div></div>
        <div style="font-size:13px;color:var(--muted)">${E([p.contactName,p.email,p.phone].filter(Boolean).join(" · "))}${p.notes?` · 📝 ${p.notes}`:""}</div>
        ${(p.tags||[]).length?`<div style="margin-top:4px">${tagBadges(p.tags)}</div>`:""}</div>`).join("")||'<div class="card" style="color:var(--muted)">Noch keine Partner — z. B. Werkstätten, Versicherer, Kanzlei, Sponsoren.</div>'}`;
  }
  function followupsView(){
    const fus=S.data.followups||[];
    const groups=[["Überfällig",f=>f.dueDate<today()],["Heute",f=>f.dueDate===today()],["Demnächst",f=>f.dueDate>today()]];
    return groups.map(([l,fn])=>{ const g=fus.filter(fn); return g.length?`<div class="sec-title" style="margin-top:8px">${l} (${g.length})</div>`+g.map(f=>`<div class="mrow"><div class="row" style="justify-content:space-between">
        <div>${fuBadge(f)} <a href="#" style="color:var(--white);font-weight:700" onclick="${f.userId?`CRM.open('${f.userId}')`:`CRM.openPartner('${f.partnerId}')`};return false">${E(f.subjectName||"—")}</a> — ${E(f.text)}</div>
        <button class="btn btn-sm btn-ghost" onclick="CRM.doneFu('${f.id}',true)">✓ erledigt</button></div></div>`).join(""):""; }).join("")
      || '<div class="card" style="color:var(--muted)">Keine offenen Wiedervorlagen. 👍</div>';
  }

  function rCrm(t){
    if(!S.st){ t.innerHTML=loginView(); return; }
    if(!S.data){ t.innerHTML=`<div class="page-title">🤝 CRM</div><div class="card" style="color:var(--muted)">Lädt …</div>`; if(!S.busy) load(); return; }
    const body = S.detail ? (S.detail.person?personView():partnerView())
      : S.view==="followups" ? followupsView() : S.view==="partners" ? partnersView() : peopleView();
    t.innerHTML = header() + body;
  }

  async function act(fn){ try{ await fn(); }catch(e){ if(e.message!=="auth") toast(e.message,"err"); } }
  async function refreshDetail(){
    if(!S.detail) return;
    S.detail = S.detail.person ? await api("person",{userId:S.detail.person.id}) : await api("partner",{partnerId:S.detail.partner.id});
  }
  const tagsOf = v => String(v||"").split(",").map(s=>s.trim()).filter(Boolean);

  window.CRM = {
    render: rCrm, login, logout:()=>logout(), reload:()=>{ S.data=null; S.detail=null; render(); },
    view:v=>{ S.view=v; S.detail=null; render(); },
    stage:s=>{ S.stage=S.stage===s?"":s; render(); },
    tag:t=>{ S.tag=t; render(); },
    search:q=>{ S.q=q; clearTimeout(S._t); S._t=setTimeout(()=>{ render(); const i=document.getElementById("crm-q"); if(i){ i.focus(); i.setSelectionRange(q.length,q.length); } },250); },
    back:()=>{ S.detail=null; act(load); },
    open:id=>isUuid(id)&&act(async()=>{ S.detail=await api("person",{userId:id}); render(); window.scrollTo(0,0); }),
    openPartner:id=>isUuid(id)&&act(async()=>{ S.detail=await api("partner",{partnerId:id}); render(); }),
    setStage:(id,v)=>act(async()=>{ await api("personUpdate",{userId:id,stage:v||null}); await refreshDetail(); render(); toast("Phase gespeichert"); }),
    setTags:id=>act(async()=>{ await api("personUpdate",{userId:id,tags:tagsOf(document.getElementById("crm-tags").value)}); await refreshDetail(); render(); toast("Schlagworte gespeichert"); }),
    addNote:(kind,id)=>act(async()=>{ const text=document.getElementById("crm-note").value; await api("noteAdd",{[kind==="user"?"userId":"partnerId"]:id,text}); await refreshDetail(); render(); toast("Notiz gespeichert"); }),
    delNote:id=>confirm("Notiz löschen?")&&act(async()=>{ await api("noteDelete",{noteId:id}); await refreshDetail(); render(); }),
    addFu:(kind,id)=>act(async()=>{ await api("followupAdd",{[kind==="user"?"userId":"partnerId"]:id,dueDate:document.getElementById("crm-fu-date").value,text:document.getElementById("crm-fu-text").value}); await refreshDetail(); render(); toast("Wiedervorlage angelegt"); }),
    doneFu:(id,done)=>act(async()=>{ await api("followupDone",{followupId:id,done}); if(S.detail) await refreshDetail(); else S.data=await api("overview"); render(); }),
    delFu:id=>confirm("Wiedervorlage löschen?")&&act(async()=>{ await api("followupDelete",{followupId:id}); await refreshDetail(); render(); }),
    savePartner:id=>act(async()=>{
      const v=k=>document.getElementById("crm-p-"+k).value;
      const r=await api("partnerSave",{partner:{id:id||undefined,name:v("name"),category:v("cat"),contactName:v("contact"),email:v("mail"),phone:v("phone"),website:v("web"),address:v("addr"),tags:tagsOf(v("tags"))}});
      toast("Partner gespeichert"); S.data=await api("overview"); S.detail=await api("partner",{partnerId:r.id}); render();
    }),
    delPartner:id=>confirm("Partner samt Notizen und Wiedervorlagen löschen?")&&act(async()=>{ await api("partnerDelete",{partnerId:id}); S.detail=null; S.data=await api("overview"); render(); toast("Partner gelöscht"); }),
  };
})();
