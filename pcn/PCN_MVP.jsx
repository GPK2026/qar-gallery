// PCN — Porsche Club Nürburgring · Digitale Clubplattform
// MVP: Fahrzeugakte · Events · QR-Code · Logbuch · Erinnerungen
// Locked features visible as milestones

import { useState, useEffect, useRef } from "react";

// ─── Utils ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9).toUpperCase();
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"}) : "–";
const daysUntil = d => Math.ceil((new Date(d)-new Date())/86400000);

// ─── Brand ───────────────────────────────────────────────────────────────────
const LOGO_URL = "https://www.porsche-club-nuerburgring.de/PorscheClubs/pc_nuerburgring/pc_main.nsf/webclubprofile/ClubProfile/$file/clublogo_og.jpg";

const C = {
  black:  "#0a0a0a",
  dark:   "#111111",
  card:   "#1a1a1a",
  border: "#2a2a2a",
  red:    "#e30613",   // Porsche red
  gold:   "#c8a96e",   // Ring gold
  white:  "#f0f0f0",
  muted:  "#666666",
  green:  "#22c55e",
  amber:  "#f59e0b",
};

// ─── Demo Data ────────────────────────────────────────────────────────────────
const CLUB_CODE = "PCN2026";

const DEMO_USER = {
  id:"u1", name:"Max Mustermann", email:"max@pcn.de",
  role:"member", memberSince:"2021-03-15", memberNr:"PCN-0847",
};

const now = new Date();
const d = days => new Date(now.getTime()+days*86400000).toISOString().split("T")[0];

const DEMO_VEHICLES = {
  "V001": {
    id:"V001", qarId:"QAR-R4T8W3NX", owner:"max@pcn.de",
    hersteller:"Porsche", modell:"911 Carrera 4S", baujahr:"2021",
    kraftstoff:"Benzin", getriebe:"PDK", farbe:"GT-Silbermetallic",
    kennzeichen:"AW-PC 911", fin:"WP0ZZZ99ZLS100001",
    kilometerstand:"32400", tuev_faelligkeit:"02/2027",
    marktwert:"138000", zustand:"1",
    besonderheiten:"Sport-Chrono, PASM, Sportabgasanlage",
    image:"https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
  },
  "V002": {
    id:"V002", qarId:"QAR-K9P2M7RW", owner:"max@pcn.de",
    hersteller:"Porsche", modell:"Boxster 718 GTS 4.0", baujahr:"2022",
    kraftstoff:"Benzin", getriebe:"6-Gang manuell", farbe:"Pythongrün",
    kennzeichen:"AW-PC 718", fin:"WP0ZZZ98ZNS200042",
    kilometerstand:"18700", tuev_faelligkeit:"09/2027",
    marktwert:"89000", zustand:"1",
    besonderheiten:"Manuelles Getriebe, PCCB, Sportabgas, Alcantara-Paket",
    image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
  },
};

const DEMO_EVENTS = {
  "E001": {
    id:"E001", name:"PCN TrackDay Nürburgring",
    subtitle:"Nordschleife · Touristenfahrten & Instruktorstunden",
    date:d(12), location:"Nürburgring, Nordschleife",
    category:"Trackday", maxParticipants:40, entryFee:"€ 380 / Fahrzeug",
    description:"Der jährliche PCN TrackDay auf der Nordschleife. Touristenfahrten, optional mit erfahrenem Instruktor. Technische Abnahme vor Ort.",
    classes:["Street","Sport","Race"],
  },
  "E002": {
    id:"E002", name:"After Work Classics",
    subtitle:"Abendausfahrt Grand-Prix-Strecke",
    date:d(22), location:"Grand-Prix-Strecke, Nürburgring",
    category:"Ausfahrt", maxParticipants:60, entryFee:"kostenlos für Mitglieder",
    description:"Entspannte Abendausfahrt auf der Grand-Prix-Strecke. Alle Porsche-Modelle willkommen.",
    classes:["Alle Modelle"],
  },
  "E003": {
    id:"E003", name:"BELMOT Oldtimer-Grand-Prix",
    subtitle:"53. Auflage — als Club besuchen",
    date:d(41), location:"Nürburgring",
    category:"Rennsport", maxParticipants:200, entryFee:"Eintritt ab € 29",
    description:"Gemeinsamer Besuch des 53. BELMOT Oldtimer-Grand-Prix. PCN-Treffpunkt am Historischen Fahrerlager.",
    classes:["Besucher","Aktive Fahrer"],
  },
  "E004": {
    id:"E004", name:"Porsche Club Nürburgring Clubabend",
    subtitle:"CHRSN x PCN im Kesselchen",
    date:d(51), location:"Historisches Fahrerlager, Nürburgring",
    category:"Clubabend", maxParticipants:80, entryFee:"kostenlos",
    description:"Monatlicher Clubabend im Kesselchen. Austausch mit Gleichgesinnten, Neuigkeiten aus dem Club.",
    classes:["Alle Mitglieder"],
  },
};

const DEMO_LOGBOOK = {
  "V001": [
    {id:"L1",date:"2026-04-15",type:"Ölwechsel",km:"31200",notes:"Mobil 1 5W-50, Ölfilter neu",workshop:"Porsche Zentrum Koblenz"},
    {id:"L2",date:"2026-01-10",type:"Inspektion",km:"27800",notes:"Großer Service — Bremsflüssigkeit, Luftfilter, Riemen geprüft",workshop:"Porsche Zentrum Koblenz"},
    {id:"L3",date:"2025-09-03",type:"Reifenwechsel",km:"24100",notes:"Pirelli P Zero auf Sommersatz",workshop:"Eigene Werkstatt"},
  ],
  "V002": [
    {id:"L4",date:"2026-03-20",type:"Inspektion",km:"18200",notes:"Jahresinspektion, alles i.O.",workshop:"Porsche Zentrum Koblenz"},
  ],
};

const DEMO_REMINDERS = [
  {id:"R1",vehicleId:"V001",title:"TÜV/HU Termin vereinbaren",date:d(35),done:false},
  {id:"R2",vehicleId:"V001",title:"PCN TrackDay — Fahrzeug vorbereiten",date:d(10),done:false},
  {id:"R3",vehicleId:"V002",title:"Sommerreifenwechsel",date:d(4),done:false},
];

const DEMO_PARTICIPANTS = {
  "E001": [
    {id:"P1",eventId:"E001",vehicleId:"V001",userId:"u1",class:"Sport",startNr:"07",status:"confirmed"},
  ],
};

// ─── Milestone System ─────────────────────────────────────────────────────────
const MILESTONES = [
  {
    id:"logbook3", label:"3 Logbuch-Einträge",
    check: (state) => Object.values(state.logbook).flat().length >= 3,
    unlocks: ["marktwert"],
  },
  {
    id:"events1", label:"Erste Veranstaltungsteilnahme",
    check: (state) => Object.values(state.participants).flat().filter(p=>p.userId===state.me?.id).length >= 1,
    unlocks: ["history"],
  },
  {
    id:"vehicles2", label:"2 Fahrzeuge erfasst",
    check: (state) => Object.values(state.vehicles).filter(v=>v.owner===state.me?.email).length >= 2,
    unlocks: ["fleet"],
  },
];

const LOCKED_FEATURES = [
  {id:"marktwert", icon:"💶", label:"KI-Marktwertanalyse", milestone:"3 Logbuch-Einträge",
   desc:"Claude analysiert deinen Marktwert anhand der vollständigen Servicehistorie"},
  {id:"history",  icon:"🏆", label:"Renn- & Rundenzeiten",  milestone:"Erste Event-Teilnahme",
   desc:"Rundenzeiten, Sektorzeiten und Nordschleife-Bestzeiten tracken"},
  {id:"fleet",    icon:"🚛", label:"Fuhrpark-Analyse",       milestone:"2 Fahrzeuge",
   desc:"Kosten/km, Wertverlauf und Gesamtübersicht deiner Fahrzeuge"},
  {id:"workshop", icon:"🔧", label:"Werkstatt-Zugang",       milestone:"Club-Partnerschaft aktiv",
   desc:"PCN-Partnerwerk­stätten greifen direkt auf deine Akte zu"},
  {id:"insurer",  icon:"🛡️", label:"Versicherer-Zugang",     milestone:"20 Club-Mitglieder",
   desc:"Allianz Classic und andere Versicherer sehen deine Dokumentation"},
  {id:"token",    icon:"🪙", label:"Digitaler Fahrzeugpass",  milestone:"Beta-Programm",
   desc:"Blockchain-basierter Eigentumsnachweis für Wettbewerbe und Verkauf"},
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PCN() {
  const [screen, setScreen]             = useState("splash");
  const [tab, setTab]                   = useState("dashboard");
  const [me, setMe]                     = useState(null);
  const [vehicles, setVehicles]         = useState({});
  const [logbook, setLogbook]           = useState({});
  const [reminders, setReminders]       = useState([]);
  const [participants, setParticipants] = useState({});
  const [events]                        = useState(DEMO_EVENTS);
  const [viewVehicle, setViewVehicle]   = useState(null);
  const [viewEvent, setViewEvent]       = useState(null);
  const [loginForm, setLoginForm]       = useState({code:"",email:"",name:""});
  const [addLogForm, setAddLogForm]     = useState({type:"Ölwechsel",km:"",notes:"",workshop:""});
  const [toast, setToast]               = useState(null);
  const [addVForm, setAddVForm]         = useState({hersteller:"Porsche",modell:"",baujahr:"",kennzeichen:"",farbe:"",kraftstoff:"Benzin",getriebe:""});
  const [showAddV, setShowAddV]         = useState(false);
  const [showAddLog, setShowAddLog]     = useState(null); // vehicleId
  const [showAddRem, setShowAddRem]     = useState(false);
  const [remForm, setRemForm]           = useState({vehicleId:"",title:"",date:""});

  const toast_ = (msg, type="ok") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3500);
  };

  // Derived
  const myVehicles = Object.values(vehicles).filter(v=>v.owner===me?.email);
  const myReminders = reminders.filter(r=>!r.done).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const myParticipations = Object.values(participants).flat().filter(p=>p.userId===me?.id);
  const appState = {logbook, participants, vehicles, me};
  const unlockedFeatures = new Set(
    MILESTONES.filter(m=>m.check(appState)).flatMap(m=>m.unlocks)
  );

  const loadDemo = () => {
    setMe(DEMO_USER);
    setVehicles(DEMO_VEHICLES);
    setLogbook(DEMO_LOGBOOK);
    setReminders(DEMO_REMINDERS);
    setParticipants(DEMO_PARTICIPANTS);
    setScreen("app");
    setTab("dashboard");
    toast_("Demo geladen — Willkommen, Max! 🏁");
  };

  const joinEvent = (eventId, vehicleId, cls) => {
    if(!vehicleId) return toast_("Bitte Fahrzeug wählen","err");
    const ev = events[eventId];
    const count = (participants[eventId]||[]).length;
    const p = {id:uid(),eventId,vehicleId,userId:me.id,class:cls,startNr:String(count+1).padStart(2,"0"),status:"confirmed"};
    setParticipants(prev=>({...prev,[eventId]:[...(prev[eventId]||[]),p]}));
    toast_(`Angemeldet für ${ev.name} — Startnr. #${p.startNr} ✓`);
  };

  const addLogEntry = (vehicleId) => {
    if(!addLogForm.km) return toast_("Kilometerstand angeben","err");
    const entry = {id:uid(), date:today(), ...addLogForm, vehicleId};
    setLogbook(prev=>({...prev,[vehicleId]:[...(prev[vehicleId]||[]),entry]}));
    setShowAddLog(null);
    setAddLogForm({type:"Ölwechsel",km:"",notes:"",workshop:""});
    toast_("Eintrag gespeichert ✓");
  };

  const addVehicle = () => {
    if(!addVForm.modell||!addVForm.kennzeichen) return toast_("Modell und Kennzeichen angeben","err");
    const v = {id:"V"+uid(), qarId:"QAR-"+uid(), owner:me.email, ...addVForm};
    setVehicles(prev=>({...prev,[v.id]:v}));
    setShowAddV(false);
    setAddVForm({hersteller:"Porsche",modell:"",baujahr:"",kennzeichen:"",farbe:"",kraftstoff:"Benzin",getriebe:""});
    toast_("Fahrzeug hinzugefügt ✓");
  };

  const markDone = (id) => {
    setReminders(prev=>prev.map(r=>r.id===id?{...r,done:true}:r));
    toast_("Erledigt ✓");
  };

  // ── CSS ────────────────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body,#root{height:100%}
    body{background:${C.black};color:${C.white};font-family:'Barlow',sans-serif;-webkit-font-smoothing:antialiased}
    input,select,textarea{font-family:'Barlow',sans-serif;outline:none;color:${C.white}}
    input::placeholder,textarea::placeholder{color:${C.muted}}
    select option{background:#1a1a1a}
    ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:${C.black}} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:99px}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    .pcn-btn{background:${C.red};color:#fff;border:none;border-radius:8px;padding:12px 22px;font-weight:700;font-size:14px;cursor:pointer;font-family:'Barlow',sans-serif;transition:all .15s;width:100%}
    .pcn-btn:hover{background:#c4050f}
    .pcn-btn.ghost{background:transparent;color:${C.white};border:1px solid ${C.border}}
    .pcn-btn.ghost:hover{border-color:${C.red};color:${C.red}}
    .pcn-btn.sm{padding:8px 14px;font-size:12px;width:auto}
    .pcn-input{background:#1a1a1a;border:1px solid ${C.border};border-radius:8px;padding:11px 14px;color:${C.white};font-size:14px;width:100%;font-family:'Barlow',sans-serif;transition:border-color .15s}
    .pcn-input:focus{border-color:${C.red}}
    .pcn-input[type=number]::-webkit-inner-spin-button{display:none}
    .pcn-toast{position:fixed;bottom:24px;right:16px;left:16px;z-index:999;background:#1a1a1a;border:1px solid ${C.border};border-radius:12px;padding:14px 18px;font-size:13px;font-weight:600;animation:slideUp .2s ease;box-shadow:0 8px 32px rgba(0,0,0,.8)}
    .pcn-toast.ok{border-color:${C.red}44;color:${C.white}}
    .pcn-toast.err{border-color:#ef444444;color:#ef4444}
    .tab-bar{position:fixed;bottom:0;left:0;right:0;background:${C.dark};border-top:1px solid ${C.border};display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom)}
    .tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px;border:none;background:transparent;cursor:pointer;gap:3px;font-family:'Barlow',sans-serif;transition:color .15s}
    .tab-btn .t-icon{font-size:20px;line-height:1}
    .tab-btn .t-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .tab-btn.active{color:${C.red}}
    .tab-btn.inactive{color:${C.muted}}
    .card{background:${C.card};border:1px solid ${C.border};border-radius:14px;overflow:hidden}
    .card-pad{padding:16px}
    .section-title{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px}
    .locked-card{background:#111;border:1px solid ${C.border};border-radius:12px;padding:14px;opacity:.6;position:relative}
    .locked-card::after{content:'🔒';position:absolute;top:12px;right:12px;font-size:14px}
    @media(max-width:400px){.pcn-btn{font-size:13px}}
  `;

  // ══════════════════════════════════════════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════════════════════════════════════════

  // ── SPLASH / LOGIN ────────────────────────────────────────────────────────
  if(screen==="splash") return (
    <div style={{minHeight:"100vh",background:C.black,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"0 24px 40px"}}>
      <style>{CSS}</style>
      {toast&&<div className={`pcn-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Top section */}
      <div style={{width:"100%",textAlign:"center",paddingTop:60}}>
        {/* Club logo */}
        <img src={LOGO_URL} alt="Porsche Club Nürburgring" onError={e=>e.target.style.display="none"}
          style={{width:220,maxWidth:"70%",objectFit:"contain",marginBottom:24,filter:"brightness(1.1)"}}/>

        <div style={{width:40,height:2,background:C.red,margin:"0 auto 20px"}}/>

        <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:32,fontWeight:900,color:C.white,lineHeight:1,marginBottom:6}}>
          DIGITALE<br/><span style={{color:C.red}}>CLUBAKTE</span>
        </h1>
        <p style={{fontSize:13,color:C.muted,lineHeight:1.6,marginTop:10}}>
          Fahrzeugdokumentation, Events und QR-Code<br/>für alle PCN-Mitglieder.
        </p>
      </div>

      {/* Login form */}
      <div style={{width:"100%",maxWidth:360,animation:"slideUp .4s ease"}}>
        <div style={{marginBottom:12}}>
          <input className="pcn-input" placeholder="Club-Code (z.B. PCN2026)"
            value={loginForm.code} onChange={e=>setLoginForm(p=>({...p,code:e.target.value}))}
            style={{textTransform:"uppercase",letterSpacing:2,textAlign:"center",fontWeight:700,fontSize:18,marginBottom:10}}/>
          {loginForm.code.toUpperCase()===CLUB_CODE&&(
            <>
              <input className="pcn-input" placeholder="Name" style={{marginBottom:8}}
                value={loginForm.name} onChange={e=>setLoginForm(p=>({...p,name:e.target.value}))}/>
              <input className="pcn-input" placeholder="E-Mail" type="email"
                value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))}/>
            </>
          )}
        </div>
        {loginForm.code.toUpperCase()===CLUB_CODE&&loginForm.name&&loginForm.email?(
          <button className="pcn-btn" onClick={()=>{setMe({id:uid(),name:loginForm.name,email:loginForm.email,role:"member",memberNr:"PCN-"+uid().slice(0,4)});setScreen("app");}}>
            Beitreten →
          </button>
        ):(
          <button className="pcn-btn" onClick={loadDemo} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,fontSize:12}}>
            Demo ansehen
          </button>
        )}

        <p style={{textAlign:"center",fontSize:11,color:C.border,marginTop:16}}>
          Powered by <span style={{color:C.gold}}>QAR.Gallery</span>
        </p>
      </div>
    </div>
  );

  // ── VEHICLE DETAIL ────────────────────────────────────────────────────────
  if(screen==="vehicle"&&viewVehicle) {
    const v = viewVehicle;
    const vLog = logbook[v.id]||[];
    const vRem = reminders.filter(r=>r.vehicleId===v.id&&!r.done);
    const vParts = Object.values(participants).flat().filter(p=>p.vehicleId===v.id);
    const tuev = v.tuev_faelligkeit;
    const tuevParts = tuev?tuev.split("/"):null;
    const tuevDate = tuevParts?new Date(parseInt(tuevParts[1]),parseInt(tuevParts[0])-1,1):null;
    const tuevDays = tuevDate?Math.ceil((tuevDate-new Date())/86400000):null;
    const tuevColor = !tuevDays?C.muted:tuevDays<0?C.red:tuevDays<90?C.amber:C.green;
    const isH = v.baujahr&&(new Date().getFullYear()-parseInt(v.baujahr)>=30);
    const kz = isH?(v.kennzeichen||"").replace(/\s*H\s*$/,"").trim()+" H":(v.kennzeichen||"");

    return (
      <div style={{minHeight:"100vh",background:C.black,paddingBottom:80,animation:"fadeIn .2s ease"}}>
        <style>{CSS}</style>
        {toast&&<div className={`pcn-toast ${toast.type}`}>{toast.msg}</div>}

        {/* Hero image */}
        <div style={{height:240,position:"relative",overflow:"hidden",background:"#111"}}>
          {v.image&&<img src={v.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,#000000ee)"}}/>
          <button onClick={()=>setScreen("app")} style={{position:"absolute",top:16,left:16,background:"rgba(0,0,0,.6)",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.white,cursor:"pointer",fontSize:13,fontWeight:700}}>← Zurück</button>
        </div>

        <div style={{padding:"20px 16px"}}>
          <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.white,lineHeight:1,marginBottom:8}}>
            {v.hersteller} {v.modell}
          </h1>

          {/* Kennzeichen */}
          <div style={{display:"inline-flex",alignItems:"center",background:"#fff",border:"2px solid #222",borderRadius:5,padding:"4px 12px",marginBottom:16}}>
            <span style={{fontSize:15,fontWeight:800,color:"#111",letterSpacing:2,fontFamily:"Arial,sans-serif"}}>{kz}</span>
          </div>

          {/* Status strip */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
            {[
              ["📅",tuev||"–","TÜV",tuevColor],
              ["🛣️",(parseInt(v.kilometerstand)||0).toLocaleString("de-DE")+" km","Stand",C.muted],
              ["⭐",["","Sehr gut","Gut","Befriedigend","Ausreichend","Mangelhaft"][parseInt(v.zustand)]||"–","Zustand",C.gold],
            ].map(([icon,val,label,color])=>(
              <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                <div style={{fontSize:16,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:12,fontWeight:700,color}}>{val}</div>
                <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Logbuch */}
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="section-title" style={{margin:0}}>📋 Service-Logbuch</div>
              <button className="pcn-btn sm ghost" onClick={()=>setShowAddLog(v.id)}>+ Eintrag</button>
            </div>
            {vLog.length===0
              ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px",textAlign:"center",color:C.muted,fontSize:13}}>Noch keine Einträge — erster Eintrag schaltet KI-Marktwert frei</div>
              :vLog.slice().reverse().map(e=>(
                <div key={e.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div style={{fontWeight:700,fontSize:14,color:C.white}}>{e.type}</div>
                    <div style={{fontSize:11,color:C.muted}}>{fmtDate(e.date)}</div>
                  </div>
                  <div style={{fontSize:12,color:C.muted}}>{e.km?parseInt(e.km).toLocaleString("de-DE")+" km":""}{e.workshop?" · "+e.workshop:""}</div>
                  {e.notes&&<div style={{fontSize:12,color:"#888",marginTop:4}}>{e.notes}</div>}
                </div>
              ))
            }
          </div>

          {/* Events */}
          {vParts.length>0&&(
            <div style={{marginBottom:20}}>
              <div className="section-title">🏁 Veranstaltungen</div>
              {vParts.map(p=>{
                const ev=events[p.eventId]; if(!ev) return null;
                return (
                  <div key={p.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8,display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:7,padding:"4px 9px",fontWeight:800,fontSize:15,color:C.red,flexShrink:0}}>#{p.startNr}</div>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:C.white}}>{ev.name}</div>
                      <div style={{fontSize:11,color:C.muted}}>{fmtDate(ev.date)} · {p.class}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* QR */}
          <div className="card card-pad">
            <div className="section-title">📱 Fahrzeug-ID</div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{background:"#fff",borderRadius:8,padding:8,flexShrink:0}}>
                <div style={{width:80,height:80,background:"#0a0a0a",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontFamily:"monospace",textAlign:"center",lineHeight:1.3}}>QR<br/>Code</div>
              </div>
              <div>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>QAR-ID (öffentlich)</div>
                <div style={{fontFamily:"monospace",fontSize:13,color:C.white,fontWeight:700,letterSpacing:1}}>{v.qarId}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:4}}>FIN wird nie im QR-Code angezeigt</div>
              </div>
            </div>
          </div>
        </div>

        {/* Add log modal */}
        {showAddLog===v.id&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:"flex-end"}}
            onClick={e=>{if(e.target===e.currentTarget)setShowAddLog(null);}}>
            <div style={{background:C.dark,borderRadius:"20px 20px 0 0",padding:"24px 20px",width:"100%",border:`1px solid ${C.border}`,animation:"slideUp .2s ease"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:16}}>Logbuch-Eintrag</div>
              <select className="pcn-input" value={addLogForm.type} onChange={e=>setAddLogForm(p=>({...p,type:e.target.value}))} style={{marginBottom:10}}>
                {["Ölwechsel","Inspektion","Reifenwechsel","Bremsenwechsel","Hauptuntersuchung","Trackday","Sonstiges"].map(t=><option key={t}>{t}</option>)}
              </select>
              <input className="pcn-input" type="number" placeholder="Kilometerstand *" style={{marginBottom:10}}
                value={addLogForm.km} onChange={e=>setAddLogForm(p=>({...p,km:e.target.value}))}/>
              <input className="pcn-input" placeholder="Werkstatt" style={{marginBottom:10}}
                value={addLogForm.workshop} onChange={e=>setAddLogForm(p=>({...p,workshop:e.target.value}))}/>
              <input className="pcn-input" placeholder="Notizen" style={{marginBottom:16}}
                value={addLogForm.notes} onChange={e=>setAddLogForm(p=>({...p,notes:e.target.value}))}/>
              <button className="pcn-btn" onClick={()=>addLogEntry(v.id)}>Speichern ✓</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── EVENT DETAIL ──────────────────────────────────────────────────────────
  if(screen==="event"&&viewEvent) {
    const ev = viewEvent;
    const evParts = participants[ev.id]||[];
    const myReg = evParts.find(p=>p.userId===me?.id);
    const [selVehicle, setSelVehicle] = useState(myVehicles[0]?.id||"");
    const [selClass, setSelClass] = useState(ev.classes[0]);

    return (
      <div style={{minHeight:"100vh",background:C.black,paddingBottom:40,animation:"fadeIn .2s ease"}}>
        <style>{CSS}</style>
        {toast&&<div className={`pcn-toast ${toast.type}`}>{toast.msg}</div>}

        {/* Header */}
        <div style={{background:C.dark,borderBottom:`1px solid ${C.border}`,padding:"16px 16px 0"}}>
          <button onClick={()=>setScreen("app")} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0,marginBottom:12}}>← Zurück</button>
          <div style={{display:"inline-block",background:`${C.red}22`,color:C.red,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,marginBottom:6}}>{ev.category}</div>
          <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:C.white,lineHeight:1.1,marginBottom:4}}>{ev.name}</h1>
          <p style={{fontSize:12,color:C.muted,marginBottom:16}}>{ev.subtitle}</p>
        </div>

        <div style={{padding:"16px"}}>
          {/* Info */}
          <div className="card card-pad" style={{marginBottom:16}}>
            {[["📅","Datum",fmtDate(ev.date)],["📍","Ort",ev.location],["💶","Nenngeld",ev.entryFee],["👥","Plätze",`${evParts.length} / ${ev.maxParticipants}`]].map(([icon,label,val])=>(
              <div key={label} style={{display:"flex",gap:10,marginBottom:8,alignItems:"center"}}>
                <span>{icon}</span>
                <span style={{fontSize:12,color:C.muted,minWidth:60}}>{label}</span>
                <span style={{fontSize:13,color:C.white,fontWeight:600}}>{val}</span>
              </div>
            ))}
            <p style={{fontSize:12,color:C.muted,lineHeight:1.6,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>{ev.description}</p>
          </div>

          {/* Registration */}
          {myReg?(
            <div style={{background:`${C.green}11`,border:`1px solid ${C.green}44`,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
              <div style={{color:C.green,fontWeight:700,fontSize:14,marginBottom:4}}>✓ Angemeldet</div>
              <div style={{fontSize:12,color:C.muted}}>Startnummer #{myReg.startNr} · {myReg.class}</div>
            </div>
          ):me&&myVehicles.length>0?(
            <div className="card card-pad">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:800,color:C.white,marginBottom:12}}>Jetzt anmelden</div>
              <select className="pcn-input" value={selVehicle} onChange={e=>setSelVehicle(e.target.value)} style={{marginBottom:10}}>
                {myVehicles.map(v=><option key={v.id} value={v.id}>{v.hersteller} {v.modell} · {v.kennzeichen}</option>)}
              </select>
              <select className="pcn-input" value={selClass} onChange={e=>setSelClass(e.target.value)} style={{marginBottom:14}}>
                {ev.classes.map(c=><option key={c}>{c}</option>)}
              </select>
              <button className="pcn-btn" onClick={()=>joinEvent(ev.id,selVehicle,selClass)}>Anmelden ✓</button>
            </div>
          ):null}

          {/* Participant list */}
          {evParts.length>0&&(
            <div style={{marginTop:16}}>
              <div className="section-title">Teilnehmer ({evParts.length})</div>
              {evParts.map(p=>{
                const v=vehicles[p.vehicleId];
                return (
                  <div key={p.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:7,padding:"4px 8px",fontWeight:800,fontSize:13,color:C.red,flexShrink:0,minWidth:34,textAlign:"center"}}>#{p.startNr}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:C.white}}>{v?`${v.hersteller} ${v.modell}`:"Fahrzeug"}</div>
                      <div style={{fontSize:11,color:C.muted}}>{v?.kennzeichen||""} · {p.class}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN APP ──────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.black,paddingBottom:70}}>
      <style>{CSS}</style>
      {toast&&<div className={`pcn-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div style={{background:C.dark,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <img src={LOGO_URL} alt="PCN" onError={e=>e.target.style.display="none"}
          style={{height:32,objectFit:"contain",filter:"brightness(1.1)"}}/>
        <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
          <div style={{color:C.white,fontWeight:700}}>{me?.name}</div>
          <div>{me?.memberNr}</div>
        </div>
      </div>

      <div style={{padding:"16px 16px 0",maxWidth:600,margin:"0 auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div style={{animation:"fadeIn .2s ease"}}>
            {/* Upcoming event alert */}
            {Object.values(events).filter(e=>daysUntil(e.date)>0&&daysUntil(e.date)<=14).slice(0,1).map(e=>(
              <div key={e.id} style={{background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:12,padding:"12px 14px",marginBottom:16,cursor:"pointer"}}
                onClick={()=>{setViewEvent(e);setScreen("event");}}>
                <div style={{fontSize:10,color:C.red,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>🏁 In {daysUntil(e.date)} Tagen</div>
                <div style={{fontWeight:700,fontSize:14,color:C.white}}>{e.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{fmtDate(e.date)} · {e.location}</div>
              </div>
            ))}

            {/* Reminders */}
            {myReminders.slice(0,3).map(r=>{
              const days=daysUntil(r.date);
              const v=vehicles[r.vehicleId];
              return (
                <div key={r.id} style={{background:C.card,border:`1px solid ${days<=3?C.amber+"44":C.border}`,borderRadius:10,padding:"11px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:days<=3?C.amber:C.white}}>{r.title}</div>
                    <div style={{fontSize:11,color:C.muted}}>{v?`${v.hersteller} ${v.modell}`:""} · {days<=0?"Heute":days===1?"Morgen":`in ${days} T.`}</div>
                  </div>
                  <button onClick={()=>markDone(r.id)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>✓</button>
                </div>
              );
            })}

            {/* Vehicles quick view */}
            <div className="section-title" style={{marginTop:16}}>Meine Fahrzeuge</div>
            {myVehicles.length===0
              ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"24px",textAlign:"center",color:C.muted,cursor:"pointer"}} onClick={()=>setShowAddV(true)}>
                  <div style={{fontSize:32,marginBottom:8}}>🏎️</div>
                  <div style={{fontSize:14,fontWeight:600,color:C.white,marginBottom:4}}>Erstes Fahrzeug hinzufügen</div>
                  <div style={{fontSize:12}}>Tippe um loszulegen</div>
                </div>
              :myVehicles.map(v=>(
                <div key={v.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden",cursor:"pointer"}}
                  onClick={()=>{setViewVehicle(v);setScreen("vehicle");}}>
                  <div style={{height:110,overflow:"hidden"}}>
                    {v.image
                      ?<img src={v.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                      :<div style={{height:"100%",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>🏎️</div>
                    }
                  </div>
                  <div style={{padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:C.white}}>{v.hersteller} {v.modell}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                        <span style={{background:"#fff",border:"1.5px solid #222",borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:800,color:"#111",letterSpacing:1,fontFamily:"Arial,sans-serif"}}>
                          {(new Date().getFullYear()-parseInt(v.baujahr)>=30)?v.kennzeichen+" H":v.kennzeichen}
                        </span>
                        <span style={{fontSize:11,color:C.muted}}>{v.baujahr}</span>
                      </div>
                    </div>
                    <span style={{color:C.muted,fontSize:18}}>›</span>
                  </div>
                </div>
              ))
            }
            {myVehicles.length>0&&(
              <button className="pcn-btn ghost" style={{marginTop:4,width:"100%"}} onClick={()=>setShowAddV(true)}>+ Fahrzeug hinzufügen</button>
            )}

            {/* Locked features */}
            <div className="section-title" style={{marginTop:24}}>Weitere Features freischalten</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {LOCKED_FEATURES.map(f=>(
                <div key={f.id} className={unlockedFeatures.has(f.id)?"card card-pad":"locked-card"}>
                  <div style={{fontSize:20,marginBottom:6}}>{f.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:unlockedFeatures.has(f.id)?C.white:"#555",marginBottom:2}}>{f.label}</div>
                  {!unlockedFeatures.has(f.id)&&<div style={{fontSize:10,color:"#444"}}>🔒 {f.milestone}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EVENTS ── */}
        {tab==="events"&&(
          <div style={{animation:"fadeIn .2s ease"}}>
            <div className="section-title">Veranstaltungen 2026</div>
            {Object.values(events).sort((a,b)=>new Date(a.date)-new Date(b.date)).map(ev=>{
              const days=daysUntil(ev.date);
              const myReg=participants[ev.id]?.find(p=>p.userId===me?.id);
              return (
                <div key={ev.id} style={{background:C.card,border:`1px solid ${myReg?C.red+"44":C.border}`,borderRadius:12,padding:"14px",marginBottom:10,cursor:"pointer"}}
                  onClick={()=>{setViewEvent(ev);setScreen("event");}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontSize:10,color:C.red,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{ev.category}</div>
                    <div style={{fontSize:11,color:days<=7?C.amber:C.muted,fontWeight:600}}>{days<=0?"Heute":days===1?"Morgen":`in ${days} T.`}</div>
                  </div>
                  <div style={{fontWeight:700,fontSize:15,color:C.white,marginBottom:3}}>{ev.name}</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:8}}>{fmtDate(ev.date)} · {ev.location}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:11,color:C.muted}}>{ev.entryFee}</span>
                    {myReg&&<span style={{background:`${C.green}22`,color:C.green,borderRadius:5,padding:"1px 8px",fontSize:10,fontWeight:700}}>✓ Angemeldet #{myReg.startNr}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── REMINDERS ── */}
        {tab==="reminders"&&(
          <div style={{animation:"fadeIn .2s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div className="section-title" style={{margin:0}}>Erinnerungen</div>
              <button className="pcn-btn sm ghost" onClick={()=>setShowAddRem(true)}>+ Neu</button>
            </div>
            {myReminders.length===0
              ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"32px",textAlign:"center",color:C.muted}}>
                  <div style={{fontSize:32,marginBottom:8}}>🎉</div>
                  <div style={{fontSize:14,color:C.white}}>Alles erledigt!</div>
                </div>
              :myReminders.map(r=>{
                  const days=daysUntil(r.date);
                  const v=vehicles[r.vehicleId];
                  const urgent=days<=3;
                  return (
                    <div key={r.id} style={{background:C.card,border:`1px solid ${urgent?C.amber+"55":C.border}`,borderRadius:12,padding:"14px",marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:14,color:urgent?C.amber:C.white,marginBottom:3}}>{r.title}</div>
                          {v&&<div style={{fontSize:11,color:C.muted}}>{v.hersteller} {v.modell}</div>}
                          <div style={{fontSize:11,color:urgent?C.amber:C.muted,marginTop:2}}>
                            {days<0?"Überfällig":days===0?"Heute":days===1?"Morgen":`in ${days} Tagen`} · {fmtDate(r.date)}
                          </div>
                        </div>
                        <button onClick={()=>markDone(r.id)} style={{background:C.red,border:"none",borderRadius:8,padding:"8px 12px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,flexShrink:0,marginLeft:10}}>✓</button>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab==="profile"&&(
          <div style={{animation:"fadeIn .2s ease"}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px",marginBottom:16,textAlign:"center"}}>
              <div style={{width:60,height:60,background:C.red,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px"}}>🏎️</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:C.white}}>{me?.name}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>{me?.memberNr}</div>
            </div>

            <div className="card card-pad" style={{marginBottom:12}}>
              <div className="section-title">Meine Stats</div>
              {[["🚗","Fahrzeuge",myVehicles.length],["📋","Logbuch-Einträge",Object.values(logbook).flat().length],["🏁","Veranstaltungen",myParticipations.length],["🔔","Offene Erinnerungen",myReminders.length]].map(([icon,label,val])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{fontSize:13,color:C.muted}}>{icon} {label}</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.white}}>{val}</div>
                </div>
              ))}
            </div>

            {/* Milestones */}
            <div className="card card-pad" style={{marginBottom:16}}>
              <div className="section-title">Milestones</div>
              {MILESTONES.map(m=>{
                const done=m.check(appState);
                return (
                  <div key={m.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:done?C.green:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:done?"#fff":C.muted,flexShrink:0,fontWeight:700}}>{done?"✓":""}</div>
                    <div>
                      <div style={{fontSize:12,color:done?C.white:C.muted,fontWeight:done?600:400}}>{m.label}</div>
                      {done&&<div style={{fontSize:10,color:C.green}}>Freischaltet: {m.unlocks.join(", ")}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="pcn-btn ghost" onClick={()=>{setMe(null);setVehicles({});setLogbook({});setReminders([]);setParticipants({});setScreen("splash");}}>
              Abmelden
            </button>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddV&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:200,display:"flex",alignItems:"flex-end"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowAddV(false);}}>
          <div style={{background:C.dark,borderRadius:"20px 20px 0 0",padding:"24px 16px",width:"100%",border:`1px solid ${C.border}`,animation:"slideUp .2s ease"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:16}}>Fahrzeug hinzufügen</div>
            {[["Modell *","modell","Cayman GT4","text"],["Kennzeichen *","kennzeichen","AW-PC 718","text"],["Baujahr","baujahr","2023","number"],["Farbe","farbe","Pythongrün","text"]].map(([ph,key,ex,type])=>(
              <input key={key} className="pcn-input" type={type} placeholder={`${ph} (z.B. ${ex})`} style={{marginBottom:8}}
                value={addVForm[key]||""} onChange={e=>setAddVForm(p=>({...p,[key]:e.target.value}))}/>
            ))}
            <button className="pcn-btn" style={{marginTop:8}} onClick={addVehicle}>Hinzufügen ✓</button>
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddRem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:200,display:"flex",alignItems:"flex-end"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowAddRem(false);}}>
          <div style={{background:C.dark,borderRadius:"20px 20px 0 0",padding:"24px 16px",width:"100%",border:`1px solid ${C.border}`,animation:"slideUp .2s ease"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:16}}>Erinnerung</div>
            <input className="pcn-input" placeholder="Titel *" style={{marginBottom:8}}
              value={remForm.title} onChange={e=>setRemForm(p=>({...p,title:e.target.value}))}/>
            <input className="pcn-input" type="date" style={{marginBottom:8}}
              value={remForm.date} onChange={e=>setRemForm(p=>({...p,date:e.target.value}))}/>
            <select className="pcn-input" style={{marginBottom:16}}
              value={remForm.vehicleId} onChange={e=>setRemForm(p=>({...p,vehicleId:e.target.value}))}>
              <option value="">Kein Fahrzeug</option>
              {myVehicles.map(v=><option key={v.id} value={v.id}>{v.hersteller} {v.modell}</option>)}
            </select>
            <button className="pcn-btn" onClick={()=>{
              if(!remForm.title||!remForm.date) return toast_("Titel und Datum angeben","err");
              setReminders(prev=>[...prev,{id:uid(),...remForm,done:false}]);
              setShowAddRem(false); setRemForm({vehicleId:"",title:"",date:""});
              toast_("Erinnerung gespeichert ✓");
            }}>Speichern ✓</button>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar">
        {[["dashboard","🏠","Start"],["events","🏁","Events"],["reminders","🔔","Erinnerungen"],["profile","👤","Profil"]].map(([id,icon,label])=>(
          <button key={id} className={`tab-btn ${tab===id?"active":"inactive"}`} onClick={()=>{setTab(id);setScreen("app");}}>
            <span className="t-icon">{icon}</span>
            <span className="t-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
