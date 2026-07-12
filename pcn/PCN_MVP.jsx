// PCN — Porsche Club Nürburgring · Digitale Clubplattform v3
// Vollständig neu geschrieben — alle Bugs behoben

import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Error Boundary — catches crashes, shows message instead of black screen ──
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(error){ return {hasError:true,error}; }
  componentDidCatch(error,info){
    console.error("[PCN]",error,info);
    try {
      if(window.Sentry) window.Sentry.captureException(error,{extra:info});
      // Lightweight beacon fallback
      const p={error:error?.message,url:window.location.href,ts:new Date().toISOString()};
      navigator.sendBeacon&&navigator.sendBeacon("/log",JSON.stringify(p));
    } catch(e2){}
  }
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
  besonderheiten:true, fin:false, marktwert:false,
  pub_logbook:false, pub_events:true, pub_phone:false, pub_gallery:true,
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
// Sponsor config — set in pcn_config.js: window.PCN_SPONSOR = {name:"Porschezentrum Koblenz", url:"https://...", logo:"https://..."}
const SPONSOR = typeof window !== "undefined" ? (window.PCN_SPONSOR || null) : null;

// Demo group channel messages
const DEMO_GROUP = {
  id:"GROUP_PCN",
  name:"PCN Mitglieder",
  vehicleName:"PCN Club-Kanal",
  icon:"🏎️",
  isGroup:true,
  anonymous:false,
  participants:["u1","u2","u3"],
  messages:[
    {id:"GM1",from:"u2",text:"Hat jemand schon Startnummern für den TrackDay bekommen?",ts:"09:14",read:true,isSystem:false},
    {id:"GM2",from:"u3",text:"Ja! Ich bin #03 in der Race-Klasse 🏁",ts:"09:22",read:true,isSystem:false},
    {id:"GM3",from:"u1",text:"Ich fahre #07 Sport — freue mich schon!",ts:"09:31",read:true,isSystem:false},
    {id:"GM4",from:"u2",text:"Wer fährt mit dem Anhänger? Kann jemanden mitnehmen",ts:"10:05",read:false,isSystem:false},
    {id:"GM5",from:"system",text:"PCN TrackDay Nürburgring — in 12 Tagen 🏁",ts:"10:00",read:true,isSystem:true},
  ]
};

const DEMO_NEWS = [
  { id:"N0", type:"newsletter", icon:"📬", pinned:true,
    title:"Newsletter Juli 2026 — Termine & Veranstaltungen",
    date:"2026-07-09",
    author:"PCN Vorstand",
    body:"Liebe Mitglieder und Freunde des Porsche Club Nürburgring,\n\nvielen Dank für die zahlreiche Teilnahme an der Nürburgring Classic. Unser Stand war ein großer Erfolg und eine tolle Visitenkarte für unseren Club.\n\nNachfolgend die anstehenden Termine für Juli und August, sowie zwei Hinweise für September und Oktober.\n\n7.–9. August: 53. Bellmot Oldtimer Grand Prix. Wie immer haben wir unser Zelt und die Stellfläche für Ausstellungsfahrzeuge (mit H-Kennzeichen) im Bereich des Vorstarts im Fahrerlager. Aufgrund des besonderen Status, den wir beim Veranstalter und dem Nürburgring genießen, wurde unserer Bitte nach der Vergrößerung unserer Stellfläche berücksichtigt, so dass wir nun über 10×30 Meter Platz verfügen.\n\nVergünstigte Tickets:\n• Wochenendtickets: 49 EUR\n• Wochenendtickets inkl. Parkplatz Mercedes-Arena: 120 EUR\nDie Tickets können ab Ende nächster Woche auf der Homepage bestellt werden.\n\n10. September: PCN TrackDay Grand Prix Strecke. Auch in diesem Jahr werden wir wieder unseren TrackDay auf der Grand Prix Strecke durchführen. Nach dem erfolgreichen TrackDay 2025 hoffen wir auch in diesem Jahr auf eine rege Teilnahme. Wie immer werden noch Helfer für den Tag gesucht, die bei der Zufahrtskontrolle / Boxengasse helfen und auch gerne beim Auf- und Abbau zur Verfügung stehen.\n\n22.–25. Oktober: Saisonabschluss-Fahrt Bodensee-Region. Geplant ist ein mehrtägiger Ausflug in die Bodensee-Region. Abfahrt wäre, bei ausreichendem Interesse, wahrscheinlich der 22. Oktober, Rückfahrt am 25. Oktober. Vorgesehen ist die Unterbringung in einem Hotel am Bodensee. Die Streckenplanung übernimmt der Präsident des Porsche Club Bodensee-Oberschwaben.\n\nWeitere Termine im September und Oktober sind bereits auf der Homepage eingepflegt."},
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
  "u1":{id:"a0000000-0000-0000-0000-000000000001",name:"Max Mustermann",email:"max@pcn.de",role:"member",memberNr:"PCN-0847",city:"Adenau",beitragBezahlt:true,joinedAt:"2021-03-15",avatar:null},
  "u2":{id:"u2",name:"Thomas Weber",email:"thomas@pcn.de",role:"member",memberNr:"PCN-0312"},
  "u3":{id:"u3",name:"Anna Fischer",email:"anna@pcn.de",role:"member",memberNr:"PCN-0561"},
};

const DEMO_VEHICLES = {
  // ── Max: Porsche 911 Carrera 4S, GT-Silbermetallic ──────────────────────────
  // Alle Bilder zeigen denselben silbernen 911 aus verschiedenen Perspektiven
  "V001":{id:"V001",qarId:"QAR-R4T8W3NX",userId:"u1",owner:"max@pcn.de",
    hersteller:"Porsche",modell:"911 GTS",baujahr:"2019",
    kraftstoff:"Benzin",getriebe:"PDK",farbe:"GT-Silbermetallic",
    kennzeichen:"AW-PC 911",fin:"WP0ZZZ99ZLS100001",phone:"+49 171 9110911",
    kilometerstand:"32.400",tuev_faelligkeit:"02/2027",marktwert:"138.000",zustand:"1",
    besonderheiten:"Sport-Chrono, PASM, Sportabgasanlage, PCCB",
    image:"https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-01-1024x683.jpg",
    images:[
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-01-1024x683.jpg",
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-02-1024x683.jpg",
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-03-1024x683.jpg",
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-04-1024x683.jpg",
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-05-1024x683.jpg",
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-07-1024x683.jpg",
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-06-1024x683.jpg",
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-10-1024x683.jpg",
      "https://photos.prestigeimports.net/prestige-imports-content/uploads/2021/11/2019-Porsche-911-Carrera-GTS-WP0AB2A93KS114265-12-1024x683.jpg",
    ],
    privacy:{...DEF_PRIVACY, pub_phone:true, pub_gallery:true, pub_events:true}},

  // ── Max: Porsche 718 Boxster GTS 4.0, Karminrot ─────────────────────────────
  "V002":{id:"V002",qarId:"QAR-K9P2M7RW",userId:"7701c779-1568-4c42-aa2d-b8506bc3e988",owner:"business@gear7.de",
    hersteller:"Porsche",modell:"718 Boxster GTS 4.0",baujahr:"2021",
    kraftstoff:"Benzin",getriebe:"PDK",farbe:"Karminrot",
    kennzeichen:"MYK-PC 718",phone:"+49 171 9110718",
    kilometerstand:"17056",tuev_faelligkeit:"06/2028",
    marktwert:"85000",zustand:"1",
    besonderheiten:"Sport Chrono Plus, PDLS+, Bose, Carbon-Zierleisten, Leder/Alcantara, 400 PS Saugmotor 4.0L, Erstbesitz",
    image:"https://cdn.elferspot.com/wp-content/uploads/2023/02/10/unnamed-file.jpg?class=xl",
    images:[
      "https://cdn.elferspot.com/wp-content/uploads/2023/02/10/unnamed-file.jpg?class=xl",
      "https://cdn.elferspot.com/wp-content/uploads/2023/02/14/DSC03430-groot.jpeg?class=xl",
      "https://cdn.elferspot.com/wp-content/uploads/2023/02/14/DSC03379-groot.jpeg?class=xl",
      "https://cdn.elferspot.com/wp-content/uploads/2023/02/14/DSC03371-groot.jpeg?class=xl",
      "https://cdn.elferspot.com/wp-content/uploads/2023/02/14/DSC03434-groot.jpeg?class=xl",
      "https://cdn.elferspot.com/wp-content/uploads/2023/02/14/DSC03424-groot.jpeg?class=xl",
      "https://cdn.elferspot.com/wp-content/uploads/2023/02/10/Boxster-GTS.jpg?class=xl",
    ],
    privacy:{...DEF_PRIVACY, pub_phone:true, pub_gallery:true, pub_events:true}},

  // ── Thomas: Porsche 992 GT3, Riviera Blau ───────────────────────────────────
  "V003":{id:"V003",qarId:"QAR-T7M3N9PX",userId:"7701c779-1568-4c42-aa2d-b8506bc3e988",owner:"business@gear7.de",
    hersteller:"Porsche",modell:"992 GT3",baujahr:"2022",
    kraftstoff:"Benzin",getriebe:"PDK",farbe:"Riviera Blau",
    kennzeichen:"MYK-PC 992",fin:"WP0AC2A92NS230001",phone:"+49 172 5550992",
    kilometerstand:"8200",tuev_faelligkeit:"06/2027",marktwert:"195000",zustand:"1",
    besonderheiten:"Clubsport-Paket, Liftsystem, Carbon-Dach, PDK, Weissach-Paket",
    image:"https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=900&q=85",
    images:[
      "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=900&q=85",
      "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=900&q=85",
    ],
    privacy:{...DEF_PRIVACY, pub_events:true, pub_gallery:true, pub_phone:true}},

  // ── Max: Porsche 904 Carrera GTS, Oldtimer ───────────────────────────────────
  "V004":{id:"V004",qarId:"QAR-W2L8X4KR",userId:"7701c779-1568-4c42-aa2d-b8506bc3e988",owner:"business@gear7.de",
    hersteller:"Porsche",modell:"904 Carrera GTS",baujahr:"1964",
    kraftstoff:"Benzin",getriebe:"5-Gang manuell",farbe:"Irischgrün",
    kennzeichen:"MYK-PC 904",fin:"904012",phone:"+49 172 5550904",
    kilometerstand:"42800",tuev_faelligkeit:"12/2026",marktwert:"1400000",zustand:"1",
    besonderheiten:"FIN 904012 · Ehem. Robert Redford · Glasfaser-Karosserie · Rally Monte Carlo 1965 · Bonhams Paris 2022 ~1,4 Mio EUR",
    image:"https://www.secret-classics.com/wp-content/uploads/2022/02/image-3.jpeg",
    images:[
      "https://www.secret-classics.com/wp-content/uploads/2022/02/image-3.jpeg",
      "https://www.secret-classics.com/wp-content/uploads/2023/10/image-4.jpeg",
      "https://www.secret-classics.com/wp-content/uploads/2023/10/image-5-1024x683.jpeg",
      "https://www.secret-classics.com/wp-content/uploads/2023/10/image-6-1024x683.jpeg",
      "https://www.secret-classics.com/wp-content/uploads/2023/10/image-1.jpeg",
      "https://www.secret-classics.com/wp-content/uploads/2023/10/image-2.jpeg",
      "https://www.secret-classics.com/wp-content/uploads/2023/10/image-8-edited.jpeg",
      "https://www.secret-classics.com/wp-content/uploads/2023/10/image-1-1-1024x683.jpeg",
    ],
    privacy:{...DEF_PRIVACY, pub_events:true, pub_gallery:true, pub_phone:true, marktwert:true}},
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
  "E010":[
    {id:"P1",eventId:"E010",vehicleId:"V001",userId:"u1",class:"Sport",startNr:"07",status:"confirmed"},
    {id:"P2",eventId:"E010",vehicleId:"V003",userId:"u2",class:"Race",startNr:"03",status:"confirmed"},
  ],
  "E006":[
    {id:"P3",eventId:"E006",vehicleId:"V004",userId:"u1",class:"H-Kennzeichen",startNr:"12",status:"confirmed"},
  ],
};

const DEMO_HISTORY = [
  {id:"H1",vehicleId:"V001",eventName:"PCN TrackDay 2025",date:dMinus(280),startNr:"05",class:"Sport",result:"Finisher",note:"Bestzeit 9:43 min Nordschleife"},
  {id:"H2",vehicleId:"V001",eventName:"After Work Classics Sep 2025",date:dMinus(310),startNr:"11",class:"Alle Modelle",result:"Teilnahme",note:""},
  {id:"H3",vehicleId:"V003",eventName:"PCN TrackDay 2025",date:dMinus(280),startNr:"02",class:"Race",result:"Schnellste Zeit",note:"7:58 min — Clubrekord"},
];

// Events now live in Supabase — loaded on login
const DEMO_EVENTS = {};
const DEMO_INSURANCE = {
  "V001":[
    {id:"I1",vehicleId:"V001",type:"Vollkasko",provider:"Allianz Classic",nr:"ALZ-2024-911GTS",since:"2024-01-01",until:"2024-12-31",premium:"€ 1.840/Jahr",note:"Agreed Value € 138.000. Saisonkennzeichen 03-11.",status:"aktiv"},
  ],
  "V002":[
    {id:"I2",vehicleId:"V002",type:"Vollkasko Sport",provider:"Hiscox Motorsport",nr:"HX-2024-718GTS",since:"2024-03-01",until:"2025-02-28",premium:"€ 1.290/Jahr",note:"Track-Day mitversichert. Fahrzeugwert: € 85.000",status:"aktiv"},
  ],
  "V003":[
    {id:"I3",vehicleId:"V003",type:"Vollkasko Sport",provider:"HDI Motorsport",nr:"HDI-MS-2024-449871",since:"2024-03-01",until:"2025-02-28",premium:"€ 2.890/Jahr",note:"Track-Day mitversichert bis 150 km/h. Fahrzeugwert: € 198.000",status:"aktiv"},
  ],
  "V004":[
    {id:"I4",vehicleId:"V004",type:"Oldtimer Vollkasko",provider:"Allianz Classic",nr:"ALZ-2024-904GTS",since:"2024-01-01",until:"2024-12-31",premium:"€ 4.200/Jahr",note:"Agreed Value € 1.400.000. Nur Oldtimer-Veranstaltungen mitversichert.",status:"aktiv"},
  ],
};

const DEMO_GUTACHTEN = {
  "V001":[
    {id:"G1",vehicleId:"V001",date:dMinus(45),type:"Wertgutachten",gutachter:"DEKRA Koblenz — Dipl.-Ing. Martin Kraft",wert:"€ 138.000",km:"32.100",zustand:"1–2 (sehr gut)",note:"Keine Vorschäden. Servicehistorie lückenlos. Originalzustand bis auf Sport-Chrono-Nachrüstung (wertsteigernd).",signiert:true},
    {id:"G2",vehicleId:"V001",date:dMinus(380),type:"Schadensgutachten",gutachter:"KFZ-Sachverständigenbüro Müller",wert:"Reparaturkosten: € 4.300",km:"28.400",zustand:"Heckschaden links",note:"Parkrempler auf dem PCN-Herbstausfahrt Parkplatz. Lackschaden Stossfänger hinten links + Nebelleuchte. Vollständig repariert, keine Wertminderung.",signiert:true},
  ],
  "V003":[
    {id:"G3",vehicleId:"V003",date:dMinus(15),type:"Wertgutachten",gutachter:"TÜV Rheinland — Dr. Stefan Berger",wert:"€ 195.000",km:"8.100",zustand:"1 (neuwertig)",note:"Fahrzeug in absolutem Neuzustand. Alle Originalteile. Seltene Konfiguration (Riviera Blau mit Weissach-Paket). Wertsteigerungspotential vorhanden.",signiert:true},
  ],
};

const DEMO_THREADS = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890":{
    id:"a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    participants:["a0000000-0000-0000-0000-000000000001","7701c779-1568-4c42-aa2d-b8506bc3e988"],
    vehicleId:"V004",vehicleName:"Porsche 904 Carrera GTS",anonymous:false,
    messages:[
      {id:"DM1",from:"a0000000-0000-0000-0000-000000000001",text:"Hallo! Ich habe gerade Ihren 904 Carrera GTS via QR-Code gescannt — was für ein beeindruckendes Fahrzeug. Ist das wirklich das Exemplar von Monte Carlo 1965?",created_at:"2026-07-12T11:23:00+00:00",read:true},
      {id:"DM2",from:"7701c779-1568-4c42-aa2d-b8506bc3e988",text:"Ja, genau! FIN 904012, einer von 16 werksseitig eingesetzten Rennwagen. Das Fahrzeug war 1965 in Monaco am Start. Die Provenienz ist lückenlos dokumentiert.",created_at:"2026-07-12T11:24:15+00:00",read:true},
      {id:"DM3",from:"a0000000-0000-0000-0000-000000000001",text:"Unglaublich. Ich bin selbst PCN-Mitglied — Max Mustermann, PCN-0847. Bringen Sie den 904 zum Bellmot Grand Prix im August? Das wäre ein Highlight auf unserer Stellfläche.",created_at:"2026-07-12T11:25:30+00:00",read:true},
      {id:"DM4",from:"7701c779-1568-4c42-aa2d-b8506bc3e988",text:"Das ist geplant! Als Ausstellungsfahrzeug ist er natürlich dabei. Freue mich auf den Austausch beim Clubabend.",created_at:"2026-07-12T11:26:45+00:00",read:true},
      {id:"DM5",from:"a0000000-0000-0000-0000-000000000001",text:"Perfekt — dann sehen wir uns am 7. August! Ich bringe meinen 911 GTS mit. Falls Sie die Fahrzeugakte teilen möchten, wäre das für unser Clubarchiv fantastisch.",created_at:"2026-07-12T11:27:50+00:00",read:true},
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
  {id:"marktwert",icon:"💶",label:"KI-Marktwertanalyse",milestone:"3 Logbuch-Einträge",
    desc:"KI-gestützte Bewertung anhand deiner Fahrzeughistorie und aktueller Marktrecherche.",
    detail:"Die KI analysiert deine Fahrzeughistorie, das Logbuch und führt eine aktuelle Marktrecherche auf Plattformen wie Elferspot, Mobile.de und Autoscout24 durch.\n\nEinbezogen werden: Kilometerstand, Baujahr, Ausstattung, Farbe, Pflegezustand und Vollständigkeit der Dokumentation.\n\nDas Ergebnis: ein realistischer Marktwert mit Spanne (konservativ / optimistisch) — ideal für Versicherungsverträge, Verkaufsgespräche oder die eigene Planung.\n\nWird automatisch aktualisiert wenn neue Logbuch-Einträge hinzukommen."},
  {id:"history",icon:"⏱️",label:"Rundenzeiten",milestone:"Erste Event-Teilnahme",
    desc:"Nordschleife-Bestzeiten tracken und mit Clubmitgliedern vergleichen.",
    detail:"Nach deiner ersten Event-Teilnahme wird das Rundenzeiten-Modul freigeschaltet. Du kannst eigene Zeiten auf der Nordschleife und Grand-Prix-Strecke eintragen, mit Fahrzeug und Setup verknüpfen und im Clubranking vergleichen.\n\nDie Zeiten werden automatisch mit dem passenden Event aus deiner Veranstaltungshistorie verknüpft — so entsteht eine vollständige Performance-Dokumentation."},
  {id:"fleet",icon:"📊",label:"Fuhrpark-Analyse",milestone:"2 Fahrzeuge",
    desc:"Kosten pro Kilometer und Wertverlauf über alle Fahrzeuge im Überblick.",
    detail:"Ab zwei Fahrzeugen in der Akte berechnet die Fuhrpark-Analyse automatisch: Kosten pro Kilometer (Betriebskosten, Service, Versicherung), Wertverlauf über Zeit, und eine Gegenüberstellung beider Fahrzeuge.\n\nBesonders hilfreich für Mitglieder mit Alltagsfahrzeug und Porsche — der direkte Vergleich zeigt den tatsächlichen Aufwand pro Kilometer."},
  {id:"workshop",icon:"🔧",label:"Werkstatt-Zugang",milestone:"Partnerschaft aktiv",
    desc:"PCN-Partnerwerkstätten greifen direkt auf die digitale Akte zu.",
    detail:"Mit aktivierter Werkstatt-Partnerschaft kann dein bevorzugter Betrieb (z.B. Porsche Zentrum Koblenz) die digitale Fahrzeugakte direkt einsehen — inklusive Servicehistorie, Logbuch und letzten Einträgen.\n\nDu entscheidest per Toggle welche Daten sichtbar sind. Der Werkstatt-Zugang wird per QR-Code oder Link aktiviert und kann jederzeit widerrufen werden."},
  {id:"insurer",icon:"🛡️",label:"Versicherer-Zugang",milestone:"Club-Partner",
    desc:"Allianz Classic sieht deine vollständige Dokumentation für bessere Konditionen.",
    detail:"Als PCN-Clubmitglied profitierst du vom direkten Versicherer-Zugang für Allianz Classic. Deine lückenlose Dokumentation — Logbuch, Servicehistorie, Gutachten — wird direkt übermittelt.\n\nMögliche Vorteile: bessere Einstufung, schnellere Schadensabwicklung, günstigere Agreed-Value-Prämien. Die Datenweitergabe erfolgt nur mit deiner ausdrücklichen Freigabe."},
  {id:"token",icon:"🪙",label:"Digitaler Fahrzeugpass",milestone:"Beta-Programm",
    desc:"Blockchain-basierter Eigentumsnachweis für deinen Porsche.",
    detail:"Der digitale Fahrzeugpass ist ein QAR-zertifiziertes Dokument auf Blockchain-Basis — fälschungssicher, dauerhaft und übertragbar.\n\nBeim Verkauf des Fahrzeugs kann der neue Besitzer die komplette Dokumentation direkt übernehmen: Servicehistorie, Logbuch, Events, Fotos. Ein echtes Alleinstellungsmerkmal das den Verkaufswert nachweisbar steigert.\n\nDerzeit im Beta-Programm — Teilnahme für PCN-Mitglieder auf Anfrage."},
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

function EventDetail({ev, me, myVehicles, vehicles, participants, onBack, onJoin, onCancel, onViewVehicle}) {
  const [selV, setSelV] = useState(myVehicles[0]?.id||"");
  const [selC, setSelC] = useState((ev.classes||["Alle Modelle"])[0]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const evParts = (participants[ev.id]||[]).filter(p=>p.status!=="cancelled");
  const confirmedParts = evParts.filter(p=>p.status==="confirmed");
  const myReg = (participants[ev.id]||[]).find(p=>p.userId===me?.id&&p.status!=="cancelled");
  const days = daysUntil(ev.date);
  const spotsLeft = (ev.maxParticipants||100) - confirmedParts.length;
  const isPast = new Date(ev.date) < new Date();

  const statusColor = myReg?.status==="confirmed" ? C.green : myReg?.status==="pending" ? C.amber : "#ef4444";
  const statusLabel = myReg?.status==="confirmed"
    ? `✓ Bestätigt${myReg.startNr?" — #"+myReg.startNr:""}`
    : myReg?.status==="pending" ? "🟡 Anmeldung eingegangen" : "✗ Abgelehnt";

  return (
    <div style={{minHeight:"100vh",background:C.black,paddingBottom:40,animation:"fadeIn .2s"}}>
      {/* Header */}
      <div style={{background:C.dark,borderBottom:`1px solid ${C.border}`,padding:"14px 16px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0,marginBottom:10}}>← Events</button>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <span style={{background:`${C.red}22`,color:C.red,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{ev.category||"Event"}</span>
          <span style={{background:isPast?"#33333322":days<=7?`${C.amber}22`:`${C.border}22`,
            color:isPast?C.muted:days<=7?C.amber:C.muted,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>
            {isPast?"Abgeschlossen":days<=0?"Heute":days===1?"Morgen":`in ${days} T.`}
          </span>
          {!isPast&&<span style={{background:spotsLeft<=5?`${C.red}22`:`${C.green}11`,color:spotsLeft<=5?C.red:C.green,
            borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>
            {spotsLeft<=0?"Ausgebucht":`${spotsLeft} Plätze frei`}
          </span>}
        </div>
        <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color:C.white,lineHeight:1.1}}>{ev.name}</h1>
      </div>

      <div style={{padding:"16px",maxWidth:520,margin:"0 auto"}}>
        {/* Event Info */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:14}}>
          {[
            ["📅", fmtDate(ev.date), "Datum"],
            ["📍", ev.location, "Ort"],
            ["💶", ev.entryFee||ev.price||"Kostenlos", "Eintritt"],
            ["👥", `${confirmedParts.length} / ${ev.maxParticipants||100}`, "Bestätigte Teilnehmer"],
          ].filter(([,v])=>v).map(([icon,val,label])=>(
            <div key={label} style={{display:"flex",gap:10,marginBottom:8,alignItems:"center"}}>
              <span style={{width:20,textAlign:"center"}}>{icon}</span>
              <span style={{fontSize:11,color:C.muted,minWidth:60}}>{label}</span>
              <span style={{fontSize:13,color:C.white,fontWeight:600}}>{val}</span>
            </div>
          ))}
          {ev.description&&<p style={{fontSize:12,color:"#bbb",lineHeight:1.75,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>{ev.description}</p>}
        </div>

        {/* ── Mein Anmeldestatus ── */}
        {myReg&&(
          <div style={{background:`${statusColor}11`,border:`2px solid ${statusColor}33`,borderRadius:14,padding:"16px",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:16,color:statusColor,marginBottom:4}}>{statusLabel}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>
              {vehicles[myReg.vehicleId]&&`${vehicles[myReg.vehicleId].hersteller} ${vehicles[myReg.vehicleId].modell}`}
              {myReg.class&&` · ${myReg.class}`}
            </div>
            {myReg.status==="pending"&&(
              <div style={{background:`${C.amber}18`,borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:12,color:C.amber,lineHeight:1.6}}>
                ⏳ Deine Anmeldung wird vom Admin geprüft und bestätigt.<br/>
                Nach Bestätigung erhältst du <b>+100 Punkte</b> und eine Startnummer.
              </div>
            )}
            {myReg.status==="confirmed"&&(
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <button onClick={()=>generateICS({title:ev.name,date:ev.date,location:ev.location||"",
                    description:`PCN Event · Klasse: ${myReg.class||""}${myReg.startNr?" · Startnr: #"+myReg.startNr:""}`,alarmMinutes:1440})}
                  style={{flex:1,background:"#fff",border:"none",borderRadius:8,padding:"9px",fontSize:12,fontWeight:700,
                    cursor:"pointer",fontFamily:"'Barlow',sans-serif",color:"#111",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                  📅 Kalender
                </button>
                <button onClick={()=>{
                    const t=encodeURIComponent(ev.name),d=(ev.date||"").replace(/-/g,""),loc=encodeURIComponent(ev.location||"");
                    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${d}/${d}&location=${loc}`,"_blank");
                  }}
                  style={{flex:1,background:"#4285F4",border:"none",borderRadius:8,padding:"9px",fontSize:12,fontWeight:700,
                    cursor:"pointer",fontFamily:"'Barlow',sans-serif",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                  🗓 Google
                </button>
              </div>
            )}
            {/* Abmelden */}
            {!isPast&&(
              confirmCancel?(
                <div style={{background:"#ef444418",border:"1px solid #ef444433",borderRadius:10,padding:"12px"}}>
                  <div style={{fontSize:13,color:"#ef4444",marginBottom:10,fontWeight:600}}>Anmeldung wirklich stornieren?</div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{ onCancel(ev.id, myReg.id); setConfirmCancel(false); }}
                      style={{flex:1,background:"#ef4444",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                      Ja, abmelden
                    </button>
                    <button onClick={()=>setConfirmCancel(false)}
                      style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              ):(
                <button onClick={()=>setConfirmCancel(true)}
                  style={{background:"none",border:`1px solid #ef444433`,borderRadius:8,padding:"8px 14px",
                    color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                  ✕ Anmeldung stornieren
                </button>
              )
            )}
          </div>
        )}

        {/* ── Anmeldung — nur wenn noch nicht angemeldet ── */}
        {!myReg&&!isPast&&me&&myVehicles.length>0&&spotsLeft>0&&(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:14}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:800,color:C.white,marginBottom:4}}>Jetzt anmelden</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
              Nach Anmeldung wird deine Teilnahme vom Admin bestätigt.
            </div>
            <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5}}>Fahrzeug</label>
            <select value={selV} onChange={e=>setSelV(e.target.value)}
              style={{width:"100%",background:"#191919",border:`1px solid ${C.border}`,borderRadius:9,padding:"12px 14px",
                color:C.white,fontSize:14,fontFamily:"'Barlow',sans-serif",marginBottom:10,appearance:"none"}}>
              {myVehicles.map(v=><option key={v.id} value={v.id}>{v.hersteller} {v.modell} · {v.kennzeichen}</option>)}
            </select>
            {(ev.classes||[]).length>1&&(
              <>
                <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5}}>Klasse</label>
                <select value={selC} onChange={e=>setSelC(e.target.value)}
                  style={{width:"100%",background:"#191919",border:`1px solid ${C.border}`,borderRadius:9,padding:"12px 14px",
                    color:C.white,fontSize:14,fontFamily:"'Barlow',sans-serif",marginBottom:14,appearance:"none"}}>
                  {(ev.classes||[]).map(c=><option key={c}>{c}</option>)}
                </select>
              </>
            )}
            <button className="btn" onClick={()=>onJoin(ev.id,selV,selC)} style={{width:"100%",padding:"14px",fontSize:15}}>
              Anmelden →
            </button>
          </div>
        )}
        {!myReg&&!isPast&&spotsLeft<=0&&(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#ef4444",marginBottom:4}}>Ausgebucht</div>
            <div style={{fontSize:12,color:C.muted}}>Keine freien Plätze mehr.</div>
          </div>
        )}
        {!myReg&&!isPast&&me&&myVehicles.length===0&&(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:14,textAlign:"center",color:C.muted,fontSize:13}}>
            Zuerst ein Fahrzeug anlegen um dich anzumelden.
          </div>
        )}

        {/* ── Teilnehmerliste (nur Bestätigte) ── */}
        {confirmedParts.length>0&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>
              Bestätigte Teilnehmer ({confirmedParts.length})
            </div>
            {confirmedParts.map(p=>{
              const pv=vehicles[p.vehicleId||p.vehicle_id];
              return (
                <div key={p.id} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 0",
                  borderBottom:`1px solid ${C.border}`,cursor:pv?"pointer":"default"}}
                  onClick={()=>pv&&onViewVehicle(pv)}>
                  <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:7,padding:"3px 8px",
                    fontWeight:800,fontSize:13,color:C.red,flexShrink:0,minWidth:32,textAlign:"center"}}>
                    {p.startNr?"#"+p.startNr:"·"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {pv?`${pv.hersteller} ${pv.modell}`:"Fahrzeug"}
                    </div>
                    <div style={{fontSize:11,color:C.muted}}>{p.class||p.klasse||""}{pv?.kennzeichen?" · "+pv.kennzeichen:""}</div>
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

function ChatScreen({thread, me, allUsers, vehicles, onBack, onSend, onMarkRead, onViewVehicle, onUpgrade, onDeleteMessage, onDeleteThread}) {
  const [msg, setMsg] = useState("");
  const [selectedMsg, setSelectedMsg] = useState(null); // for delete menu
  const endRef = useRef(null);
  const rootRef = useRef(null);
  const threadParticipants = thread.participants||[];
  const other = Object.values(allUsers).find(u=>threadParticipants.includes(u.id)&&u.id!==me?.id)||{name:thread.isGroup?thread.name:"Mitglied"};
  const v = vehicles[thread.vehicleId];
  const isGuest = me?.role === "guest";
  const longPressTimer = useRef(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[thread.messages]);
  useEffect(()=>{ if(onMarkRead) onMarkRead(thread.id); },[thread.id]);

  const startLongPress = (m) => {
    longPressTimer.current = setTimeout(()=>{ setSelectedMsg(m); }, 500);
  };
  const cancelLongPress = () => { clearTimeout(longPressTimer.current); };

  useEffect(()=>{ return ()=>clearTimeout(longPressTimer.current); },[]);

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
      {/* ── Chat Header ── */}
      <div style={{background:C.dark,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:thread.isGroup?6:0}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:22,padding:0,lineHeight:1,flexShrink:0}}>←</button>
          {/* Avatar */}
          <div style={{width:44,height:44,borderRadius:thread.isGroup?"12px":"50%",
            background:thread.isGroup?C.red:thread.anonymous?"#1a1a2e":`${C.red}22`,
            color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:800,fontSize:thread.isGroup?22:17,flexShrink:0}}>
            {thread.isGroup?"🏎️":thread.anonymous?"🔒":other.name[0]?.toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:16,color:C.white,lineHeight:1.2}}>
              {thread.isGroup?thread.name:thread.anonymous?"🔒 Anonyme Nachricht":other.name}
            </div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>
              {thread.isGroup
                ? `${threadParticipants.length} Mitglieder`
                : v?`Re: ${v.hersteller} ${v.modell}`:"Direktnachricht"}
            </div>
          </div>
          {!thread.isGroup&&v&&(
            <button className="btn sm ghost" onClick={()=>onViewVehicle(v)} style={{fontSize:12,flexShrink:0}}>Akte →</button>
          )}
          {onDeleteThread&&(
            <button onClick={()=>onDeleteThread(thread.id)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:18,padding:"0 4px",flexShrink:0}}>🗑</button>
          )}
        </div>
        {/* Group member avatars */}
        {thread.isGroup&&(
          <div style={{display:"flex",gap:6,paddingLeft:56,alignItems:"center"}}>
            {threadParticipants.slice(0,5).map(uid=>{
              const u=allUsers[uid]||{name:"?"};
              return (
                <div key={uid} style={{width:26,height:26,borderRadius:"50%",
                  background:`${C.red}33`,border:`1.5px solid ${C.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,fontWeight:800,color:C.white}}>
                  {u.name[0]?.toUpperCase()}
                </div>
              );
            })}
            {threadParticipants.length>5&&(
              <div style={{fontSize:10,color:C.muted}}>+{threadParticipants.length-5}</div>
            )}
          </div>
        )}
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
          const senderUser = !mine ? Object.values(allUsers).find(u=>u.id===m.from) : null;
          const senderName = thread.isGroup ? (mine?"Du":senderUser?.name||"Mitglied") : null;
          const rawTs = m.created_at||m.createdAt||"";
          const tsDate = rawTs ? new Date(rawTs) : null;
          const today = new Date();
          const isToday = tsDate && tsDate.toDateString()===today.toDateString();
          const isYesterday = tsDate && new Date(today-86400000).toDateString()===tsDate.toDateString();
          const timeStr = tsDate ? tsDate.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : m.ts||"";
          const dateStr = tsDate ? (isToday?"Heute":isYesterday?"Gestern":tsDate.toLocaleDateString("de-DE",{day:"2-digit",month:"short"})) : "";
          const fullTs = dateStr ? `${dateStr} · ${timeStr}` : timeStr;
          return (
            <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start",marginBottom:2}}>
              {senderName&&<div style={{fontSize:11,color:C.muted,marginBottom:2,paddingLeft:4}}>{senderName}</div>}
              <div
                onMouseDown={()=>startLongPress(m)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={()=>startLongPress(m)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                style={{maxWidth:"82%",background:mine?C.red:"#1e1e1e",border:mine?"none":`1px solid ${C.border}`,
                  borderRadius:mine?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"11px 15px",
                  userSelect:"none",WebkitUserSelect:"none",cursor:"pointer",
                  opacity:selectedMsg?.id===m.id?0.7:1,transition:"opacity .1s"}}>
                <div style={{fontSize:15,color:"#fff",lineHeight:1.5}}>{m.text}</div>
                <div style={{fontSize:10,color:mine?"rgba(255,255,255,.5)":C.muted,marginTop:4,textAlign:"right"}}>
                  {fullTs}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* ── Message delete menu (WhatsApp style) ── */}
      {selectedMsg&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 0"}}
          onClick={()=>setSelectedMsg(null)}>
          <div style={{background:C.dark,border:`1px solid ${C.border}`,borderRadius:"16px 16px 0 0",
            padding:"16px",width:"100%",maxWidth:480}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:12,color:C.muted,marginBottom:12,textAlign:"center"}}>
              „{selectedMsg.text.slice(0,40)}{selectedMsg.text.length>40?"…":""}"
            </div>
            {selectedMsg.from===me?.id&&onDeleteMessage&&(
              <button onClick={()=>{ onDeleteMessage(thread.id, selectedMsg.id); setSelectedMsg(null); }}
                style={{width:"100%",background:"#ef444422",border:"1px solid #ef444444",borderRadius:10,
                  padding:"13px",color:"#ef4444",fontSize:14,fontWeight:700,cursor:"pointer",
                  fontFamily:"'Barlow',sans-serif",marginBottom:8}}>
                🗑 Nachricht löschen
              </button>
            )}
            <button onClick={async()=>{ await navigator.clipboard.writeText(selectedMsg.text).catch(()=>{}); setSelectedMsg(null); }}
              style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,
                padding:"13px",color:C.white,fontSize:14,fontWeight:700,cursor:"pointer",
                fontFamily:"'Barlow',sans-serif",marginBottom:8}}>
              📋 Kopieren
            </button>
            <button onClick={()=>setSelectedMsg(null)}
              style={{width:"100%",background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",fontFamily:"'Barlow',sans-serif",padding:"8px"}}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

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
  const [screen, setScreen]       = useState(()=>window.__PCN_PRELOAD_SESSION__ ? "app" : "splash");
  const [tab, setTab]             = useState("dashboard");
  const [me, setMe]               = useState(()=>window.__PCN_PRELOAD_SESSION__||null);
  const [allUsers, setAllUsers]   = useState({...DEMO_USERS});
  const [vehicles, setVehicles]   = useState({});
  const [logbook, setLogbook]     = useState({});
  const [reminders, setReminders] = useState([]);
  const [participants, setParticipants] = useState({});
  const [events, setEvents]       = useState({});
  const [eventHistory]            = useState(DEMO_HISTORY);
  const [threads, setThreads]     = useState({});
  const [activeThread, setActiveThread] = useState(null);
  const [guestThreads, setGuestThreads] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pcn_guest_threads")||"[]"); } catch(e){ return []; }
  });
  const [deletedThreadIds, setDeletedThreadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pcn_deleted_threads")||"[]"); } catch(e){ return []; }
  });
  const [viewV, setViewV]         = useState(null);
  const [viewEv, setViewEv]       = useState(null);
  const [publicV, setPublicV]     = useState(null);
  const [recentVehicles, setRecentVehicles] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pcn_recent_vehicles")||"[]"); } catch(e){ return []; }
  });

  // ── Form state ──────────────────────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({mode:"register",code:"",email:"",name:""});
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authStep, setAuthStep] = useState(""); // status message during auth
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
  const [openSections, setOpenSections] = useState({}); // {vehicleId_section: bool}
  const toggleSection = (vid, section) => setOpenSections(p=>({...p,[vid+"_"+section]:!p[vid+"_"+section]}));
  const isOpen = (vid, section) => !!openSections[vid+"_"+section];
  const [profileImgUploading, setProfileImgUploading] = useState(false);
  const [newsState, setNewsState] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("pcn_news_state")||"{}"); } catch(e){ return {}; }
  });
  const [viewNews, setViewNews] = useState(null);
  const markNewsRead = (id) => {
    setNewsState(p=>{
      const updated = {...p,[id]:"read"};
      localStorage.setItem("pcn_news_state", JSON.stringify(updated));
      return updated;
    });
    // Add points for reading — 10 pts per article
    const readKey = "pcn_news_read_pts";
    const already = JSON.parse(localStorage.getItem(readKey)||"[]");
    if(!already.includes(id)) {
      localStorage.setItem(readKey, JSON.stringify([...already, id]));
      toast_("✓ Gelesen · +10 Punkte 🏆");
    } else {
      toast_("✓ Als gelesen markiert");
    }
  }; // full newsletter detail // {id: "read"|"remind"}
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFeatureDetail, setShowFeatureDetail] = useState(null); // false | 'features' | 'points'
  const [eventsView, setEventsView] = useState("list"); // "list" | "calendar"
  const [calMonth, setCalMonth] = useState(new Date());
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
  const [statusCustomMins, setStatusCustomMins] = useState(30);
  const [gallerySwipe, setGallerySwipe] = useState({}); // {vehicleId: currentIndex}
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [scannerStatus, setScannerStatus] = useState("idle");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isGuest = me?.role === "guest";
  const isDemo = me?.id==="a0000000-0000-0000-0000-000000000001"||me?.id==="u2";
  const myVehicles = Object.values(vehicles).filter(v=>v.owner===me?.email||v.userId===me?.id||(isDemo&&v.id==="V001"));
  // In demo mode show all demo vehicles as "Neueste Fahrzeuge"
  const displayVehicles = isDemo
    ? Object.values(vehicles).filter(v=>["V001","V002","V003","V004"].includes(v.id))
    : myVehicles;
  const myReminders = reminders.filter(r=>!r.done).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const myParticipations = Object.values(participants).flat().filter(p=>p.userId===me?.id);
  const myThreads = Object.values(threads).filter(t=>(t.participants||[]).includes(me?.id) && !deletedThreadIds.includes(t.id));
  const unreadCount = myThreads.filter(t=>t.messages.some(m=>m.from!==me?.id&&!m.read&&!m.isSystem)).length;
  const appState = {logbook,participants,vehicles,me};
  const unlockedFeatures = new Set(MILESTONES.filter(m=>m.check(appState)).flatMap(m=>m.unlocks));

  // Punkte-Berechnung: Basis-Aktivitäten + Events
  const calcPoints = () => {
    let pts = 0;
    pts += myVehicles.length * 50;             // 50 Punkte pro Fahrzeug
    pts += Object.values(logbook).flat().length * 10; // 10 Punkte pro Logbuch-Eintrag
    pts += myParticipations.filter(p=>p.status==="confirmed").length * 100; // 100 Punkte nur bei bestätigter Teilnahme
    pts += myThreads.length * 5;               // 5 Punkte pro Nachricht
    // 10 Punkte pro gelesenen News-Artikel
    try { pts += JSON.parse(localStorage.getItem("pcn_news_read_pts")||"[]").length * 10; } catch(e){}
    return pts;
  };
  const myPoints = calcPoints();
  const TIERS = [
    {name:"Bronze",  pts:100},
    {name:"Silber",  pts:300},
    {name:"Gold",    pts:600},
    {name:"Platin",  pts:1000},
    {name:"Legend",  pts:2000},
  ];
  const currentTier = TIERS.filter(t=>myPoints>=t.pts).slice(-1)[0]||null;
  const nextTier = TIERS.find(t=>myPoints<t.pts)||{name:"Legend",pts:2000};
  const prevTierPts = currentTier?.pts||0;
  const pointsToNext = nextTier.pts;
  const pointsProgress = Math.min(100, Math.round(((myPoints-prevTierPts)/(nextTier.pts-prevTierPts))*100));

  // ── Toast ────────────────────────────────────────────────────────────────────
  // ── Status helpers — now wired to DB layer (works across devices via Supabase) ──
  const setStatus = async (vehicleId, preset, customText="") => {
    const text = customText || preset.text;
    const expiresAt = preset.mins ? Date.now() + preset.mins*60*1000 : null;
    const status = {text, icon:preset.icon||"💬", expiresAt, setAt:Date.now()};
    setVehicleStatus(prev=>({...prev,[vehicleId]:status}));
    broadcastStatus(vehicleId, status);
    const DB = window.PCN_DB;
    if(DB) await DB.vehicles.setStatus(vehicleId, status);
    setShowStatusPicker(null); setStatusCustom("");
    toast_(`Status gesetzt: "${text}"`);
  };

  const clearStatus = async (vehicleId) => {
    setVehicleStatus(prev=>{const n={...prev};delete n[vehicleId];return n;});
    broadcastStatus(vehicleId, null);
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
    const evMap={};
    savedEvs.forEach(e=>evMap[e.id]=e);
    setEvents(evMap);
    const pMap={};
    // Load participants for all known events (from DB + demo)
    const allEventIds = [...Object.keys(evMap)];
    await Promise.all(allEventIds.map(async eid=>{
      const r=await DB.events.participants(eid); 
      if(r.data&&r.data.length>0) pMap[eid]=r.data;
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

  // ── Session restore + Magic Link token handler ───────────────────────────────
  useEffect(()=>{
    (async()=>{
      const params=new URLSearchParams(window.location.search);
      // Handle magic link token from URL hash
      const hash=window.location.hash;
      if(hash.includes("access_token=")){
        const token=hash.split("access_token=")[1]?.split("&")[0];
        if(token){
          const DB=window.PCN_DB;
          const {data:u,error}=await DB.auth.exchangeToken(token);
          if(!error&&u){
            window.history.replaceState(null,"",window.location.pathname);
            await refreshAll(u); setScreen("app"); toast_("Willkommen zurück! 🏁");
            return;
          }
        }
      }
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
          const vWithPrivacy = {...v, privacy:{...DEF_PRIVACY,...(v.privacy||{})}};
          setPublicV(vWithPrivacy);
          setScreen("public");
          // Load status immediately — essential for cross-device status display
          if(DB) {
            DB.vehicles.getStatus(v.id).then(({data})=>{
              if(data && data.text) setVehicleStatus(prev=>({...prev,[v.id]:data}));
            });
          }
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

  // ── Realtime message sync — WebSocket first, polling fallback ────────────────
  useEffect(()=>{
    if(!me?.id) return;
    const DB=window.PCN_DB; if(!DB) return;
    let cleanup=null;

    const refreshThreads = async () => {
      const {data:liveThreads}=await DB.threads.list(me.id);
      if(!liveThreads) return;
      setThreads(prev=>{
        const next={...prev};
        liveThreads.forEach(t=>{next[t.id]=t;});
        return next;
      });
    };

    const startPolling = () => {
      const iv=setInterval(refreshThreads, 15000);
      cleanup=()=>clearInterval(iv);
    };

    const tryRealtime = () => {
      try {
        const cfg=window.PCN_CONFIG||{};
        if(!cfg.supabaseUrl) return false;
        const wsUrl=cfg.supabaseUrl
          .replace("https://","wss://").replace("http://","ws://")
          +"/realtime/v1/websocket?apikey="+cfg.supabaseKey+"&vsn=1.0.0";
        const ws=new WebSocket(wsUrl);
        let alive=true;
        ws.onopen=()=>{
          ws.send(JSON.stringify({
            topic:"realtime:public:messages",event:"phx_join",
            payload:{config:{broadcast:{ack:false},presence:{key:""},
              postgres_changes:[{event:"INSERT",schema:"public",table:"messages"}]}},
            ref:"1"
          }));
        };
        ws.onmessage=(e)=>{
          try{const d=JSON.parse(e.data);if(d.event==="postgres_changes")refreshThreads();}catch(err){}
        };
        ws.onerror=()=>{alive=false;ws.close();startPolling();};
        ws.onclose=()=>{if(alive){alive=false;startPolling();}};
        cleanup=()=>{alive=false;ws.readyState===1&&ws.close();};
        return true;
      } catch(e){return false;}
    };

    refreshThreads();
    if(!tryRealtime()) startPolling();

    // Fast polling when user is actively in chat screen (3s)
    let fastPoll = null;
    const checkFast = () => {
      if(fastPoll) clearInterval(fastPoll);
      // Will be set by screen change — see below
    };

    return ()=>{ cleanup&&cleanup(); if(fastPoll) clearInterval(fastPoll); };
  },[me?.id]);

  // ── Fast polling (3s) when actively viewing a chat ────────────────────────
  useEffect(()=>{
    if(screen!=="chat"||!activeThread||!me?.id) return;
    const DB=window.PCN_DB; if(!DB) return;
    const fast=setInterval(async()=>{
      const {data:liveThreads}=await DB.threads.list(me.id);
      if(liveThreads){
        setThreads(prev=>{
          const next={...prev};
          liveThreads.forEach(t=>{next[t.id]=t;});
          return next;
        });
      }
    },3000);
    return ()=>clearInterval(fast);
  },[screen,activeThread,me?.id]);

  // ── Track recently viewed vehicles ──────────────────────────────────────────
  useEffect(()=>{
    if(screen!=="public"||!publicV) return;
    const entry = {
      id: publicV.id, qarId: publicV.qarId,
      hersteller: publicV.hersteller, modell: publicV.modell,
      image: publicV.image||(publicV.images&&publicV.images[0])||"",
      kennzeichen: publicV.kennzeichen,
      viewedAt: new Date().toISOString(),
    };
    setRecentVehicles(prev=>{
      const filtered = prev.filter(v=>v.id!==entry.id);
      const updated = [entry,...filtered].slice(0,10);
      localStorage.setItem("pcn_recent_vehicles", JSON.stringify(updated));
      return updated;
    });
  },[screen, publicV?.id]);

  // ── Track screen changes for analytics ───────────────────────────────────────
  useEffect(()=>{
    if(screen==="public"&&publicV) track("qr_scan_public_view",{vehicle_id:publicV?.id,qar_id:publicV?.qarId});
  },[screen, publicV?.id]);

  // ── Live sync — vehicle data + status on public page ─────────────────────────
  useEffect(()=>{
    // BroadcastChannel: instant same-browser cross-tab sync
    let bc = null;
    try {
      bc = new BroadcastChannel("pcn_status");
      bc.onmessage = async (e) => {
        if(e.data?.type==="status_update") {
          const {vehicleId, status} = e.data;
          if(status) setVehicleStatus(prev=>({...prev,[vehicleId]:status}));
          else setVehicleStatus(prev=>{const n={...prev};delete n[vehicleId];return n;});
        }
        // Vehicle data changed (privacy, fields) — reload publicV
        if(e.data?.type==="vehicle_update" && publicV?.qarId) {
          const DB=window.PCN_DB;
          if(DB){const {data}=await DB.vehicles.getPublic(publicV.qarId);
            if(data) setPublicV({...data,privacy:{...DEF_PRIVACY,...(data.privacy||{})}});}
        }
      };
    } catch(err) {}

    // 5s polling — reload full vehicle + status when on public page
    const DB = window.PCN_DB;
    const poll = setInterval(async()=>{
      if(!DB || screen!=="public" || !publicV?.qarId) return;
      // Reload full vehicle data (catches privacy/field changes)
      const {data:vd} = await DB.vehicles.getPublic(publicV.qarId);
      if(vd) setPublicV({...vd, privacy:{...DEF_PRIVACY,...(vd.privacy||{})}});
      // Reload status
      const vid = vd?.id || publicV.id;
      const {data:s} = await DB.vehicles.getStatus(vid);
      if(s) setVehicleStatus(prev=>({...prev,[publicV.id]:s}));
      else setVehicleStatus(prev=>({...prev,[publicV.id]:null}));
    }, 5000);

    return ()=>{ bc?.close(); clearInterval(poll); };
  },[screen, publicV?.id]);

  // ── Broadcast status change to other tabs when set ────────────────────────
  const broadcastStatus = useCallback((vehicleId, status) => {
    try {
      const bc = new BroadcastChannel("pcn_status");
      bc.postMessage({type:"status_update", vehicleId, status});
      bc.close();
    } catch(err) {}
  }, []);

  // ── Scanner ──────────────────────────────────────────────────────────────────
  const openScanner = () => {
    track("qr_scanner_opened"); setScannerOpen(true); setScannerError(null); setScannerStatus("loading"); };
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
    const newV={
      qarId:genQARId(), userId:me.id, owner:me.email,
      ...addVForm,
      images:addVForm.images||[],
      image:(addVForm.images||[])[0]||"",
      privacy:{...DEF_PRIVACY},
    };
    const {data:saved,error}=await DB.vehicles.save(newV);
    if(error){ toast_("Fehler beim Speichern: "+error,"err"); return; }
    // Merge saved data (from DB) with local data — DB may not return all fields
    const vehicle = saved && saved.id
      ? { ...newV, ...saved }  // DB returned full object
      : { ...newV, id:"V"+Date.now() }; // Fallback: local ID
    setVehicles(prev=>({...prev,[vehicle.id]:vehicle}));
    setShowAddV(false);
    setAddVForm({hersteller:"Porsche",modell:"",baujahr:"",kennzeichen:"",farbe:"",kraftstoff:"Benzin",getriebe:"",images:[]});
    toast_("Fahrzeug hinzugefügt ✓ · QAR-ID: "+vehicle.qarId);
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

  const cancelEvent = async (eventId, regId) => {
    const DB=window.PCN_DB;
    if(DB) await DB.events.cancel?.(regId).catch(()=>{});
    setParticipants(prev=>{
      const evParts = (prev[eventId]||[]).map(p=>p.id===regId?{...p,status:"cancelled"}:p);
      return {...prev,[eventId]:evParts};
    });
    toast_("Anmeldung storniert");
  };

  const joinEvent = async (eventId,vehicleId,cls) => {
    if(!vehicleId) return toast_("Fahrzeug wählen","err");
    const DB=window.PCN_DB;
    const {data:p,error}=await DB.events.join(eventId,me.id,vehicleId,cls);
    if(error){
      // Already registered — load existing from DB and show status
      const {data:parts} = await DB.events.participants(me.id).catch(()=>({data:null}));
      if(parts) {
        const existing = parts.filter(x=>x.eventId===eventId||x.event_id===eventId);
        if(existing.length>0) {
          setParticipants(prev=>({...prev,[eventId]:[...((prev[eventId]||[]).filter(x=>x.userId!==me.id)),...existing]}));
          toast_("Du bist bereits angemeldet 🟡");
          return;
        }
      }
      toast_("Fehler: "+error,"err");
      return;
    }
    const reg = p || { id:"P"+Date.now(), eventId, userId:me.id, vehicleId, class:cls, startNr:null, status:"pending" };
    setParticipants(prev=>{
      const existing = prev[eventId]||[];
      if(existing.find(x=>x.userId===me.id)) return prev;
      return {...prev,[eventId]:[...existing,reg]};
    });
    toast_("Anmeldung eingegangen — wird vom Admin bestätigt 🟡");
  };

  const openEditProfile = () => {
    setProfileForm({
      name: me?.name||"",
      phone: me?.phone||"",
      city: me?.city||"",
      bio: me?.bio||"",
      avatar: me?.avatar||"",
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
      avatar: profileForm.avatar||me?.avatar||"",
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
      marktwert:v.marktwert||"", fin:v.fin||"",
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
    const v=vehicles[vehicleId]; if(!v) return;
    const currentPrivacy = {...DEF_PRIVACY,...(v.privacy||{})};
    const currentVal = currentPrivacy[key];
    const newPrivacy = {...currentPrivacy,[key]:!currentVal};
    const updated={...v,privacy:newPrivacy};
    setVehicles(prev=>({...prev,[vehicleId]:updated}));
    if(viewV?.id===vehicleId) setViewV(updated);
    const DB=window.PCN_DB;
    if(DB) await DB.vehicles.save(updated);
    toast_(`${key.replace("pub_","")}: ${!currentVal?"🔓 Öffentlich":"🔒 Privat"}`);
    // Broadcast to other tabs (public page)
    try { const bc=new BroadcastChannel("pcn_status");
      bc.postMessage({type:"vehicle_update",vehicleId}); bc.close(); } catch(e){}
  };

  const updateVehicleImage = async (vehicleId,dataUrl) => {
    const v=vehicles[vehicleId]; if(!v) return;
    const updated={...v,image:dataUrl};
    setVehicles(prev=>({...prev,[vehicleId]:updated}));
    if(viewV?.id===vehicleId) setViewV(updated);
    const DB=window.PCN_DB; await DB.vehicles.save(updated);
  };

  // Sanitize text input — strip HTML tags, limit length
  const sanitize = (t) => t.replace(/<[^>]*>/g,"").replace(/[<>]/g,"").trim().slice(0,1000);

  // PostHog Analytics — track key funnel events (called outside render)
  const track = useCallback((event, props={}) => {
    try {
      if(window.posthog) window.posthog.capture(event, {
        ...props, app:"pcn_mvp",
      });
    } catch(e){}
  }, []);

  const PETER_ID = "7701c779-1568-4c42-aa2d-b8506bc3e988";
  const DEMO_REPLIES = [
    "Gerne! Die Fahrzeugakte des 904 ist vollständig digital — Servicenachweise seit 1964, Rennhistorie und Gutachten sind alle hinterlegt.",
    "Ja, das Fahrzeug hat H-Kennzeichen. Beim Bellmot haben wir immer einen schönen Platz auf der PCN-Stellfläche — freue mich auf das Treffen!",
    "Der 904 wird selten bewegt, aber beim Clubabend im Kesselchen bin ich regelmäßig dabei. Mit dem 992 GT3 fahre ich häufiger.",
    "Die Marktwertanalyse auf der Plattform hat den 904 übrigens auf 1,3–1,5 Mio. EUR eingeschätzt — sehr nützliche Funktion!",
    "Danke für Ihr Interesse! Gerne teile ich die QR-Akte beim nächsten Treffen persönlich mit Ihnen.",
  ];
  let _demoReplyIdx = 0;

  const sendMsg = async (threadId,text) => {
    const clean = sanitize(text);
    if(!clean) return;
    const newMsg = {id:"m"+Date.now(),from:me.id,text:clean,created_at:new Date().toISOString(),read:false};
    setThreads(prev=>({...prev,[threadId]:{...prev[threadId],messages:[...(prev[threadId]?.messages||[]),newMsg]}}));

    // Try DB send (may fail in demo — that's ok)
    const DB=window.PCN_DB;
    if(DB) DB.threads.send(threadId,me.id,clean).catch(()=>{});
    track("message_sent", {thread_id:threadId, is_guest:me?.role==="guest"});

    // Demo chatbot auto-reply from Peter
    if(isDemo) {
      setTimeout(()=>{
        const reply = DEMO_REPLIES[_demoReplyIdx % DEMO_REPLIES.length];
        _demoReplyIdx++;
        const botMsg = {id:"bot"+Date.now(),from:PETER_ID,text:reply,created_at:new Date().toISOString(),read:false};
        setThreads(prev=>({...prev,[threadId]:{...prev[threadId],messages:[...(prev[threadId]?.messages||[]),botMsg]}}));
      }, 1200 + Math.random()*800);
    }
  };

  const startContact = async (vehicleId, asUser) => {
    const currentMe = asUser || me;
    if(!currentMe){ toast_("Bitte zuerst anmelden","err"); return; }
    const DB=window.PCN_DB;

    // Priority 1: publicV (already loaded on public page — guaranteed to have qarId)
    // Priority 2: local vehicles state
    // Priority 3: lookup by vehicleId in DB
    // Priority 4: demo vehicles fallback
    let v = (publicV?.id===vehicleId || publicV?.qarId===vehicleId) ? publicV : null;
    if(!v) v = vehicles[vehicleId];
    if(!v && DB){
      // Try direct DB lookup by vehicleId first
      const {data:rows} = await DB.vehicles.getVehicles(vehicleId).catch(()=>({data:null}));
      if(rows && rows[0]) v = rows[0];
    }
    if(!v && DB && publicV?.qarId){
      // Fallback: lookup by QAR-ID from publicV
      const {data:realV} = await DB.vehicles.getPublic(publicV.qarId);
      if(realV) v = realV;
    }
    if(!v) v = DEMO_VEHICLES[vehicleId];
    if(!v){ toast_("Fahrzeug nicht gefunden","err"); return; }
    if(v.owner===currentMe.email || v.userId===currentMe.id){ toast_("Das ist dein eigenes Fahrzeug","err"); return; }

    const ownerId = v.userId || v.owner;
    if(!ownerId){ toast_("Besitzer nicht gefunden","err"); return; }
    if(!allUsers[ownerId]){
      setAllUsers(prev=>({...prev,[ownerId]:{id:ownerId,name:"PCN-Mitglied",email:v.owner,role:"member"}}));
    }

    // Robust duplicate check — query DB directly by vehicle_id
    const {data:myThreadsLive} = DB ? await DB.threads.list(currentMe.id) : {data:[]};
    const allThreads = [...(myThreadsLive||[]), ...Object.values(threads)];
    const vId = v.id;
    const existing = allThreads.find(t=> {
      const tid = t.vehicleId||t.vehicle_id;
      if(tid !== vId) return false;
      const parts = t.participants||[];
      // Match by user ID or email
      return parts.includes(currentMe.id) || parts.includes(currentMe.email) ||
             parts.some(p=>p===currentMe.id||p===currentMe.email);
    });
    if(existing){
      const merged = {...existing, vehicleId: existing.vehicleId||existing.vehicle_id};
      setThreads(prev=>({...prev,[existing.id]:merged}));
      setActiveThread(existing.id); setScreen("chat");
      toast_("Chat fortgesetzt 💬");
      return;
    }
    const {data:t,error}=await DB.threads.create([currentMe.id,ownerId],v.id,`${v.hersteller} ${v.modell}`);
    if(error){toast_("Fehler: "+error,"err");return;}
    await DB.threads.send(t.id,"system",`Kontakt über QAR-ID: ${v.qarId}`);
    const newThread={...t,messages:[{id:uid(),from:"system",text:`Kontakt über QAR-ID: ${v.qarId}`,ts:fmtTime(),isSystem:true,read:true}]};
    setThreads(prev=>({...prev,[t.id]:newThread}));
    setTab("messages");
    setActiveThread(t.id);
    // Persist guest thread so it can be reopened later
    if(!currentMe.id || currentMe.role==="guest") {
      const gThread = {id:t.id, vehicleId:v.id, vehicleName:`${v.hersteller} ${v.modell}`, qarId:v.qarId, createdAt:new Date().toISOString()};
      setGuestThreads(prev=>{
        const updated=[gThread,...prev.filter(x=>x.id!==t.id)].slice(0,10);
        localStorage.setItem("pcn_guest_threads", JSON.stringify(updated));
        return updated;
      });
    }
    setScreen("chat");
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
      stored.events={};
      stored.participants=DEMO_PARTICIPANTS;
      stored.threads=JSON.parse(JSON.stringify(DEMO_THREADS)); // fresh copy each login
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
      // Clear session news cache — will be reloaded fresh
      window._dbNews = null;
      // Always reset demo threads — fresh every login
      localStorage.removeItem("pcn_deleted_threads");
      setThreads(JSON.parse(JSON.stringify(DEMO_THREADS)));
      setReminders([
        {id:"R1",vehicleId:"V001",title:"PCN TrackDay — Fahrzeug vorbereiten",date:dPlus(10),done:false},
        {id:"R2",vehicleId:"V002",title:"Sommerreifenwechsel",date:dPlus(4),done:false},
        {id:"R3",vehicleId:"V001",title:"TÜV Termin vereinbaren",date:dPlus(45),done:false},
      ]);
      // Load news/newsletter from Supabase (non-persistent — session only)
      if(DB) {
        // Fetch news from Supabase (session only — not persisted)
        try {
          const newsResp = await fetch(
            "https://xsyuhfleesstrchcwspg.supabase.co/rest/v1/news?select=*&order=created_at.desc&limit=20",
            {headers:{"apikey":"sb_publishable_xmmKWwXaQliEBAOIFPM8ig_srQP3zED","Authorization":"Bearer sb_publishable_xmmKWwXaQliEBAOIFPM8ig_srQP3zED"}}
          );
          if(newsResp.ok) {
            const newsData = await newsResp.json();
            if(newsData && newsData.length>0) {
              // Merge DB news with DEMO_NEWS (DB takes priority, no localStorage persistence)
              window._dbNews = newsData.map(n=>({
                id:n.id,type:n.type||"news",icon:n.icon||"📰",
                title:n.title,body:n.body||"",date:n.created_at?.slice(0,10)||"",
                author:n.author,pinned:n.pinned||false
              }));
            }
          }
        } catch(e) {}
      }
      // Load events from Supabase
      if(DB) {
        const {data:liveEvs} = await DB.events.list().catch(()=>({data:null}));
        if(liveEvs && liveEvs.length>0) {
          const evMap={};
          liveEvs.forEach(e=>{evMap[e.id]=e;});
          setEvents(evMap);
        }
        // Load participants for demo user from Supabase
        const {data:liveParts} = await DB.events.participants("a0000000-0000-0000-0000-000000000001").catch(()=>({data:null}));
        if(liveParts && liveParts.length>0) {
          const pMap={...DEMO_PARTICIPANTS};
          liveParts.forEach(p=>{
            const eid=p.eventId||p.event_id;
            if(!pMap[eid]) pMap[eid]=[];
            const exists = pMap[eid].find(x=>x.id===p.id||x.userId===p.userId||x.user_id===p.user_id);
            if(!exists) pMap[eid].push(p);
            else Object.assign(exists, p); // update with fresh DB data
          });
          setParticipants(pMap);
        }
      }
    }
    // Add Peter to allUsers so his name shows in chat
    setAllUsers({
      ...DEMO_USERS,
      "7701c779-1568-4c42-aa2d-b8506bc3e988":{id:"7701c779-1568-4c42-aa2d-b8506bc3e988",name:"Peter K.",email:"business@gear7.de",role:"member",memberNr:"PCN-4213"},
    });
    setScreen("app"); setTab("dashboard");
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
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    .news-marquee-wrap{overflow:hidden;width:100%;mask-image:linear-gradient(to right,transparent 0,#000 5%,#000 95%,transparent 100%);-webkit-mask-image:linear-gradient(to right,transparent 0,#000 5%,#000 95%,transparent 100%)}
    .news-marquee-track{display:flex !important;flex-direction:row !important;flex-wrap:nowrap !important;gap:12px;width:max-content !important;animation:marquee 34s linear infinite}
    .news-marquee-track:hover,.news-marquee-track:active{animation-play-state:paused}
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

      {/* ── Back to chat — for guests navigating to splash ── */}
      {me?.role==="guest"&&(
        <div style={{background:C.dark,padding:"10px 16px",display:"flex",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
          <button onClick={()=>setScreen("app")}
            style={{background:"none",border:"none",color:C.red,cursor:"pointer",
              fontSize:14,fontWeight:700,fontFamily:"'Barlow',sans-serif",display:"flex",alignItems:"center",gap:6}}>
            ← Zurück zum Chat
          </button>
        </div>
      )}

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
            <button key={m} onClick={()=>{setLoginForm(p=>({...p,mode:m}));setLoginPassword("");setShowPassword(false);}}
              style={{flex:1,padding:"11px",border:"none",borderRadius:10,cursor:"pointer",
                fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:14,transition:"all .15s",
                background:loginForm.mode===m?C.red:"transparent",
                color:loginForm.mode===m?"#fff":C.muted}}>
              {label}
            </button>
          ))}
        </div>

        {/* Login — E-Mail + Passwort, sofort einloggen */}
        {loginForm.mode==="login"&&(
          <>
            <input className="inp" placeholder="E-Mail-Adresse" type="email"
              value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))}
              style={{marginBottom:10,fontSize:16}}/>
            <div style={{position:"relative",marginBottom:14}}>
              <input className="inp" placeholder="Passwort"
                type={showPassword?"text":"password"}
                value={loginPassword} onChange={e=>setLoginPassword(e.target.value)}
                style={{fontSize:16,paddingRight:44}}
                onKeyDown={async e=>{
                  if(e.key!=="Enter"||!loginForm.email||!loginPassword) return;
                  setAuthLoading(true);
                  const DB=window.PCN_DB;
                  const {data:u,error}=await DB.auth.loginWithPassword(loginForm.email,loginPassword);
                  setAuthLoading(false);
                  if(error){toast_(error,"err");return;}
                  await refreshAll(u); setScreen("app");
                  toast_("Willkommen zurück, "+u.name+"! 🏁");
                }}/>
              <button onClick={()=>setShowPassword(p=>!p)}
                style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.muted}}>
                {showPassword?"🙈":"👁"}
              </button>
            </div>
            <button className="btn" style={{width:"100%",padding:"14px",fontSize:15,
              opacity:loginForm.email&&loginPassword&&!authLoading?1:.5}}
              onClick={async()=>{
                if(!loginForm.email) return toast_("E-Mail eingeben","err");
                if(!loginPassword) return toast_("Passwort eingeben","err");
                if(authLoading) return;
                const DB=window.PCN_DB;
                if(!DB){ toast_("App nicht geladen — bitte Seite neu laden","err"); return; }
                setAuthLoading(true);
                setAuthStep("Anmelden…");
                const t1=setTimeout(()=>setAuthStep("Daten werden geladen…"),2000);
                try {
                  const {data:u,error}=await DB.auth.loginWithPassword(loginForm.email,loginPassword);
                  clearTimeout(t1);
                  setAuthLoading(false); setAuthStep("");
                  if(error){toast_(error,"err");return;}
                  track("member_login", {method:"password"});
                  await refreshAll(u); setScreen("app");
                  toast_("Willkommen zurück, "+u.name+"! 🏁");
                } catch(e) {
                  clearTimeout(t1);
                  setAuthLoading(false); setAuthStep("");
                  toast_("Fehler: "+e.message,"err");
                }
              }}>
              {authLoading?(authStep||"⏳ Anmelden…"):"Anmelden →"}
            </button>
            <div style={{textAlign:"center",marginTop:10,fontSize:11,color:C.muted}}>
              Passwort vergessen?{" "}
              <span style={{color:C.red,cursor:"pointer",fontWeight:700}}
                onClick={async()=>{
                  if(!loginForm.email){toast_("Bitte zuerst E-Mail eingeben","err");return;}
                  const DB=window.PCN_DB;
                  await DB.auth.resetPassword(loginForm.email);
                  toast_("Reset-Link gesendet — schau in dein Postfach ✉️");
                }}>
                Reset-Link senden
              </span>
            </div>
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
                <input className="inp" placeholder="E-Mail" type="email" style={{marginBottom:10}}
                  value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))}/>
                <div style={{position:"relative",marginBottom:14}}>
                  <input className="inp" placeholder="Passwort wählen (mind. 6 Zeichen)"
                    type={showPassword?"text":"password"}
                    value={loginPassword} onChange={e=>setLoginPassword(e.target.value)}
                    style={{fontSize:16,paddingRight:44}}/>
                  <button onClick={()=>setShowPassword(p=>!p)}
                    style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.muted}}>
                    {showPassword?"🙈":"👁"}
                  </button>
                </div>
              </>
            )}

            <button className="btn" style={{width:"100%",padding:"14px",fontSize:15,
              opacity:loginForm.code.toUpperCase()===CLUB_CODE&&loginForm.name&&loginForm.email&&loginPassword.length>=6&&!authLoading?1:.5}}
              onClick={async()=>{
                if(loginForm.code.toUpperCase()!==CLUB_CODE) return toast_("Club-Code ungültig","err");
                if(!loginForm.name.trim()) return toast_("Name eingeben","err");
                if(!loginForm.email.trim()) return toast_("E-Mail eingeben","err");
                if(loginPassword.length<6) return toast_("Passwort mind. 6 Zeichen","err");
                if(authLoading) return;
                const DB=window.PCN_DB;
                if(!DB){ toast_("App nicht geladen — bitte Seite neu laden","err"); return; }
                setAuthLoading(true);
                setAuthStep("Konto wird erstellt…");
                const t1=setTimeout(()=>setAuthStep("Verbindung zur Datenbank…"),1500);
                const t2=setTimeout(()=>setAuthStep("Mitgliedsnummer wird vergeben…"),4000);
                const t3=setTimeout(()=>setAuthStep("Fast fertig…"),8000);
                try {
                  const {data:u,error}=await DB.auth.register(loginForm.name,loginForm.email,loginForm.code,loginPassword);
                  clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
                  setAuthLoading(false); setAuthStep("");
                  if(error){toast_(error,"err");return;}
                  const stored=JSON.parse(localStorage.getItem("pcn_v1")||"{}");
                  if(!stored.events||Object.keys(stored.events).length===0){
                    stored.events={}; localStorage.setItem("pcn_v1",JSON.stringify(stored));
                  }
                  track("member_register", {club_code:loginForm.code});
                  setMe(u); setAllUsers(p=>({...p,[u.id]:u}));
                  setScreen("app");
                  toast_("Willkommen, "+u.name+"! 🏁");
                } catch(e) {
                  clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
                  setAuthLoading(false); setAuthStep("");
                  toast_("Fehler: "+e.message,"err");
                }
              }}>
              {authLoading ? (authStep||"⏳ Erstelle Konto…") : "Konto erstellen →"}
            </button>
            {authLoading&&(
              <div style={{marginTop:12,background:"rgba(255,255,255,.05)",borderRadius:10,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:16,height:16,border:"2px solid #ffffff33",borderTop:`2px solid ${C.red}`,borderRadius:"50%",animation:"spin 1s linear infinite",flexShrink:0}}/>
                  <span style={{fontSize:13,color:"#aaa"}}>{authStep||"Verbindung wird hergestellt…"}</span>
                </div>
                <div style={{marginTop:8,fontSize:11,color:"#555"}}>Dies kann bei erster Registrierung bis zu 15 Sekunden dauern.</div>
              </div>
            )}
            {!authLoading&&loginPassword.length>0&&loginPassword.length<6&&(
              <div style={{fontSize:11,color:"#ef4444",textAlign:"center",marginTop:6}}>Passwort muss mind. 6 Zeichen haben</div>
            )}
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

        {/* Back to chat — shown when guest navigates to splash from upgrade prompt */}
        {me?.role==="guest"&&(
          <button onClick={()=>setScreen("app")}
            style={{background:"none",border:"none",color:C.muted,cursor:"pointer",
              fontSize:13,fontFamily:"'Barlow',sans-serif",width:"100%",marginTop:8,padding:"8px"}}>
            ← Zurück zum Chat
          </button>
        )}

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

        {/* ── Header — white, like app header ── */}
        <div style={{background:"#ffffff",borderBottom:`3px solid ${C.red}`,padding:"10px 16px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          position:"sticky",top:0,zIndex:50}}>
          <img src={LOGO_URL} alt="PCN" onError={e=>e.target.style.display="none"}
            style={{height:36,objectFit:"contain"}}/>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,color:"#888",fontWeight:600}}>Digitale Fahrzeugakte</span>
            {/* QR Code button */}
            <button
              onClick={()=>setLightbox({images:["https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=https://qar.gallery/pcn/?v="+v.qarId],index:0})}
              style={{background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,
                padding:"7px 10px",color:"#111",cursor:"pointer",fontSize:12,fontWeight:700,
                fontFamily:"'Barlow',sans-serif",display:"flex",alignItems:"center",gap:4}}>
              📱 QR-Code anzeigen
            </button>
          </div>
        </div>

        {/* ── Sponsor banner — shown below header if configured ── */}
        {SPONSOR&&(
          <a href={SPONSOR.url||"#"} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",gap:10,background:"#fff",
              padding:"8px 16px",textDecoration:"none",borderBottom:"1px solid #eee"}}>
            {SPONSOR.logo&&<img src={SPONSOR.logo} alt={SPONSOR.name} style={{height:28,objectFit:"contain"}}/>}
            <span style={{fontSize:11,color:"#888",fontWeight:600}}>Powered by</span>
            <span style={{fontSize:12,fontWeight:800,color:"#111"}}>{SPONSOR.name}</span>
          </a>
        )}

        {/* ── Hero image — taller, with gallery fallback ── */}
        <div style={{height:260,position:"relative",overflow:"hidden",background:"#111"}}>
          {(()=>{
            // Try all image sources in priority order
            // Show gallery unless explicitly disabled (undefined = show by default)
            const galleryEnabled = priv.pub_gallery !== false;
            const img = galleryEnabled && (
              (v.images&&v.images[0]) ||
              v.image ||
              (DEMO_VEHICLES[v.id]?.images?.[0]) ||
              (DEMO_VEHICLES[v.id]?.image)
            );
            if(img) return (
              <img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}
                onError={e=>{e.target.style.display="none";}}/>
            );
            if(priv.pub_gallery===false) return (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                height:"100%",color:C.muted,flexDirection:"column",gap:8}}>
                <span style={{fontSize:32}}>🔒</span>
                <span style={{fontSize:12}}>Galerie nicht öffentlich</span>
              </div>
            );
            return <div style={{height:"100%",background:"linear-gradient(135deg,#1a1a1a,#111)"}}/>;
          })()}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.2) 0%,transparent 40%,rgba(0,0,0,.85) 100%)"}}/>
          <div style={{position:"absolute",bottom:16,left:16,right:16}}>
            <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:30,fontWeight:900,
              color:"#fff",lineHeight:1,marginBottom:10,textShadow:"0 2px 8px rgba(0,0,0,.5)"}}>
              {v.hersteller} {v.modell}
            </h1>
            {priv.kennzeichen!==false&&kz&&(
            <div style={{display:"inline-flex",alignItems:"center",background:"#fff",
              border:"2px solid #222",borderRadius:5,padding:"3px 12px"}}>
              <span style={{fontSize:14,fontWeight:800,color:"#111",letterSpacing:2,fontFamily:"Arial,sans-serif"}}>{kz}</span>
            </div>
            )}
          </div>
        </div>
          {/* ── Thumbnail strip — direkt unter Hero, Teil des Bild-Blocks ── */}
          {priv.pub_gallery!==false&&(()=>{
            const allImgs = v.images||(DEMO_VEHICLES[v.id]?.images)||[];
            if(allImgs.length<=1) return null;
            return (
              <div style={{display:"flex",gap:6,overflowX:"auto",padding:"8px 10px",background:"#0a0a0a",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
                {allImgs.map((img,i)=>(
                  <img key={i} src={img} alt=""
                    onClick={()=>setLightbox({images:allImgs,index:i})}
                    style={{width:90,height:64,objectFit:"cover",borderRadius:8,
                      flexShrink:0,cursor:"pointer",
                      border:i===0?"2px solid #D5001C":"1px solid #333"}}
                    onError={e=>e.target.style.display="none"}/>
                ))}
              </div>
            );
          })()}

        {/* ── Action Buttons ── */}
        <div style={{padding:"12px 14px",background:C.dark,borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:520,margin:"0 auto"}}>

          {/* ── Status Banner — live from DB, above message button ── */}
            {(()=>{
              const s = vehicleStatus[v.id];
              if(s && s.expiresAt && Date.now() > s.expiresAt) return null;
              if(!s || !s.text) return (
                <button onClick={async()=>{
                    const DB=window.PCN_DB; if(!DB) return;
                    // Try by vehicle id first, fallback to qarId lookup
                    let vid = v.id;
                    if(v.qarId && (!vid || vid.startsWith("tmp-"))) {
                      const {data:rv} = await DB.vehicles.getPublic(v.qarId);
                      if(rv?.id) vid = rv.id;
                    }
                    const {data} = await DB.vehicles.getStatus(vid);
                    if(data && data.text) {
                      setVehicleStatus(prev=>({...prev,[v.id]:data}));
                      toast_("Status geladen ✓");
                    } else {
                      toast_("Kein aktiver Status");
                    }
                  }}
                  style={{width:"100%",background:"rgba(255,255,255,.05)",
                    border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",
                    cursor:"pointer",display:"flex",alignItems:"center",
                    justifyContent:"center",gap:8,fontFamily:"'Barlow',sans-serif",
                    color:C.muted,fontSize:13,fontWeight:600}}>
                  <span style={{fontSize:16}}>🔄</span> Live-Status abrufen
                </button>
              );
              // Time calculations
              const now = Date.now();
              const minsLeft = s.expiresAt ? Math.ceil((s.expiresAt - now) / 60000) : null;
              const setAt = s.setAt ? new Date(s.setAt) : null;
              const isToday = setAt && setAt.toDateString()===new Date().toDateString();
              const timeStamp = setAt
                ? (isToday
                  ? "Heute " + setAt.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) + " Uhr"
                  : setAt.toLocaleDateString("de-DE",{day:"2-digit",month:"short"}) + " · " + setAt.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) + " Uhr")
                : null;
              const urgent = minsLeft && minsLeft <= 5;
              const color = urgent ? "#ef4444" : C.amber;
              return (
                <div style={{background:urgent?"#ef444418":`${C.amber}18`,
                  border:`2px solid ${urgent?"#ef444466":C.amber+"66"}`,
                  borderRadius:14,padding:"14px 16px",marginBottom:4,animation:"fadeIn .3s ease"}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <span style={{fontSize:28,flexShrink:0,marginTop:2}}>{s.icon||"💬"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:16,color,lineHeight:1.2,marginBottom:5}}>{s.text}</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                        {timeStamp&&(
                          <span style={{fontSize:10,color:C.muted,display:"flex",alignItems:"center",gap:3}}>
                            🕐 {timeStamp}
                          </span>
                        )}
                        {minsLeft&&minsLeft>0&&(
                          <span style={{fontSize:11,fontWeight:700,color,
                            background:urgent?"#ef444422":`${C.amber}22`,
                            border:`1px solid ${urgent?"#ef444444":C.amber+"44"}`,
                            borderRadius:6,padding:"2px 8px"}}>
                            {minsLeft<=1?"< 1 Min":minsLeft<60?`noch ${minsLeft} Min`:`noch ca. ${Math.round(minsLeft/60)} Std`}
                          </span>
                        )}
                        {!minsLeft&&(
                          <span style={{fontSize:10,color:"#555"}}>Kein Ablauf gesetzt</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* PHONE — below status, above message */}
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

            {/* INFO BOX — explains the anonymous messaging system */}
            {(!me||(v.owner!==me.email&&v.userId!==me.id))&&(
              <div style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"11px 13px",display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0,marginTop:1}}>🔒</span>
                <div style={{fontSize:12,color:"#888",lineHeight:1.6}}>
                  <strong style={{color:"#aaa"}}>Anonymer Kontakt:</strong> Deine Nachricht wird anonym übermittelt — Name und E-Mail bleiben geschützt. Der Fahrzeughalter antwortet direkt über die QAR-App.
                </div>
              </div>
            )}


          </div>
        </div>

        <div style={{padding:"14px 16px",maxWidth:520,margin:"0 auto"}}>

        {nextEvent&&priv.pub_events&&(
            <div style={{background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:9,color:C.red,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>🏁 Nächste Veranstaltung — in {daysUntil(nextEvent.ev.date)} Tagen</div>
              <div style={{fontWeight:700,fontSize:14,color:C.white}}>{nextEvent.ev.name}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Startnr. <span style={{color:C.gold,fontWeight:700}}>#{nextEvent.startNr}</span> · {nextEvent.class}</div>
            </div>
          )}
          <div className="card" style={{padding:16,marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Fahrzeugdaten</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Baujahr","baujahr"],["Kraftstoff","kraftstoff"],["Getriebe","getriebe"],["Farbe","farbe"],["Kilometerstand","kilometerstand"],["TÜV","tuev_faelligkeit"],["Marktwert","marktwert"],["FIN","fin"]].filter(([,k])=>priv[k]!==false&&v[k]).map(([label,key])=>(
                <div key={key}>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
                  <div style={{fontSize:15,fontWeight:600,color:"#eee",marginTop:2}}>
                    {key==="kilometerstand"?parseInt(v[key]).toLocaleString("de-DE")+" km":
                     key==="marktwert"?"€ "+parseInt(v[key]).toLocaleString("de-DE"):
                     v[key]}
                  </div>
                </div>
              ))}
            </div>
            {v.besonderheiten&&priv.besonderheiten!==false&&<div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted,lineHeight:1.6}}>ℹ️ {v.besonderheiten}</div>}
          </div>
          {priv.pub_events&&vHist.length>0&&(
            <div className="card" style={{padding:16,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Veranstaltungshistorie</div>
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

          {/* SHARE — ganz unten */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>
              Fahrzeugakte teilen
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {(()=>{
                const shareUrl = "https://qar.gallery/pcn/?v="+v.qarId;
                const shareTitle = v.hersteller+" "+v.modell+" — Digitale Fahrzeugakte";
                return (<>
                  <button
                    onClick={async()=>{
                      if(navigator.share){ try{ await navigator.share({title:shareTitle,url:shareUrl}); return; }catch(e){} }
                      try{ await navigator.clipboard.writeText(shareUrl); toast_("Link kopiert ✓"); }catch(e){ toast_(shareUrl); }
                    }}
                    style={{flex:2,background:C.red,border:"none",borderRadius:9,padding:"11px",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                      color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                    <span style={{fontSize:16}}>↑</span> Teilen
                  </button>
                  <button
                    onClick={async()=>{
                      try{ await navigator.clipboard.writeText(shareUrl); toast_("Link kopiert ✓"); }catch(e){ toast_(shareUrl); }
                    }}
                    style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"11px",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                      color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                    <span style={{fontSize:16}}>🔗</span> Link
                  </button>
                </>);
              })()}
            </div>
          </div>

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
          <div className="sheet" style={{maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>📍 Live-Status setzen</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Sichtbar wenn jemand deinen QR-Code scannt</div>

            {/* ── Dauer oben — immer sichtbar ── */}
            <div style={{background:`${C.red}18`,border:`1.5px solid ${C.red}44`,borderRadius:12,padding:"13px",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:700,color:C.white}}>⏱ Aktivierungsdauer</span>
                <span style={{fontSize:16,fontWeight:900,color:C.red}}>
                  {(()=>{const m=statusCustomMins||30; return m>=60?`${Math.floor(m/60)}h${m%60>0?" "+m%60+"min":""}`:m+" Min";})()}
                </span>
              </div>
              <input type="range" min="5" max="480" step="5"
                value={statusCustomMins||30}
                onChange={e=>setStatusCustomMins(parseInt(e.target.value))}
                style={{width:"100%",accentColor:C.red}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#555",marginTop:3}}>
                <span>5 Min</span><span>30 Min</span><span>1 Std</span><span>4 Std</span><span>8 Std</span>
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {STATUS_PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setStatus(showStatusPicker,{...p,mins:statusCustomMins||p.mins})}
                  style={{display:"flex",gap:12,alignItems:"center",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",textAlign:"left"}}>
                  <span style={{fontSize:22,flexShrink:0}}>{p.icon}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.white}}>{p.text}</div>
                    <div style={{fontSize:11,color:C.muted}}>Läuft ab nach {statusCustomMins||p.mins} Min</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginBottom:10}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Eigener Text</div>
              <div style={{display:"flex",gap:8}}>
                <input className="inp" placeholder="z.B. Bin gleich beim Einlass..." value={statusCustom}
                  onChange={e=>setStatusCustom(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&statusCustom.trim())setStatus(showStatusPicker,{icon:"💬",mins:statusCustomMins||30},statusCustom);}}
                  style={{flex:1}}/>
                <button className="btn" disabled={!statusCustom.trim()}
                  onClick={()=>{if(statusCustom.trim())setStatus(showStatusPicker,{icon:"💬",mins:statusCustomMins||30},statusCustom);}}
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
  // ── News Detail / Newsletter Vollansicht ────────────────────────────────────
  if(viewNews) return (
    <div style={{position:"fixed",inset:0,background:C.dark,zIndex:300,overflowY:"auto",animation:"slideUp .25s ease"}}>
      <div style={{background:"#fff",borderBottom:`3px solid ${C.red}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
        <button onClick={()=>setViewNews(null)}
          style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#111",padding:"0 4px"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:900,color:"#111",letterSpacing:1}}>PCN NÜRBURGRING</div>
          <div style={{fontSize:10,color:"#888"}}>Mitglieder-Information</div>
        </div>
        <img src="data:image/jpeg;base64,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REBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEQ8FHTVL6qQwUnm/Kk9yDJU1jjJ1FKNuTmeTV56ivxntTc92P8ARfOsp7eBEA58hGTgbyskNwikeGEOY4nADgqMfUV7z5dS1o/NH+i+i2tcczyySHx3Lf3AZyMBR89TJUyGCj3/AJUnIIPEzooHdRRRNdOd2cZwtiio2042nHalPF3uXulpWUzMN3uPFx5rYUBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREHxw2mkd4wo6lc6jm7LKPJc7LHjmpJR1Se010ULP6I7TndyD7cIXMJq4ZNh7BvzzC1TVNqKhksxDGRDOObitmpLqyr7O0kRR73kc/BbTaOnDtsQtyqNQ9fcDzip+fe5b0MLIYwyNuAP2rIAigIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiIMdRIIYXyH5I3KLppH09NJUBof1nygd7T4rZur8xshYfLkdwHcvU1A2Rpa15aHAeSOGRwKD1bYeqpw473SeUSVtrRo55Wy9mqANto3OHMLeQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBalXVOicIom7czuA7ltqOnjqIa108MQl224Hggxkmnm62pPW1LvMY35KyiOvqP4yQQN7m8Vko6V7JDPUO2pXd3yVuKjWpaNkDzIXGSQjG05bKIoCIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIg//Z"
          style={{height:32,objectFit:"contain"}} onError={e=>e.target.style.display="none"} alt="PCN"/>
      </div>
      <div style={{padding:"24px 18px",maxWidth:600,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:28}}>{viewNews.icon}</span>
          {viewNews.pinned&&<span style={{background:C.red,color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:4}}>NEU</span>}
        </div>
        <h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:C.white,lineHeight:1.2,marginBottom:8}}>{viewNews.title}</h1>
        <div style={{fontSize:11,color:C.muted,marginBottom:24}}>
          {viewNews.author&&<span>{viewNews.author} · </span>}{fmtDate(viewNews.date)}
        </div>
        <div style={{fontSize:14,color:"#ccc",lineHeight:1.9,whiteSpace:"pre-wrap",marginBottom:32}}>
          {viewNews.body}
        </div>
        <div style={{display:"flex",gap:10,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <button onClick={()=>{markNewsRead(viewNews.id);setViewNews(null);}}
            style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",
              color:C.muted,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
            ✓ Gelesen
          </button>
          <button onClick={()=>setNewsState(p=>({...p,[viewNews.id]:p[viewNews.id]==="remind"?undefined:"remind"}))}
            style={{flex:1,background:newsState[viewNews.id]==="remind"?`${C.amber}22`:C.card,
              border:`1px solid ${newsState[viewNews.id]==="remind"?C.amber+"44":C.border}`,
              borderRadius:10,padding:"12px",color:newsState[viewNews.id]==="remind"?C.amber:C.muted,
              fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
            🔔 {newsState[viewNews.id]==="remind"?"Erinnerung aktiv":"Erinnern"}
          </button>
        </div>
      </div>
    </div>
  );

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
        {/* ── Photo Gallery — inline ── */}
        <div style={{position:"relative"}}>
          {(()=>{
            const imgs=getImages(v);
            const cur=Math.min(gallerySwipe[v.id]||0, Math.max(0,imgs.length-1));
            const goTo=i=>setGallerySwipe(p=>({...p,[v.id]:Math.max(0,Math.min(imgs.length-1,i))}));
            let touchX=0;
            if(imgs.length===0) return isOwn?(
              <label style={{height:260,background:"#111",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer"}}>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImageUpload(e.target.files[0],url=>addImageToVehicle(v.id,url))}/>
                <span style={{fontSize:44}}>📷</span>
                <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>Erstes Foto hinzufügen</span>
              </label>
            ):(<div style={{height:220,background:"#111",display:"flex",alignItems:"center",justifyContent:"center",color:"#333",fontSize:40}}>📷</div>);
            return (
              <div>
                {/* Hero image */}
                <div style={{height:280,position:"relative",overflow:"hidden",background:"#111"}}
                  onTouchStart={e=>{touchX=e.touches[0].clientX;}}
                  onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>40)goTo(cur+(dx<0?1:-1));}}>
                  <img src={imgs[cur]} alt="" draggable={false}
                    style={{width:"100%",height:"100%",objectFit:"cover",cursor:"zoom-in",userSelect:"none"}}
                    onClick={()=>setLightbox({images:imgs,index:cur})}
                    onError={e=>e.target.style.display="none"}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.45) 0%,transparent 40%,transparent 55%,rgba(0,0,0,.7) 100%)",pointerEvents:"none"}}/>
                  {imgs.length>1&&(<>
                    <div style={{position:"absolute",bottom:14,left:0,right:0,display:"flex",justifyContent:"center",gap:6,zIndex:3}}>
                      {imgs.map((_,i)=>(
                        <div key={i} onClick={e=>{e.stopPropagation();goTo(i);}}
                          style={{width:i===cur?20:7,height:7,borderRadius:99,background:i===cur?"#fff":"rgba(255,255,255,.4)",transition:"all .2s",cursor:"pointer"}}/>
                      ))}
                    </div>
                    <div style={{position:"absolute",bottom:14,right:14,background:"rgba(0,0,0,.6)",borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.9)",zIndex:3}}>
                      {cur+1}/{imgs.length}
                    </div>
                  </>)}
                </div>
                {/* Thumbnail strip — direkt unter Hero, scrollbar */}
                {imgs.length>1&&(
                  <div style={{display:"flex",gap:6,overflowX:"auto",padding:"8px 10px",background:"#0a0a0a",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
                    {imgs.map((img,i)=>(
                      <div key={i} style={{position:"relative",flexShrink:0}}>
                        <img src={img} alt="" onClick={()=>{goTo(i);setLightbox({images:imgs,index:i});}}
                          style={{width:90,height:64,objectFit:"cover",borderRadius:8,cursor:"pointer",display:"block",
                            border:`2.5px solid ${i===cur?C.red:"transparent"}`,
                            opacity:i===cur?1:0.7,transition:"all .15s"}}
                          onError={e=>e.target.style.display="none"}/>
                        {i===0&&<div style={{position:"absolute",top:2,left:2,fontSize:10,background:"rgba(0,0,0,.6)",borderRadius:4,padding:"1px 4px"}}>👑</div>}
                        {isOwn&&i===cur&&i!==0&&(
                          <button onClick={async e=>{
                            e.stopPropagation();
                            const imgs2=[...imgs]; const img2=imgs2[i];
                            imgs2.splice(i,1); imgs2.unshift(img2);
                            const updated={...v,images:imgs2,image:img2};
                            setVehicles(prev=>({...prev,[v.id]:updated}));
                            if(viewV?.id===v.id) setViewV(updated);
                            goTo(0);
                            const DB=window.PCN_DB; if(DB) await DB.vehicles.save(updated);
                            toast_("Titelbild gesetzt 👑");
                          }} style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(200,169,110,.9)",border:"none",borderRadius:"0 0 6px 6px",padding:"2px",color:"#000",fontSize:8,fontWeight:800,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                            👑 Titelbild
                          </button>
                        )}
                        {isOwn&&(
                          <button onClick={e=>{e.stopPropagation();removeImageFromVehicle(v.id,i);}}
                            style={{position:"absolute",top:-4,right:-4,background:C.red,border:"2px solid #0a0a0a",color:"#fff",fontSize:9,width:17,height:17,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>✕</button>
                        )}
                      </div>
                    ))}
                    {isOwn&&(
                      <label style={{width:90,height:64,background:C.card,border:`1.5px dashed ${C.border}`,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,gap:2}}>
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImageUpload(e.target.files[0],url=>addImageToVehicle(v.id,url))}/>
                        <span style={{fontSize:22}}>{imgUploading?"⏳":"📷"}</span>
                        <span style={{fontSize:9,color:C.muted}}>Hinzufügen</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          {/* Overlay buttons on hero */}
          <div style={{position:"absolute",top:16,left:14,zIndex:5}}>
            <button onClick={()=>setScreen("app")}
              style={{background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"9px 14px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Barlow',sans-serif"}}>
              ← Zurück
            </button>
          </div>
          {isOwn&&(
            <div style={{position:"absolute",top:16,right:14,display:"flex",gap:8,zIndex:5}}>
              <button title="QR-Sichtbarkeit einstellen" onClick={()=>setShowPrivacy(v.id)}
                style={{background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"8px 12px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:4,fontFamily:"'Barlow',sans-serif"}}>
                QR 🔒
              </button>
              <button title="Öffentliche QR-Ansicht" onClick={()=>{setPublicV({...v,privacy:priv});setScreen("public");loadStatusFor(v.id);}}
                style={{background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"8px 12px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:4,fontFamily:"'Barlow',sans-serif"}}>
                👁 Vorschau
              </button>
            </div>
          )}
          {!isOwn&&(
            <div style={{position:"absolute",top:16,right:14,zIndex:5}}>
              <button onClick={()=>{setPublicV({...v,privacy:priv});setScreen("public");loadStatusFor(v.id);}}
                style={{background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"8px 12px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'Barlow',sans-serif"}}>
                👁 Ansicht
              </button>
            </div>
          )}
        </div>

        {/* ── Vehicle detail content ── */}
        <div style={{padding:"16px",maxWidth:560,margin:"0 auto"}}>

          {/* ── Eckdaten auf einen Blick ── */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:2}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:C.white}}>{v.hersteller} {v.modell}</div>
              {isOwn&&(
                <button onClick={()=>openEditVehicle(v)}
                  style={{background:C.red,border:"none",borderRadius:8,padding:"6px 14px",
                    color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,
                    fontFamily:"'Barlow',sans-serif",flexShrink:0,marginLeft:10}}>
                  ✏️ Bearbeiten
                </button>
              )}
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{v.baujahr} · {v.farbe} · {v.getriebe}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[
                [v.tuev_faelligkeit||"–","TÜV",tuevColor],
                [(v.kilometerstand||"–")+" km","Kilometerstand",C.white],
                [["","Sehr gut","Gut","Befriend.","Ausreichend","Mangelhaft"][parseInt(v.zustand)]||"–","Zustand",C.gold],
              ].map(([val,label,color],i)=>(
                <div key={i} style={{background:C.black,borderRadius:8,padding:"9px 8px",textAlign:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,color,marginBottom:2,lineHeight:1.2}}>{val}</div>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                ["🔑","Kennzeichen",v.kennzeichen||"–"],
                ["⛽","Kraftstoff",v.kraftstoff||"–"],
                ["💶","Marktwert",v.marktwert?(v.marktwert.toLocaleString?v.marktwert.toLocaleString("de-DE"):v.marktwert)+" €":"–"],
                ["🔩","FIN",v.fin?"••• "+v.fin.slice(-6):"–"],
              ].map(([icon,label,val])=>(
                <div key={label} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:10,color:C.muted}}>{label}</div>
                    <div style={{fontSize:13,fontWeight:600,color:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
            {v.besonderheiten&&(
              <div style={{marginTop:10,padding:"8px 10px",background:C.black,borderRadius:8,fontSize:11,color:C.muted,lineHeight:1.5}}>
                ✨ {v.besonderheiten}
              </div>
            )}

          </div>

          {/* ── QR-Code & Aktionen — eigener Block ── */}
          {isOwn&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px",marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>🔗 QR-Code & Aktionen</div>
              {(()=>{
                const active = getActiveStatus(v.id);
                if(!active) return null;
                return (
                  <div style={{background:`${C.amber}18`,border:`1px solid ${C.amber}44`,borderRadius:10,padding:"10px 13px",marginBottom:10,display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:20}}>{active.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.amber}}>{active.text}</div>
                      <div style={{fontSize:10,color:C.muted,marginTop:1}}>Aktiver Status · sichtbar für Besucher</div>
                    </div>
                    <button onClick={()=>{clearStatus(v.id);toast_("Status gelöscht");}}
                      style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:18,padding:"0 4px"}}>✕</button>
                  </div>
                );
              })()}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>setShowStatusPicker(v.id)}
                  style={{flex:1,background:`${C.amber}15`,border:`1.5px solid ${C.amber}44`,borderRadius:10,padding:"11px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'Barlow',sans-serif"}}>
                  <span style={{fontSize:18}}>📍</span>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.white}}>Live-Status setzen</div>
                    <div style={{fontSize:10,color:C.muted}}>Sichtbar beim QR-Scan</div>
                  </div>
                </button>
                <button onClick={()=>setShowPrivacy(v.id)}
                  style={{flex:1,background:`${C.red}15`,border:`1.5px solid ${C.red}44`,borderRadius:10,padding:"11px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'Barlow',sans-serif"}}>
                  <span style={{fontSize:18}}>🔒</span>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.white}}>QR-Sichtbarkeit</div>
                    <div style={{fontSize:10,color:C.muted}}>Einstellen was Besucher sehen</div>
                  </div>
                </button>
                {v.qarId&&(
                  <div style={{background:C.black,borderRadius:10,padding:"12px",width:"100%",
                    display:"flex",gap:14,alignItems:"center",border:`1px solid ${C.border}`,cursor:"pointer"}}
                    onClick={()=>setLightbox({images:["https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=https://qar.gallery/pcn/?v="+v.qarId],index:0})}>
                    <div style={{background:"#fff",borderRadius:8,padding:6,flexShrink:0}}>
                      <QRCodeCanvas value={"https://qar.gallery/pcn/?v="+v.qarId} size={72}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,color:C.muted,marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>QAR-ID</div>
                      <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.white,letterSpacing:1,marginBottom:4}}>{v.qarId}</div>
                      <div style={{fontSize:10,color:C.muted}}>Tippen zum Vergrößern · FIN wird niemals geteilt</div>
                    </div>
                    <span style={{fontSize:18,color:C.muted,flexShrink:0}}>⤢</span>
                  </div>
                )}
                <button onClick={()=>{setPublicV({...v,privacy:priv});setScreen("public");loadStatusFor(v.id);}}
                  style={{width:"100%",background:C.black,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'Barlow',sans-serif"}}>
                  <span style={{fontSize:18}}>👁</span>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.white}}>Vorschau öffentliche Akte</div>
                    <div style={{fontSize:10,color:C.muted}}>So sehen Besucher dein Fahrzeug beim QR-Scan</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── Fahrzeugspezifische Termine & Erinnerungen ── */}
          {(()=>{
            const vRems = myReminders.filter(r=>r.vehicleId===v.id||r.vehicle_id===v.id);
            if(vRems.length===0) return null;
            return (
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>🔔 Termine & Erinnerungen</div>
                {vRems.map(r=>{
                  const days=daysUntil(r.date);
                  const overdue=days<0, urgent=days<=7;
                  return (
                    <div key={r.id} style={{background:C.card,border:`1.5px solid ${overdue?C.red+"55":urgent?C.amber+"44":C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:6,display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:overdue?C.red:urgent?C.amber:C.white}}>{r.title}</div>
                        <div style={{fontSize:11,color:overdue?C.red:urgent?C.amber:C.muted,marginTop:2}}>
                          {overdue?"⚠️ Überfällig":days===0?"📅 Heute":days===1?"📅 Morgen":`📅 In ${days} Tagen`} · {fmtDate(r.date)}
                        </div>
                      </div>
                      {r.title.toLowerCase().includes("tüv")&&(
                        <button onClick={()=>{
                          const ds=r.date?r.date.replace(/-/g,""):"";
                          const t=encodeURIComponent(`TÜV ${v.hersteller} ${v.modell}`);
                          window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${ds}/${ds}`,"_blank");
                        }} style={{background:`${C.amber}22`,border:`1px solid ${C.amber}44`,borderRadius:7,padding:"5px 9px",color:C.amber,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif",flexShrink:0}}>
                          📅 Eintragen
                        </button>
                      )}
                      <button onClick={async()=>{const DB=window.PCN_DB;if(DB)await DB.reminders.done(me.id,r.id);setReminders(p=>p.map(x=>x.id===r.id?{...x,done:true}:x));toast_("Erledigt ✓");}}
                        style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 10px",color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif",flexShrink:0}}>✓</button>
                    </div>
                  );
                })}
                {isOwn&&<button className="btn sm ghost" style={{marginTop:4}} onClick={()=>{setRemForm({vehicleId:v.id,title:"",date:""});setShowAddRem(true);}}>+ Erinnerung</button>}
              </div>
            );
          })()}

          {/* ── ACCORDION SECTIONS ── */}
          {(()=>{
            const vInsurance = (DEMO_INSURANCE[v.id]||[]);
            const vGutachten = (DEMO_GUTACHTEN[v.id]||[]);
            const sections = [
              {
                id:"logbook", icon:"📋", label:"Service-Logbuch", count:vLog.length,
                action:isOwn?()=>setShowAddLog(v.id):null, actionLabel:"+ Eintrag",
                content:(
                  <div>
                    {vLog.length===0
                      ?<div style={{padding:"16px",textAlign:"center",color:C.muted,fontSize:13}}>
                          Noch leer — 3 Einträge schalten KI-Marktwert frei
                        </div>
                      :vLog.map(e=>(
                        <div key={e.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                            <div>
                              <span style={{fontWeight:700,fontSize:14,color:C.white}}>{e.type}</span>
                              {e.workshop&&<span style={{fontSize:11,color:C.muted,marginLeft:8}}>· {e.workshop}</span>}
                            </div>
                            <span style={{fontSize:11,color:C.muted,flexShrink:0}}>{fmtDate(e.date)}</span>
                          </div>
                          {e.km&&<div style={{fontSize:11,color:C.muted,marginBottom:2}}>{parseInt(e.km).toLocaleString("de-DE")} km</div>}
                          {e.notes&&<div style={{fontSize:12,color:"#888",lineHeight:1.5}}>{e.notes}</div>}
                        </div>
                      ))
                    }
                  </div>
                )
              },
              {
                id:"events", icon:"🏁", label:"Veranstaltungshistorie", count:vParts.length+vHist.length,
                content:(
                  <div>
                    {vParts.map(p=>{const ev=events[p.eventId];if(!ev)return null;return(
                      <div key={p.id} style={{display:"flex",gap:10,alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>{setViewEv(ev);setScreen("event");}}>
                        <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:6,padding:"3px 8px",fontWeight:800,fontSize:13,color:C.red,flexShrink:0}}>#{p.startNr}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:14,color:C.white}}>{ev.name}</div>
                          <div style={{fontSize:11,color:C.muted}}>{fmtDate(ev.date)} · {p.class}</div>
                        </div>
                        <div style={{fontSize:11,color:C.amber,fontWeight:600,flexShrink:0}}>in {daysUntil(ev.date)} T. →</div>
                      </div>
                    );})}
                    {vHist.map(h=>(
                      <div key={h.id} style={{display:"flex",gap:10,alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{background:`${C.gold}22`,border:`1px solid ${C.gold}44`,borderRadius:6,padding:"3px 8px",fontWeight:800,fontSize:13,color:C.gold,flexShrink:0}}>#{h.startNr}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:14,color:C.white}}>{h.eventName}</div>
                          <div style={{fontSize:11,color:C.muted}}>{fmtDate(h.date)}{h.note?" · "+h.note:""}</div>
                        </div>
                        <div style={{fontSize:11,color:h.result==="Teilnahme"?C.muted:C.gold,fontWeight:700,flexShrink:0}}>{h.result}</div>
                      </div>
                    ))}
                    {vParts.length===0&&vHist.length===0&&(
                      <div style={{padding:"16px",textAlign:"center",color:C.muted,fontSize:13}}>Noch keine Veranstaltungsteilnahmen</div>
                    )}
                  </div>
                )
              },
              {
                id:"insurance", icon:"🛡️", label:"Versicherungen", count:vInsurance.length,
                content:(
                  <div>
                    {vInsurance.length===0
                      ?<div style={{padding:"16px",textAlign:"center",color:C.muted,fontSize:13}}>Noch keine Versicherungsdaten hinterlegt</div>
                      :vInsurance.map(ins=>(
                        <div key={ins.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                            <div style={{fontWeight:700,fontSize:14,color:C.white}}>{ins.type}</div>
                            <span style={{background:ins.status==="aktiv"?`${C.green}22`:`${C.red}22`,color:ins.status==="aktiv"?C.green:C.red,fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:4,border:`1px solid ${ins.status==="aktiv"?C.green+"44":C.red+"44"}`}}>
                              {ins.status.toUpperCase()}
                            </span>
                          </div>
                          <div style={{fontSize:12,color:C.muted,marginBottom:2}}>{ins.provider} · Nr: {ins.nr}</div>
                          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Gültig: {fmtDate(ins.since)} – {fmtDate(ins.until)} · {ins.premium}</div>
                          {ins.note&&<div style={{fontSize:11,color:"#777",background:C.black,borderRadius:6,padding:"6px 8px"}}>{ins.note}</div>}
                        </div>
                      ))
                    }
                  </div>
                )
              },
              {
                id:"gutachten", icon:"📄", label:"Gutachten", count:vGutachten.length,
                content:(
                  <div>
                    {vGutachten.length===0
                      ?<div style={{padding:"16px",textAlign:"center",color:C.muted,fontSize:13}}>Noch keine Gutachten hinterlegt</div>
                      :vGutachten.map(g=>(
                        <div key={g.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                            <div style={{fontWeight:700,fontSize:14,color:C.white}}>{g.type}</div>
                            <div style={{display:"flex",gap:4,alignItems:"center"}}>
                              {g.signiert&&<span style={{background:`${C.green}22`,color:C.green,fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:4}}>✓ SIGNIERT</span>}
                              <span style={{fontSize:11,color:C.muted}}>{fmtDate(g.date)}</span>
                            </div>
                          </div>
                          <div style={{fontSize:12,color:C.muted,marginBottom:2}}>{g.gutachter}</div>
                          <div style={{display:"flex",gap:12,marginBottom:6,flexWrap:"wrap"}}>
                            <div><span style={{fontSize:10,color:C.muted}}>Bewertung: </span><span style={{fontSize:13,fontWeight:700,color:C.gold}}>{g.wert}</span></div>
                            <div><span style={{fontSize:10,color:C.muted}}>Zustand: </span><span style={{fontSize:12,color:C.white}}>{g.zustand}</span></div>
                            {g.km&&<div><span style={{fontSize:10,color:C.muted}}>KM: </span><span style={{fontSize:12,color:C.white}}>{parseInt(g.km).toLocaleString("de-DE")}</span></div>}
                          </div>
                          {g.note&&<div style={{fontSize:11,color:"#777",background:C.black,borderRadius:6,padding:"8px 10px",lineHeight:1.6}}>{g.note}</div>}
                        </div>
                      ))
                    }
                  </div>
                )
              },
            ];

            return sections.map(sec=>(
              <div key={sec.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
                {/* Accordion header */}
                <button onClick={()=>toggleSection(v.id, sec.id)}
                  style={{width:"100%",background:"none",border:"none",padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontFamily:"'Barlow',sans-serif"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{sec.icon}</span>
                  <span style={{fontWeight:700,fontSize:15,color:C.white,flex:1,textAlign:"left"}}>{sec.label}</span>
                  {sec.count>0&&<span style={{background:C.black,borderRadius:99,padding:"2px 8px",fontSize:11,fontWeight:700,color:C.muted,flexShrink:0}}>{sec.count}</span>}
                  {sec.action&&isOpen(v.id,sec.id)&&(
                    <button onClick={e=>{e.stopPropagation();sec.action();}}
                      style={{background:C.red,border:"none",borderRadius:6,padding:"4px 10px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,fontFamily:"'Barlow',sans-serif"}}>
                      {sec.actionLabel}
                    </button>
                  )}
                  <span style={{fontSize:16,color:C.muted,flexShrink:0,transition:"transform .2s",
                    transform:isOpen(v.id,sec.id)?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
                </button>
                {/* Accordion body */}
                {isOpen(v.id,sec.id)&&(
                  <div style={{padding:"0 16px 14px",borderTop:`1px solid ${C.border}`}}>
                    {sec.content}
                  </div>
                )}
              </div>
            ));
          })()}

          {/* Phone — pulled from profile, with inline public/private toggle */}
          {isOwn&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>📞 Kontakt</div>
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

        </div>

        {/* Privacy Sheet */}
        {showPrivacy===v.id&&(
          <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowPrivacy(null);}}>
            <div className="sheet">
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontWeight:800,fontSize:13,color:C.red}}>QR</span>
                  <span style={{fontSize:16}}>🔒</span>
                </div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white}}>QR-Sichtbarkeit</div>
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Was sehen Besucher wenn sie den QR-Code scannen?</div>

              {/* Live status summary */}
              <div style={{background:C.black,borderRadius:8,padding:"10px 12px",marginBottom:14,display:"flex",gap:6,flexWrap:"wrap"}}>
                {[
                  [priv.pub_gallery!==false,"📸 Fotos"],
                  [priv.pub_events,"🏁 Events"],
                  [priv.pub_logbook,"📋 Logbuch"],
                  [priv.pub_phone,"📞 Telefon"],
                  [priv.kennzeichen!==false,"🔑 Kennzeichen"],
                  [priv.besonderheiten!==false,"✨ Besonderheiten"],
                ].map(([on,label])=>(
                  <span key={label} style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,
                    background:on?`${C.green}22`:`${C.border}44`,
                    color:on?C.green:C.muted,
                    border:`1px solid ${on?C.green+"44":C.border}`}}>
                    {on?"✓":"✗"} {label}
                  </span>
                ))}
              </div>

              <div style={{fontSize:10,color:"#444",marginBottom:16,lineHeight:1.6}}>
                🔓 = sichtbar für Besucher · 🔒 = nur für dich sichtbar
              </div>
              {[
                ["Basis",[["kennzeichen","Kennzeichen"],["farbe","Farbe"],["kraftstoff","Kraftstoff"],["getriebe","Getriebe"],["baujahr","Baujahr"]]],
                ["Details",[["kilometerstand","Kilometerstand"],["tuev_faelligkeit","TÜV-Datum"],["zustand","Zustand"],["marktwert","Marktwert"],["besonderheiten","Besonderheiten ✨"]]],
                ["Abschnitte",[["pub_gallery","Fotogalerie 📸"],["pub_events","Veranstaltungsteilnahmen"],["pub_logbook","Service-Logbuch"]]],
                ["Kontakt",[["pub_phone","Telefonnummer (Direktanruf)"]]],
              ].map(([group,fields])=>(
                <div key={group} style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>{group}</div>
                  {fields.map(([key,label])=>(
                    <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
                      <div>
                        <div style={{fontSize:14,color:C.white}}>{label}</div>
                        <div style={{fontSize:10,color:(priv[key]===true||(priv[key]===undefined&&DEF_PRIVACY[key]))?C.green:C.muted,marginTop:1}}>
                          {(priv[key]===true||(priv[key]===undefined&&DEF_PRIVACY[key]))?"🔓 Öffentlich sichtbar":"🔒 Nur privat"}
                        </div>
                      </div>
                      <button className={`tog ${(priv[key]===true||priv[key]===undefined&&DEF_PRIVACY[key])?"on":""}`}
                        onClick={()=>togglePrivacy(v.id,key)}/>
                    </div>
                  ))}
                </div>
              ))}
              <button className="btn" style={{width:"100%",marginTop:8,padding:"14px",fontSize:15}} onClick={()=>setShowPrivacy(null)}>Fertig ✓</button>
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
                <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Basis</div>
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
                <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Status & Technik</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input className="inp" type="number" inputMode="numeric" placeholder="Kilometerstand" value={editForm.kilometerstand||""}
                    onChange={e=>setEditForm(p=>({...p,kilometerstand:e.target.value}))}/>
                  <input className="inp" placeholder="TÜV (MM/JJJJ)" value={editForm.tuev_faelligkeit||""}
                    onChange={e=>setEditForm(p=>({...p,tuev_faelligkeit:e.target.value}))}/>
                  <input className="inp" placeholder="Marktwert (€)" value={editForm.marktwert||""}
                    onChange={e=>setEditForm(p=>({...p,marktwert:e.target.value}))}/>
                  <input className="inp" placeholder="FIN (Fahrgestellnummer)" value={editForm.fin||""}
                    onChange={e=>setEditForm(p=>({...p,fin:e.target.value}))}/>
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
                <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Kontakt</div>
                <input className="inp" type="tel" placeholder="Telefonnummer (optional)" value={editForm.phone||""}
                  onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))}/>
                <div style={{fontSize:10,color:C.muted,marginTop:6}}>🔒 Sichtbarkeit über QR-Einstellungen steuerbar</div>
              </div>

              <div style={{marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Besonderheiten</div>
                <textarea className="inp" placeholder="Ausstattung, Extras, Hinweise..." rows={3}
                  value={editForm.besonderheiten||""} onChange={e=>setEditForm(p=>({...p,besonderheiten:e.target.value}))}
                  style={{resize:"vertical",fontFamily:"'Barlow',sans-serif"}}/>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button className="btn ghost" style={{flex:1}} onClick={()=>setShowEditVehicle(null)}>Abbrechen</button>
                <button className="btn" style={{flex:1}} onClick={saveVehicleEdit}>Speichern ✓</button>
              </div>

              {/* Delete vehicle — with confirmation */}
              <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
                <button
                  onClick={async()=>{
                    const v=vehicles[showEditVehicle]; if(!v) return;
                    if(!window.confirm(`Fahrzeug "${v.hersteller} ${v.modell}" wirklich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`)) return;
                    const DB=window.PCN_DB;
                    if(DB) await DB.vehicles.delete(v.id);
                    setVehicles(prev=>{const n={...prev}; delete n[v.id]; return n;});
                    setShowEditVehicle(null);
                    setScreen("app"); setTab("dashboard");
                    toast_("Fahrzeug gelöscht");
                  }}
                  style={{width:"100%",background:"none",border:`1.5px solid ${C.red}44`,
                    borderRadius:10,padding:"12px",color:C.red,cursor:"pointer",
                    fontSize:14,fontWeight:700,fontFamily:"'Barlow',sans-serif"}}>
                  🗑 Fahrzeug löschen
                </button>
                <div style={{fontSize:10,color:"#444",textAlign:"center",marginTop:6}}>
                  Löscht Fahrzeug, Logbuch und QR-Code dauerhaft
                </div>
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
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>📍 Live-Status setzen</div>
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
          onBack={()=>{ setScreen("app"); setTab("events"); }}
          onJoin={joinEvent}
          onCancel={cancelEvent}
          onViewVehicle={v=>{ setViewV(v); setScreen("vehicle"); }}
        />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT (proper component — no useEffect-in-render bug)
  // ══════════════════════════════════════════════════════════════════════════════
  if(screen==="chat"&&activeThread&&(threads[activeThread]||activeThread==="GROUP_PCN")) {
    const t = activeThread==="GROUP_PCN" ? DEMO_GROUP : threads[activeThread];
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
          onDeleteMessage={async(threadId,msgId)=>{
            setThreads(prev=>({...prev,[threadId]:{...prev[threadId],
              messages:(prev[threadId]?.messages||[]).filter(m=>m.id!==msgId)}}));
            const DB=window.PCN_DB;
            if(DB) try{ await DB.threads.deleteMessage(msgId); }catch(e){}
          }}
          onDeleteThread={(threadId)=>setConfirmDeleteThread(threadId)}
          onUpgrade={()=>{
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
        {tab==="dashboard"&&isGuest&&(
          <div style={{padding:"32px 20px",textAlign:"center",animation:"fadeIn .2s"}}>
            <div style={{fontSize:48,marginBottom:16}}>🔒</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color:"#fff",marginBottom:8}}>
              Gast-Modus
            </div>
            <div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:24}}>
              Du bist als Gast angemeldet und kannst Nachrichten an Fahrzeughalter senden.<br/>
              Für alle Club-Features benötigst du ein Mitgliedskonto.
            </div>
            <button className="btn" style={{width:"100%",padding:"14px",fontSize:15,marginBottom:10}}
              onClick={()=>{setScreen("splash");setLoginForm(p=>({...p,mode:"register"}));}}
              style={{background:"none",border:`1.5px solid ${C.red}`,borderRadius:10,padding:"12px",color:C.red,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"'Barlow',sans-serif",width:"100%",marginBottom:10}}>
              🏁 Jetzt Mitglied werden
              🏁 Jetzt Mitglied werden
            </button>
            <button onClick={()=>{setMe(null);setScreen("splash");}}
              style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,fontFamily:"'Barlow',sans-serif"}}>
              Abmelden
            </button>
          </div>
        )}
        {tab==="dashboard"&&!isGuest&&(
          <div style={{animation:"fadeIn .2s"}}>

            {/* ── Demo-Hinweis ── */}
            {isDemo&&(
              <div style={{background:"#6b7fff18",border:"1px solid #6b7fff44",borderRadius:12,padding:"13px 16px",marginBottom:16}}>
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:18}}>🎭</span>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:900,color:"#6b7fff",letterSpacing:.5}}>Demo-Modus — Max Mustermann</div>
                </div>
                <div style={{fontSize:12,color:"#bbb",lineHeight:1.7}}>
                  Alle Funktionen der Plattform sind vollständig implementiert und hier erlebbar — Events, Chat, Fahrzeugakte, QR-Code, Punkte und Admin-Dashboard.
                </div>
                <div style={{marginTop:8,background:"#ffffff12",borderRadius:7,padding:"7px 10px",display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:13}}>🔄</span>
                  <div style={{fontSize:11,color:"#aaa"}}>Demo-Daten werden bei jedem Seitenaufruf zurückgesetzt — Änderungen sind nicht dauerhaft gespeichert.</div>
                </div>
              </div>
            )}
            {/* ── 1. Infos & Neuigkeiten ── */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>📰 Infos & Neuigkeiten</div>

              {/* Willkommen — immer oben, nicht ausblendbar */}
              {(()=>{
                const welcome = DEMO_NEWS.find(n=>n.type==="welcome");
                if(!welcome) return null;
                return (
                  <div style={{background:"#ffffff",border:"1px solid #e5e7eb",borderRadius:12,padding:"13px 14px",marginBottom:10}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontSize:20,flexShrink:0}}>🎉</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:3}}>{welcome.title}</div>
                        <div style={{fontSize:11,color:"#666",lineHeight:1.6}}>{welcome.body}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

{/* Neuigkeiten — horizontal swipeable */}
              {(()=>{
                const dbNews = (window._dbNews||[]).filter(n=>n&&!DEMO_NEWS.find(d=>d.id===String(n.id)));
                const items = [...dbNews, ...DEMO_NEWS]
                  .filter(n=>n.type!=="welcome" && newsState[n.id]!=="read")
                  .sort((a,b)=>new Date(b.date)-new Date(a.date));
                if(!items.length) return null;
                return (
                  <div style={{display:"flex",gap:12,overflowX:"auto",scrollbarWidth:"none",
                    WebkitOverflowScrolling:"touch",paddingBottom:4,marginBottom:8}}>
                    {items.map(n=>{
                      const isRemind = newsState[n.id]==="remind";
                      // Teaser: first 80 chars
                      const teaser = n.body ? n.body.replace(/\n/g," ").slice(0,90)+(n.body.length>90?"…":"") : "";
                      return (
                        <div key={n.id} onClick={()=>setViewNews(n)}
                          style={{background:isRemind?`${C.amber}10`:n.pinned?`${C.red}10`:"#0d0d0d",
                            border:`1px solid ${isRemind?C.amber+"55":C.red+"33"}`,
                            borderRadius:12,padding:"13px 14px",width:260,flexShrink:0,cursor:"pointer"}}>
                          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                            <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{n.icon}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                                <div style={{fontSize:13,fontWeight:700,color:C.white,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</div>
                                {n.pinned&&<span style={{background:C.red,color:"#fff",fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:4,flexShrink:0}}>NEU</span>}
                              </div>
                              <div style={{fontSize:12,color:"#bbb",lineHeight:1.7,marginBottom:10}}>{teaser}</div>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                <span style={{fontSize:9,color:"#444"}}>{fmtDate(n.date)}</span>
                                <span style={{fontSize:11,color:C.red,fontWeight:700}}>Lesen →</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* ── 2. Meine Fahrzeuge ── */}
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5}}>🚗 Meine Fahrzeuge</div>
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
                    <div style={{fontWeight:700,fontSize:15,color:C.white}}>{v.hersteller} {v.modell}</div>
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

            {/* ── Neueste Mitglieder-Fahrzeuge (Demo: alle 4, sonst ausgeblendet) ── */}
            {isDemo&&(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>
                  🚗 Neueste Mitglieder-Fahrzeuge
                </div>
                {displayVehicles.filter(v=>!myVehicles.find(m=>m.id===v.id)).map(v=>(
                  <div key={v.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden",cursor:"pointer",display:"flex"}}
                    onClick={()=>{
                      // Open public view — respects privacy settings
                      const priv = typeof v.privacy==="string" ? JSON.parse(v.privacy) : (v.privacy||{});
                      setPublicV({...v, privacy:{...DEF_PRIVACY,...priv}});
                      setScreen("public");
                    }}>                    <div style={{width:90,height:90,overflow:"hidden",background:"#111",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {v.image?<img src={v.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:<span style={{fontSize:28}}>🏎️</span>}
                    </div>
                    <div style={{padding:"12px 13px",flex:1,minWidth:0,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                      <div style={{fontWeight:700,fontSize:15,color:C.white}}>{v.hersteller} {v.modell}</div>
                      <div style={{display:"flex",gap:6,marginTop:5,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{background:"#fff",border:"1.5px solid #222",borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:800,color:"#111",letterSpacing:1,fontFamily:"Arial,sans-serif"}}>
                          {fmtKz(v.kennzeichen,v.baujahr)}
                        </span>
                        <span style={{fontSize:10,color:C.muted}}>{v.baujahr}</span>
                        <span style={{fontSize:9,color:C.gold,fontWeight:700}}>Peter K.</span>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",paddingRight:12,color:C.muted,fontSize:20}}>›</div>
                  </div>
                ))}
              </div>
            )}

              {/* ── Zuletzt angesehen ── */}
              {recentVehicles.length>0&&(
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>🕐 Zuletzt angesehen</div>
                  <div style={{display:"flex",gap:10,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
                    {recentVehicles.map(rv=>(
                      <div key={rv.id} style={{flexShrink:0,width:130,position:"relative"}}>
                        {/* ✕ per Kachel */}
                        <button
                          onClick={e=>{
                            e.stopPropagation();
                            setRecentVehicles(prev=>{
                              const updated=prev.filter(v=>v.id!==rv.id);
                              localStorage.setItem("pcn_recent_vehicles",JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          style={{position:"absolute",top:-6,right:-6,zIndex:10,
                            width:20,height:20,borderRadius:"50%",
                            background:"#333",border:`1.5px solid ${C.border}`,
                            color:"#aaa",fontSize:10,fontWeight:900,
                            cursor:"pointer",display:"flex",alignItems:"center",
                            justifyContent:"center",lineHeight:1,fontFamily:"sans-serif"}}>
                          ✕
                        </button>
                        <div
                          onClick={()=>{
                            const full = vehicles[rv.id]||DEMO_VEHICLES[rv.id];
                            if(full){ setPublicV({...full,privacy:{...DEF_PRIVACY,...(full.privacy||{})}}); setScreen("public"); }
                            else if(rv.qarId){
                              const DB=window.PCN_DB;
                              if(DB) DB.vehicles.getPublic(rv.qarId).then(({data})=>{
                                if(data) setPublicV({...data,privacy:{...DEF_PRIVACY,...(data.privacy||{})}});
                              });
                              setScreen("public");
                            }
                          }}
                          style={{cursor:"pointer",borderRadius:10,overflow:"hidden",
                            border:`1px solid ${C.border}`,background:C.card}}>
                          <div style={{height:80,overflow:"hidden",background:"#111",position:"relative"}}>
                            {rv.image
                              ? <img src={rv.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                              : <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:28}}>🚗</div>}
                          </div>
                          <div style={{padding:"7px 8px"}}>
                            <div style={{fontSize:11,fontWeight:700,color:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rv.hersteller} {rv.modell}</div>
                            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{rv.kennzeichen||rv.qarId}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={()=>{setRecentVehicles([]);localStorage.removeItem("pcn_recent_vehicles");}}
                      style={{flexShrink:0,width:44,height:"100%",background:"none",border:`1px dashed ${C.border}`,
                        borderRadius:10,color:"#333",cursor:"pointer",fontSize:16,alignSelf:"stretch",minHeight:120}}>
                      ✕
                    </button>
                  </div>
                </div>
              )}

                          {/* ── 3. Plattform-Funktionen ── */}
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5}}>⚙️ Plattform-Funktionen</div>
                <button onClick={()=>setShowInfoModal(true)}
                  style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,lineHeight:1}}>ℹ️</button>
              </div>

              {/* Active functions */}
              {LOCKED_FEATURES.filter(f=>unlockedFeatures.has(f.id)).length>0&&(
                <div style={{marginBottom:10}}>
                  {LOCKED_FEATURES.filter(f=>unlockedFeatures.has(f.id)).map(f=>(
                    <div key={f.id} onClick={()=>setShowFeatureDetail(f)}
                      style={{background:`${C.green}0d`,border:`1px solid ${C.green}33`,borderRadius:11,padding:"12px 14px",marginBottom:7,display:"flex",gap:12,alignItems:"center",cursor:"pointer"}}>
                      <span style={{fontSize:22,flexShrink:0}}>{f.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.white}}>{f.label}</div>
                        <div style={{fontSize:10,color:C.green,marginTop:2}}>✓ Freigeschaltet · {f.desc}</div>
                      </div>
                      <span style={{fontSize:16,color:C.green,flexShrink:0}}>›</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Locked functions — greyed out grid, tappable for explanation */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {LOCKED_FEATURES.filter(f=>!unlockedFeatures.has(f.id)).map(f=>(
                  <div key={f.id} onClick={()=>setShowFeatureDetail(f)}
                    style={{background:"#111",border:`1px solid ${C.border}`,borderRadius:11,padding:"12px 11px",
                      opacity:.6,position:"relative",cursor:"pointer",transition:"opacity .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity=".85"}
                    onMouseLeave={e=>e.currentTarget.style.opacity=".6"}>
                    <div style={{position:"absolute",top:7,right:8,fontSize:11}}>🔒</div>
                    <div style={{fontSize:20,marginBottom:5}}>{f.icon}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:2}}>{f.label}</div>
                    <div style={{fontSize:9,color:"#444",lineHeight:1.4}}>{f.milestone}</div>
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
        {tab==="events"&&!isGuest&&(
          <div style={{animation:"fadeIn .2s"}}>

            {/* View toggle */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:800,color:C.white}}>Veranstaltungen 2026</div>
              <div style={{display:"flex",background:"#1a1a1a",borderRadius:8,padding:2}}>
                {[["list","☰ Liste"],["calendar","📅 Kalender"]].map(([v,label])=>(
                  <button key={v} onClick={()=>setEventsView(v)}
                    style={{padding:"7px 12px",border:"none",borderRadius:6,cursor:"pointer",
                      fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,
                      background:eventsView===v?C.red:"transparent",
                      color:eventsView===v?"#fff":C.muted,transition:"all .15s"}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* LIST VIEW */}
            {eventsView==="list"&&Object.values(events).sort((a,b)=>new Date(a.date)-new Date(b.date)).map(ev=>{
              const days=daysUntil(ev.date);
              const myReg=(participants[ev.id]||[]).find(p=>p.userId===me?.id);
              return (
                <div key={ev.id}
                  style={{background:C.card,borderRadius:14,marginBottom:12,overflow:"hidden",cursor:"pointer",
                    border:`2px solid ${myReg?C.green+"66":days<=7?C.amber+"44":C.border}`}}
                  onClick={()=>{setViewEv(ev);setScreen("event");}}>
                  {/* Color bar top */}
                  <div style={{height:4,background:myReg?C.green:days<=7?C.amber:C.red}}/>
                  <div style={{padding:"14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{background:`${C.red}22`,color:C.red,borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:700}}>{ev.category}</span>
                          {myReg
                            ? <span style={{background:`${C.green}22`,color:C.green,borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:800}}>✓ Angemeldet #{myReg.startNr}</span>
                            : <span style={{background:`${C.border}44`,color:C.muted,borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:600}}>Nicht angemeldet</span>
                          }
                        </div>
                        <div style={{fontWeight:800,fontSize:17,color:C.white,marginBottom:3}}>{ev.name}</div>
                        <div style={{fontSize:13,color:C.muted}}>{fmtDate(ev.date)} · {ev.location}</div>
                      </div>
                      <div style={{textAlign:"center",background:days<=0?"#1a1a1a":days<=7?`${C.amber}22`:`${C.border}33`,borderRadius:10,padding:"8px 10px",marginLeft:10,flexShrink:0}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:days<=0?C.red:days<=7?C.amber:C.white,lineHeight:1}}>
                          {days<=0?"Heute":days}
                        </div>
                        {days>0&&<div style={{fontSize:10,color:C.muted}}>Tage</div>}
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,color:C.muted}}>💶 {ev.entryFee}</span>
                      <span style={{fontSize:12,color:C.muted}}>
                        {(participants[ev.id]||[]).length}/{ev.maxParticipants} Plätze
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* CALENDAR VIEW */}
            {eventsView==="calendar"&&(()=>{
              const year = calMonth.getFullYear();
              const month = calMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month+1, 0).getDate();
              const startOffset = (firstDay+6)%7; // Mon=0
              const eventsThisMonth = Object.values(events).filter(ev=>{
                const d=new Date(ev.date); return d.getFullYear()===year && d.getMonth()===month;
              });
              const eventsByDay = {};
              eventsThisMonth.forEach(ev=>{ const d=new Date(ev.date).getDate(); (eventsByDay[d]=eventsByDay[d]||[]).push(ev); });
              const today = new Date().getDate();
              const todayMonth = new Date().getMonth();
              const todayYear = new Date().getFullYear();
              const isToday = (d) => d===today && month===todayMonth && year===todayYear;

              return (
                <div>
                  {/* Month nav */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <button onClick={()=>setCalMonth(new Date(year,month-1,1))}
                      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",color:C.white,cursor:"pointer",fontSize:16,fontFamily:"'Barlow',sans-serif"}}>‹</button>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white}}>
                      {new Date(year,month).toLocaleDateString("de-DE",{month:"long",year:"numeric"})}
                    </div>
                    <button onClick={()=>setCalMonth(new Date(year,month+1,1))}
                      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",color:C.white,cursor:"pointer",fontSize:16,fontFamily:"'Barlow',sans-serif"}}>›</button>
                  </div>

                  {/* Day headers */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                    {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>(
                      <div key={d} style={{textAlign:"center",fontSize:12,fontWeight:700,color:C.muted,padding:"4px 0"}}>{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
                    {Array.from({length:startOffset}).map((_,i)=><div key={"e"+i}/>)}
                    {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
                      const dayEvents=eventsByDay[day]||[];
                      const hasReg=dayEvents.some(ev=>(participants[ev.id]||[]).find(p=>p.userId===me?.id));
                      return (
                        <div key={day}
                          style={{minHeight:44,borderRadius:8,padding:"4px",cursor:dayEvents.length?"pointer":"default",
                            background:isToday(day)?C.red:dayEvents.length?C.card:"transparent",
                            border:dayEvents.length?`1px solid ${hasReg?C.green+"66":C.border}`:"none",
                            position:"relative"}}
                          onClick={()=>{if(dayEvents.length===1){setViewEv(dayEvents[0]);setScreen("event");}}}>
                          <div style={{fontSize:13,fontWeight:isToday(day)?800:400,color:isToday(day)?"#fff":dayEvents.length?C.white:C.muted,textAlign:"center",lineHeight:1.8}}>{day}</div>
                          {dayEvents.map((ev,i)=>(
                            <div key={ev.id} style={{fontSize:8,fontWeight:700,color:"#fff",
                              background:hasReg?C.green:C.red,borderRadius:3,padding:"1px 3px",
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1}}
                              onClick={e=>{e.stopPropagation();setViewEv(ev);setScreen("event");}}>
                              {ev.name.split(" ")[0]}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {/* Events this month */}
                  {eventsThisMonth.length>0&&(
                    <>
                      <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>
                        Events im {new Date(year,month).toLocaleDateString("de-DE",{month:"long"})}
                      </div>
                      {eventsThisMonth.map(ev=>{
                        const myReg=(participants[ev.id]||[]).find(p=>p.userId===me?.id);
                        return (
                          <div key={ev.id} style={{background:C.card,border:`1px solid ${myReg?C.green+"44":C.border}`,borderRadius:12,padding:"13px",marginBottom:8,cursor:"pointer",display:"flex",gap:12,alignItems:"center"}}
                            onClick={()=>{setViewEv(ev);setScreen("event");}}>
                            <div style={{width:44,height:44,borderRadius:10,background:myReg?`${C.green}22`:`${C.red}22`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <div style={{fontSize:16,fontWeight:800,color:myReg?C.green:C.red,lineHeight:1}}>{new Date(ev.date).getDate()}</div>
                              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase"}}>{new Date(ev.date).toLocaleDateString("de-DE",{month:"short"})}</div>
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:15,fontWeight:700,color:C.white,marginBottom:2}}>{ev.name}</div>
                              <div style={{fontSize:12,color:C.muted}}>{ev.location}</div>
                            </div>
                            {myReg
                              ? <span style={{background:`${C.green}22`,color:C.green,borderRadius:6,padding:"4px 8px",fontSize:12,fontWeight:800,flexShrink:0}}>✓ #{myReg.startNr}</span>
                              : <span style={{background:`${C.border}44`,color:C.muted,borderRadius:6,padding:"4px 8px",fontSize:11,flexShrink:0}}>Anmelden</span>
                            }
                          </div>
                        );
                      })}
                    </>
                  )}
                  {eventsThisMonth.length===0&&(
                    <div style={{textAlign:"center",padding:"30px 20px",color:C.muted}}>
                      <div style={{fontSize:32,marginBottom:8}}>📅</div>
                      <div style={{fontSize:15,color:C.white}}>Keine Events in diesem Monat</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* MESSAGES */}
        {tab==="messages"&&(
          <div style={{animation:"fadeIn .2s",overflowX:"hidden",width:"100%"}}>

            {/* ── Meine anonymen Chats (Gast + Mitglied) ── */}
            {guestThreads.length>0&&(
              <div style={{marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>🔒 MEINE CHATS</div>
                {[...guestThreads].sort((a,b)=>{
                  const at=threads[a.id]?.messages?.filter(m=>!m.isSystem)?.slice(-1)[0];
                  const bt=threads[b.id]?.messages?.filter(m=>!m.isSystem)?.slice(-1)[0];
                  return new Date(bt?.created_at||bt?.createdAt||0) - new Date(at?.created_at||at?.createdAt||0);
                }).map(gt=>{
                  const t=threads[gt.id];
                  const lastMsg=t?.messages?.filter(m=>!m.isSystem)?.slice(-1)[0];
                  return (
                    <div key={gt.id}
                      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 14px",marginBottom:8,display:"flex",gap:12,alignItems:"center",position:"relative"}}
                      onClick={async()=>{
                        if(!t && window.PCN_DB) {
                          const {data:liveThreads}=await window.PCN_DB.threads.list(me?.id||gt.id);
                          const found=(liveThreads||[]).find(x=>x.id===gt.id);
                          if(found) setThreads(prev=>({...prev,[gt.id]:found}));
                        }
                        setActiveThread(gt.id); setScreen("chat");
                      }}>
                      <div style={{width:44,height:44,borderRadius:"50%",background:"#1a1a2e",border:"2px solid #3a3a5e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🔒</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                          <span style={{fontWeight:700,fontSize:15,color:C.white}}>{gt.vehicleName||"Anonymer Chat"}</span>
                          {(()=>{
                            const last=t?.messages?.filter(m=>!m.isSystem)?.slice(-1)[0];
                            if(!last) return null;
                            const raw=last.created_at||last.createdAt||last.ts||"";
                            const d=raw&&!raw.includes(":")===false?new Date(raw):null;
                            const today=new Date();
                            const isToday=d&&d.toDateString()===today.toDateString();
                            return <span style={{fontSize:10,color:C.muted}}>{d&&!isNaN(d)?(isToday?d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString("de-DE",{day:"2-digit",month:"short"})):last.ts||""}</span>;
                          })()}
                        </div>
                        <div style={{fontSize:12,color:"#6b7fff",marginBottom:2}}>QAR: {gt.qarId}</div>
                        <div style={{fontSize:12,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {lastMsg?(lastMsg.from===me?.id?"Du: ":"")+lastMsg.text:"Noch keine Nachricht"}
                        </div>
                      </div>
                      <button
                        onClick={e=>{e.stopPropagation(); setConfirmDeleteThread(gt.id);}}
                        style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:17,padding:"4px 8px",flexShrink:0}}>
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {isGuest&&guestThreads.length===0&&(
              <div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
                <div style={{fontSize:32,marginBottom:12}}>💬</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Noch keine Chats</div>
                <div style={{fontSize:12}}>Scanne einen QR-Code und schreibe dem Fahrzeughalter</div>
              </div>
            )}

            {/* ── Group Channel — nur für Mitglieder ── */}
            {!isGuest&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>📡 Club-Kanal</div>
              <div style={{background:`linear-gradient(135deg, #1a0a0a, #200808)`,border:`2px solid ${C.red}44`,borderRadius:14,padding:"14px",cursor:"pointer",display:"flex",gap:14,alignItems:"center"}}
                onClick={()=>{ setActiveThread("GROUP_PCN"); setScreen("chat"); }}>
                <div style={{width:52,height:52,borderRadius:14,background:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🏎️</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontWeight:800,fontSize:16,color:C.white}}>PCN Mitglieder</span>
                    <span style={{background:C.red,color:"#fff",borderRadius:99,padding:"2px 8px",fontSize:11,fontWeight:800}}>1</span>
                  </div>
                  <div style={{fontSize:12,color:`${C.red}99`,marginBottom:2}}>Gruppen-Kanal · {DEMO_GROUP.participants.length} Mitglieder</div>
                  <div style={{fontSize:13,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    Thomas: Wer fährt mit dem Anhänger?
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* ── Direktnachrichten — nur für Mitglieder ── */}
            {!isGuest&&(
            <div>
            <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>💬 Direktnachrichten</div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:16}}>🔒</span>
              <span style={{fontSize:13,color:C.muted,lineHeight:1.5}}>Direktnachrichten sind anonym — Name und E-Mail bleiben geschützt.</span>
            </div>
            {myThreads.length===0?(
              <div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
                <div style={{fontSize:32,marginBottom:8}}>💬</div>
                <div style={{fontSize:14,color:C.white,marginBottom:4}}>Noch keine Nachrichten</div>
                <div style={{fontSize:12}}>Scanne einen QR-Code am Fahrzeug oder tippe auf „Kontakt" in der Fahrzeugakte</div>
              </div>
            ):(() => {
              // Filter out empty duplicate threads — keep only one per vehicleId + show threads with messages first
              const seen = new Set();
              const filtered = myThreads
                .filter(t => {
                  const hasMsg = t.messages.filter(m=>!m.isSystem).length > 0;
                  const key = t.vehicleId || t.id;
                  if(!hasMsg && seen.has(key)) return false;
                  seen.add(key);
                  return true;
                })
                .sort((a,b) => {
                  const aLast = a.messages.filter(m=>!m.isSystem).pop();
                  const bLast = b.messages.filter(m=>!m.isSystem).pop();
                  // Sort by created_at or createdAt timestamp, newest first
                  const aTime = aLast ? new Date(aLast.created_at||aLast.createdAt||0).getTime() : 0;
                  const bTime = bLast ? new Date(bLast.created_at||bLast.createdAt||0).getTime() : 0;
                  return bTime - aTime;
                });

              return filtered.map(t=>{
              const other=Object.values(allUsers).find(u=>(t.participants||[]).includes(u.id)&&u.id!==me?.id)||{name:"Mitglied"};
              const last=t.messages.filter(m=>!m.isSystem).pop();
              const unread=t.messages.some(m=>m.from!==me?.id&&!m.read&&!m.isSystem);
              const tv=vehicles[t.vehicleId];
              // Fallback: try to get vehicle name from thread title or guestThreads
              const guestT = guestThreads.find(g=>g.id===t.id);
              const vehicleName = tv ? `${tv.hersteller} ${tv.modell}` : (t.vehicleName||guestT?.vehicleName||"");
              const isAnon = t.anonymous;
              // Title: vehicle name for anon threads, member name for direct messages
              const title = isAnon && vehicleName ? vehicleName : isAnon ? "Anonyme Nachricht" : other.name;
              return (
                <div key={t.id} style={{background:C.card,border:`1.5px solid ${unread?C.red+"55":C.border}`,borderRadius:14,padding:"13px 14px",marginBottom:8,display:"flex",gap:12,alignItems:"center",position:"relative"}}>
                  <div style={{flex:1,display:"flex",gap:12,alignItems:"center",cursor:"pointer"}}
                    onClick={()=>{setActiveThread(t.id);setScreen("chat");}}>
                  <div style={{width:46,height:46,borderRadius:"50%",flexShrink:0,
                    background:isAnon?"#1a1a2e":`${C.red}22`,
                    border:`2px solid ${isAnon?"#3a3a5e":C.red+"44"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:isAnon?20:17,color:isAnon?"#6b7fff":C.red,fontWeight:800}}>
                    {isAnon?"🔒":other.name[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2,alignItems:"center"}}>
                      <span style={{fontWeight:unread?800:700,fontSize:14,color:C.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>
                        {title}
                      </span>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                        {unread&&<div style={{width:8,height:8,borderRadius:"50%",background:C.red}}/>}
                        <span style={{fontSize:10,color:C.muted}}>{last?.ts||""}</span>
                      </div>
                    </div>
                    {isAnon&&<div style={{fontSize:11,color:"#6b7fff",marginBottom:2}}>🔒 Anonym · {vehicleName||"Fahrzeuganfrage"}</div>}
                    <div style={{fontSize:12,color:unread?C.white:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {last?(last.from===me?.id?"Du: ":"")+last.text:"Noch keine Nachricht"}
                    </div>
                  </div>
                  </div>
                  <button
                    onClick={async e=>{
                      e.stopPropagation();
                      if(!window.confirm("Chat löschen?")) return;
                      const DB=window.PCN_DB;
                      if(DB) await DB.threads.delete(t.id).catch(()=>{});
                      setThreads(prev=>{const n={...prev};delete n[t.id];return n;});
                      setDeletedThreadIds(prev=>{
                        const updated=[...new Set([...prev, t.id])];
                        localStorage.setItem("pcn_deleted_threads",JSON.stringify(updated));
                        return updated;
                      });
                      setGuestThreads(prev=>{
                        const updated=prev.filter(x=>x.id!==t.id);
                        localStorage.setItem("pcn_guest_threads",JSON.stringify(updated));
                        return updated;
                      });
                    }}
                    style={{background:"none",border:"none",color:"#444",cursor:"pointer",
                      fontSize:17,padding:"4px 6px",flexShrink:0}}>
                    🗑
                  </button>
                </div>
              );
            });})()}
            </div>
            )}
          </div>
        )}

        {/* REMINDERS */}
        {tab==="reminders"&&!isGuest&&(
          <div style={{animation:"fadeIn .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5}}>Erinnerungen</div>
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
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}
                              onClick={()=>{setViewV(rv);setScreen("vehicle");}}>
                              <span style={{fontSize:13,color:C.muted}}>{rv.hersteller} {rv.modell}</span>
                              <span style={{fontSize:11,color:C.red,fontWeight:700}}>→ Zur Akte</span>
                            </div>
                            {r.date&&(
                              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                                <button
                                  onClick={()=>generateICS({
                                    title: r.title+(rv?` — ${rv.hersteller} ${rv.modell}`:""),
                                    date: r.date,
                                    description: rv?`Fahrzeug: ${rv.hersteller} ${rv.modell} (${rv.kennzeichen||""})\nQAR.Gallery: https://qar.gallery/pcn/`:"",
                                    alarmMinutes: 1440,
                                  })}
                                  style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",borderRadius:7,padding:"4px 9px",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif",display:"flex",alignItems:"center",gap:4}}>
                                  📅 .ics
                                </button>
                                <button
                                  onClick={()=>{
                                    const dateStr = r.date ? r.date.replace(/-/g,"") : "";
                                    const title = encodeURIComponent(r.title+(rv?` — ${rv.hersteller} ${rv.modell}`:""));
                                    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}`,"_blank");
                                  }}
                                  style={{background:"#4285F422",border:"1px solid #4285F444",borderRadius:7,padding:"4px 9px",color:"#4285F4",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif",display:"flex",alignItems:"center",gap:4}}>
                                  🗓 Google
                                </button>
                              </div>
                            )}
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
        {tab==="profile"&&!isGuest&&(
          <div style={{animation:"fadeIn .2s"}}>

            {/* ── Punkte-Score — prominent ganz oben ── */}
            <div style={{background:`linear-gradient(135deg, #1a0a0a 0%, #2a0808 100%)`,border:`1px solid ${C.red}44`,borderRadius:16,padding:"20px",marginBottom:14}}>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{width:68,height:68,borderRadius:"50%",overflow:"hidden",flexShrink:0,background:C.red,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative"}}
                  onClick={openEditProfile}>
                  {me?.avatar
                    ?<img src={me.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<span style={{fontSize:26,fontWeight:900,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>{(me?.name||"?")[0].toUpperCase()}</span>
                  }
                  <div style={{position:"absolute",bottom:0,right:0,width:22,height:22,background:C.red,borderRadius:"50%",border:"2px solid #1a0808",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>📷</div>
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
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:40,fontWeight:900,color:C.gold}}>{myPoints}</span>
                    <span style={{fontSize:15,color:C.muted}}>Punkte</span>
                    <button onClick={()=>setShowInfoModal("points")}
                      style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>ℹ️</button>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,color:C.muted}}>Nächste Stufe</div>
                    <div style={{fontSize:15,fontWeight:700,color:C.gold}}>{nextTier.name} · {pointsToNext} Pkt</div>
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

            {/* ── Wallet / Bezahldaten ── */}
            <div className="card" style={{padding:16,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:2}}>💳 Wallet & Mitgliedschaft</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{background:C.black,borderRadius:10,padding:"12px"}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Mitglied seit</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.white}}>{me?.createdAt?new Date(me.createdAt).toLocaleDateString("de-DE",{month:"short",year:"numeric"}):"2026"}</div>
                </div>
                <div style={{background:C.black,borderRadius:10,padding:"12px"}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Jahresbeitrag</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.green}}>✓ Bezahlt</div>
                </div>
              </div>
              <div style={{background:`${C.border}44`,borderRadius:12,padding:"14px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.white}}>PCN Mitgliedschaft</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>Gültig bis: 31.12.2026</div>
                  </div>
                  <div style={{background:C.green,borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:800,color:"#fff"}}>AKTIV</div>
                </div>
              </div>
              <button className="btn ghost" style={{width:"100%",fontSize:14,padding:"12px",borderColor:C.gold,color:C.gold}}
                onClick={async()=>{
                  // Stripe Checkout — opens Stripe hosted payment page
                  // Replace STRIPE_LINK with your actual Stripe Payment Link
                  const STRIPE_LINK = "https://buy.stripe.com/test_placeholder";
                  const params = new URLSearchParams({
                    prefilled_email: me?.email||"",
                    client_reference_id: me?.id||"",
                  });
                  // In production: open Stripe link with prefilled member data
                  // For now: show setup info
                  toast_("Stripe-Integration bereit. Bitte Stripe Payment Link in pcn_config.js eintragen.");
                  // Uncomment when Stripe link is ready:
                  // window.open(STRIPE_LINK+"?"+params.toString(), "_blank");
                }}>
                💳 Mitgliedsbeitrag bezahlen
              </button>
              <div style={{fontSize:10,color:"#444",textAlign:"center",marginTop:6}}>
                Sichere Zahlung via Stripe · SEPA · Kreditkarte
              </div>
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

      {/* ── Feature Detail Modal ── */}
      {showFeatureDetail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={()=>setShowFeatureDetail(null)}>
          <div style={{background:C.dark,border:`1px solid ${C.border}`,borderRadius:"20px 20px 0 0",
            padding:"28px 24px",width:"100%",maxWidth:480,animation:"slideUp .25s ease",maxHeight:"85vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:C.border,borderRadius:2,margin:"0 auto 20px"}}/>
            {(()=>{
              const isUnlocked = unlockedFeatures.has(showFeatureDetail.id);
              const accent = isUnlocked ? C.green : C.red;
              return (<>
                <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:20}}>
                  <div style={{width:56,height:56,borderRadius:16,background:`${accent}22`,border:`1px solid ${accent}44`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>
                    {showFeatureDetail.icon}
                  </div>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:C.white}}>{showFeatureDetail.label}</div>
                      <span style={{fontSize:12}}>{isUnlocked?"✅":"🔒"}</span>
                    </div>
                    <div style={{fontSize:12,color:accent,fontWeight:700}}>
                      {isUnlocked?"✓ Freigeschaltet":showFeatureDetail.milestone}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:14,color:"#ccc",lineHeight:1.85,marginBottom:24,whiteSpace:"pre-wrap"}}>
                  {showFeatureDetail.detail||showFeatureDetail.desc}
                </div>
                {!isUnlocked&&(
                  <div style={{background:"#111",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:20}}>
                    <div style={{fontSize:11,fontWeight:800,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>So freischalten</div>
                    {[
                      ["💳","Premium-Mitgliedschaft aktivieren","Sofortzugang zu allen Funktionen"],
                      ["🏆","Punkte durch Events sammeln","Aktive Teilnahme schaltet Features frei"],
                      ["👥","Neue Mitglieder werben","Bonus-Punkte pro Empfehlung"],
                    ].map(([ic,title,sub])=>(
                      <div key={title} style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                        <span style={{fontSize:18,flexShrink:0}}>{ic}</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:C.white}}>{title}</div>
                          <div style={{fontSize:10,color:C.muted}}>{sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn" style={{width:"100%",padding:"14px",fontSize:15,background:isUnlocked?C.green:C.red}}
                  onClick={()=>setShowFeatureDetail(null)}>Verstanden</button>
              </>);
            })()}
          </div>
        </div>
      )}

      {/* ── INFO MODAL ── */}
      {showInfoModal&&showInfoModal!=='points'&&(
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

      {/* ── POINTS INFO MODAL ── */}
      {showInfoModal==="points"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
          onClick={()=>setShowInfoModal(false)}>
          <div style={{background:C.dark,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",maxWidth:380,width:"100%",animation:"fadeIn .2s"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:C.white,marginBottom:6}}>
              🏆 Punktesystem
            </div>
            <div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:20}}>
              Sammle Punkte durch Aktivitäten und schalte neue Funktionen frei:
            </div>
            {[
              ["🚗","Fahrzeug anlegen","50 Punkte pro Fahrzeug"],
              ["📋","Logbuch-Eintrag","10 Punkte pro Eintrag"],
              ["🏁","Event-Teilnahme","100 Punkte pro Veranstaltung"],
              ["💬","Nachricht senden","5 Punkte pro Nachricht"],
              ["👥","Mitglied werben","200 Punkte pro Neumitglied"],
            ].map(([icon,label,pts])=>(
              <div key={label} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:22,flexShrink:0,width:32,textAlign:"center"}}>{icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:600,color:C.white}}>{label}</div>
                </div>
                <div style={{fontSize:15,fontWeight:800,color:C.gold,flexShrink:0}}>{pts}</div>
              </div>
            ))}
            <div style={{marginTop:16,padding:"12px",background:`${C.gold}11`,borderRadius:10,fontSize:12,color:C.muted,lineHeight:1.7}}>
              💡 Stufen: 100 Pkt = Bronze · 300 Pkt = Silber · 600 Pkt = Gold · 1.000 Pkt = Platin · 2.000 Pkt = Legend
            </div>
            <button className="btn" style={{width:"100%",padding:"14px",fontSize:15,marginTop:16}}
              onClick={()=>setShowInfoModal(false)}>Verstanden ✓</button>
          </div>
        </div>
      )}

      {/* ── PROFILE EDIT SHEET ── */}
      {showEditProfile&&(
        <div className="overlay" style={{zIndex:500}} onClick={e=>{if(e.target===e.currentTarget)setShowEditProfile(false);}}>
          <div className="sheet">
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:800,color:C.white,marginBottom:4}}>✏️ Profil bearbeiten</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Deine persönlichen Angaben</div>

            {/* ── Profilbild ── */}
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:18,padding:"14px",background:C.card,borderRadius:12,border:`1px solid ${C.border}`}}>
              <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                {profileForm.avatar
                  ?<img src={profileForm.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  :<span style={{fontSize:28,fontWeight:900,color:"#fff",fontFamily:"'Barlow Condensed',sans-serif"}}>{(profileForm.name||me?.name||"?")[0]?.toUpperCase()}</span>
                }
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.white,marginBottom:6}}>Profilbild</div>
                <div style={{display:"flex",gap:8}}>
                  <label style={{background:C.red,borderRadius:8,padding:"8px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>
                    <input type="file" accept="image/*" style={{display:"none"}}
                      onChange={e=>{
                        const file=e.target.files[0]; if(!file) return;
                        setProfileImgUploading(true);
                        const reader=new FileReader();
                        reader.onload=ev=>{
                          const img=new Image();
                          img.onload=()=>{
                            const SIZE=200;
                            const canvas=document.createElement("canvas");
                            const scale=Math.min(1,SIZE/img.width,SIZE/img.height);
                            canvas.width=Math.round(img.width*scale);
                            canvas.height=Math.round(img.height*scale);
                            canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
                            setProfileForm(p=>({...p,avatar:canvas.toDataURL("image/jpeg",0.8)}));
                            setProfileImgUploading(false);
                          };
                          img.src=ev.target.result;
                        };
                        reader.readAsDataURL(file);
                      }}/>
                    {profileImgUploading?"⏳ Lädt…":"📷 Foto wählen"}
                  </label>
                  {profileForm.avatar&&(
                    <button onClick={()=>setProfileForm(p=>({...p,avatar:""}))}
                      style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.muted,cursor:"pointer",fontSize:12,fontFamily:"'Barlow',sans-serif"}}>
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Persönlich</div>
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
              <div style={{fontSize:11,fontWeight:800,color:"#aaa",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Benachrichtigungen</div>
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
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:800,color:C.white,marginBottom:4}}>🔔 Erinnerung</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Neue Aufgabe oder Termin anlegen</div>

            {/* Quick presets */}
            <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Schnellauswahl</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {[["🔧","TÜV vereinbaren"],["🛢️","Ölwechsel"],["🏎️","Reifenwechsel"],["📋","Inspektion"],["🏁","Event vorbereiten"]].map(([icon,label])=>(
                <button key={label} onClick={()=>setRemForm(p=>({...p,title:label}))}
                  style={{background:remForm.title===label?C.red:C.card,border:`1px solid ${remForm.title===label?C.red:C.border}`,
                    borderRadius:8,padding:"8px 10px",color:remForm.title===label?"#fff":C.muted,
                    cursor:"pointer",fontSize:12,fontFamily:"'Barlow',sans-serif",display:"flex",gap:4,alignItems:"center"}}>
                  <span>{icon}</span><span>{label}</span>
                </button>
              ))}
            </div>

            <input className="inp" placeholder="Eigener Titel..." style={{marginBottom:10}} value={remForm.title} onChange={e=>setRemForm(p=>({...p,title:e.target.value}))}/>
            <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Fälligkeitsdatum *</div>
            <input className="inp" type="date" style={{marginBottom:10}} value={remForm.date} onChange={e=>setRemForm(p=>({...p,date:e.target.value}))}/>
            <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Fahrzeug (optional)</div>
            <select className="inp" style={{marginBottom:16}} value={remForm.vehicleId} onChange={e=>setRemForm(p=>({...p,vehicleId:e.target.value}))}>
              <option value="">Kein Fahrzeug</option>
              {myVehicles.map(v=><option key={v.id} value={v.id}>{v.hersteller} {v.modell}</option>)}
            </select>
            <button className="btn" style={{width:"100%",padding:"14px",fontSize:15}} onClick={async()=>{
              if(!remForm.title.trim()){toast_("Titel angeben","err");return;}
              if(!remForm.date){toast_("Datum angeben","err");return;}
              const newR = {
                id: "R"+Date.now(),
                title: remForm.title.trim(),
                date: remForm.date,
                vehicleId: remForm.vehicleId||null,
                done: false,
              };
              // Try to persist to DB — but always update local state regardless
              try {
                const DB=window.PCN_DB;
                if(DB){
                  const {data,error}=await DB.reminders.save(me.id, {...newR, vehicle_id:newR.vehicleId, user_id:me.id});
                  if(data && data.id) {
                    const saved={...data, vehicleId:data.vehicle_id||newR.vehicleId};
                    setReminders(prev=>[...prev,saved]);
                  } else {
                    setReminders(prev=>[...prev,newR]);
                  }
                } else {
                  setReminders(prev=>[...prev,newR]);
                }
              } catch(e) {
                console.warn("Reminder save error:",e);
                setReminders(prev=>[...prev,newR]); // still add locally
              }
              setShowAddRem(false);
              setRemForm({vehicleId:"",title:"",date:""});
              toast_("Erinnerung gespeichert ✓");
            }}>Speichern ✓</button>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar">
        {/* Scan button — only for members */}
        {!isGuest&&(
          <button className="tab-btn" onClick={openScanner} style={{color:C.red}}>
            <span className="ico">📷</span>
            <span className="lbl">Scan</span>
          </button>
        )}
        {(isGuest
          ? [["messages","💬","Chats"]]
          : [["dashboard","🏠","Start"],["events","🏁","Events"],["messages","💬","Chats"],["reminders","🔔","Termine"],["profile","👤","Profil"]]
        ).map(([id,icon,label])=>(
          <button key={id} className={`tab-btn ${tab===id?"on":""}`} onClick={()=>setTab(id)}>
            {id==="messages"&&unreadCount>0&&<div className="badge">{unreadCount}</div>}
            <span className="ico">{icon}</span>
            <span className="lbl">{label}</span>
          </button>
        ))}
        {/* Guest: back to public vehicle page */}
        {isGuest&&publicV&&(
          <button className="tab-btn" onClick={()=>setScreen("public")}>
            <span className="ico">🚗</span>
            <span className="lbl">Fahrzeugakte</span>
          </button>
        )}
        {/* Guest: upgrade prompt */}
        {isGuest&&(
          <button className="tab-btn" onClick={()=>{setScreen("splash");setLoginForm(p=>({...p,mode:"register"}));}}>
            <span className="ico">🔓</span>
            <span className="lbl">Mitglied</span>
          </button>
        )}
      </div>
    </div>
  );
}
