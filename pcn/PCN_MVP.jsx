// PCN — Porsche Club Nürburgring · Digitale Clubplattform v3
// Vollständig neu geschrieben — alle Bugs behoben

import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Error Boundary — catches crashes, shows message instead of black screen ──
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(error){ return {hasError:true,error}; }
  componentDidCatch(error,info){ console.error("[PCN]",error,info); }
  render(){
    if(!this.state.hasError) return this.props.children;
    return (
      <div style={{minHeight:"100vh",background:"#0a0a0a",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"sans-serif"}}>
        <div style={{background:"#191919",border:"1px solid #e3061344",borderRadius:18,padding:"28px 24px",maxWidth:380,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:14}}>⚠️</div>
          <div style={{fontSize:17,fontWeight:800,color:"#fff",marginBottom:8}}>Etwas ist schiefgelaufen</div>
          <div style={{fontSize:12,color:"#999",marginBottom:6,lineHeight:1.6,fontFamily:"monospace",wordBreak:"break-word"}}>{this.state.error?.message||"Unbekannter Fehler"}</div>
          <div style={{fontSize:11,color:"#666",marginBottom:20}}>Deine Daten sind sicher gespeichert.</div>
          <button onClick={()=>window.location.reload()}
            style={{background:"#e30613",color:"#fff",border:"none",borderRadius:10,padding:"12px 28px",fontWeight:800,fontSize:14,cursor:"pointer",width:"100%"}}>
            🔄 Neu laden
          </button>
        </div>
      </div>
    );
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9).toUpperCase();
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"}) : "–";
const fmtTime = () => new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
const daysUntil = d => Math.ceil((new Date(d)-new Date())/86400000);
const QAR_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genQARId = () => { let id="QAR-"; for(let i=0;i<8;i++) id+=QAR_CHARS[Math.floor(Math.random()*QAR_CHARS.length)]; return id; };
const isH = (baujahr) => baujahr && (new Date().getFullYear()-parseInt(baujahr)>=30);
const fmtKz = (kz, baujahr) => isH(baujahr) ? (kz||"").replace(/\s*H\s*$/,"").trim()+" H" : (kz||"");

// ─── Brand ───────────────────────────────────────────────────────────────────
const LOGO_URL = "https://www.porsche-club-nuerburgring.de/PorscheClubs/pc_nuerburgring/pc_main.nsf/webclubprofile/ClubProfile/$file/clublogo_og.jpg";
const C = {
  black:"#0a0a0a", dark:"#111111", card:"#191919", border:"#272727",
  red:"#D5001C",   // Authentic Porsche Guards Red
  gold:"#c8a96e", white:"#f0f0f0", muted:"#666",
  green:"#22c55e", amber:"#f59e0b",
  surface:"#ffffff", // white surface for logo areas
};

// ─── Privacy defaults ─────────────────────────────────────────────────────────
const DEF_PRIVACY = {
  hersteller:true, modell:true, baujahr:true, farbe:true,
  kraftstoff:true, getriebe:true, kennzeichen:true,
  kilometerstand:false, zustand:false, tuev_faelligkeit:false,
  fin:false, marktwert:false, pub_logbook:false, pub_events:true, pub_phone:false,
};

// ─── QR Code (Real, scannable — uses bundled qrcode.js library) ──────────────
// Fully defensive: never throws, always falls back gracefully
function QRCodeCanvas({value, size=140}) {
  const ref = useRef(null);
  const [status, setStatus] = useState(window.QRCodeLib ? "ready" : "loading");

  useEffect(()=>{
    if(window.QRCodeLib){ setStatus("ready"); return; }
    let cancelled = false;
    const s = document.createElement("script");
    s.src = "qrcode_bundle.js";
    s.onload = () => { if(!cancelled) setStatus(window.QRCodeLib ? "ready" : "error"); };
    s.onerror = () => { if(!cancelled) setStatus("error"); };
    document.head.appendChild(s);
    // Fallback timeout — if script never loads, show fallback after 3s
    const timer = setTimeout(()=>{ if(!cancelled && !window.QRCodeLib) setStatus("error"); }, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  },[]);

  useEffect(()=>{
    if(status !== "ready" || !ref.current || !window.QRCodeLib) return;
    try {
      const QR = window.QRCodeLib;
      QR.toCanvas(ref.current, value, {
        width: size, margin: 1, errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#ffffff" },
      }, (err) => { if(err){ console.error("QR render error:", err); setStatus("error"); } });
    } catch(e) {
      console.error("QR exception:", e);
      setStatus("error");
    }
  },[status, value, size]);

  if(status === "loading") return (
    <div style={{width:size,height:size,background:"#fff",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:10,color:"#999",fontFamily:"sans-serif"}}>Lädt…</span>
    </div>
  );

  if(status === "error") return (
    <div style={{width:size,height:size,background:"#fff",borderRadius:4,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:8,gap:4}}>
      <span style={{fontSize:20}}>📱</span>
      <span style={{fontSize:9,color:"#666",fontFamily:"sans-serif",textAlign:"center",wordBreak:"break-all"}}>{value}</span>
    </div>
  );

  return <canvas ref={ref} style={{borderRadius:4,display:"block",width:size,height:size}}/>;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const CLUB_CODE = "PCN2026";

const DEMO_NEWS = [
  { id:"N1", type:"news", icon:"📰", title:"Neue Kooperation: PCN × Porsche Zentrum Koblenz",
    body:"Mitglieder erhalten ab sofort 10% Rabatt auf alle Serviceleistungen beim Porsche Zentrum Koblenz. Einfach die PCN-Mitgliedsnummer angeben.",
    date:"2026-06-28", pinned:true },
  { id:"N2", type:"tip", icon:"🏁", title:"Nordschleife-Tipp: Touristenfahrten im Juli",
    body:"Die Nordschleife ist an folgenden Terminen für Touristenfahrten geöffnet: 5., 12., 19. und 26. Juli. Früh buchen — Plätze sind begrenzt.",
    date:"2026-06-25", eventId:"E001" },
  { id:"N3", type:"welcome", icon:"🎉", title:"Willkommen im PCN",
    body:"Leg deine Fahrzeugakte an und lass andere Mitglieder dein Fahrzeug per QR-Code entdecken. Je mehr du einträgst, desto mehr Funktionen werden freigeschaltet.",
    date:"2026-06-01" },
];
const dPlus = days => new Date(Date.now()+days*86400000).toISOString().split("T")[0];
const dMinus = days => new Date(Date.now()-days*86400000).toISOString().split("T")[0];

const DEMO_USERS = {
  "u1":{id:"u1",name:"Max Mustermann",email:"max@pcn.de",role:"member",memberNr:"PCN-0847"},
  "u2":{id:"u2",name:"Thomas Weber",email:"thomas@pcn.de",role:"member",memberNr:"PCN-0312"},
  "u3":{id:"u3",name:"Anna Fischer",email:"anna@pcn.de",role:"member",memberNr:"PCN-0561"},
};

const DEMO_VEHICLES = {
  "V001":{id:"V001",qarId:"QAR-R4T8W3NX",userId:"u1",owner:"max@pcn.de",
    hersteller:"Porsche",modell:"911 Carrera 4S",baujahr:"2021",
    kraftstoff:"Benzin",getriebe:"PDK",farbe:"GT-Silbermetallic",
    kennzeichen:"AW-PC 911",fin:"WP0ZZZ99ZLS100001",phone:"+49 171 9110911",
    kilometerstand:"32400",tuev_faelligkeit:"02/2027",marktwert:"138000",zustand:"1",
    besonderheiten:"Sport-Chrono, PASM, Sportabgasanlage, PCCB",
    image:"https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
    images:[
      "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=800&q=80",
      "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=800&q=80",
      "https://images.unsplash.com/photo-1611859266238-4b98091d9d9b?w=800&q=80",
    ],
    privacy:{...DEF_PRIVACY, pub_phone:true}},
  "V002":{id:"V002",qarId:"QAR-K9P2M7RW",userId:"u1",owner:"max@pcn.de",
    hersteller:"Porsche",modell:"Boxster 718 GTS 4.0",baujahr:"2022",
    kraftstoff:"Benzin",getriebe:"6-Gang manuell",farbe:"Pythongrün",
    kennzeichen:"AW-PC 718",fin:"WP0ZZZ98ZNS200042",
    kilometerstand:"18700",tuev_faelligkeit:"09/2027",marktwert:"89000",zustand:"1",
    besonderheiten:"Manuelles Getriebe, Alcantara-Paket, Sportabgas",
    image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
    images:[
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
      "https://images.unsplash.com/photo-1547744152-14d985cb937f?w=800&q=80",
    ],
    privacy:{...DEF_PRIVACY}},
  "V003":{id:"V003",qarId:"QAR-T7M3N9PX",userId:"u2",owner:"thomas@pcn.de",
    hersteller:"Porsche",modell:"992 GT3",baujahr:"2022",
    kraftstoff:"Benzin",getriebe:"PDK",farbe:"Riviera Blau",
    kennzeichen:"MYK-PC 992",fin:"WP0AC2A92NS230001",
    kilometerstand:"8200",tuev_faelligkeit:"06/2027",marktwert:"195000",zustand:"1",
    besonderheiten:"Clubsport-Paket, Liftsystem, Carbon-Dach",
    image:"https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
    images:[
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
      "https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=800&q=80",
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800&q=80",
      "https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=800&q=80",
    ],
    privacy:{...DEF_PRIVACY,pub_events:true}},
};

const DEMO_EVENTS = {
  "E001":{id:"E001",name:"PCN TrackDay Nürburgring",subtitle:"Nordschleife · Touristenfahrten",
    date:dPlus(12),location:"Nürburgring, Nordschleife",category:"Trackday",
    maxParticipants:40,entryFee:"€ 380 / Fahrzeug",
    description:"Jährlicher PCN TrackDay auf der Nordschleife. Touristenfahrten, optional mit Instruktor. Technische Abnahme vor Ort.",
    classes:["Street","Sport","Race"]},
  "E002":{id:"E002",name:"After Work Classics",subtitle:"Abendausfahrt Grand-Prix-Strecke",
    date:dPlus(22),location:"Grand-Prix-Strecke, Nürburgring",category:"Ausfahrt",
    maxParticipants:60,entryFee:"kostenlos für Mitglieder",
    description:"Entspannte Abendausfahrt. Alle Porsche-Modelle willkommen.",
    classes:["Alle Modelle"]},
  "E003":{id:"E003",name:"BELMOT Oldtimer-Grand-Prix",subtitle:"53. Auflage — Clubbesuch",
    date:dPlus(41),location:"Nürburgring",category:"Rennsport",
    maxParticipants:200,entryFee:"Eintritt ab € 29",
    description:"Gemeinsamer Besuch des BELMOT Grand Prix. PCN-Treffpunkt am Historischen Fahrerlager.",
    classes:["Besucher","Aktive Fahrer"]},
  "E004":{id:"E004",name:"PCN Clubabend",subtitle:"CHRSN x PCN im Kesselchen",
    date:dPlus(51),location:"Historisches Fahrerlager",category:"Clubabend",
    maxParticipants:80,entryFee:"kostenlos",
    description:"Monatlicher Clubabend im Kesselchen. Austausch und Neuigkeiten.",
    classes:["Alle Mitglieder"]},
};

const DEMO_LOGBOOK = {
  "V001":[
    {id:"L1",vehicleId:"V001",date:dMinus(60),type:"Ölwechsel",km:"31200",notes:"Mobil 1 5W-50",workshop:"Porsche Zentrum Koblenz"},
    {id:"L2",vehicleId:"V001",date:dMinus(120),type:"Inspektion",km:"27800",notes:"Großer Service — Bremsflüssigkeit, Luftfilter",workshop:"Porsche Zentrum Koblenz"},
    {id:"L3",vehicleId:"V001",date:dMinus(200),type:"Reifenwechsel",km:"24100",notes:"Pirelli P Zero Sommer",workshop:"Eigene Werkstatt"},
  ],
  "V002":[
    {id:"L4",vehicleId:"V002",date:dMinus(90),type:"Inspektion",km:"18200",notes:"Jahresinspektion i.O.",workshop:"Porsche Zentrum Koblenz"},
  ],
};

const DEMO_PARTICIPANTS = {
  "E001":[
    {id:"P1",eventId:"E001",vehicleId:"V001",userId:"u1",class:"Sport",startNr:"07",status:"confirmed"},
    {id:"P2",eventId:"E001",vehicleId:"V003",userId:"u2",class:"Race",startNr:"03",status:"confirmed"},
  ],
  "E002":[
    {id:"P3",eventId:"E002",vehicleId:"V002",userId:"u1",class:"Alle Modelle",startNr:"12",status:"confirmed"},
  ],
};

const DEMO_HISTORY = [
  {id:"H1",vehicleId:"V001",eventName:"PCN TrackDay 2025",date:dMinus(280),startNr:"05",class:"Sport",result:"Finisher",note:"Bestzeit 9:43 min Nordschleife"},
  {id:"H2",vehicleId:"V001",eventName:"After Work Classics Sep 2025",date:dMinus(310),startNr:"11",class:"Alle Modelle",result:"Teilnahme",note:""},
  {id:"H3",vehicleId:"V003",eventName:"PCN TrackDay 2025",date:dMinus(280),startNr:"02",class:"Race",result:"Schnellste Zeit",note:"7:58 min — Clubrekord"},
];

const DEMO_THREADS = {
  "T001":{id:"T001",participants:["u1","u2"],vehicleId:"V003",vehicleName:"Porsche 992 GT3",anonymous:true,
    messages:[
      {id:"M0",from:"system",text:"Kontakt über QAR-ID: QAR-T7M3N9PX",ts:"Gestern 18:31",isSystem:true,read:true},
      {id:"M1",from:"u2",text:"Hallo! Welche Reifengröße fährst du hinten beim GT3?",ts:"Gestern 18:32",read:false},
    ]},
};

// ─── Milestones ───────────────────────────────────────────────────────────────
const MILESTONES = [
  {id:"logbook3",label:"3 Logbuch-Einträge",
    check:s=>Object.values(s.logbook).flat().length>=3,unlocks:["marktwert"]},
  {id:"events1",label:"Erste Event-Teilnahme",
    check:s=>Object.values(s.participants).flat().filter(p=>p.userId===s.me?.id).length>=1,unlocks:["history"]},
  {id:"vehicles2",label:"2 Fahrzeuge erfasst",
    check:s=>Object.values(s.vehicles).filter(v=>v.owner===s.me?.email).length>=2,unlocks:["fleet"]},
];

const LOCKED_FEATURES = [
  {id:"marktwert",icon:"💶",label:"KI-Marktwertanalyse",milestone:"3 Logbuch-Einträge",desc:"Claude bewertet deinen Porsche anhand der Servicehistorie"},
  {id:"history",icon:"⏱️",label:"Rundenzeiten",milestone:"Erste Event-Teilnahme",desc:"Nordschleife-Bestzeiten tracken"},
  {id:"fleet",icon:"📊",label:"Fuhrpark-Analyse",milestone:"2 Fahrzeuge",desc:"Kosten/km und Wertverlauf"},
  {id:"workshop",icon:"🔧",label:"Werkstatt-Zugang",milestone:"Partnerschaft aktiv",desc:"PCN-Partnerwerkstätten greifen auf die Akte zu"},
  {id:"insurer",icon:"🛡️",label:"Versicherer-Zugang",milestone:"Club-Partner",desc:"Allianz Classic sieht deine Dokumentation"},
  {id:"token",icon:"🪙",label:"Digitaler Fahrzeugpass",milestone:"Beta-Programm",desc:"Blockchain-Eigentumsnachweis"},
];

// ─── Status Presets ──────────────────────────────────────────────────────────
const STATUS_PRESETS = [
  {icon:"🏁", text:"Komme gleich zurück",  mins:15},
  {icon:"⏱️", text:"Bin in 5 Min zurück",  mins:5},
  {icon:"⏱️", text:"Bin in 10 Min zurück", mins:10},
  {icon:"⏱️", text:"Bin in 15 Min zurück", mins:15},
  {icon:"⏱️", text:"Bin in 30 Min zurück", mins:30},
];

// ─── Sub-components (proper React components — no hooks-in-render) ─────────────

function EventDetail({ev, me, myVehicles, vehicles, participants, onBack, onJoin, onViewVehicle}) {
  const [selV, setSelV] = useState(myVehicles[0]?.id||"");
  const [selC, setSelC] = useState(ev.classes[0]);
  const evParts = participants[ev.id]||[];
  const myReg = evParts.find(p=>p.userId===me?.id);
  const days = daysUntil(ev.date);

  return (
    <div style={{minHeight:"100vh",background:C.black,paddingBottom:40,animation:"fadeIn .2s"}}>
      <div style={{background:C.dark,borderBottom:`1px solid ${C.border}`,padding:"14px 16px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0,marginBottom:10}}>← Events</button>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <span style={{background:`${C.red}22`,color:C.red,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{ev.category}</span>
          <span style={{background:days<=7?`${C.amber}22`:`${C.border}22`,color:days<=7?C.amber:C.muted,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>
            {days<=0?"Heute":days===1?"Morgen":`in ${days} T.`}
          </span>
        </div>
        <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color:C.white,lineHeight:1.1}}>{ev.name}</h1>
        <p style={{fontSize:11,color:C.muted,marginTop:3}}>{ev.subtitle}</p>
      </div>
      <div style={{padding:"16px",maxWidth:520,margin:"0 auto"}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:14}}>
          {[["📅",fmtDate(ev.date),"Datum"],["📍",ev.location,"Ort"],["💶",ev.entryFee,"Nenngeld"],["👥",`${evParts.length} / ${ev.maxParticipants}`,"Plätze"]].map(([icon,val,label])=>(
            <div key={label} style={{display:"flex",gap:10,marginBottom:8,alignItems:"center"}}>
              <span style={{width:20,textAlign:"center"}}>{icon}</span>
              <span style={{fontSize:11,color:C.muted,minWidth:56}}>{label}</span>
              <span style={{fontSize:13,color:C.white,fontWeight:600}}>{val}</span>
            </div>
          ))}
          <p style={{fontSize:12,color:C.muted,lineHeight:1.7,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>{ev.description}</p>
        </div>

        {myReg?(
          <div style={{background:`${C.green}11`,border:`1px solid ${C.green}44`,borderRadius:12,padding:"14px 16px",textAlign:"center",marginBottom:14}}>
            <div style={{color:C.green,fontWeight:700,fontSize:15,marginBottom:3}}>✓ Angemeldet — #{myReg.startNr}</div>
            <div style={{fontSize:12,color:C.muted}}>{myReg.class} · {fmtDate(ev.date)}</div>
          </div>
        ):me&&myVehicles.length>0?(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:14}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:800,color:C.white,marginBottom:12}}>Jetzt anmelden</div>
            <select value={selV} onChange={e=>setSelV(e.target.value)}
              style={{width:"100%",background:"#191919",border:`1px solid ${C.border}`,borderRadius:9,padding:"12px 14px",color:C.white,fontSize:14,fontFamily:"'Barlow',sans-serif",marginBottom:8}}>
              {myVehicles.map(v=><option key={v.id} value={v.id}>{v.hersteller} {v.modell} · {v.kennzeichen}</option>)}
            </select>
            <select value={selC} onChange={e=>setSelC(e.target.value)}
              style={{width:"100%",background:"#191919",border:`1px solid ${C.border}`,borderRadius:9,padding:"12px 14px",color:C.white,fontSize:14,fontFamily:"'Barlow',sans-serif",marginBottom:14}}>
              {ev.classes.map(c=><option key={c}>{c}</option>)}
            </select>
            <button className="btn" onClick={()=>onJoin(ev.id,selV,selC)} style={{width:"100%"}}>Anmelden ✓</button>
          </div>
        ):me?(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:14,textAlign:"center",color:C.muted,fontSize:13}}>
            Zuerst ein Fahrzeug hinzufügen um dich anzumelden.
          </div>
        ):null}

        {evParts.length>0&&(
          <div>
            <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Teilnehmer ({evParts.length})</div>
            {evParts.map(p=>{
              const pv=vehicles[p.vehicleId];
              return (
                <div key={p.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`,cursor:pv?"pointer":"default"}}
                  onClick={()=>pv&&onViewVehicle(pv)}>
                  <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:7,padding:"3px 8px",fontWeight:800,fontSize:13,color:C.red,flexShrink:0}}>#{p.startNr}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {pv?`${pv.hersteller} ${pv.modell}`:"Fahrzeug"}
                    </div>
                    <div style={{fontSize:11,color:C.muted}}>{p.class}{pv?.kennzeichen?" · "+fmtKz(pv.kennzeichen,pv.baujahr):""}</div>
                  </div>
                  {pv&&<span style={{color:C.muted,fontSize:16}}>›</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatScreen({thread, me, allUsers, vehicles, onBack, onSend, onMarkRead, onViewVehicle, onUpgrade}) {
  const [msg, setMsg] = useState("");
  const endRef = useRef(null);
  const rootRef = useRef(null);
  const other = Object.values(allUsers).find(u=>thread.participants.includes(u.id)&&u.id!==me?.id)||{name:"Mitglied"};
  const v = vehicles[thread.vehicleId];
  const isGuest = me?.role === "guest";

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[thread.messages]);
  useEffect(()=>{ if(onMarkRead) onMarkRead(thread.id); },[thread.id]);

  // ── iOS keyboard fix: resize root to visualViewport height ─────────────────
  useEffect(()=>{
    if(!window.visualViewport) return;
    const onResize = () => {
      if(rootRef.current){
        rootRef.current.style.height = window.visualViewport.height + "px";
      }
    };
    window.visualViewport.addEventListener("resize", onResize);
    window.visualViewport.addEventListener("scroll", onResize);
    onResize();
    return ()=>{
      window.visualViewport.removeEventListener("resize", onResize);
      window.visualViewport.removeEventListener("scroll", onResize);
    };
  },[]);

  return (
    <div ref={rootRef} style={{height:"100vh",background:C.black,display:"flex",flexDirection:"column",position:"fixed",inset:0}}>
      <div style={{background:C.dark,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20,padding:0,lineHeight:1}}>←</button>
        <div style={{width:36,height:36,borderRadius:"50%",background:`${C.red}22`,color:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,flexShrink:0}}>
          {thread.anonymous?"🔒":other.name[0]}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:C.white}}>{thread.anonymous?"🔒 Anonym":other.name}</div>
          {v&&<div style={{fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Re: {v.hersteller} {v.modell}</div>}
        </div>
        {v&&<button className="btn sm ghost" onClick={()=>onViewVehicle(v)} style={{fontSize:11,flexShrink:0}}>Akte →</button>}
      </div>

      {isGuest && (
        <div style={{background:`${C.gold}14`,borderBottom:`1px solid ${C.gold}33`,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <span style={{fontSize:16,flexShrink:0}}>👋</span>
          <div style={{flex:1,fontSize:11,color:C.white,lineHeight:1.4}}>
            Du schreibst als <strong>Gast</strong>. Mitglieder bekommen eigene Fahrzeugakte & Event-Zugang.
          </div>
          <button onClick={onUpgrade}
            style={{background:C.gold,border:"none",borderRadius:7,padding:"6px 11px",color:"#0a0a0a",fontWeight:800,fontSize:11,cursor:"pointer",flexShrink:0,fontFamily:"'Barlow',sans-serif"}}>
            Mitglied werden
          </button>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
        {thread.messages.map(m=>{
          if(m.isSystem) return (
            <div key={m.id} style={{textAlign:"center",fontSize:10,color:"#444",margin:"4px 0"}}>— {m.text} —</div>
          );
          const mine = m.from===me?.id;
          return (
            <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"80%",background:mine?C.red:"#1e1e1e",border:mine?"none":`1px solid ${C.border}`,
                borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"10px 14px"}}>
                <div style={{fontSize:14,color:"#fff",lineHeight:1.5}}>{m.text}</div>
                <div style={{fontSize:9,color:mine?"rgba(255,255,255,.5)":C.muted,marginTop:3,textAlign:"right"}}>{m.ts}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"10px 12px",background:C.dark,borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0,paddingBottom:"calc(10px + env(safe-area-inset-bottom,0))"}}>
        <input placeholder="Nachricht…" value={msg} onChange={e=>setMsg(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&msg.trim()){e.preventDefault();onSend(thread.id,msg);setMsg("");}}}
          style={{flex:1,background:"#191919",border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 14px",color:C.white,fontSize:14,fontFamily:"'Barlow',sans-serif"}}/>
        <button className="btn" style={{padding:"10px 18px",flexShrink:0}}
          onClick={()=>{if(msg.trim()){onSend(thread.id,msg);setMsg("");}}} >↑</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PCN() {
  return <ErrorBoundary><PCNInner/></ErrorBoundary>;
}

function PCNInner() {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [screen, setScreen]       = useState("splash");
  const [tab, setTab]             = useState("dashboard");
  const [me, setMe]               = useState(null);
  const [allUsers, setAllUsers]   = useState({...DEMO_USERS});
  const [vehicles, setVehicles]   = useState({});
  const [logbook, setLogbook]     = useState({});
  const [reminders, setReminders] = useState([]);
  const [participants, setParticipants] = useState({});
  const [events, setEvents]       = useState(DEMO_EVENTS);
  const [eventHistory]            = useState(DEMO_HISTORY);
  const [threads, setThreads]     = useState({});
  const [activeThread, setActiveThread] = useState(null);
  const [viewV, setViewV]         = useState(null);
  const [viewEv, setViewEv]       = useState(null);
  const [publicV, setPublicV]     = useState(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({mode:"register",code:"",email:"",name:""});
  const [addVForm, setAddVForm]   = useState({hersteller:"Porsche",modell:"",baujahr:"",kennzeichen:"",farbe:"",kraftstoff:"Benzin",getriebe:"",images:[],phone:""});
  const [addLogForm, setAddLogForm] = useState({type:"Ölwechsel",km:"",notes:"",workshop:""});
  const [remForm, setRemForm]     = useState({vehicleId:"",title:"",date:""});

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [toast, setToast]         = useState(null);
  const [showAddV, setShowAddV]   = useState(false);
  const [showAddLog, setShowAddLog] = useState(null);
  const [showAddRem, setShowAddRem] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(null);
  const [showEditVehicle, setShowEditVehicle] = useState(null); // vehicleId
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newsState, setNewsState] = useState({}); // {id: "read"|"remind"}
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [profileForm, setProfileForm]         = useState({});
  const [showContactAuth, setShowContactAuth] = useState(null); // vehicleId — triggers login/register/guest sheet
  const [contactAuthMode, setContactAuthMode] = useState("guest"); // "guest" | "login" | "register"
  const [contactAuthForm, setContactAuthForm] = useState({name:"",email:"",code:""});
  const [editForm, setEditForm] = useState({});
  const [imgUploading, setImgUploading] = useState(false);
  const [lightbox, setLightbox]       = useState(null); // {images:[], index:0}
  const [vehicleStatus, setVehicleStatus] = useState({}); // {vehicleId: {text, icon, expiresAt}}
  const [showStatusPicker, setShowStatusPicker] = useState(null); // vehicleId
  const [statusCustom, setStatusCustom]   = useState("");
  const [gallerySwipe, setGallerySwipe] = useState({}); // {vehicleId: currentIndex}
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [scannerStatus, setScannerStatus] = useState("idle");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const myVehicles = Object.values(vehicles).filter(v=>v.owner===me?.email||v.userId===me?.id);
  const myReminders = reminders.filter(r=>!r.done).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const myParticipations = Object.values(participants).flat().filter(p=>p.userId===me?.id);
  const myThreads = Object.values(threads).filter(t=>t.participants.includes(me?.id));
  const unreadCount = myThreads.filter(t=>t.messages.some(m=>m.from!==me?.id&&!m.read&&!m.isSystem)).length;
  const appState = {logbook,participants,vehicles,me};
  const unlockedFeatures = new Set(MILESTONES.filter(m=>m.check(appState)).flatMap(m=>m.unlocks));

  // Punkte-Berechnung: Basis-Aktivitäten + Events
  const calcPoints = () => {
    let pts = 0;
    pts += myVehicles.length * 50;             // 50 Punkte pro Fahrzeug
    pts += Object.values(logbook).flat().length * 10; // 10 Punkte pro Logbuch-Eintrag
    pts += myParticipations.length * 100;      // 100 Punkte pro Event-Teilnahme
    pts += myThreads.length * 5;               // 5 Punkte pro Nachricht
    return pts;
  };
  const myPoints = calcPoints();
  const pointsToNext = myPoints < 100 ? 100 : myPoints < 300 ? 300 : myPoints < 500 ? 500 : 1000;
  const pointsProgress = Math.min(100, Math.round((myPoints / pointsToNext) * 100));

  // ── Toast ────────────────────────────────────────────────────────────────────
  // ── Status helpers — now wired to DB layer (works across devices via Supabase) ──
  const setStatus = async (vehicleId, preset, customText="") => {
    const text = customText || preset.text;
    const expiresAt = preset.mins ? Date.now() + preset.mins*60*1000 : null;
    const status = {text, icon:preset.icon||"💬", expiresAt, setAt:Date.now()};
    setVehicleStatus(prev=>({...prev,[vehicleId]:status}));
    const DB = window.PCN_DB;
    if(DB) await DB.vehicles.setStatus(vehicleId, status);
    setShowStatusPicker(null); setStatusCustom("");
    toast_(`Status gesetzt: "${text}"`);
  };

  const clearStatus = async (vehicleId) => {
    setVehicleStatus(prev=>{const n={...prev};delete n[vehicleId];return n;});
    const DB = window.PCN_DB;
    if(DB) await DB.vehicles.clearStatus(vehicleId);
  };

  const getActiveStatus = (vehicleId) => {
    const s = vehicleStatus[vehicleId];
    if(!s) return null;
    if(s.expiresAt && Date.now() > s.expiresAt) { clearStatus(vehicleId); return null; }
    return s;
  };

  // Load status fresh when viewing a vehicle (public or detail) — ensures cross-device sync
  const loadStatusFor = async (vehicleId) => {
    const DB = window.PCN_DB;
    if(!DB) return;
    const {data} = await DB.vehicles.getStatus(vehicleId);
    if(data) setVehicleStatus(prev=>({...prev,[vehicleId]:data}));
    else setVehicleStatus(prev=>{const n={...prev};delete n[vehicleId];return n;});
  };

  const toast_ = useCallback((msg,type="ok")=>{
    setToast({msg,type}); setTimeout(()=>setToast(null),3500);
  },[]);

  // ── Gallery helpers ──────────────────────────────────────────────────────────
  const getImages = (v) => {
    // Support both single image and images array
    const imgs = v.images || (v.image ? [v.image] : []);
    return imgs.filter(Boolean);
  };

  const addImageToVehicle = async (vehicleId, dataUrl) => {
    const v = vehicles[vehicleId]; if(!v) return;
    const images = getImages(v);
    const updated = {...v, images:[...images, dataUrl], image:images[0]||dataUrl};
    setVehicles(prev=>({...prev,[vehicleId]:updated}));
    if(viewV?.id===vehicleId) setViewV(updated);
    const DB=window.PCN_DB; await DB.vehicles.save(updated);
  };

  const removeImageFromVehicle = async (vehicleId, index) => {
    const v = vehicles[vehicleId]; if(!v) return;
    const images = getImages(v).filter((_,i)=>i!==index);
    const updated = {...v, images, image:images[0]||""};
    setVehicles(prev=>({...prev,[vehicleId]:updated}));
    if(viewV?.id===vehicleId) setViewV(updated);
    const DB=window.PCN_DB; await DB.vehicles.save(updated);
  };

  // ── Image upload ─────────────────────────────────────────────────────────────
  const handleImageUpload = (file, onDone) => {
    if(!file) return;
    setImgUploading(true);
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX=600, scale=Math.min(1,MAX/img.width,MAX/img.height);
        const canvas=document.createElement("canvas");
        canvas.width=Math.round(img.width*scale);
        canvas.height=Math.round(img.height*scale);
        const ctx=canvas.getContext("2d");
        ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="high";
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const dataUrl=canvas.toDataURL("image/jpeg",0.72);
        onDone(dataUrl); setImgUploading(false);
        toast_(`Bild geladen ✓ (${Math.round(dataUrl.length*.75/1024)} KB)`);
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ── DB refresh ───────────────────────────────────────────────────────────────
  const refreshAll = async (user) => {
    if(!user) return;
    const DB=window.PCN_DB; if(!DB) return;
    const [vRes,remRes,evRes,thRes] = await Promise.all([
      DB.vehicles.list(user.id||user.email),
      DB.reminders.list(user.id),
      DB.events.list(),
      DB.threads.list(user.id),
    ]);
    const vMap={}; (vRes.data||[]).forEach(v=>vMap[v.id]=v); setVehicles(vMap);
    const lMap={};
    await Promise.all((vRes.data||[]).map(async v=>{
      const r=await DB.logbook.list(v.id); lMap[v.id]=r.data||[];
    }));
    setLogbook(lMap);
    setReminders(remRes.data||[]);
    // Merge saved events with demo events
    const savedEvs=evRes.data||[];
    if(savedEvs.length>0){
      const evMap={...DEMO_EVENTS};
      savedEvs.forEach(e=>evMap[e.id]=e);
      setEvents(evMap);
    }
    const pMap={};
    await Promise.all(Object.keys(events).map(async eid=>{
      const r=await DB.events.participants(eid); pMap[eid]=r.data||[];
    }));
    setParticipants(pMap);
    const tMap={}; (thRes.data||[]).forEach(t=>tMap[t.id]=t); setThreads(tMap);
    // Load each vehicle's live status from DB
    const sMap={};
    await Promise.all((vRes.data||[]).map(async v=>{
      const r=await DB.vehicles.getStatus(v.id);
      if(r.data) sMap[v.id]=r.data;
    }));
    setVehicleStatus(sMap);
    setMe(user);
  };

  // ── Session restore ───────────────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      const params=new URLSearchParams(window.location.search);
      const qarId=params.get("v");
      if(qarId&&/^QAR-[A-Z2-9]{8}$/.test(qarId)){
        const DB=window.PCN_DB;
        // First check demo data (works offline / before DB configured)
        let v=Object.values(DEMO_VEHICLES).find(v=>v.qarId===qarId);
        // Then check real database — this is the real QR scan path for user-created vehicles
        if(!v&&DB){
          const {data:realV}=await DB.vehicles.getPublic(qarId);
          if(realV) v=realV;
        }
        if(v){
          setPublicV({...v,privacy:{...DEF_PRIVACY,...(v.privacy||{})}});
          setScreen("public");
          if(DB) loadStatusFor(v.id);
          return;
        } else {
          toast_("Fahrzeug nicht gefunden: "+qarId,"err");
        }
      }
      const DB=window.PCN_DB; if(!DB) return;
      const {data:session}=await DB.auth.session();
      if(session){ await refreshAll(session); setScreen("app"); }
    })();
  },[]);

  // ── Live message polling — checks for new messages every 5s while logged in ──
  // (No real-time websockets in this MVP, so we poll. Cheap on Supabase free tier.)
  useEffect(()=>{
    if(!me) return;
    const DB = window.PCN_DB;
    if(!DB) return;
    const poll = async () => {
      const {data:liveThreads} = await DB.threads.list(me.id);
      if(!liveThreads) return;
      setThreads(prev=>{
        const next = {...prev};
        liveThreads.forEach(t => { next[t.id] = t; });
        return next;
      });
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  },[me?.id]);

  // ── Scanner ──────────────────────────────────────────────────────────────────
  const openScanner = () => { setScannerOpen(true); setScannerError(null); setScannerStatus("loading"); };
  const closeScanner = () => {
    setScannerOpen(false); setScannerStatus("idle"); setScannerError(null);
    if(videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop());
  };
  const handleScanResult = async (data) => {
    const match=data.match(/QAR-[A-Z2-9]{8}/);
    if(!match) return;
    const qarId=match[0];
    let v=Object.values(vehicles).find(v=>v.qarId===qarId)||Object.values(DEMO_VEHICLES).find(v=>v.qarId===qarId);
    // Also check real DB in case the scanned vehicle isn't in local state (e.g. someone else's car)
    if(!v){
      const DB=window.PCN_DB;
      if(DB){ const {data:realV}=await DB.vehicles.getPublic(qarId); if(realV) v=realV; }
    }
    setScannerStatus("found");
    setTimeout(async()=>{
      closeScanner();
      if(v){
        setPublicV({...v,privacy:{...DEF_PRIVACY,...(v.privacy||{})}});
        setScreen("public");
        await loadStatusFor(v.id);
      }
      else toast_("Fahrzeug nicht gefunden: "+qarId,"err");
    },600);
  };
  useEffect(()=>{
    if(!scannerOpen||scannerStatus!=="loading") return;
    const loadjsQR=()=>new Promise((res,rej)=>{
      if(window.jsQR){res();return;}
      const s=document.createElement("script"); s.src="jsQR.js";
      s.onload=()=>window.jsQR?res():rej(new Error("jsQR nicht geladen"));
      s.onerror=()=>rej(new Error("jsQR nicht gefunden")); document.head.appendChild(s);
    });
    loadjsQR().then(()=>{
      setScannerStatus("scanning");
      navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})
        .then(stream=>{
          const video=videoRef.current; if(!video) return;
          video.srcObject=stream; video.setAttribute("playsinline",true); video.play();
          const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
          let last=""; let lastT=0; let running=true;
          const scan=()=>{
            if(!running||!scannerOpen) return;
            if(video.readyState===video.HAVE_ENOUGH_DATA){
              canvas.width=video.videoWidth; canvas.height=video.videoHeight;
              ctx.drawImage(video,0,0);
              const img=ctx.getImageData(0,0,canvas.width,canvas.height);
              const code=window.jsQR(img.data,img.width,img.height,{inversionAttempts:"dontInvert"});
              if(code&&(code.data!==last||Date.now()-lastT>3000)){
                last=code.data; lastT=Date.now(); handleScanResult(code.data);
              }
            }
            requestAnimationFrame(scan);
          };
          requestAnimationFrame(scan);
          return ()=>{ running=false; stream.getTracks().forEach(t=>t.stop()); };
        })
        .catch(e=>{ setScannerError(e.name==="NotAllowedError"?"Kamera-Zugriff verweigert.\n\nEinstellungen → Safari → Kamera → Erlauben":"Kamera-Fehler: "+e.message); setScannerStatus("error"); });
    }).catch(e=>{ setScannerError(e.message); setScannerStatus("error"); });
    return ()=>{ if(videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop()); };
  },[scannerOpen,scannerStatus]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const addVehicle = async () => {
    if(!addVForm.modell||!addVForm.kennzeichen) return toast_("Modell und Kennzeichen angeben","err");
    const DB=window.PCN_DB;
    const v={qarId:genQARId(),userId:me.id,owner:me.email,...addVForm,images:addVForm.images||[],image:(addVForm.images||[])[0]||"",privacy:{...DEF_PRIVACY}};
    const {data:saved,error}=await DB.vehicles.save(v);
    if(error){toast_("Fehler: "+error,"err");return;}
    setVehicles(prev=>({...prev,[saved.id]:saved}));
setShowAddV(false); setAddVForm({hersteller:"Porsche",modell:"",baujahr:"",kennzeichen:"",farbe:"",kraftstoff:"Benzin",getriebe:"",images:[]});
    toast_("Fahrzeug hinzugefügt ✓");
  };

  const addLogEntry = async (vehicleId) => {
    if(!addLogForm.km) return toast_("Kilometerstand angeben","err");
    const DB=window.PCN_DB;
    const {data:e,error}=await DB.logbook.add(vehicleId,{date:today(),...addLogForm});
    if(error){toast_("Fehler","err");return;}
    setLogbook(prev=>({...prev,[vehicleId]:[e,...(prev[vehicleId]||[])]}));
    setShowAddLog(null); setAddLogForm({type:"Ölwechsel",km:"",notes:"",workshop:""});
    toast_("Eintrag gespeichert ✓");
  };

  const joinEvent = async (eventId,vehicleId,cls) => {
    if(!vehicleId) return toast_("Fahrzeug wählen","err");
    const DB=window.PCN_DB;
    const {data:p,error}=await DB.events.join(eventId,me.id,vehicleId,cls);
    if(error){toast_("Fehler: "+error,"err");return;}
    setParticipants(prev=>({...prev,[eventId]:[...(prev[eventId]||[]),p]}));
    setScreen("app"); setTab("events");
    toast_(`Angemeldet — Startnr. #${p.startNr} ✓`);
  };

  const openEditProfile = () => {
    setProfileForm({
      name: me?.name||"",
      phone: me?.phone||"",
      city: me?.city||"",
      bio: me?.bio||"",
      notifications_events: me?.notifications?.events!==false,
      notifications_messages: me?.notifications?.messages!==false,
    });
    setShowEditProfile(true);
  };

  const saveProfile = async () => {
    if(!profileForm.name.trim()){ toast_("Name darf nicht leer sein","err"); return; }
    const updated = {
      ...me,
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
      city: profileForm.city.trim(),
      bio: profileForm.bio.trim(),
      notifications: {
        events: profileForm.notifications_events,
        messages: profileForm.notifications_messages,
      },
    };
    setMe(updated);
    // Persist session locally (always)
    localStorage.setItem("pcn_session", JSON.stringify(updated));
    // Patch in Supabase if active
    const DB = window.PCN_DB;
    if(DB && me?.id){
      try {
        const cfg = (window.PCN_CONFIG||{});
        await fetch(
          `${cfg.supabaseUrl}/rest/v1/users?id=eq.${me.id}`,
          { method:"PATCH",
            headers:{
              "apikey": cfg.supabaseKey,
              "Authorization": "Bearer " + cfg.supabaseKey,
              "Content-Type":"application/json",
              "Prefer":"return=minimal",
            },
            body: JSON.stringify({ name: updated.name }),
          }
        );
      } catch(e){ console.warn("Supabase patch skipped:", e); }
    }
    setShowEditProfile(false);
    toast_("Profil gespeichert ✓");
  };

  const openEditVehicle = (v) => {
    setEditForm({
      hersteller:v.hersteller||"", modell:v.modell||"", baujahr:v.baujahr||"",
      kennzeichen:v.kennzeichen||"", farbe:v.farbe||"", kraftstoff:v.kraftstoff||"Benzin",
      getriebe:v.getriebe||"PDK", kilometerstand:v.kilometerstand||"",
      tuev_faelligkeit:v.tuev_faelligkeit||"", zustand:v.zustand||"",
      besonderheiten:v.besonderheiten||"", phone:v.phone||"",
    });
    setShowEditVehicle(v.id);
  };

  const saveVehicleEdit = async () => {
    const v = vehicles[showEditVehicle]; if(!v) return;
    if(!editForm.modell || !editForm.kennzeichen) { toast_("Modell und Kennzeichen angeben","err"); return; }
    const updated = {...v, ...editForm};
    setVehicles(prev=>({...prev,[v.id]:updated}));
    if(viewV?.id===v.id) setViewV(updated);
    const DB = window.PCN_DB;
    if(DB) await DB.vehicles.save(updated);
    setShowEditVehicle(null);
    toast_("Fahrzeugdaten gespeichert ✓");
  };

  const togglePrivacy = async (vehicleId,key) => {
    const v=vehicles[vehicleId];
    const updated={...v,privacy:{...(v.privacy||DEF_PRIVACY),[key]:!v.privacy?.[key]}};
    setVehicles(prev=>({...prev,[vehicleId]:updated}));
    if(viewV?.id===vehicleId) setViewV(updated);
    const DB=window.PCN_DB; await DB.vehicles.save(updated);
  };

  const updateVehicleImage = async (vehicleId,dataUrl) => {
    const v=vehicles[vehicleId]; if(!v) return;
    const updated={...v,image:dataUrl};
    setVehicles(prev=>({...prev,[vehicleId]:updated}));
    if(viewV?.id===vehicleId) setViewV(updated);
    const DB=window.PCN_DB; await DB.vehicles.save(updated);
  };

  const sendMsg = async (threadId,text) => {
    if(!text.trim()) return;
    const DB=window.PCN_DB;
    const {data:msg,error}=await DB.threads.send(threadId,me.id,text.trim());
    if(error){toast_("Fehler","err");return;}
    setThreads(prev=>({...prev,[threadId]:{...prev[threadId],messages:[...(prev[threadId].messages||[]),msg]}}));
  };

  const startContact = async (vehicleId, asUser) => {
    // asUser: pass fresh user object directly to avoid stale React state closure (e.g. after guest login)
    const currentMe = asUser || me;
    if(!currentMe){ toast_("Bitte zuerst anmelden","err"); return; }
    const DB=window.PCN_DB;
    // Always fetch the authoritative vehicle record from the DB first —
    // local `vehicles` state is empty for guests, and DEMO_VEHICLES is stale/static.
    let v = vehicles[vehicleId];
    if(!v && DB){
      const qarGuess = Object.values(DEMO_VEHICLES).find(dv=>dv.id===vehicleId)?.qarId;
      if(qarGuess){
        const {data:realV} = await DB.vehicles.getPublic(qarGuess);
        if(realV) v = realV;
      }
    }
    if(!v) v = DEMO_VEHICLES[vehicleId]; // last-resort fallback for pure offline demo
    if(!v){ toast_("Fahrzeug nicht gefunden","err"); return; }
    if(v.owner===currentMe.email || v.userId===currentMe.id){ toast_("Das ist dein eigenes Fahrzeug","err"); return; }

    const ownerId = v.userId || v.owner;
    if(!ownerId){ toast_("Besitzer nicht gefunden","err"); return; }
    if(!allUsers[ownerId]){
      setAllUsers(prev=>({...prev,[ownerId]:{id:ownerId,name:"PCN-Mitglied",email:v.owner,role:"member"}}));
    }
    // Check for existing thread (re-check from DB in case state is stale)
    const {data:myThreadsLive} = DB ? await DB.threads.list(currentMe.id) : {data:[]};
    const existing = (myThreadsLive||Object.values(threads)).find(t=>t.vehicleId===vehicleId&&t.participants.includes(currentMe.id));
    if(existing){
      setThreads(prev=>({...prev,[existing.id]:existing}));
      setActiveThread(existing.id); setScreen("chat"); return;
    }
    const {data:t,error}=await DB.threads.create([currentMe.id,ownerId],vehicleId,`${v.hersteller} ${v.modell}`);
    if(error){toast_("Fehler: "+error,"err");return;}
    await DB.threads.send(t.id,"system",`Kontakt über QAR-ID: ${v.qarId}`);
    const newThread={...t,messages:[{id:uid(),from:"system",text:`Kontakt über QAR-ID: ${v.qarId}`,ts:fmtTime(),isSystem:true,read:true}]};
    setThreads(prev=>({...prev,[t.id]:newThread}));
    setActiveThread(t.id); setScreen("chat");
    toast_("Anonyme Nachricht gestartet 🔒");
  };

  // ── Triggered from the public-view "Nachricht senden" sheet ──
  // Logs in / registers / creates guest, then immediately opens the chat
  const handleContactAuth = async () => {
    const DB = window.PCN_DB;
    const { name, email, code } = contactAuthForm;
    if(!email) { toast_("E-Mail angeben","err"); return; }
    let result;
    if(contactAuthMode === "guest"){
      if(!name) { toast_("Name angeben","err"); return; }
      result = await DB.auth.registerGuest(name, email);
    } else if(contactAuthMode === "register"){
      if(!name) { toast_("Name angeben","err"); return; }
      if(code.toUpperCase() !== CLUB_CODE) { toast_("Falscher Club-Code","err"); return; }
      result = await DB.auth.register(name, email, code);
    } else {
      result = await DB.auth.login(email);
    }
    if(result.error){ toast_(result.error,"err"); return; }
    const u = result.data;
    setMe(u);
    setAllUsers(prev=>({...prev,[u.id]:u}));
    const vehicleId = showContactAuth;
    setShowContactAuth(null);
    setContactAuthForm({name:"",email:"",code:""});
    toast_(`Willkommen, ${u.name}! 🏁`);
    // Pass u directly — don't rely on setMe() React state which hasn't updated yet
    await startContact(vehicleId, u);
  };

  const loadDemo = async () => {
    const DB = window.PCN_DB;
    if(DB && DB.backend === "local"){
      // Local backend: seed via localStorage directly (fast path)
      const stored=JSON.parse(localStorage.getItem("pcn_v1")||"{}");
      stored.users={...stored.users,...DEMO_USERS};
      stored.session=DEMO_USERS.u1;
      stored.vehicles=DEMO_VEHICLES;
      stored.logbook=DEMO_LOGBOOK;
      stored.events=DEMO_EVENTS;
      stored.participants=DEMO_PARTICIPANTS;
      stored.threads=DEMO_THREADS;
      stored.reminders={"u1":[
        {id:"R1",vehicleId:"V001",title:"PCN TrackDay — Fahrzeug vorbereiten",date:dPlus(10),done:false},
        {id:"R2",vehicleId:"V002",title:"Sommerreifenwechsel",date:dPlus(4),done:false},
        {id:"R3",vehicleId:"V001",title:"TÜV Termin vereinbaren",date:dPlus(45),done:false},
      ]};
      localStorage.setItem("pcn_v1",JSON.stringify(stored));
      await refreshAll(DEMO_USERS.u1);
    } else {
      // Supabase/API backend: demo runs purely in-memory, not persisted to DB
      // (avoids polluting the real database with fake demo data)
      setMe(DEMO_USERS.u1);
      setVehicles(DEMO_VEHICLES);
      setLogbook(DEMO_LOGBOOK);
      setParticipants(DEMO_PARTICIPANTS);
      setThreads(DEMO_THREADS);
      setReminders([
        {id:"R1",vehicleId:"V001",title:"PCN TrackDay — Fahrzeug vorbereiten",date:dPlus(10),done:false},
        {id:"R2",vehicleId:"V002",title:"Sommerreifenwechsel",date:dPlus(4),done:false},
        {id:"R3",vehicleId:"V001",title:"TÜV Termin vereinbaren",date:dPlus(45),done:false},
      ]);
    }
    setAllUsers({...DEMO_USERS}); setScreen("app"); setTab("dashboard");
    toast_("Demo geladen — Willkommen, Max! 🏁 (nicht in echter DB gespeichert)");
  };

  // ── CSS ────────────────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body,#root{height:100%}
    body{background:${C.black};color:${C.white};font-family:'Barlow',sans-serif;-webkit-font-smoothing:antialiased}
    input,select,textarea{font-family:'Barlow',sans-serif;outline:none;color:${C.white};background:transparent}
    input::placeholder,textarea::placeholder{color:${C.muted}}
    select option{background:#191919}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:99px}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes scanline{0%{top:4px}50%{top:calc(100% - 6px)}100%{top:4px}}
    .btn{background:${C.red};color:#fff;border:none;border-radius:10px;padding:14px 18px;font-weight:700;font-size:16px;cursor:pointer;font-family:'Barlow',sans-serif;transition:opacity .15s}
    .btn:active{opacity:.8}
    .btn.ghost{background:transparent;color:${C.white};border:1px solid ${C.border}}
    .btn.sm{padding:7px 13px;font-size:12px}
    .inp{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;color:${C.white};font-size:17px;width:100%;transition:border-color .15s;font-family:'Barlow',sans-serif}
    .inp:focus{border-color:${C.red}}
    .toast{position:fixed;bottom:80px;left:14px;right:14px;z-index:999;background:${C.dark};border:1px solid #333;border-radius:12px;padding:13px 16px;font-size:13px;font-weight:600;animation:slideUp .2s;box-shadow:0 8px 24px rgba(0,0,0,.8);white-space:pre-line}
    .toast.ok{border-color:${C.red}44;color:${C.white}}
    .toast.err{border-color:#ef444466;color:#ef4444}
    .tab-bar{position:fixed;bottom:0;left:0;right:0;background:${C.dark};border-top:1px solid ${C.border};display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,0)}
    .tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px 2px;border:none;background:transparent;cursor:pointer;gap:2px;font-family:'Barlow',sans-serif;color:${C.muted};transition:color .15s;position:relative}
    .tab-btn.on{color:${C.red}}
    .tab-btn .ico{font-size:23px;line-height:1}
    .tab-btn .lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .badge{position:absolute;top:5px;right:calc(50% - 18px);background:${C.red};color:#fff;border-radius:99px;padding:1px 5px;font-size:9px;font-weight:800;min-width:16px;text-align:center;line-height:14px}
    .card{background:${C.card};border:1px solid ${C.border};border-radius:14px}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:200;display:flex;align-items:flex-end;justify-content:center}
    .sheet{background:${C.dark};border-radius:20px 20px 0 0;width:100%;max-width:480px;border-top:1px solid ${C.border};padding:24px 16px;animation:slideUp .2s;max-height:88vh;overflow-y:auto}
    @media(min-width:640px){
      .overlay{align-items:center}
      .sheet{border-radius:20px;max-height:80vh}
    }
    .tog{width:44px;height:24px;border-radius:99px;border:none;cursor:pointer;transition:background .2s;flex-shrink:0;position:relative;background:${C.border}}
    .tog::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:99px;background:#fff;transition:transform .2s}
    .tog.on{background:${C.red}}.tog.on::after{transform:translateX(20px)}
  `;

  // ══════════════════════════════════════════════════════════════════════════════
  // SCANNER OVERLAY
  // ══════════════════════════════════════════════════════════════════════════════
  const ScannerOverlay = scannerOpen ? (
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:300,display:"flex",flexDirection:"column"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(to bottom,rgba(0,0,0,.8),transparent)"}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:800,color:"#fff"}}>QR-Code scannen</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>Halte die Kamera über den QAR-Code</div>
        </div>
        <button onClick={closeScanner} style={{background:"rgba(0,0,0,.6)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Barlow',sans-serif"}}>✕ Schließen</button>
      </div>
      <video ref={videoRef} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline/>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        {scannerStatus==="found"?(
          <div style={{width:220,height:220,border:"3px solid #22c55e",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(34,197,94,.15)"}}>
            <span style={{fontSize:64,color:"#22c55e"}}>✓</span>
          </div>
        ):(
          <div style={{position:"relative",width:220,height:220}}>
            <div style={{position:"absolute",top:0,left:0,width:32,height:32,borderTop:`3px solid ${C.red}`,borderLeft:`3px solid ${C.red}`,borderRadius:"8px 0 0 0"}}/>
            <div style={{position:"absolute",top:0,right:0,width:32,height:32,borderTop:`3px solid ${C.red}`,borderRight:`3px solid ${C.red}`,borderRadius:"0 8px 0 0"}}/>
            <div style={{position:"absolute",bottom:0,left:0,width:32,height:32,borderBottom:`3px solid ${C.red}`,borderLeft:`3px solid ${C.red}`,borderRadius:"0 0 0 8px"}}/>
            <div style={{position:"absolute",bottom:0,right:0,width:32,height:32,borderBottom:`3px solid ${C.red}`,borderRight:`3px solid ${C.red}`,borderRadius:"0 0 8px 0"}}/>
            {scannerStatus==="scanning"&&<div style={{position:"absolute",left:4,right:4,height:2,background:`linear-gradient(90deg,transparent,${C.red},transparent)`,animation:"scanline 1.8s ease-in-out infinite"}}/>}
          </div>
        )}
      </div>
      {scannerError&&(
        <div style={{position:"absolute",bottom:100,left:20,right:20,background:"rgba(0,0,0,.95)",border:"1px solid #ef4444",borderRadius:14,padding:"16px"}}>
          <div style={{color:"#ef4444",fontWeight:700,fontSize:14,marginBottom:6}}>⚠️ Kein Kamera-Zugriff</div>
          <div style={{color:"#999",fontSize:12,lineHeight:1.7,marginBottom:12,whiteSpace:"pre-line"}}>{scannerError}</div>
          <button onClick={()=>{setScannerError(null);setScannerStatus("loading");}}
            style={{background:C.red,border:"none",borderRadius:8,padding:"10px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,width:"100%",fontFamily:"'Barlow',sans-serif"}}>Erneut versuchen</button>
        </div>
      )}
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"14px 16px",background:"linear-gradient(to top,rgba(0,0,0,.95),transparent)",paddingBottom:"calc(20px + env(safe-area-inset-bottom,0))"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,.4)",textAlign:"center",marginBottom:8}}>Oder UID manuell eingeben</div>
        <input placeholder="QAR-XXXXXXXX" onChange={e=>{const v=e.target.value.toUpperCase();if(/^QAR-[A-Z2-9]{8}$/.test(v))handleScanResult(v);}}
          style={{width:"100%",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"10px 12px",color:"#fff",fontSize:14,fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1}}/>
      </div>
    </div>
  ) : null;

  // ══════════════════════════════════════════════════════════════════════════════
  // SPLASH
  // ══════════════════════════════════════════════════════════════════════════════
  if(screen==="splash") return (
    <div style={{minHeight:"100vh",background:C.black,display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>
      {toast&&<div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {/* ── White logo area ── */}
      <div style={{background:"#ffffff",padding:"36px 24px 28px",textAlign:"center",borderBottom:"3px solid "+C.red}}>
        <img src={LOGO_URL} alt="PCN" onError={e=>e.target.style.display="none"}
          style={{width:220,maxWidth:"75%",objectFit:"contain",marginBottom:16}}/>
        <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:"#1a1a1a",letterSpacing:1,lineHeight:1}}>
          DIGITALE <span style={{color:C.red}}>CLUBPLATTFORM</span>
        </h1>
        <p style={{fontSize:11,color:"#888",marginTop:6}}>Fahrzeugakte · Events · QR-Code · Messenger</p>
      </div>

      {/* ── Login area ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"28px 20px 44px",maxWidth:400,margin:"0 auto",width:"100%"}}>

        {/* Tab toggle */}
        <div style={{display:"flex",background:"#1a1a1a",borderRadius:12,padding:3,marginBottom:20}}>
          {[["login","Anmelden"],["register","Registrieren"]].map(([m,label])=>(
            <button key={m} onClick={()=>setLoginForm(p=>({...p,mode:m}))}
              style={{flex:1,padding:"11px",border:"none",borderRadius:10,cursor:"pointer",
                fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:14,transition:"all .15s",
                background:loginForm.mode===m?C.red:"transparent",
                color:loginForm.mode===m?"#fff":C.muted}}>
              {label}
            </button>
          ))}
        </div>

        {/* Login */}
        {loginForm.mode==="login"&&(
          <>
            <input className="inp" placeholder="E-Mail-Adresse" type="email"
              value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))}
              style={{marginBottom:12,fontSize:16}}/>
            <button className="btn" style={{width:"100%",padding:"14px",fontSize:15,opacity:loginForm.email?1:.4}}
              disabled={!loginForm.email}
              onClick={async()=>{
                const DB=window.PCN_DB;
                const {data:u,error}=await DB.auth.login(loginForm.email);
                if(error){toast_(error,"err");return;}
                await refreshAll(u); setScreen("app");
                toast_("Willkommen zurück, "+u.name+"! 🏁");
              }}>Anmelden →</button>
            <div style={{textAlign:"center",marginTop:10,fontSize:11,color:C.muted}}>Kein Passwort nötig — nur deine Club-E-Mail</div>
          </>
        )}

        {/* Register */}
        {loginForm.mode==="register"&&(
          <>
            {/* Single Club-Code field */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>CLUB-CODE</div>
              <input className="inp" placeholder="PCN2026" value={loginForm.code}
                onChange={e=>setLoginForm(p=>({...p,code:e.target.value}))}
                style={{textTransform:"uppercase",letterSpacing:4,textAlign:"center",fontWeight:800,fontSize:20,
                  border:`2px solid ${loginForm.code.toUpperCase()===CLUB_CODE?C.green:loginForm.code.length>0?"#ef4444":C.border}`}}/>
              {loginForm.code.length>0&&loginForm.code.toUpperCase()!==CLUB_CODE&&(
                <div style={{fontSize:10,color:"#ef4444",marginTop:4,textAlign:"center"}}>Falscher Club-Code</div>
              )}
              {loginForm.code.toUpperCase()===CLUB_CODE&&(
                <div style={{fontSize:10,color:C.green,marginTop:4,textAlign:"center"}}>✓ Club-Code korrekt</div>
              )}
            </div>

            {loginForm.code.toUpperCase()===CLUB_CODE&&(
              <>
                <input className="inp" placeholder="Dein Name" style={{marginBottom:10}}
                  value={loginForm.name} onChange={e=>setLoginForm(p=>({...p,name:e.target.value}))}/>
                <input className="inp" placeholder="E-Mail" type="email" style={{marginBottom:14}}
                  value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))}/>
              </>
            )}

            <button className="btn" style={{width:"100%",padding:"14px",fontSize:15,
              opacity:loginForm.code.toUpperCase()===CLUB_CODE&&loginForm.name&&loginForm.email?1:.35}}
              disabled={!(loginForm.code.toUpperCase()===CLUB_CODE&&loginForm.name&&loginForm.email)}
              onClick={async()=>{
                const DB=window.PCN_DB;
                const {data:u,error}=await DB.auth.register(loginForm.name,loginForm.email,loginForm.code);
                if(error){toast_(error,"err");return;}
                const stored=JSON.parse(localStorage.getItem("pcn_v1")||"{}");
                if(!stored.events||Object.keys(stored.events).length===0){
                  stored.events=DEMO_EVENTS; localStorage.setItem("pcn_v1",JSON.stringify(stored));
                }
                setMe(u); setAllUsers(p=>({...p,[u.id]:u}));
                setEvents(DEMO_EVENTS); setScreen("app");
                toast_("Willkommen, "+u.name+"! 🏁");
              }}>Konto erstellen →</button>
          </>
        )}

        <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0"}}>
          <div style={{flex:1,height:1,background:C.border}}/>
          <span style={{fontSize:11,color:"#444"}}>oder</span>
          <div style={{flex:1,height:1,background:C.border}}/>
        </div>

        <button className="btn ghost" style={{width:"100%",padding:"13px",fontSize:14}} onClick={loadDemo}>
          Demo ansehen
        </button>
        <p style={{textAlign:"center",fontSize:10,color:"#333",marginTop:16}}>
          Powered by <span style={{color:C.gold}}>QAR.Gallery</span>
        </p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // PUBLIC VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  if(screen==="public"&&publicV) {
    const v=publicV; const priv=v.privacy||DEF_PRIVACY;
    const vHist=eventHistory.filter(h=>h.vehicleId===v.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const kz=fmtKz(v.kennzeichen,v.baujahr);
    const vParts=Object.values(participants).flat().filter(p=>p.vehicleId===v.id);
    const nextEvent=vParts.map(p=>({...p,ev:events[p.eventId]})).filter(p=>p.ev&&daysUntil(p.ev.date)>0).sort((a,b)=>daysUntil(a.ev.date)-daysUntil(b.ev.date))[0];
    return (
      <div style={{minHeight:"100vh",background:C.black,paddingBottom:40}}>
        <style>{CSS}</style>
        {toast&&<div className={`toast ${toast.type}`}>{toast.msg}</div>}
        <div style={{background:C.dark,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <img src={LOGO_URL} alt="PCN" onError={e=>e.target.style.display="none"} style={{height:28,objectFit:"contain"}}/>
          <span style={{fontSize:10,color:C.muted}}>Digitale Fahrzeugakte</span>
        </div>
        <div style={{height:200,position:"relative",overflow:"hidden",background:"#111"}}>
          {v.image&&<img src={v.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,#000000f0)"}}/>
          <div style={{position:"absolute",bottom:14,left:16,right:16}}>
            <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color:"#fff",lineHeight:1,marginBottom:8}}>{v.hersteller} {v.modell}</h1>
            <div style={{display:"inline-flex",alignItems:"center",background:"#fff",border:"2px solid #222",borderRadius:5,padding:"3px 10px"}}>
              <span style={{fontSize:13,fontWeight:800,color:"#111",letterSpacing:2,fontFamily:"Arial,sans-serif"}}>{kz}</span>
            </div>
          </div>
        </div>
        {/* ── Action Buttons — directly under hero, always visible ── */}
        <div style={{padding:"12px 14px",background:C.dark,borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:520,margin:"0 auto"}}>

            {/* PHONE — prominent green call button */}
            {(priv.pub_phone===true)&&v.phone&&v.phone.trim()&&(
              <a href={`tel:${(v.phone||"").replace(/[^+\d]/g,"")}`}
                style={{display:"flex",alignItems:"center",gap:12,background:"#16a34a",border:"none",
                  borderRadius:12,padding:"14px 16px",textDecoration:"none",color:"#fff",cursor:"pointer"}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📞</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>Direkt anrufen</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:1}}>{v.phone}</div>
                </div>
                <span style={{fontSize:20,color:"rgba(255,255,255,.7)"}}>›</span>
              </a>
            )}

            {/* CHAT — always visible for visitors (non-owners), opens anonymous chat */}
            {(!me||(v.owner!==me.email&&v.userId!==me.id))&&(
              <button
                onClick={()=>{ if(me){ startContact(v.id); } else { setContactAuthMode("guest"); setShowContactAuth(v.id); }}}
                style={{display:"flex",alignItems:"center",gap:12,background:C.red,border:"none",
                  borderRadius:12,padding:"14px 16px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",color:"#fff",width:"100%"}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💬</div>
                <div style={{flex:1,textAlign:"left"}}>
                  <div style={{fontWeight:800,fontSize:15}}>Nachricht an Fahrer(in) senden</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:1}}>Anonym · Besitzer antwortet per App</div>
                </div>
                <span style={{fontSize:20,color:"rgba(255,255,255,.7)"}}>›</span>
              </button>
            )}

          </div>
        </div>

        <div style={{padding:"14px 16px",maxWidth:520,margin:"0 auto"}}>
          {/* ── Status Banner — READ ONLY, set via Akte only ── */}
          {(()=>{
            const s = getActiveStatus(v.id);
            if(!s) return null;
            const minsLeft = s.expiresAt ? Math.ceil((s.expiresAt-Date.now())/60000) : null;
            return (
              <div style={{background:`${C.amber}18`,border:`2px solid ${C.amber}66`,borderRadius:14,padding:"14px 16px",marginBottom:14,animation:"fadeIn .3s ease"}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:28,flexShrink:0}}>{s.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:16,color:C.amber,lineHeight:1.2}}>{s.text}</div>
                    {minsLeft&&minsLeft>0&&<div style={{fontSize:11,color:C.muted,marginTop:3}}>Noch ca. {minsLeft} Min</div>}
                  </div>
                </div>
              </div>
            );
          })()}

        {nextEvent&&priv.pub_events&&(
            <div style={{background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:9,color:C.red,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>🏁 Nächste Veranstaltung — in {daysUntil(nextEvent.ev.date)} Tagen</div>
              <div style={{fontWeight:700,fontSize:14,color:C.white}}>{nextEvent.ev.name}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Startnr. <span style={{color:C.gold,fontWeight:700}}>#{nextEvent.startNr}</span> · {nextEvent.class}</div>
            </div>
          )}
          <div className="card" style={{padding:16,marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Fahrzeugdaten</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Baujahr","baujahr"],["Kraftstoff","kraftstoff"],["Getriebe","getriebe"],["Farbe","farbe"],["Kilometerstand","kilometerstand"],["TÜV","tuev_faelligkeit"]].filter(([,k])=>priv[k]!==false&&v[k]).map(([label,key])=>(
                <div key={key}>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
                  <div style={{fontSize:14,fontWeight:600,color:C.white,marginTop:2}}>
                    {key==="kilometerstand"?parseInt(v[key]).toLocaleString("de-DE")+" km":v[key]}
                  </div>
                </div>
              ))}
            </div>
            {v.besonderheiten&&<div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted,lineHeight:1.6}}>ℹ️ {v.besonderheiten}</div>}
          </div>
          {priv.pub_events&&vHist.length>0&&(
            <div className="card" style={{padding:16,marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Veranstaltungshistorie</div>
              {vHist.map(h=>(
                <div key={h.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:6,padding:"2px 8px",fontWeight:800,fontSize:12,color:C.red,flexShrink:0}}>#{h.startNr}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.eventName}</div>
                    <div style={{fontSize:10,color:C.muted}}>{fmtDate(h.date)} · {h.class}</div>
                    {h.note&&<div style={{fontSize:10,color:C.gold}}>{h.note}</div>}
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:h.result==="Teilnahme"?C.muted:C.gold,flexShrink:0}}>{h.result}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{textAlign:"center",padding:"12px 0",borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:4}}>VERIFIZIERT DURCH QAR.GALLERY</div>
            <div style={{fontFamily:"monospace",fontSize:11,color:"#444"}}>{v.qarId}</div>
          </div>
          {me&&<button className="btn sm ghost" style={{width:"100%",marginTop:10}} onClick={()=>setScreen(viewV?"vehicle":"app")}>← Zurück</button>}
        </div>

        {/* ── CONTACT AUTH SHEET — Login/Register/Guest before sending message ── */}
        {showContactAuth&&(
          <div className="overlay" style={{zIndex:550}} onClick={e=>{if(e.target===e.currentTarget){setShowContactAuth(null);setContactAuthForm({name:"",email:"",code:""});}}}>
            <div className="sheet">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>💬 Nachricht senden</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:18}}>Um eine Nachricht zu senden, identifiziere dich kurz</div>

              <div style={{display:"flex",background:"#111",borderRadius:10,padding:3,marginBottom:16}}>
                {[["guest","Als Gast"],["login","Anmelden"],["register","Registrieren"]].map(([m,label])=>(
                  <button key={m} onClick={()=>setContactAuthMode(m)}
                    style={{flex:1,padding:"9px 4px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,
                      background:contactAuthMode===m?C.red:"transparent",color:contactAuthMode===m?"#fff":C.muted,transition:"all .15s"}}>
                    {label}
                  </button>
                ))}
              </div>

              {contactAuthMode==="guest"&&(
                <div style={{background:"#141414",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:16}}>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:10}}>
                    Kein Account nötig — nur Name und E-Mail für die Zustellung deiner Nachricht.
                  </div>
                  <div style={{fontSize:10,fontWeight:800,color:C.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Als PCN-Mitglied bekommst du zusätzlich</div>
                  {[
                    ["🚗","Eigene digitale Fahrzeugakte"],
                    ["📱","QR-Code fürs eigene Auto"],
                    ["🏁","Direkte Anmeldung zu Club-Events"],
                  ].map(([icon,text])=>(
                    <div key={text} style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:C.white,marginBottom:5}}>
                      <span style={{fontSize:13,flexShrink:0}}>{icon}</span>
                      <span>{text}</span>
                    </div>
                  ))}
                  <button onClick={()=>setContactAuthMode("register")}
                    style={{background:"none",border:"none",color:C.red,fontWeight:700,fontSize:12,cursor:"pointer",padding:0,marginTop:8,fontFamily:"'Barlow',sans-serif"}}>
                    Stattdessen Mitglied werden →
                  </button>
                </div>
              )}

              {(contactAuthMode==="guest"||contactAuthMode==="register")&&(
                <input className="inp" placeholder="Dein Name" style={{marginBottom:8}}
                  value={contactAuthForm.name} onChange={e=>setContactAuthForm(p=>({...p,name:e.target.value}))}/>
              )}

              {contactAuthMode==="register"&&(
                <input className="inp" placeholder="Club-Code" style={{marginBottom:8,textTransform:"uppercase",letterSpacing:2,textAlign:"center",fontWeight:700}}
                  value={contactAuthForm.code} onChange={e=>setContactAuthForm(p=>({...p,code:e.target.value}))}/>
              )}

              <input className="inp" placeholder="E-Mail" type="email" style={{marginBottom:16}}
                value={contactAuthForm.email} onChange={e=>setContactAuthForm(p=>({...p,email:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Enter")handleContactAuth();}}/>

              <button className="btn" style={{width:"100%"}} onClick={handleContactAuth}>
                {contactAuthMode==="guest"?"Weiter zur Nachricht →":contactAuthMode==="login"?"Anmelden →":"Konto erstellen →"}
              </button>

              {contactAuthMode==="login"&&(
                <div style={{textAlign:"center",marginTop:10,fontSize:11,color:C.muted}}>Kein Passwort nötig — nur deine E-Mail</div>
              )}
            </div>
          </div>
        )}

      {/* ── OVERLAYS (rendered in every screen) ── */}
      {showStatusPicker&&(
        <div className="overlay" style={{zIndex:500}} onClick={e=>{if(e.target===e.currentTarget)setShowStatusPicker(null);}}>
          <div className="sheet">
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>📍 Status setzen</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Sichtbar wenn jemand deinen QR-Code scannt</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {STATUS_PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setStatus(showStatusPicker,p)}
                  style={{display:"flex",gap:12,alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",textAlign:"left"}}>
                  <span style={{fontSize:24,flexShrink:0}}>{p.icon}</span>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:C.white}}>{p.text}</div>
                    <div style={{fontSize:11,color:C.muted}}>Läuft ab nach {p.mins} Min</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginBottom:10}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Eigener Text</div>
              <div style={{display:"flex",gap:8}}>
                <input className="inp" placeholder="z.B. Bin gleich beim Einlass..." value={statusCustom}
                  onChange={e=>setStatusCustom(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&statusCustom.trim())setStatus(showStatusPicker,{icon:"💬",mins:30},statusCustom);}}
                  style={{flex:1}}/>
                <button className="btn" disabled={!statusCustom.trim()}
                  onClick={()=>{if(statusCustom.trim())setStatus(showStatusPicker,{icon:"💬",mins:30},statusCustom);}}
                  style={{flexShrink:0,opacity:statusCustom.trim()?1:.4}}>OK</button>
              </div>
            </div>
            {getActiveStatus(showStatusPicker)&&(
              <button className="btn ghost" style={{width:"100%",marginTop:4,color:"#ef4444",borderColor:"#ef444444"}}
                onClick={()=>{clearStatus(showStatusPicker);setShowStatusPicker(null);toast_("Status gelöscht");}}>
                Status löschen
              </button>
            )}
          </div>
        </div>
      )}
      {lightbox&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.97)",zIndex:600,display:"flex",flexDirection:"column"}}
          onClick={()=>setLightbox(null)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>{lightbox.index+1} / {lightbox.images.length}</div>
            <button onClick={()=>setLightbox(null)} style={{background:"rgba(255,255,255,.1)",border:"none",color:"#fff",fontSize:20,width:40,height:40,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 16px",position:"relative"}} onClick={e=>e.stopPropagation()}>
            <img src={lightbox.images[lightbox.index]} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8}}/>
            {lightbox.images.length>1&&<>
              <button onClick={()=>setLightbox(p=>({...p,index:Math.max(0,p.index-1)}))}
                style={{position:"absolute",left:8,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",fontSize:28,width:44,height:44,borderRadius:"50%",cursor:"pointer",display:lightbox.index===0?"none":"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
              <button onClick={()=>setLightbox(p=>({...p,index:Math.min(p.images.length-1,p.index+1)}))}
                style={{position:"absolute",right:8,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",fontSize:28,width:44,height:44,borderRadius:"50%",cursor:"pointer",display:lightbox.index===lightbox.images.length-1?"none":"flex",alignItems:"center",justifyContent:"center"}}>›</button>
            </>}
          </div>
          {lightbox.images.length>1&&(
            <div style={{display:"flex",gap:6,justifyContent:"center",padding:"16px",flexShrink:0}} onClick={e=>e.stopPropagation()}>
              {lightbox.images.map((_,i)=>(
                <div key={i} onClick={()=>setLightbox(p=>({...p,index:i}))}
                  style={{width:i===lightbox.index?20:6,height:6,borderRadius:99,background:i===lightbox.index?"#fff":"rgba(255,255,255,.3)",transition:"all .2s",cursor:"pointer"}}/>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VEHICLE DETAIL
  // ══════════════════════════════════════════════════════════════════════════════
  if(screen==="vehicle"&&viewV) {
    const v=viewV;
    const vLog=logbook[v.id]||[];
    const vParts=Object.values(participants).flat().filter(p=>p.vehicleId===v.id);
    const vHist=eventHistory.filter(h=>h.vehicleId===v.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const isOwn = v.owner===me?.email || v.userId===me?.id || v.userId===me?.email;
    const tuevParts=(v.tuev_faelligkeit||"").split("/");
    const tuevDate=tuevParts.length===2?new Date(parseInt(tuevParts[1]),parseInt(tuevParts[0])-1,1):null;
    const tuevDays=tuevDate?Math.ceil((tuevDate-new Date())/86400000):null;
    const tuevColor=!tuevDays?C.muted:tuevDays<0?C.red:tuevDays<90?C.amber:C.green;
    const kz=fmtKz(v.kennzeichen,v.baujahr);
    const priv=v.privacy||DEF_PRIVACY;
    return (
      <div style={{minHeight:"100vh",background:C.black,paddingBottom:80}}>
        <style>{CSS}</style>
        {toast&&<div className={`toast ${toast.type}`}>{toast.msg}</div>}
        {ScannerOverlay}
        {/* ── Photo Gallery Hero ── */}
        {(()=>{
          const imgs = getImages(v);
          const curIdx = Math.min(gallerySwipe[v.id]||0, Math.max(0,imgs.length-1));
          const curImg = imgs[curIdx];
          const goTo = (i) => setGallerySwipe(p=>({...p,[v.id]:Math.max(0,Math.min(imgs.length-1,i))}));
          // Touch swipe state
          let touchStartX = 0;
          const onTouchStart = e => { touchStartX = e.touches[0].clientX; };
          const onTouchEnd = e => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if(Math.abs(dx) > 40) goTo(curIdx + (dx < 0 ? 1 : -1));
          };
          return (
            <div style={{height:280,position:"relative",overflow:"hidden",background:"#111"}}
              onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

              {/* Image */}
              {curImg
                ? <img src={curImg} alt="" draggable={false}
                    style={{width:"100%",height:"100%",objectFit:"cover",cursor:"zoom-in",userSelect:"none",WebkitUserSelect:"none"}}
                    onClick={()=>setLightbox({images:imgs,index:curIdx})}
                    onError={e=>e.target.style.display="none"}/>
                : isOwn && (
                  <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",height:"100%",color:C.muted}}>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImageUpload(e.target.files[0],url=>addImageToVehicle(v.id,url))}/>
                    <span style={{fontSize:40}}>📷</span>
                    <span style={{fontSize:13,fontWeight:600,color:C.white}}>Erstes Foto hinzufügen</span>
                    <span style={{fontSize:11,color:C.muted}}>Tippe um Foto oder Bibliothek zu öffnen</span>
                  </label>
                )
              }

              {/* Gradient overlay */}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.45) 0%,transparent 35%,transparent 50%,rgba(0,0,0,.75) 100%)",pointerEvents:"none"}}/>

              {/* Bottom: dots + counter */}
              {imgs.length > 1 && (
                <div style={{position:"absolute",bottom:14,left:0,right:0,display:"flex",alignItems:"center",justifyContent:"center",gap:6,zIndex:3}}>
                  {imgs.map((_,i)=>(
                    <div key={i} onClick={e=>{e.stopPropagation();goTo(i);}}
                      style={{width:i===curIdx?20:6,height:6,borderRadius:99,background:i===curIdx?"#fff":"rgba(255,255,255,.35)",transition:"width .2s, background .2s",cursor:"pointer"}}/>
                  ))}
                </div>
              )}

              {/* Counter badge */}
              {imgs.length > 1 && (
                <div style={{position:"absolute",bottom:14,right:14,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.9)",zIndex:3,letterSpacing:.5}}>
                  {curIdx+1}/{imgs.length}
                </div>
              )}

              {/* Top-left: back */}
              <div style={{position:"absolute",top:16,left:14,zIndex:5}}>
                <button onClick={()=>setScreen("app")}
                  style={{background:"rgba(0,0,0,.55)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"8px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'Barlow',sans-serif",display:"flex",alignItems:"center",gap:6}}>
                  ← Zurück
                </button>
              </div>

              {/* Top-right: controls */}
              <div style={{position:"absolute",top:16,right:14,display:"flex",gap:8,zIndex:5}}>
                {isOwn && <>
                  <label title="Foto hinzufügen"
                    style={{background:"rgba(0,0,0,.55)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"8px 12px",color:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",minWidth:38}}>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImageUpload(e.target.files[0],url=>addImageToVehicle(v.id,url))}/>
                    {imgUploading ? "⏳" : "📷"}
                  </label>
                  <button title="QR-Sichtbarkeit einstellen" onClick={()=>setShowPrivacy(v.id)}
                    style={{background:"rgba(0,0,0,.55)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.25)",borderRadius:10,padding:"7px 11px",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:11}}>
                    <span style={{fontSize:13}}>▪︎</span>
                    <span>QR</span>
                    <span style={{fontSize:13}}>🔒</span>
                  </button>
                </>}
                <button title="Öffentliche QR-Ansicht" onClick={()=>{setPublicV({...v,privacy:priv});setScreen("public");loadStatusFor(v.id);}}
                  style={{background:"rgba(0,0,0,.55)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 11px",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:11}}>
                  <span style={{fontSize:13}}>👁</span>
                  <span>Vorschau</span>
                </button>
              </div>
            </div>
          );
        })()}

        <div style={{padding:"16px",maxWidth:520,margin:"0 auto"}}>
          <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:C.white,lineHeight:1,marginBottom:8}}>{v.hersteller} {v.modell}</h1>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
            <div style={{display:"inline-flex",alignItems:"center",background:"#fff",border:"2px solid #222",borderRadius:5,padding:"3px 10px"}}>
              <span style={{fontSize:14,fontWeight:800,color:"#111",letterSpacing:2,fontFamily:"Arial,sans-serif"}}>{kz}</span>
            </div>
            {isOwn&&(
              <button className="btn sm ghost" style={{fontSize:11}}
                onClick={()=>setShowStatusPicker(v.id)}>
                {getActiveStatus(v.id)?`${getActiveStatus(v.id).icon} Status`:"📍 Status"}
              </button>
            )}
            {isOwn&&(
              <button className="btn sm ghost" style={{fontSize:11}}
                onClick={()=>openEditVehicle(v)}>
                ✏️ Bearbeiten
              </button>
            )}
            {!isOwn&&<button className="btn sm ghost" style={{fontSize:11}} onClick={()=>startContact(v.id)}>💬 Kontakt</button>}
          </div>

          {/* Active status banner */}
          {(()=>{
            const s=getActiveStatus(v.id);
            if(!s||!isOwn) return null;
            return (
              <div style={{background:`${C.amber}18`,border:`1px solid ${C.amber}44`,borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:20}}>{s.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.amber}}>{s.text}</div>
                  {s.expiresAt&&<div style={{fontSize:10,color:C.muted}}>Läuft ab in {Math.max(0,Math.ceil((s.expiresAt-Date.now())/60000))} Min</div>}
                </div>
                <button onClick={()=>clearStatus(v.id)}
                  style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:4}}>✕</button>
              </div>
            );
          })()}

          {/* Thumbnail strip */}
          {(()=>{
            const imgs = getImages(v);
            if(imgs.length <= 1) return null;
            const curIdx = Math.min(gallerySwipe[v.id]||0, imgs.length-1);
            return (
              <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14,padding:"2px 0 6px",
                scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
                {imgs.map((img,i)=>{
                  const active = i === curIdx;
                  return (
                    <div key={i} style={{position:"relative",flexShrink:0,transition:"transform .15s",transform:active?"scale(1.05)":"scale(1)"}}>
                      <img src={img} alt=""
                        onClick={()=>setGallerySwipe(p=>({...p,[v.id]:i}))}
                        style={{
                          width:68, height:68, objectFit:"cover", borderRadius:9, cursor:"pointer", display:"block",
                          border:`2.5px solid ${active?C.red:"transparent"}`,
                          boxShadow:active?`0 0 0 1px ${C.red}`:"none",
                          transition:"border-color .15s",
                        }}
                        onError={e=>e.target.style.display="none"}/>
                      {isOwn && (
                        <button
                          onClick={e=>{e.stopPropagation();removeImageFromVehicle(v.id,i);}}
                          style={{position:"absolute",top:-4,right:-4,background:C.red,border:"2px solid #0a0a0a",color:"#fff",fontSize:9,fontWeight:700,width:18,height:18,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"'Barlow',sans-serif"}}>
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* Add more photos button */}
                {isOwn && (
                  <label style={{width:68,height:68,background:C.card,border:`1.5px dashed ${C.border}`,borderRadius:9,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,gap:2}}>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImageUpload(e.target.files[0],url=>addImageToVehicle(v.id,url))}/>
                    <span style={{fontSize:18}}>📷</span>
                    <span style={{fontSize:8,color:C.muted,textAlign:"center"}}>Hinzufügen</span>
                  </label>
                )}
              </div>
            );
          })()}

          {/* Status strip */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
            {[
              [v.tuev_faelligkeit||"–","TÜV",tuevColor],
              [parseInt(v.kilometerstand||0).toLocaleString("de-DE")+" km","Stand",C.muted],
              [["","Sehr gut","Gut","Befriend.","Ausreichend","Mangelhaft"][parseInt(v.zustand)]||"–","Zustand",C.gold],
            ].map(([val,label,color],i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:700,color,marginBottom:2}}>{val}</div>
                <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Logbuch */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2}}>📋 Logbuch ({vLog.length})</div>
              {isOwn&&<button className="btn sm ghost" onClick={()=>setShowAddLog(v.id)}>+ Eintrag</button>}
            </div>
            {vLog.length===0
              ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px",textAlign:"center",color:C.muted,fontSize:12}}>
                  Noch leer — 3 Einträge schalten KI-Marktwert frei
                </div>
              :vLog.slice(0,10).map(e=>(
                <div key={e.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.white}}>{e.type}</div>
                    <div style={{fontSize:10,color:C.muted}}>{fmtDate(e.date)}</div>
                  </div>
                  <div style={{fontSize:11,color:C.muted}}>{e.km?parseInt(e.km).toLocaleString("de-DE")+" km":""}{e.workshop?" · "+e.workshop:""}</div>
                  {e.notes&&<div style={{fontSize:11,color:"#555",marginTop:3}}>{e.notes}</div>}
                </div>
              ))
            }
          </div>

          {/* Events */}
          {(vParts.length>0||vHist.length>0)&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>🏁 Veranstaltungen</div>
              {vParts.map(p=>{const ev=events[p.eventId];if(!ev)return null;return(
                <div key={p.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",marginBottom:6,display:"flex",gap:10,alignItems:"center",cursor:"pointer"}} onClick={()=>{setViewEv(ev);setScreen("event");}}>
                  <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:7,padding:"3px 8px",fontWeight:800,fontSize:13,color:C.red,flexShrink:0}}>#{p.startNr}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:C.white}}>{ev.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{fmtDate(ev.date)} · {p.class}</div>
                  </div>
                  <div style={{marginLeft:"auto",fontSize:10,color:C.amber,fontWeight:600}}>in {daysUntil(ev.date)} T.</div>
                </div>
              );})}
              {vHist.map(h=>(
                <div key={h.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",marginBottom:6,display:"flex",gap:10,alignItems:"center",opacity:.75}}>
                  <div style={{background:`${C.gold}22`,border:`1px solid ${C.gold}44`,borderRadius:7,padding:"3px 8px",fontWeight:800,fontSize:13,color:C.gold,flexShrink:0}}>#{h.startNr}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.eventName}</div>
                    <div style={{fontSize:11,color:C.muted}}>{fmtDate(h.date)}{h.note?" · "+h.note:""}</div>
                  </div>
                  <div style={{fontSize:10,color:h.result==="Teilnahme"?C.muted:C.gold,fontWeight:700,flexShrink:0}}>{h.result}</div>
                </div>
              ))}
            </div>
          )}

          {/* Phone — pulled from profile, with inline public/private toggle */}
          {isOwn&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>📞 Kontakt</div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"12px 14px",display:"flex",gap:10,alignItems:"center"}}>
                  <input className="inp" placeholder="Telefonnummer (aus Profil übernehmen)" type="tel"
                    value={viewV.phone||me?.phone||""}
                    onChange={e=>{
                      const val=e.target.value;
                      const updated={...viewV,phone:val};
                      setViewV(updated);
                      setVehicles(prev=>({...prev,[viewV.id]:updated}));
                      clearTimeout(window._phoneSaveTimer);
                      window._phoneSaveTimer=setTimeout(async()=>{
                        const DB=window.PCN_DB; if(DB) await DB.vehicles.save(updated);
                      }, 800);
                    }}
                    style={{flex:1,fontSize:14,border:"none",background:"transparent",padding:0}}/>
                  {!viewV.phone&&me?.phone&&(
                    <button onClick={()=>{
                      const updated={...viewV,phone:me.phone};
                      setViewV(updated);
                      setVehicles(prev=>({...prev,[viewV.id]:updated}));
                      const DB=window.PCN_DB; if(DB) DB.vehicles.save(updated);
                      toast_("Aus Profil übernommen ✓");
                    }} style={{background:C.red,border:"none",borderRadius:7,padding:"5px 10px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif",flexShrink:0}}>
                      Übernehmen
                    </button>
                  )}
                </div>
                <div style={{borderTop:`1px solid ${C.border}`,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:priv.pub_phone?C.green:C.white}}>
                      {priv.pub_phone?"🔓 Öffentlich sichtbar":"🔒 Nur privat"}
                    </div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                      {priv.pub_phone?"Besucher sehen Direktanruf-Button":"Nummer nicht im QR-Profil sichtbar"}
                    </div>
                  </div>
                  <button className={`tog ${priv.pub_phone?"on":"off"}`}
                    onClick={()=>togglePrivacy(v.id,"pub_phone")}/>
                </div>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="card" style={{padding:16}}>
            <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>📱 QR-Code</div>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <div style={{background:"#fff",borderRadius:10,padding:8,flexShrink:0,cursor:"pointer"}} onClick={()=>{setPublicV({...v,privacy:priv});setScreen("public");loadStatusFor(v.id);}}>
                <QRCodeCanvas value={`https://qar.gallery/pcn/?v=${v.qarId}`} size={90}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:3}}>QAR-ID</div>
                <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.white,letterSpacing:1}}>{v.qarId}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:4}}>FIN niemals öffentlich</div>
                <button className="btn sm ghost" style={{marginTop:8,fontSize:11}} onClick={()=>{setPublicV({...v,privacy:priv});setScreen("public");loadStatusFor(v.id);}}>Öffentliche Seite →</button>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Sheet */}
        {showPrivacy===v.id&&(
          <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowPrivacy(null);}}>
            <div className="sheet">
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:16}}>▪︎</span>
                  <span style={{fontWeight:800,fontSize:13,color:C.red}}>QR</span>
                  <span style={{fontSize:16}}>🔒</span>
                </div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white}}>Öffentliche Sichtbarkeit</div>
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Was sehen Besucher wenn sie deinen QR-Code scannen?</div>
              <div style={{fontSize:10,color:"#444",marginBottom:16,lineHeight:1.6}}>Tippe einen Toggle um die Sichtbarkeit zu ändern. 🔓 = sichtbar · 🔒 = versteckt</div>
              {[
                ["Basis",[["kennzeichen","Kennzeichen"],["farbe","Farbe"],["kraftstoff","Kraftstoff"],["getriebe","Getriebe"],["baujahr","Baujahr"]]],
                ["Details",[["kilometerstand","Kilometerstand"],["tuev_faelligkeit","TÜV-Datum"],["zustand","Zustand"],["marktwert","Marktwert"]]],
                ["Abschnitte",[["pub_events","Veranstaltungsteilnahmen"],["pub_logbook","Service-Logbuch"]]],
                ["Kontakt",[["pub_phone","Telefonnummer (Direktanruf)"]]],
              ].map(([group,fields])=>(
                <div key={group} style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>{group}</div>
                  {fields.map(([key,label])=>(
                    <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:13,color:C.white}}>{label}</span>
                      <button className={`tog ${(priv[key]===true||priv[key]===undefined&&DEF_PRIVACY[key])?"on":""}`} onClick={()=>togglePrivacy(v.id,key)}/>
                    </div>
                  ))}
                </div>
              ))}
              <button className="btn" style={{width:"100%",marginTop:8}} onClick={()=>setShowPrivacy(null)}>Fertig ✓</button>
            </div>
          </div>
        )}

        {/* ── EDIT VEHICLE SHEET ── */}
        {showEditVehicle===v.id&&(
          <div className="overlay" style={{zIndex:500}} onClick={e=>{if(e.target===e.currentTarget)setShowEditVehicle(null);}}>
            <div className="sheet">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>✏️ Fahrzeugdaten bearbeiten</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:18}}>Alle Angaben jederzeit änderbar</div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Basis</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input className="inp" placeholder="Hersteller" value={editForm.hersteller||""}
                    onChange={e=>setEditForm(p=>({...p,hersteller:e.target.value}))}/>
                  <input className="inp" placeholder="Modell *" value={editForm.modell||""}
                    onChange={e=>setEditForm(p=>({...p,modell:e.target.value}))}/>
                  <input className="inp" placeholder="Baujahr" value={editForm.baujahr||""}
                    onChange={e=>setEditForm(p=>({...p,baujahr:e.target.value}))}/>
                  <input className="inp" placeholder="Kennzeichen *" value={editForm.kennzeichen||""}
                    onChange={e=>setEditForm(p=>({...p,kennzeichen:e.target.value}))}/>
                  <input className="inp" placeholder="Farbe" value={editForm.farbe||""}
                    onChange={e=>setEditForm(p=>({...p,farbe:e.target.value}))}/>
                  <select className="inp" value={editForm.kraftstoff||"Benzin"}
                    onChange={e=>setEditForm(p=>({...p,kraftstoff:e.target.value}))}>
                    {["Benzin","Diesel","Elektro","Hybrid"].map(k=><option key={k}>{k}</option>)}
                  </select>
                  <select className="inp" style={{gridColumn:"1/-1"}} value={editForm.getriebe||"PDK"}
                    onChange={e=>setEditForm(p=>({...p,getriebe:e.target.value}))}>
                    {["PDK","7-Gang PDK","6-Gang manuell","8-Gang Automatik","Stufenlos"].map(k=><option key={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Status & Technik</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input className="inp" type="number" inputMode="numeric" placeholder="Kilometerstand" value={editForm.kilometerstand||""}
                    onChange={e=>setEditForm(p=>({...p,kilometerstand:e.target.value}))}/>
                  <input className="inp" placeholder="TÜV (MM/JJJJ)" value={editForm.tuev_faelligkeit||""}
                    onChange={e=>setEditForm(p=>({...p,tuev_faelligkeit:e.target.value}))}/>
                  <select className="inp" style={{gridColumn:"1/-1"}} value={editForm.zustand||""}
                    onChange={e=>setEditForm(p=>({...p,zustand:e.target.value}))}>
                    <option value="">Zustand wählen…</option>
                    <option value="1">1 — Sehr gut</option>
                    <option value="2">2 — Gut</option>
                    <option value="3">3 — Befriedigend</option>
                    <option value="4">4 — Ausreichend</option>
                    <option value="5">5 — Mangelhaft</option>
                  </select>
                </div>
              </div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Kontakt</div>
                <input className="inp" type="tel" placeholder="Telefonnummer (optional)" value={editForm.phone||""}
                  onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))}/>
                <div style={{fontSize:10,color:C.muted,marginTop:6}}>🔒 Sichtbarkeit über QR-Einstellungen steuerbar</div>
              </div>

              <div style={{marginBottom:18}}>
                <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Besonderheiten</div>
                <textarea className="inp" placeholder="Ausstattung, Extras, Hinweise..." rows={3}
                  value={editForm.besonderheiten||""} onChange={e=>setEditForm(p=>({...p,besonderheiten:e.target.value}))}
                  style={{resize:"vertical",fontFamily:"'Barlow',sans-serif"}}/>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button className="btn ghost" style={{flex:1}} onClick={()=>setShowEditVehicle(null)}>Abbrechen</button>
                <button className="btn" style={{flex:1}} onClick={saveVehicleEdit}>Speichern ✓</button>
              </div>
            </div>
          </div>
        )}

          {/* ── CONTACT AUTH SHEET — Login/Register/Guest before sending message ── */}
        {showContactAuth&&(
          <div className="overlay" style={{zIndex:550}} onClick={e=>{if(e.target===e.currentTarget){setShowContactAuth(null);setContactAuthForm({name:"",email:"",code:""});}}}>
            <div className="sheet">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>💬 Nachricht senden</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:18}}>Um eine Nachricht zu senden, identifiziere dich kurz</div>

              <div style={{display:"flex",background:"#111",borderRadius:10,padding:3,marginBottom:16}}>
                {[["guest","Als Gast"],["login","Anmelden"],["register","Registrieren"]].map(([m,label])=>(
                  <button key={m} onClick={()=>setContactAuthMode(m)}
                    style={{flex:1,padding:"9px 4px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,
                      background:contactAuthMode===m?C.red:"transparent",color:contactAuthMode===m?"#fff":C.muted,transition:"all .15s"}}>
                    {label}
                  </button>
                ))}
              </div>

              {contactAuthMode==="guest"&&(
                <div style={{background:"#141414",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:16}}>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:10}}>
                    Kein Account nötig — nur Name und E-Mail für die Zustellung deiner Nachricht.
                  </div>
                  <div style={{fontSize:10,fontWeight:800,color:C.gold,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Als PCN-Mitglied bekommst du zusätzlich</div>
                  {[
                    ["🚗","Eigene digitale Fahrzeugakte"],
                    ["📱","QR-Code fürs eigene Auto"],
                    ["🏁","Direkte Anmeldung zu Club-Events"],
                  ].map(([icon,text])=>(
                    <div key={text} style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:C.white,marginBottom:5}}>
                      <span style={{fontSize:13,flexShrink:0}}>{icon}</span>
                      <span>{text}</span>
                    </div>
                  ))}
                  <button onClick={()=>setContactAuthMode("register")}
                    style={{background:"none",border:"none",color:C.red,fontWeight:700,fontSize:12,cursor:"pointer",padding:0,marginTop:8,fontFamily:"'Barlow',sans-serif"}}>
                    Stattdessen Mitglied werden →
                  </button>
                </div>
              )}

              {(contactAuthMode==="guest"||contactAuthMode==="register")&&(
                <input className="inp" placeholder="Dein Name" style={{marginBottom:8}}
                  value={contactAuthForm.name} onChange={e=>setContactAuthForm(p=>({...p,name:e.target.value}))}/>
              )}

              {contactAuthMode==="register"&&(
                <input className="inp" placeholder="Club-Code" style={{marginBottom:8,textTransform:"uppercase",letterSpacing:2,textAlign:"center",fontWeight:700}}
                  value={contactAuthForm.code} onChange={e=>setContactAuthForm(p=>({...p,code:e.target.value}))}/>
              )}

              <input className="inp" placeholder="E-Mail" type="email" style={{marginBottom:16}}
                value={contactAuthForm.email} onChange={e=>setContactAuthForm(p=>({...p,email:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Enter")handleContactAuth();}}/>

              <button className="btn" style={{width:"100%"}} onClick={handleContactAuth}>
                {contactAuthMode==="guest"?"Weiter zur Nachricht →":contactAuthMode==="login"?"Anmelden →":"Konto erstellen →"}
              </button>

              {contactAuthMode==="login"&&(
                <div style={{textAlign:"center",marginTop:10,fontSize:11,color:C.muted}}>Kein Passwort nötig — nur deine E-Mail</div>
              )}
            </div>
          </div>
        )}

      {/* ── OVERLAYS (rendered in every screen) ── */}
        {showStatusPicker&&(
          <div className="overlay" style={{zIndex:500}} onClick={e=>{if(e.target===e.currentTarget)setShowStatusPicker(null);}}>
            <div className="sheet">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>📍 Status setzen</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Sichtbar wenn jemand deinen QR-Code scannt</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                {STATUS_PRESETS.map((p,i)=>(
                  <button key={i} onClick={()=>setStatus(showStatusPicker,p)}
                    style={{display:"flex",gap:12,alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",textAlign:"left"}}>
                    <span style={{fontSize:24,flexShrink:0}}>{p.icon}</span>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:C.white}}>{p.text}</div>
                      <div style={{fontSize:11,color:C.muted}}>Läuft ab nach {p.mins} Min</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginBottom:10}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Eigener Text</div>
                <div style={{display:"flex",gap:8}}>
                  <input className="inp" placeholder="z.B. Bin gleich beim Einlass..." value={statusCustom}
                    onChange={e=>setStatusCustom(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&statusCustom.trim())setStatus(showStatusPicker,{icon:"💬",mins:30},statusCustom);}}
                    style={{flex:1}}/>
                  <button className="btn" disabled={!statusCustom.trim()}
                    onClick={()=>{if(statusCustom.trim())setStatus(showStatusPicker,{icon:"💬",mins:30},statusCustom);}}
                    style={{flexShrink:0,opacity:statusCustom.trim()?1:.4}}>OK</button>
                </div>
              </div>
              {getActiveStatus(showStatusPicker)&&(
                <button className="btn ghost" style={{width:"100%",marginTop:4,color:"#ef4444",borderColor:"#ef444444"}}
                  onClick={()=>{clearStatus(showStatusPicker);setShowStatusPicker(null);toast_("Status gelöscht");}}>
                  Status löschen
                </button>
              )}
            </div>
          </div>
        )}
        {lightbox&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.97)",zIndex:600,display:"flex",flexDirection:"column"}}
            onClick={()=>setLightbox(null)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>{lightbox.index+1} / {lightbox.images.length}</div>
              <button onClick={()=>setLightbox(null)} style={{background:"rgba(255,255,255,.1)",border:"none",color:"#fff",fontSize:20,width:40,height:40,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 16px",position:"relative"}} onClick={e=>e.stopPropagation()}>
              <img src={lightbox.images[lightbox.index]} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8}}/>
              {lightbox.images.length>1&&<>
                <button onClick={()=>setLightbox(p=>({...p,index:Math.max(0,p.index-1)}))}
                  style={{position:"absolute",left:8,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",fontSize:28,width:44,height:44,borderRadius:"50%",cursor:"pointer",display:lightbox.index===0?"none":"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                <button onClick={()=>setLightbox(p=>({...p,index:Math.min(p.images.length-1,p.index+1)}))}
                  style={{position:"absolute",right:8,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",fontSize:28,width:44,height:44,borderRadius:"50%",cursor:"pointer",display:lightbox.index===lightbox.images.length-1?"none":"flex",alignItems:"center",justifyContent:"center"}}>›</button>
              </>}
            </div>
            {lightbox.images.length>1&&(
              <div style={{display:"flex",gap:6,justifyContent:"center",padding:"16px",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                {lightbox.images.map((_,i)=>(
                  <div key={i} onClick={()=>setLightbox(p=>({...p,index:i}))}
                    style={{width:i===lightbox.index?20:6,height:6,borderRadius:99,background:i===lightbox.index?"#fff":"rgba(255,255,255,.3)",transition:"all .2s",cursor:"pointer"}}/>
                ))}
              </div>
            )}
          </div>
        )}
          {/* Add Log Sheet */}
          {showAddLog===v.id&&(
            <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowAddLog(null);}}>
              <div className="sheet">
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:16}}>Logbuch-Eintrag</div>
                <select className="inp" value={addLogForm.type} onChange={e=>setAddLogForm(p=>({...p,type:e.target.value}))} style={{marginBottom:8}}>
                  {["Ölwechsel","Inspektion","Reifenwechsel","Bremsenwechsel","Hauptuntersuchung","Trackday","Sonstiges"].map(t=><option key={t}>{t}</option>)}
                </select>
                <input className="inp" type="number" inputMode="numeric" placeholder="Kilometerstand *" style={{marginBottom:8}}
                  value={addLogForm.km} onChange={e=>setAddLogForm(p=>({...p,km:e.target.value}))}/>
                <input className="inp" placeholder="Werkstatt" style={{marginBottom:8}}
                  value={addLogForm.workshop} onChange={e=>setAddLogForm(p=>({...p,workshop:e.target.value}))}/>
                <input className="inp" placeholder="Notizen" style={{marginBottom:16}}
                  value={addLogForm.notes} onChange={e=>setAddLogForm(p=>({...p,notes:e.target.value}))}/>
                <button className="btn" style={{width:"100%"}} onClick={()=>addLogEntry(v.id)}>Speichern ✓</button>
              </div>
            </div>
          )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // EVENT DETAIL (proper component — no useState-in-render bug)
  // ══════════════════════════════════════════════════════════════════════════════
  if(screen==="event"&&viewEv) {
    return (
      <>
        <style>{CSS}</style>
        {toast&&<div className={`toast ${toast.type}`}>{toast.msg}</div>}
        <EventDetail
          ev={viewEv} me={me} myVehicles={myVehicles} vehicles={vehicles}
          participants={participants}
          onBack={()=>setScreen("app")}
          onJoin={joinEvent}
          onViewVehicle={v=>{ setViewV(v); setScreen("vehicle"); }}
        />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT (proper component — no useEffect-in-render bug)
  // ══════════════════════════════════════════════════════════════════════════════
  if(screen==="chat"&&activeThread&&threads[activeThread]) {
    const t=threads[activeThread];
    return (
      <>
        <style>{CSS}</style>
        {toast&&<div className={`toast ${toast.type}`}>{toast.msg}</div>}
        <ChatScreen
          thread={t} me={me} allUsers={allUsers} vehicles={vehicles}
          onBack={()=>{setScreen("app");setTab("messages");}}
          onSend={sendMsg}
          onMarkRead={(tid)=>setThreads(prev=>({...prev,[tid]:{...prev[tid],messages:(prev[tid]?.messages||[]).map(m=>({...m,read:true}))}}))}
          onViewVehicle={v=>{setViewV(v);setScreen("vehicle");}}
          onUpgrade={()=>{
            // Pre-fill registration form with the guest's existing name/email — frictionless upgrade
            setLoginForm({mode:"register",code:"",name:me?.name||"",email:me?.email||""});
            setScreen("splash");
            toast_("Fast geschafft — gib nur noch den Club-Code ein 🏁");
          }}
        />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MAIN APP TABS
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{minHeight:"100vh",background:C.black,paddingBottom:62}}>
      <style>{CSS}</style>
      {toast&&<div className={`toast ${toast.type}`}>{toast.msg}</div>}
      {ScannerOverlay}

      {/* Nav */}
      <div style={{background:"#ffffff",borderBottom:`3px solid ${C.red}`,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <img src={LOGO_URL} alt="PCN" onError={e=>e.target.style.display="none"} style={{height:32,objectFit:"contain"}}/>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>{me?.name}</div>
          <div style={{fontSize:10,color:"#888"}}>{me?.memberNr}</div>
        </div>
      </div>

      <div style={{padding:"14px 14px 0",maxWidth:560,margin:"0 auto"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div style={{animation:"fadeIn .2s"}}>

            {/* ── 1. Infos & Neuigkeiten ── */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>📰 Infos & Neuigkeiten</div>

              {/* Willkommen — immer oben, nicht ausblendbar */}
              {(()=>{
                const welcome = DEMO_NEWS.find(n=>n.type==="welcome");
                if(!welcome) return null;
                return (
                  <div style={{background:`${C.gold}12`,border:`1px solid ${C.gold}33`,borderRadius:12,padding:"13px 14px",marginBottom:10}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontSize:20,flexShrink:0}}>🎉</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.white,marginBottom:3}}>{welcome.title}</div>
                        <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{welcome.body}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Neuigkeiten mit Lesen/Erinnern-Aktionen */}
              {DEMO_NEWS.filter(n=>n.type!=="welcome").map(n=>{
                const state = newsState[n.id];
                if(state==="read") return null; // ausgeblendet wenn gelesen
                const isRemind = state==="remind";
                return (
                  <div key={n.id} style={{background:isRemind?`${C.amber}10`:n.pinned?`${C.red}0d`:C.card,
                    border:`1px solid ${isRemind?C.amber+"44":n.pinned?C.red+"33":C.border}`,
                    borderRadius:12,padding:"13px 14px",marginBottom:8}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{n.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                          <div style={{fontSize:13,fontWeight:700,color:C.white,flex:1}}>{n.title}</div>
                          {n.pinned&&<span style={{background:C.red,color:"#fff",fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:4,flexShrink:0}}>NEU</span>}
                          {isRemind&&<span style={{background:`${C.amber}33`,color:C.amber,fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:4,flexShrink:0}}>🔔 ERINNERT</span>}
                        </div>
                        <div style={{fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:8}}>{n.body}</div>
                        {/* Event-Link falls vorhanden */}
                        {n.eventId&&(
                          <button onClick={()=>{const ev=events[n.eventId];if(ev){setViewEv(ev);setScreen("event");}}}
                            style={{background:"none",border:`1px solid ${C.red}44`,borderRadius:7,padding:"5px 10px",color:C.red,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif",marginBottom:8}}>
                            🏁 Zum Event →
                          </button>
                        )}
                        {/* Aktionen */}
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>setNewsState(p=>({...p,[n.id]:"read"}))}
                            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",color:C.muted,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                            ✓ Gelesen
                          </button>
                          <button onClick={()=>setNewsState(p=>({...p,[n.id]:isRemind?undefined:"remind"}))}
                            style={{background:isRemind?`${C.amber}22`:"none",border:`1px solid ${isRemind?C.amber+"44":C.border}`,borderRadius:7,padding:"5px 10px",
                              color:isRemind?C.amber:C.muted,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                            🔔 {isRemind?"Erinnerung aktiv":"Erinnern"}
                          </button>
                          <div style={{fontSize:9,color:"#444",alignSelf:"center",marginLeft:"auto"}}>{fmtDate(n.date)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── 2. Meine Fahrzeuge ── */}
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2}}>🚗 Meine Fahrzeuge</div>
                <button className="btn sm ghost" onClick={()=>setShowAddV(true)}>+ Hinzufügen</button>
              </div>
              {myVehicles.length===0?(
                <div style={{background:C.card,border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"28px",textAlign:"center",cursor:"pointer"}} onClick={()=>setShowAddV(true)}>
                  <div style={{fontSize:32,marginBottom:8}}>🏎️</div>
                  <div style={{fontSize:13,color:C.white,fontWeight:600,marginBottom:4}}>Erstes Fahrzeug hinzufügen</div>
                  <div style={{fontSize:11,color:C.muted}}>Schaltet QR-Code, Logbuch und Events frei</div>
                </div>
              ):myVehicles.map(v=>(
                <div key={v.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden",cursor:"pointer",display:"flex"}}
                  onClick={()=>{setViewV(v);setScreen("vehicle");}}>
                  <div style={{width:90,height:90,overflow:"hidden",background:"#111",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {v.image?<img src={v.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:<span style={{fontSize:28}}>🏎️</span>}
                  </div>
                  <div style={{padding:"12px 13px",flex:1,minWidth:0,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                    <div style={{fontWeight:700,fontSize:14,color:C.white}}>{v.hersteller} {v.modell}</div>
                    <div style={{display:"flex",gap:6,marginTop:5,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{background:"#fff",border:"1.5px solid #222",borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:800,color:"#111",letterSpacing:1,fontFamily:"Arial,sans-serif"}}>
                        {fmtKz(v.kennzeichen,v.baujahr)}
                      </span>
                      <span style={{fontSize:10,color:C.muted}}>{v.baujahr}</span>
                      {(logbook[v.id]||[]).length>0&&<span style={{fontSize:9,color:C.green,fontWeight:700}}>{(logbook[v.id]||[]).length} Einträge</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",paddingRight:12,color:C.muted,fontSize:20}}>›</div>
                </div>
              ))}
            </div>

            {/* ── 3. Plattform-Funktionen ── */}
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2}}>⚙️ Plattform-Funktionen</div>
                <button onClick={()=>setShowInfoModal(true)}
                  style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,lineHeight:1}}>ℹ️</button>
              </div>

              {/* Active functions */}
              {LOCKED_FEATURES.filter(f=>unlockedFeatures.has(f.id)).length>0&&(
                <div style={{marginBottom:10}}>
                  {LOCKED_FEATURES.filter(f=>unlockedFeatures.has(f.id)).map(f=>(
                    <div key={f.id} style={{background:`${C.green}0d`,border:`1px solid ${C.green}33`,borderRadius:11,padding:"12px 14px",marginBottom:7,display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontSize:22,flexShrink:0}}>{f.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.white}}>{f.label}</div>
                        <div style={{fontSize:10,color:C.green,marginTop:2}}>✓ Freigeschaltet · {f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Locked functions — greyed out grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {LOCKED_FEATURES.filter(f=>!unlockedFeatures.has(f.id)).map(f=>(
                  <div key={f.id} style={{background:"#111",border:`1px solid ${C.border}`,borderRadius:11,padding:"12px 11px",opacity:.45,position:"relative"}}>
                    <div style={{position:"absolute",top:7,right:8,fontSize:11}}>🔒</div>
                    <div style={{fontSize:20,marginBottom:5}}>{f.icon}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:2}}>{f.label}</div>
                    <div style={{fontSize:9,color:"#333",lineHeight:1.4}}>{f.milestone}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:10,color:"#444",marginTop:10,textAlign:"center",lineHeight:1.6}}>
                Mehr Funktionen freischalten: Fahrzeug anlegen · Logbuch führen · Events besuchen
              </div>
            </div>
          </div>
        )}

        {/* EVENTS */}
        {tab==="events"&&(
          <div style={{animation:"fadeIn .2s"}}>
            <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Veranstaltungen 2026</div>
            {Object.values(events).sort((a,b)=>new Date(a.date)-new Date(b.date)).map(ev=>{
              const days=daysUntil(ev.date);
              const myReg=(participants[ev.id]||[]).find(p=>p.userId===me?.id);
              return (
                <div key={ev.id} style={{background:C.card,border:`1px solid ${myReg?C.red+"44":C.border}`,borderRadius:12,padding:"14px",marginBottom:10,cursor:"pointer"}}
                  onClick={()=>{setViewEv(ev);setScreen("event");}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{background:`${C.red}22`,color:C.red,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{ev.category}</span>
                    <span style={{fontSize:11,color:days<=7?C.amber:C.muted,fontWeight:600}}>{days<=0?"Heute":days===1?"Morgen":`in ${days} T.`}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:15,color:C.white,marginBottom:2}}>{ev.name}</div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{fmtDate(ev.date)} · {ev.location}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:11,color:C.muted}}>{ev.entryFee}</span>
                    {myReg&&<span style={{background:`${C.green}22`,color:C.green,borderRadius:5,padding:"1px 8px",fontSize:10,fontWeight:700}}>✓ #{myReg.startNr}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MESSAGES */}
        {tab==="messages"&&(
          <div style={{animation:"fadeIn .2s"}}>
            <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>💬 Nachrichten</div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:11,color:C.muted,lineHeight:1.6}}>
              🔒 Nachrichten werden anonym vermittelt — Name und E-Mail bleiben geschützt.
            </div>
            {myThreads.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
                <div style={{fontSize:32,marginBottom:8}}>💬</div>
                <div style={{fontSize:14,color:C.white,marginBottom:4}}>Noch keine Nachrichten</div>
                <div style={{fontSize:12}}>Scanne einen QR-Code am Fahrzeug oder tippe auf „Kontakt" in der Fahrzeugakte</div>
              </div>
            ):myThreads.map(t=>{
              const other=Object.values(allUsers).find(u=>t.participants.includes(u.id)&&u.id!==me?.id)||{name:"Mitglied"};
              const last=t.messages.filter(m=>!m.isSystem).pop();
              const unread=t.messages.some(m=>m.from!==me?.id&&!m.read&&!m.isSystem);
              const tv=vehicles[t.vehicleId];
              const isAnon = t.anonymous;
              return (
                <div key={t.id} style={{background:C.card,border:`1.5px solid ${unread?C.red+"55":C.border}`,borderRadius:14,padding:"14px 14px",marginBottom:10,display:"flex",gap:14,alignItems:"center",cursor:"pointer"}}
                  onClick={()=>{setActiveThread(t.id);setScreen("chat");}}>
                  {/* Avatar: Schloss für anonym, farbige Initiale für Mitglied */}
                  <div style={{width:48,height:48,borderRadius:"50%",
                    background:isAnon?"#1a1a2e":`${C.red}22`,
                    border:`2px solid ${isAnon?"#3a3a5e":C.red+"44"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:800,fontSize:isAnon?22:18,flexShrink:0,
                    color:isAnon?"#6b7fff":C.red}}>
                    {isAnon?"🔒":other.name[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,alignItems:"center"}}>
                      <span style={{fontWeight:unread?800:600,fontSize:15,color:C.white}}>
                        {isAnon?"🔒 Anonyme Nachricht":other.name}
                      </span>
                      <span style={{fontSize:11,color:C.muted,flexShrink:0,marginLeft:6}}>{last?.ts||""}</span>
                    </div>
                    {tv&&<div style={{fontSize:12,color:`${C.red}99`,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Re: {tv.hersteller} {tv.modell}</div>}
                    <div style={{fontSize:13,color:unread?C.white:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {last?(last.from===me?.id?"Du: ":"")+last.text:"Neuer Chat"}
                    </div>
                  </div>
                  {unread&&<div style={{width:10,height:10,borderRadius:"50%",background:C.red,flexShrink:0}}/>}
                </div>
              );
            })}
          </div>
        )}

        {/* REMINDERS */}
        {tab==="reminders"&&(
          <div style={{animation:"fadeIn .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2}}>Erinnerungen</div>
              <button className="btn sm ghost" onClick={()=>setShowAddRem(true)}>+ Neu</button>
            </div>
            {myReminders.length===0
              ?<div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
                  <div style={{fontSize:40,marginBottom:10}}>🎉</div>
                  <div style={{fontSize:16,color:C.white,marginBottom:4}}>Alles erledigt!</div>
                  <div style={{fontSize:13,color:C.muted}}>Keine offenen Erinnerungen</div>
                </div>
              :myReminders.map(r=>{
                const days=daysUntil(r.date); const rv=vehicles[r.vehicleId];
                const urgent = days <= 3;
                const overdue = days < 0;
                return (
                  <div key={r.id} style={{background:C.card,border:`1.5px solid ${overdue?C.red+"66":urgent?C.amber+"55":C.border}`,borderRadius:12,padding:"14px",marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:16,color:overdue?C.red:urgent?C.amber:C.white,marginBottom:4}}>{r.title}</div>
                        {/* Link zur Fahrzeugakte */}
                        {rv&&(
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,cursor:"pointer"}}
                            onClick={()=>{setViewV(rv);setScreen("vehicle");}}>
                            <span style={{fontSize:13,color:C.muted}}>{rv.hersteller} {rv.modell}</span>
                            <span style={{fontSize:11,color:C.red,fontWeight:700}}>→ Zur Akte</span>
                          </div>
                        )}
                        <div style={{fontSize:13,fontWeight:600,color:overdue?C.red:urgent?C.amber:C.muted}}>
                          {overdue?"⚠️ Überfällig":days===0?"📅 Heute fällig":days===1?"📅 Morgen fällig":`📅 In ${days} Tagen`}
                          <span style={{fontWeight:400,color:C.muted}}> · {fmtDate(r.date)}</span>
                        </div>
                      </div>
                      <button onClick={async()=>{const DB=window.PCN_DB;if(DB)await DB.reminders.done(me.id,r.id);setReminders(p=>p.map(x=>x.id===r.id?{...x,done:true}:x));toast_("Erledigt ✓");}}
                        style={{background:C.red,border:"none",borderRadius:10,padding:"10px 16px",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,flexShrink:0,fontFamily:"'Barlow',sans-serif"}}>
                        ✓
                      </button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* PROFILE */}
        {tab==="profile"&&(
          <div style={{animation:"fadeIn .2s"}}>

            {/* ── Punkte-Score — prominent ganz oben ── */}
            <div style={{background:`linear-gradient(135deg, #1a0a0a 0%, #2a0808 100%)`,border:`1px solid ${C.red}44`,borderRadius:16,padding:"20px",marginBottom:14}}>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{width:64,height:64,background:C.red,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,fontWeight:900,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>
                  {(me?.name||"?")[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color:C.white,lineHeight:1}}>{me?.name}</div>
                  <div style={{fontSize:13,color:C.muted,marginTop:3}}>{me?.role==="guest"?"Gast-Account":"PCN-Mitglied"}{me?.memberNr?" · "+me.memberNr:""}</div>
                  {me?.city&&<div style={{fontSize:13,color:C.muted,marginTop:2}}>📍 {me.city}</div>}
                </div>
                <button className="btn sm ghost" style={{flexShrink:0,borderColor:"rgba(255,255,255,.2)",color:"#fff"}} onClick={openEditProfile}>✏️</button>
              </div>

              {/* Punkte-Anzeige */}
              <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid rgba(255,255,255,.1)`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
                  <div>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:36,fontWeight:900,color:C.gold}}>{myPoints}</span>
                    <span style={{fontSize:14,color:C.muted,marginLeft:4}}>Punkte</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,color:C.muted}}>Nächste Stufe</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.gold}}>{pointsToNext} Pkt</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{height:8,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pointsProgress}%`,background:`linear-gradient(90deg, ${C.red}, ${C.gold})`,borderRadius:99,transition:"width .6s ease"}}/>
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:6}}>
                  🏁 {myParticipations.length} Events · 🚗 {myVehicles.length} Fahrzeuge · 📋 {Object.values(logbook).flat().length} Logbuch-Einträge
                </div>
              </div>

              {me?.role==="guest"&&(
                <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid rgba(255,255,255,.1)`,display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{flex:1,fontSize:13,color:C.muted}}>Vollmitglied werden — Fahrzeugakte, QR-Code & Events</div>
                  <button className="btn sm" onClick={()=>{ setLoginForm({mode:"register",code:"",name:me?.name||"",email:me?.email||""}); setScreen("splash"); }}>Upgrade →</button>
                </div>
              )}
            </div>

            {/* ── Statistiken ── */}
            <div className="card" style={{padding:16,marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Statistiken</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["🚗","Fahrzeuge",myVehicles.length],["📋","Logbuch",Object.values(logbook).flat().length],["🏁","Events",myParticipations.length],["💬","Nachrichten",myThreads.length]].map(([icon,label,val])=>(
                  <div key={label} style={{background:C.black,borderRadius:10,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                    <div style={{fontSize:22,fontWeight:800,color:C.white,fontFamily:"'Barlow Condensed',sans-serif"}}>{val}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Milestones ── */}
            <div className="card" style={{padding:16,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Milestones</div>
              {MILESTONES.map(m=>{const done=m.check(appState);return(
                <div key={m.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:done?C.green:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:done?"#fff":C.muted,flexShrink:0,fontWeight:700}}>{done?"✓":"○"}</div>
                  <span style={{fontSize:14,color:done?C.white:C.muted,flex:1}}>{m.label}</span>
                  {done&&<span style={{fontSize:11,color:C.green,fontWeight:700}}>AKTIV</span>}
                </div>
              );})}
            </div>

            <button className="btn ghost" style={{width:"100%",fontSize:15,padding:"14px"}} onClick={async()=>{
              const DB=window.PCN_DB; if(DB) await DB.auth.logout();
              setMe(null);setVehicles({});setLogbook({});setReminders([]);setParticipants({});setThreads({});
              setScreen("splash"); setTab("dashboard");
            }}>Abmelden</button>
          </div>
        )}
      </div>

      {/* overlays moved to each screen */}

      {/* ── INFO MODAL ── */}
      {showInfoModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
          onClick={()=>setShowInfoModal(false)}>
          <div style={{background:C.dark,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",maxWidth:380,width:"100%",animation:"fadeIn .2s"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:C.white,marginBottom:6}}>
              ⚙️ Funktionen freischalten
            </div>
            <div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:20}}>
              Zusätzliche Plattform-Funktionen werden auf drei Wegen freigeschaltet:
            </div>
            {[
              [C.gold,"💳","Bezahlung","Aktiviere die Premium-Mitgliedschaft und erhalte sofortigen Zugang zu allen Funktionen — KI-Marktwert, Werkstatt-Zugang, digitaler Fahrzeugpass und mehr."],
              [C.green,"🏆","Punkte sammeln","Jede Veranstaltungsteilnahme bringt Punkte. Ab bestimmten Schwellenwerten schalten sich neue Funktionen automatisch frei — Belohnung für aktive Mitglieder."],
              [C.red,"👥","Mitglieder werben","Lade neue Mitglieder in den Club ein. Pro erfolgreich geworbenes Mitglied erhältst du Bonus-Punkte und schaltest exklusive Funktionen frei."],
            ].map(([color,icon,title,text])=>(
              <div key={title} style={{display:"flex",gap:14,marginBottom:18,alignItems:"flex-start"}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${color}22`,border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.white,marginBottom:4}}>{title}</div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>{text}</div>
                </div>
              </div>
            ))}
            <button className="btn" style={{width:"100%",padding:"14px",fontSize:15,marginTop:4}}
              onClick={()=>setShowInfoModal(false)}>Verstanden ✓</button>
          </div>
        </div>
      )}

      {/* ── PROFILE EDIT SHEET ── */}
      {showEditProfile&&(
        <div className="overlay" style={{zIndex:500}} onClick={e=>{if(e.target===e.currentTarget)setShowEditProfile(false);}}>
          <div className="sheet">
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>✏️ Profil bearbeiten</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:18}}>Deine persönlichen Angaben</div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Persönlich</div>
              <input className="inp" placeholder="Name *" value={profileForm.name||""}
                onChange={e=>setProfileForm(p=>({...p,name:e.target.value}))} style={{marginBottom:8}}/>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,color:C.muted}}>{me?.email}</span>
                <span style={{fontSize:10,color:"#444"}}>E-Mail (nicht änderbar)</span>
              </div>
              <input className="inp" placeholder="Telefon (optional)" type="tel" value={profileForm.phone||""}
                onChange={e=>setProfileForm(p=>({...p,phone:e.target.value}))} style={{marginBottom:8}}/>
              <input className="inp" placeholder="Wohnort (z.B. Koblenz)" value={profileForm.city||""}
                onChange={e=>setProfileForm(p=>({...p,city:e.target.value}))} style={{marginBottom:8}}/>
              <textarea className="inp" placeholder="Kurzbeschreibung (optional, z.B. Porsche-Fan seit 2010, Nordschleife-Enthusiast)"
                rows={2} value={profileForm.bio||""} onChange={e=>setProfileForm(p=>({...p,bio:e.target.value}))}
                style={{resize:"none",fontFamily:"'Barlow',sans-serif"}}/>
            </div>

            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Benachrichtigungen</div>
              {[
                ["notifications_events","🏁  Event-Erinnerungen","Neue Events und Anmeldungsbestätigungen"],
                ["notifications_messages","💬  Neue Nachrichten","Eingehende Nachrichten im Chat"],
              ].map(([key,label,sub])=>(
                <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div>
                    <div style={{fontSize:13,color:C.white}}>{label}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{sub}</div>
                  </div>
                  <button className={`tog ${profileForm[key]?"on":"off"}`}
                    onClick={()=>setProfileForm(p=>({...p,[key]:!p[key]}))}/>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:8}}>
              <button className="btn ghost" style={{flex:1}} onClick={()=>setShowEditProfile(false)}>Abbrechen</button>
              <button className="btn" style={{flex:1}} onClick={saveProfile}>Speichern ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Sheet */}
      {showAddV&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowAddV(false);}}>
          <div className="sheet">
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:14}}>Fahrzeug hinzufügen</div>
            {/* Multi-photo upload */}
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:6}}>
                {(addVForm.images||[]).map((img,i)=>(
                  <div key={i} style={{position:"relative",flexShrink:0}}>
                    <img src={img} alt="" style={{width:70,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.border}`}}/>
                    <button onClick={()=>setAddVForm(p=>({...p,images:p.images.filter((_,j)=>j!==i)}))}
                      style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,.7)",border:"none",color:"#fff",fontSize:10,width:18,height:18,borderRadius:"50%",cursor:"pointer"}}>✕</button>
                  </div>
                ))}
                <label style={{width:70,height:70,background:C.card,border:`1px dashed ${C.border}`,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,gap:2}}>
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImageUpload(e.target.files[0],url=>setAddVForm(p=>({...p,images:[...(p.images||[]),url]})))}/>
                  <span style={{fontSize:20}}>📷</span>
                  <span style={{fontSize:9,color:C.muted}}>Foto</span>
                </label>
              </div>
              <div style={{fontSize:11,color:C.muted}}>Mehrere Fotos möglich — erstes Foto = Titelbild</div>
            </div>
            {[["Modell *","modell","Cayman GT4"],["Kennzeichen *","kennzeichen","AW-PC 718"],["Baujahr","baujahr","2023"],["Farbe","farbe","Pythongrün"]].map(([ph,key,ex])=>(
              <input key={key} className="inp" placeholder={`${ph} (z.B. ${ex})`} style={{marginBottom:8}}
                value={addVForm[key]||""} onChange={e=>setAddVForm(p=>({...p,[key]:e.target.value}))}/>
            ))}
            <select className="inp" value={addVForm.kraftstoff} onChange={e=>setAddVForm(p=>({...p,kraftstoff:e.target.value}))} style={{marginBottom:10}}>
              {["Benzin","Diesel","Elektro","Hybrid"].map(k=><option key={k}>{k}</option>)}
            </select>
            <select className="inp" value={addVForm.getriebe||"PDK"} onChange={e=>setAddVForm(p=>({...p,getriebe:e.target.value}))} style={{marginBottom:8}}>
              {["PDK","7-Gang PDK","6-Gang manuell","8-Gang Automatik","Stufenlos"].map(k=><option key={k}>{k}</option>)}
            </select>
            <input className="inp" placeholder="Telefon (optional, für Direktanruf)" type="tel"
              value={addVForm.phone||""} onChange={e=>setAddVForm(p=>({...p,phone:e.target.value}))}
              style={{marginBottom:6}}/>
            <div style={{fontSize:10,color:C.muted,marginBottom:14}}>🔒 Standardmäßig privat — Sichtbarkeit in QR-Einstellungen</div>
            <button className="btn" style={{width:"100%"}} onClick={addVehicle}>Hinzufügen ✓</button>
          </div>
        </div>
      )}

      {/* Add Reminder Sheet */}
      {showAddRem&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowAddRem(false);}}>
          <div className="sheet">
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:14}}>Erinnerung</div>
            <input className="inp" placeholder="Titel *" style={{marginBottom:8}} value={remForm.title} onChange={e=>setRemForm(p=>({...p,title:e.target.value}))}/>
            <input className="inp" type="date" style={{marginBottom:8}} value={remForm.date} onChange={e=>setRemForm(p=>({...p,date:e.target.value}))}/>
            <select className="inp" style={{marginBottom:14}} value={remForm.vehicleId} onChange={e=>setRemForm(p=>({...p,vehicleId:e.target.value}))}>
              <option value="">Kein Fahrzeug</option>
              {myVehicles.map(v=><option key={v.id} value={v.id}>{v.hersteller} {v.modell}</option>)}
            </select>
            <button className="btn" style={{width:"100%"}} onClick={async()=>{
              if(!remForm.title||!remForm.date){toast_("Titel und Datum angeben","err");return;}
              const DB=window.PCN_DB;
              const {data:r,error}=await DB.reminders.save(me.id,{...remForm,done:false});
              if(error){toast_("Fehler","err");return;}
              setReminders(prev=>[...prev,r]); setShowAddRem(false); setRemForm({vehicleId:"",title:"",date:""});
              toast_("Gespeichert ✓");
            }}>Speichern ✓</button>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar">
        {/* Scan button — far left, always visible */}
        <button className="tab-btn" onClick={openScanner} style={{color:C.red}}>
          <span className="ico">📷</span>
          <span className="lbl">Scan</span>
        </button>
        {[["dashboard","🏠","Start"],["events","🏁","Events"],["messages","💬","Chat"],["reminders","🔔","Termine"],["profile","👤","Profil"]].map(([id,icon,label])=>(
          <button key={id} className={`tab-btn ${tab===id?"on":""}`} onClick={()=>setTab(id)}>
            {id==="messages"&&unreadCount>0&&<div className="badge">{unreadCount}</div>}
            <span className="ico">{icon}</span>
            <span className="lbl">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
