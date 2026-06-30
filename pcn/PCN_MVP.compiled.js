(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "react"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require("react"));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.React);
    global.PCN_MVP = mod.exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_exports, _react) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = PCN;
  _react = _interopRequireWildcard(_react);
  function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
  // PCN — Porsche Club Nürburgring · Digitale Clubplattform v3
  // Vollständig neu geschrieben — alle Bugs behoben

  // ─── Error Boundary — catches crashes, shows message instead of black screen ──
  class ErrorBoundary extends _react.default.Component {
    constructor(props) {
      super(props);
      this.state = {
        hasError: false,
        error: null
      };
    }
    static getDerivedStateFromError(error) {
      return {
        hasError: true,
        error
      };
    }
    componentDidCatch(error, info) {
      console.error("[PCN]", error, info);
    }
    render() {
      if (!this.state.hasError) return this.props.children;
      return /*#__PURE__*/_react.default.createElement("div", {
        style: {
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "sans-serif"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: "#191919",
          border: "1px solid #e3061344",
          borderRadius: 18,
          padding: "28px 24px",
          maxWidth: 380,
          textAlign: "center"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 44,
          marginBottom: 14
        }
      }, "⚠️"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 17,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 8
        }
      }, "Etwas ist schiefgelaufen"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 12,
          color: "#999",
          marginBottom: 6,
          lineHeight: 1.6,
          fontFamily: "monospace",
          wordBreak: "break-word"
        }
      }, this.state.error?.message || "Unbekannter Fehler"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: "#666",
          marginBottom: 20
        }
      }, "Deine Daten sind sicher gespeichert."), /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => window.location.reload(),
        style: {
          background: "#e30613",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "12px 28px",
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
          width: "100%"
        }
      }, "🔄 Neu laden")));
    }
  }

  // ─── Utils ────────────────────────────────────────────────────────────────────
  const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
  const today = () => new Date().toISOString().split("T")[0];
  const fmtDate = d => d ? new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) : "–";
  const fmtTime = () => new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const daysUntil = d => Math.ceil((new Date(d) - new Date()) / 86400000);
  const QAR_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const genQARId = () => {
    let id = "QAR-";
    for (let i = 0; i < 8; i++) id += QAR_CHARS[Math.floor(Math.random() * QAR_CHARS.length)];
    return id;
  };
  const isH = baujahr => baujahr && new Date().getFullYear() - parseInt(baujahr) >= 30;
  const fmtKz = (kz, baujahr) => isH(baujahr) ? (kz || "").replace(/\s*H\s*$/, "").trim() + " H" : kz || "";

  // ─── Brand ───────────────────────────────────────────────────────────────────
  const LOGO_URL = "https://www.porsche-club-nuerburgring.de/PorscheClubs/pc_nuerburgring/pc_main.nsf/webclubprofile/ClubProfile/$file/clublogo_og.jpg";
  const C = {
    black: "#0a0a0a",
    dark: "#111111",
    card: "#191919",
    border: "#272727",
    red: "#e30613",
    gold: "#c8a96e",
    white: "#f0f0f0",
    muted: "#666",
    green: "#22c55e",
    amber: "#f59e0b"
  };

  // ─── Privacy defaults ─────────────────────────────────────────────────────────
  const DEF_PRIVACY = {
    hersteller: true,
    modell: true,
    baujahr: true,
    farbe: true,
    kraftstoff: true,
    getriebe: true,
    kennzeichen: true,
    kilometerstand: false,
    zustand: false,
    tuev_faelligkeit: false,
    fin: false,
    marktwert: false,
    pub_logbook: false,
    pub_events: true,
    pub_phone: false
  };

  // ─── QR Code (Real, scannable — uses bundled qrcode.js library) ──────────────
  // Fully defensive: never throws, always falls back gracefully
  function QRCodeCanvas({
    value,
    size = 140
  }) {
    const ref = (0, _react.useRef)(null);
    const [status, setStatus] = (0, _react.useState)(window.QRCodeLib ? "ready" : "loading");
    (0, _react.useEffect)(() => {
      if (window.QRCodeLib) {
        setStatus("ready");
        return;
      }
      let cancelled = false;
      const s = document.createElement("script");
      s.src = "qrcode_bundle.js";
      s.onload = () => {
        if (!cancelled) setStatus(window.QRCodeLib ? "ready" : "error");
      };
      s.onerror = () => {
        if (!cancelled) setStatus("error");
      };
      document.head.appendChild(s);
      // Fallback timeout — if script never loads, show fallback after 3s
      const timer = setTimeout(() => {
        if (!cancelled && !window.QRCodeLib) setStatus("error");
      }, 3000);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, []);
    (0, _react.useEffect)(() => {
      if (status !== "ready" || !ref.current || !window.QRCodeLib) return;
      try {
        const QR = window.QRCodeLib;
        QR.toCanvas(ref.current, value, {
          width: size,
          margin: 1,
          errorCorrectionLevel: "M",
          color: {
            dark: "#111111",
            light: "#ffffff"
          }
        }, err => {
          if (err) {
            console.error("QR render error:", err);
            setStatus("error");
          }
        });
      } catch (e) {
        console.error("QR exception:", e);
        setStatus("error");
      }
    }, [status, value, size]);
    if (status === "loading") return /*#__PURE__*/_react.default.createElement("div", {
      style: {
        width: size,
        height: size,
        background: "#fff",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 10,
        color: "#999",
        fontFamily: "sans-serif"
      }
    }, "Lädt…"));
    if (status === "error") return /*#__PURE__*/_react.default.createElement("div", {
      style: {
        width: size,
        height: size,
        background: "#fff",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        gap: 4
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 20
      }
    }, "📱"), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 9,
        color: "#666",
        fontFamily: "sans-serif",
        textAlign: "center",
        wordBreak: "break-all"
      }
    }, value));
    return /*#__PURE__*/_react.default.createElement("canvas", {
      ref: ref,
      style: {
        borderRadius: 4,
        display: "block",
        width: size,
        height: size
      }
    });
  }

  // ─── Demo Data ────────────────────────────────────────────────────────────────
  const CLUB_CODE = "PCN2026";
  const dPlus = days => new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
  const dMinus = days => new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const DEMO_USERS = {
    "u1": {
      id: "u1",
      name: "Max Mustermann",
      email: "max@pcn.de",
      role: "member",
      memberNr: "PCN-0847"
    },
    "u2": {
      id: "u2",
      name: "Thomas Weber",
      email: "thomas@pcn.de",
      role: "member",
      memberNr: "PCN-0312"
    },
    "u3": {
      id: "u3",
      name: "Anna Fischer",
      email: "anna@pcn.de",
      role: "member",
      memberNr: "PCN-0561"
    }
  };
  const DEMO_VEHICLES = {
    "V001": {
      id: "V001",
      qarId: "QAR-R4T8W3NX",
      userId: "u1",
      owner: "max@pcn.de",
      hersteller: "Porsche",
      modell: "911 Carrera 4S",
      baujahr: "2021",
      kraftstoff: "Benzin",
      getriebe: "PDK",
      farbe: "GT-Silbermetallic",
      kennzeichen: "AW-PC 911",
      fin: "WP0ZZZ99ZLS100001",
      phone: "+49 171 9110911",
      kilometerstand: "32400",
      tuev_faelligkeit: "02/2027",
      marktwert: "138000",
      zustand: "1",
      besonderheiten: "Sport-Chrono, PASM, Sportabgasanlage, PCCB",
      image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
      images: ["https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80", "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=800&q=80", "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=800&q=80", "https://images.unsplash.com/photo-1611859266238-4b98091d9d9b?w=800&q=80"],
      privacy: {
        ...DEF_PRIVACY,
        pub_phone: true
      }
    },
    "V002": {
      id: "V002",
      qarId: "QAR-K9P2M7RW",
      userId: "u1",
      owner: "max@pcn.de",
      hersteller: "Porsche",
      modell: "Boxster 718 GTS 4.0",
      baujahr: "2022",
      kraftstoff: "Benzin",
      getriebe: "6-Gang manuell",
      farbe: "Pythongrün",
      kennzeichen: "AW-PC 718",
      fin: "WP0ZZZ98ZNS200042",
      kilometerstand: "18700",
      tuev_faelligkeit: "09/2027",
      marktwert: "89000",
      zustand: "1",
      besonderheiten: "Manuelles Getriebe, Alcantara-Paket, Sportabgas",
      image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
      images: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80", "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80", "https://images.unsplash.com/photo-1547744152-14d985cb937f?w=800&q=80"],
      privacy: {
        ...DEF_PRIVACY
      }
    },
    "V003": {
      id: "V003",
      qarId: "QAR-T7M3N9PX",
      userId: "u2",
      owner: "thomas@pcn.de",
      hersteller: "Porsche",
      modell: "992 GT3",
      baujahr: "2022",
      kraftstoff: "Benzin",
      getriebe: "PDK",
      farbe: "Riviera Blau",
      kennzeichen: "MYK-PC 992",
      fin: "WP0AC2A92NS230001",
      kilometerstand: "8200",
      tuev_faelligkeit: "06/2027",
      marktwert: "195000",
      zustand: "1",
      besonderheiten: "Clubsport-Paket, Liftsystem, Carbon-Dach",
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
      images: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80", "https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=800&q=80", "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800&q=80", "https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=800&q=80"],
      privacy: {
        ...DEF_PRIVACY,
        pub_events: true
      }
    }
  };
  const DEMO_EVENTS = {
    "E001": {
      id: "E001",
      name: "PCN TrackDay Nürburgring",
      subtitle: "Nordschleife · Touristenfahrten",
      date: dPlus(12),
      location: "Nürburgring, Nordschleife",
      category: "Trackday",
      maxParticipants: 40,
      entryFee: "€ 380 / Fahrzeug",
      description: "Jährlicher PCN TrackDay auf der Nordschleife. Touristenfahrten, optional mit Instruktor. Technische Abnahme vor Ort.",
      classes: ["Street", "Sport", "Race"]
    },
    "E002": {
      id: "E002",
      name: "After Work Classics",
      subtitle: "Abendausfahrt Grand-Prix-Strecke",
      date: dPlus(22),
      location: "Grand-Prix-Strecke, Nürburgring",
      category: "Ausfahrt",
      maxParticipants: 60,
      entryFee: "kostenlos für Mitglieder",
      description: "Entspannte Abendausfahrt. Alle Porsche-Modelle willkommen.",
      classes: ["Alle Modelle"]
    },
    "E003": {
      id: "E003",
      name: "BELMOT Oldtimer-Grand-Prix",
      subtitle: "53. Auflage — Clubbesuch",
      date: dPlus(41),
      location: "Nürburgring",
      category: "Rennsport",
      maxParticipants: 200,
      entryFee: "Eintritt ab € 29",
      description: "Gemeinsamer Besuch des BELMOT Grand Prix. PCN-Treffpunkt am Historischen Fahrerlager.",
      classes: ["Besucher", "Aktive Fahrer"]
    },
    "E004": {
      id: "E004",
      name: "PCN Clubabend",
      subtitle: "CHRSN x PCN im Kesselchen",
      date: dPlus(51),
      location: "Historisches Fahrerlager",
      category: "Clubabend",
      maxParticipants: 80,
      entryFee: "kostenlos",
      description: "Monatlicher Clubabend im Kesselchen. Austausch und Neuigkeiten.",
      classes: ["Alle Mitglieder"]
    }
  };
  const DEMO_LOGBOOK = {
    "V001": [{
      id: "L1",
      vehicleId: "V001",
      date: dMinus(60),
      type: "Ölwechsel",
      km: "31200",
      notes: "Mobil 1 5W-50",
      workshop: "Porsche Zentrum Koblenz"
    }, {
      id: "L2",
      vehicleId: "V001",
      date: dMinus(120),
      type: "Inspektion",
      km: "27800",
      notes: "Großer Service — Bremsflüssigkeit, Luftfilter",
      workshop: "Porsche Zentrum Koblenz"
    }, {
      id: "L3",
      vehicleId: "V001",
      date: dMinus(200),
      type: "Reifenwechsel",
      km: "24100",
      notes: "Pirelli P Zero Sommer",
      workshop: "Eigene Werkstatt"
    }],
    "V002": [{
      id: "L4",
      vehicleId: "V002",
      date: dMinus(90),
      type: "Inspektion",
      km: "18200",
      notes: "Jahresinspektion i.O.",
      workshop: "Porsche Zentrum Koblenz"
    }]
  };
  const DEMO_PARTICIPANTS = {
    "E001": [{
      id: "P1",
      eventId: "E001",
      vehicleId: "V001",
      userId: "u1",
      class: "Sport",
      startNr: "07",
      status: "confirmed"
    }, {
      id: "P2",
      eventId: "E001",
      vehicleId: "V003",
      userId: "u2",
      class: "Race",
      startNr: "03",
      status: "confirmed"
    }],
    "E002": [{
      id: "P3",
      eventId: "E002",
      vehicleId: "V002",
      userId: "u1",
      class: "Alle Modelle",
      startNr: "12",
      status: "confirmed"
    }]
  };
  const DEMO_HISTORY = [{
    id: "H1",
    vehicleId: "V001",
    eventName: "PCN TrackDay 2025",
    date: dMinus(280),
    startNr: "05",
    class: "Sport",
    result: "Finisher",
    note: "Bestzeit 9:43 min Nordschleife"
  }, {
    id: "H2",
    vehicleId: "V001",
    eventName: "After Work Classics Sep 2025",
    date: dMinus(310),
    startNr: "11",
    class: "Alle Modelle",
    result: "Teilnahme",
    note: ""
  }, {
    id: "H3",
    vehicleId: "V003",
    eventName: "PCN TrackDay 2025",
    date: dMinus(280),
    startNr: "02",
    class: "Race",
    result: "Schnellste Zeit",
    note: "7:58 min — Clubrekord"
  }];
  const DEMO_THREADS = {
    "T001": {
      id: "T001",
      participants: ["u1", "u2"],
      vehicleId: "V003",
      vehicleName: "Porsche 992 GT3",
      anonymous: true,
      messages: [{
        id: "M0",
        from: "system",
        text: "Kontakt über QAR-ID: QAR-T7M3N9PX",
        ts: "Gestern 18:31",
        isSystem: true,
        read: true
      }, {
        id: "M1",
        from: "u2",
        text: "Hallo! Welche Reifengröße fährst du hinten beim GT3?",
        ts: "Gestern 18:32",
        read: false
      }]
    }
  };

  // ─── Milestones ───────────────────────────────────────────────────────────────
  const MILESTONES = [{
    id: "logbook3",
    label: "3 Logbuch-Einträge",
    check: s => Object.values(s.logbook).flat().length >= 3,
    unlocks: ["marktwert"]
  }, {
    id: "events1",
    label: "Erste Event-Teilnahme",
    check: s => Object.values(s.participants).flat().filter(p => p.userId === s.me?.id).length >= 1,
    unlocks: ["history"]
  }, {
    id: "vehicles2",
    label: "2 Fahrzeuge erfasst",
    check: s => Object.values(s.vehicles).filter(v => v.owner === s.me?.email).length >= 2,
    unlocks: ["fleet"]
  }];
  const LOCKED_FEATURES = [{
    id: "marktwert",
    icon: "💶",
    label: "KI-Marktwertanalyse",
    milestone: "3 Logbuch-Einträge",
    desc: "Claude bewertet deinen Porsche anhand der Servicehistorie"
  }, {
    id: "history",
    icon: "⏱️",
    label: "Rundenzeiten",
    milestone: "Erste Event-Teilnahme",
    desc: "Nordschleife-Bestzeiten tracken"
  }, {
    id: "fleet",
    icon: "📊",
    label: "Fuhrpark-Analyse",
    milestone: "2 Fahrzeuge",
    desc: "Kosten/km und Wertverlauf"
  }, {
    id: "workshop",
    icon: "🔧",
    label: "Werkstatt-Zugang",
    milestone: "Partnerschaft aktiv",
    desc: "PCN-Partnerwerkstätten greifen auf die Akte zu"
  }, {
    id: "insurer",
    icon: "🛡️",
    label: "Versicherer-Zugang",
    milestone: "Club-Partner",
    desc: "Allianz Classic sieht deine Dokumentation"
  }, {
    id: "token",
    icon: "🪙",
    label: "Digitaler Fahrzeugpass",
    milestone: "Beta-Programm",
    desc: "Blockchain-Eigentumsnachweis"
  }];

  // ─── Status Presets ──────────────────────────────────────────────────────────
  const STATUS_PRESETS = [{
    icon: "🏁",
    text: "Komme gleich zurück",
    mins: 15
  }, {
    icon: "⏱️",
    text: "Bin in 5 Min zurück",
    mins: 5
  }, {
    icon: "⏱️",
    text: "Bin in 10 Min zurück",
    mins: 10
  }, {
    icon: "⏱️",
    text: "Bin in 15 Min zurück",
    mins: 15
  }, {
    icon: "⏱️",
    text: "Bin in 30 Min zurück",
    mins: 30
  }];

  // ─── Sub-components (proper React components — no hooks-in-render) ─────────────

  function EventDetail({
    ev,
    me,
    myVehicles,
    vehicles,
    participants,
    onBack,
    onJoin,
    onViewVehicle
  }) {
    const [selV, setSelV] = (0, _react.useState)(myVehicles[0]?.id || "");
    const [selC, setSelC] = (0, _react.useState)(ev.classes[0]);
    const evParts = participants[ev.id] || [];
    const myReg = evParts.find(p => p.userId === me?.id);
    const days = daysUntil(ev.date);
    return /*#__PURE__*/_react.default.createElement("div", {
      style: {
        minHeight: "100vh",
        background: C.black,
        paddingBottom: 40,
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: C.dark,
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 16px"
      }
    }, /*#__PURE__*/_react.default.createElement("button", {
      onClick: onBack,
      style: {
        background: "none",
        border: "none",
        color: C.muted,
        cursor: "pointer",
        fontSize: 13,
        padding: 0,
        marginBottom: 10
      }
    }, "← Events"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 6
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        background: `${C.red}22`,
        color: C.red,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 700
      }
    }, ev.category), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        background: days <= 7 ? `${C.amber}22` : `${C.border}22`,
        color: days <= 7 ? C.amber : C.muted,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 700
      }
    }, days <= 0 ? "Heute" : days === 1 ? "Morgen" : `in ${days} T.`)), /*#__PURE__*/_react.default.createElement("h1", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 24,
        fontWeight: 900,
        color: C.white,
        lineHeight: 1.1
      }
    }, ev.name), /*#__PURE__*/_react.default.createElement("p", {
      style: {
        fontSize: 11,
        color: C.muted,
        marginTop: 3
      }
    }, ev.subtitle)), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        padding: "16px",
        maxWidth: 520,
        margin: "0 auto"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14
      }
    }, [["📅", fmtDate(ev.date), "Datum"], ["📍", ev.location, "Ort"], ["💶", ev.entryFee, "Nenngeld"], ["👥", `${evParts.length} / ${ev.maxParticipants}`, "Plätze"]].map(([icon, val, label]) => /*#__PURE__*/_react.default.createElement("div", {
      key: label,
      style: {
        display: "flex",
        gap: 10,
        marginBottom: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        width: 20,
        textAlign: "center"
      }
    }, icon), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 11,
        color: C.muted,
        minWidth: 56
      }
    }, label), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 13,
        color: C.white,
        fontWeight: 600
      }
    }, val))), /*#__PURE__*/_react.default.createElement("p", {
      style: {
        fontSize: 12,
        color: C.muted,
        lineHeight: 1.7,
        marginTop: 8,
        paddingTop: 8,
        borderTop: `1px solid ${C.border}`
      }
    }, ev.description)), myReg ? /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: `${C.green}11`,
        border: `1px solid ${C.green}44`,
        borderRadius: 12,
        padding: "14px 16px",
        textAlign: "center",
        marginBottom: 14
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        color: C.green,
        fontWeight: 700,
        fontSize: 15,
        marginBottom: 3
      }
    }, "✓ Angemeldet — #", myReg.startNr), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 12,
        color: C.muted
      }
    }, myReg.class, " · ", fmtDate(ev.date))) : me && myVehicles.length > 0 ? /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 17,
        fontWeight: 800,
        color: C.white,
        marginBottom: 12
      }
    }, "Jetzt anmelden"), /*#__PURE__*/_react.default.createElement("select", {
      value: selV,
      onChange: e => setSelV(e.target.value),
      style: {
        width: "100%",
        background: "#191919",
        border: `1px solid ${C.border}`,
        borderRadius: 9,
        padding: "12px 14px",
        color: C.white,
        fontSize: 14,
        fontFamily: "'Barlow',sans-serif",
        marginBottom: 8
      }
    }, myVehicles.map(v => /*#__PURE__*/_react.default.createElement("option", {
      key: v.id,
      value: v.id
    }, v.hersteller, " ", v.modell, " · ", v.kennzeichen))), /*#__PURE__*/_react.default.createElement("select", {
      value: selC,
      onChange: e => setSelC(e.target.value),
      style: {
        width: "100%",
        background: "#191919",
        border: `1px solid ${C.border}`,
        borderRadius: 9,
        padding: "12px 14px",
        color: C.white,
        fontSize: 14,
        fontFamily: "'Barlow',sans-serif",
        marginBottom: 14
      }
    }, ev.classes.map(c => /*#__PURE__*/_react.default.createElement("option", {
      key: c
    }, c))), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn",
      onClick: () => onJoin(ev.id, selV, selC),
      style: {
        width: "100%"
      }
    }, "Anmelden ✓")) : me ? /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 14,
        textAlign: "center",
        color: C.muted,
        fontSize: 13
      }
    }, "Zuerst ein Fahrzeug hinzufügen um dich anzumelden.") : null, evParts.length > 0 && /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "Teilnehmer (", evParts.length, ")"), evParts.map(p => {
      const pv = vehicles[p.vehicleId];
      return /*#__PURE__*/_react.default.createElement("div", {
        key: p.id,
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "10px 0",
          borderBottom: `1px solid ${C.border}`,
          cursor: pv ? "pointer" : "default"
        },
        onClick: () => pv && onViewVehicle(pv)
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: `${C.red}22`,
          border: `1px solid ${C.red}44`,
          borderRadius: 7,
          padding: "3px 8px",
          fontWeight: 800,
          fontSize: 13,
          color: C.red,
          flexShrink: 0
        }
      }, "#", p.startNr), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: C.white,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, pv ? `${pv.hersteller} ${pv.modell}` : "Fahrzeug"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, p.class, pv?.kennzeichen ? " · " + fmtKz(pv.kennzeichen, pv.baujahr) : "")), pv && /*#__PURE__*/_react.default.createElement("span", {
        style: {
          color: C.muted,
          fontSize: 16
        }
      }, "›"));
    }))));
  }
  function ChatScreen({
    thread,
    me,
    allUsers,
    vehicles,
    onBack,
    onSend,
    onMarkRead,
    onViewVehicle,
    onUpgrade
  }) {
    const [msg, setMsg] = (0, _react.useState)("");
    const endRef = (0, _react.useRef)(null);
    const other = Object.values(allUsers).find(u => thread.participants.includes(u.id) && u.id !== me?.id) || {
      name: "Mitglied"
    };
    const v = vehicles[thread.vehicleId];
    const isGuest = me?.role === "guest";
    (0, _react.useEffect)(() => {
      endRef.current?.scrollIntoView({
        behavior: "smooth"
      });
    }, [thread.messages]);
    (0, _react.useEffect)(() => {
      if (onMarkRead) onMarkRead(thread.id);
    }, [thread.id]);
    return /*#__PURE__*/_react.default.createElement("div", {
      style: {
        height: "100vh",
        background: C.black,
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: C.dark,
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 16px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/_react.default.createElement("button", {
      onClick: onBack,
      style: {
        background: "none",
        border: "none",
        color: C.muted,
        cursor: "pointer",
        fontSize: 20,
        padding: 0,
        lineHeight: 1
      }
    }, "←"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: `${C.red}22`,
        color: C.red,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: 16,
        flexShrink: 0
      }
    }, thread.anonymous ? "🔒" : other.name[0]), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: C.white
      }
    }, thread.anonymous ? "🔒 Anonym" : other.name), v && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        color: C.muted,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, "Re: ", v.hersteller, " ", v.modell)), v && /*#__PURE__*/_react.default.createElement("button", {
      className: "btn sm ghost",
      onClick: () => onViewVehicle(v),
      style: {
        fontSize: 11,
        flexShrink: 0
      }
    }, "Akte →")), isGuest && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: `${C.gold}14`,
        borderBottom: `1px solid ${C.gold}33`,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 16,
        flexShrink: 0
      }
    }, "👋"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        flex: 1,
        fontSize: 11,
        color: C.white,
        lineHeight: 1.4
      }
    }, "Du schreibst als ", /*#__PURE__*/_react.default.createElement("strong", null, "Gast"), ". Mitglieder bekommen eigene Fahrzeugakte & Event-Zugang."), /*#__PURE__*/_react.default.createElement("button", {
      onClick: onUpgrade,
      style: {
        background: C.gold,
        border: "none",
        borderRadius: 7,
        padding: "6px 11px",
        color: "#0a0a0a",
        fontWeight: 800,
        fontSize: 11,
        cursor: "pointer",
        flexShrink: 0,
        fontFamily: "'Barlow',sans-serif"
      }
    }, "Mitglied werden")), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, thread.messages.map(m => {
      if (m.isSystem) return /*#__PURE__*/_react.default.createElement("div", {
        key: m.id,
        style: {
          textAlign: "center",
          fontSize: 10,
          color: "#444",
          margin: "4px 0"
        }
      }, "— ", m.text, " —");
      const mine = m.from === me?.id;
      return /*#__PURE__*/_react.default.createElement("div", {
        key: m.id,
        style: {
          display: "flex",
          justifyContent: mine ? "flex-end" : "flex-start"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          maxWidth: "80%",
          background: mine ? C.red : "#1e1e1e",
          border: mine ? "none" : `1px solid ${C.border}`,
          borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: "10px 14px"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 14,
          color: "#fff",
          lineHeight: 1.5
        }
      }, m.text), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 9,
          color: mine ? "rgba(255,255,255,.5)" : C.muted,
          marginTop: 3,
          textAlign: "right"
        }
      }, m.ts)));
    }), /*#__PURE__*/_react.default.createElement("div", {
      ref: endRef
    })), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        padding: "10px 12px",
        background: C.dark,
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        gap: 8,
        flexShrink: 0,
        paddingBottom: "calc(10px + env(safe-area-inset-bottom,0))"
      }
    }, /*#__PURE__*/_react.default.createElement("input", {
      placeholder: "Nachricht…",
      value: msg,
      onChange: e => setMsg(e.target.value),
      onKeyDown: e => {
        if (e.key === "Enter" && !e.shiftKey && msg.trim()) {
          e.preventDefault();
          onSend(thread.id, msg);
          setMsg("");
        }
      },
      style: {
        flex: 1,
        background: "#191919",
        border: `1px solid ${C.border}`,
        borderRadius: 9,
        padding: "10px 14px",
        color: C.white,
        fontSize: 14,
        fontFamily: "'Barlow',sans-serif"
      }
    }), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn",
      style: {
        padding: "10px 18px",
        flexShrink: 0
      },
      onClick: () => {
        if (msg.trim()) {
          onSend(thread.id, msg);
          setMsg("");
        }
      }
    }, "↑")));
  }

  // ─── MAIN APP ─────────────────────────────────────────────────────────────────
  function PCN() {
    return /*#__PURE__*/_react.default.createElement(ErrorBoundary, null, /*#__PURE__*/_react.default.createElement(PCNInner, null));
  }
  function PCNInner() {
    // ── Core state ──────────────────────────────────────────────────────────────
    const [screen, setScreen] = (0, _react.useState)("splash");
    const [tab, setTab] = (0, _react.useState)("dashboard");
    const [me, setMe] = (0, _react.useState)(null);
    const [allUsers, setAllUsers] = (0, _react.useState)({
      ...DEMO_USERS
    });
    const [vehicles, setVehicles] = (0, _react.useState)({});
    const [logbook, setLogbook] = (0, _react.useState)({});
    const [reminders, setReminders] = (0, _react.useState)([]);
    const [participants, setParticipants] = (0, _react.useState)({});
    const [events, setEvents] = (0, _react.useState)(DEMO_EVENTS);
    const [eventHistory] = (0, _react.useState)(DEMO_HISTORY);
    const [threads, setThreads] = (0, _react.useState)({});
    const [activeThread, setActiveThread] = (0, _react.useState)(null);
    const [viewV, setViewV] = (0, _react.useState)(null);
    const [viewEv, setViewEv] = (0, _react.useState)(null);
    const [publicV, setPublicV] = (0, _react.useState)(null);

    // ── Form state ──────────────────────────────────────────────────────────────
    const [loginForm, setLoginForm] = (0, _react.useState)({
      mode: "register",
      code: "",
      email: "",
      name: ""
    });
    const [addVForm, setAddVForm] = (0, _react.useState)({
      hersteller: "Porsche",
      modell: "",
      baujahr: "",
      kennzeichen: "",
      farbe: "",
      kraftstoff: "Benzin",
      getriebe: "",
      images: [],
      phone: ""
    });
    const [addLogForm, setAddLogForm] = (0, _react.useState)({
      type: "Ölwechsel",
      km: "",
      notes: "",
      workshop: ""
    });
    const [remForm, setRemForm] = (0, _react.useState)({
      vehicleId: "",
      title: "",
      date: ""
    });

    // ── UI state ─────────────────────────────────────────────────────────────────
    const [toast, setToast] = (0, _react.useState)(null);
    const [showAddV, setShowAddV] = (0, _react.useState)(false);
    const [showAddLog, setShowAddLog] = (0, _react.useState)(null);
    const [showAddRem, setShowAddRem] = (0, _react.useState)(false);
    const [showPrivacy, setShowPrivacy] = (0, _react.useState)(null);
    const [showEditVehicle, setShowEditVehicle] = (0, _react.useState)(null); // vehicleId
    const [showContactAuth, setShowContactAuth] = (0, _react.useState)(null); // vehicleId — triggers login/register/guest sheet
    const [contactAuthMode, setContactAuthMode] = (0, _react.useState)("guest"); // "guest" | "login" | "register"
    const [contactAuthForm, setContactAuthForm] = (0, _react.useState)({
      name: "",
      email: "",
      code: ""
    });
    const [editForm, setEditForm] = (0, _react.useState)({});
    const [imgUploading, setImgUploading] = (0, _react.useState)(false);
    const [lightbox, setLightbox] = (0, _react.useState)(null); // {images:[], index:0}
    const [vehicleStatus, setVehicleStatus] = (0, _react.useState)({}); // {vehicleId: {text, icon, expiresAt}}
    const [showStatusPicker, setShowStatusPicker] = (0, _react.useState)(null); // vehicleId
    const [statusCustom, setStatusCustom] = (0, _react.useState)("");
    const [gallerySwipe, setGallerySwipe] = (0, _react.useState)({}); // {vehicleId: currentIndex}
    const [scannerOpen, setScannerOpen] = (0, _react.useState)(false);
    const [scannerError, setScannerError] = (0, _react.useState)(null);
    const [scannerStatus, setScannerStatus] = (0, _react.useState)("idle");
    const videoRef = (0, _react.useRef)(null);
    const canvasRef = (0, _react.useRef)(null);

    // ── Derived ──────────────────────────────────────────────────────────────────
    const myVehicles = Object.values(vehicles).filter(v => v.owner === me?.email || v.userId === me?.id);
    const myReminders = reminders.filter(r => !r.done).sort((a, b) => new Date(a.date) - new Date(b.date));
    const myParticipations = Object.values(participants).flat().filter(p => p.userId === me?.id);
    const myThreads = Object.values(threads).filter(t => t.participants.includes(me?.id));
    const unreadCount = myThreads.filter(t => t.messages.some(m => m.from !== me?.id && !m.read && !m.isSystem)).length;
    const appState = {
      logbook,
      participants,
      vehicles,
      me
    };
    const unlockedFeatures = new Set(MILESTONES.filter(m => m.check(appState)).flatMap(m => m.unlocks));

    // ── Toast ────────────────────────────────────────────────────────────────────
    // ── Status helpers — now wired to DB layer (works across devices via Supabase) ──
    const setStatus = async (vehicleId, preset, customText = "") => {
      const text = customText || preset.text;
      const expiresAt = preset.mins ? Date.now() + preset.mins * 60 * 1000 : null;
      const status = {
        text,
        icon: preset.icon || "💬",
        expiresAt,
        setAt: Date.now()
      };
      setVehicleStatus(prev => ({
        ...prev,
        [vehicleId]: status
      }));
      const DB = window.PCN_DB;
      if (DB) await DB.vehicles.setStatus(vehicleId, status);
      setShowStatusPicker(null);
      setStatusCustom("");
      toast_(`Status gesetzt: "${text}"`);
    };
    const clearStatus = async vehicleId => {
      setVehicleStatus(prev => {
        const n = {
          ...prev
        };
        delete n[vehicleId];
        return n;
      });
      const DB = window.PCN_DB;
      if (DB) await DB.vehicles.clearStatus(vehicleId);
    };
    const getActiveStatus = vehicleId => {
      const s = vehicleStatus[vehicleId];
      if (!s) return null;
      if (s.expiresAt && Date.now() > s.expiresAt) {
        clearStatus(vehicleId);
        return null;
      }
      return s;
    };

    // Load status fresh when viewing a vehicle (public or detail) — ensures cross-device sync
    const loadStatusFor = async vehicleId => {
      const DB = window.PCN_DB;
      if (!DB) return;
      const {
        data
      } = await DB.vehicles.getStatus(vehicleId);
      if (data) setVehicleStatus(prev => ({
        ...prev,
        [vehicleId]: data
      }));else setVehicleStatus(prev => {
        const n = {
          ...prev
        };
        delete n[vehicleId];
        return n;
      });
    };
    const toast_ = (0, _react.useCallback)((msg, type = "ok") => {
      setToast({
        msg,
        type
      });
      setTimeout(() => setToast(null), 3500);
    }, []);

    // ── Gallery helpers ──────────────────────────────────────────────────────────
    const getImages = v => {
      // Support both single image and images array
      const imgs = v.images || (v.image ? [v.image] : []);
      return imgs.filter(Boolean);
    };
    const addImageToVehicle = async (vehicleId, dataUrl) => {
      const v = vehicles[vehicleId];
      if (!v) return;
      const images = getImages(v);
      const updated = {
        ...v,
        images: [...images, dataUrl],
        image: images[0] || dataUrl
      };
      setVehicles(prev => ({
        ...prev,
        [vehicleId]: updated
      }));
      if (viewV?.id === vehicleId) setViewV(updated);
      const DB = window.PCN_DB;
      await DB.vehicles.save(updated);
    };
    const removeImageFromVehicle = async (vehicleId, index) => {
      const v = vehicles[vehicleId];
      if (!v) return;
      const images = getImages(v).filter((_, i) => i !== index);
      const updated = {
        ...v,
        images,
        image: images[0] || ""
      };
      setVehicles(prev => ({
        ...prev,
        [vehicleId]: updated
      }));
      if (viewV?.id === vehicleId) setViewV(updated);
      const DB = window.PCN_DB;
      await DB.vehicles.save(updated);
    };

    // ── Image upload ─────────────────────────────────────────────────────────────
    const handleImageUpload = (file, onDone) => {
      if (!file) return;
      setImgUploading(true);
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const MAX = 600,
            scale = Math.min(1, MAX / img.width, MAX / img.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          onDone(dataUrl);
          setImgUploading(false);
          toast_(`Bild geladen ✓ (${Math.round(dataUrl.length * .75 / 1024)} KB)`);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    // ── DB refresh ───────────────────────────────────────────────────────────────
    const refreshAll = async user => {
      if (!user) return;
      const DB = window.PCN_DB;
      if (!DB) return;
      const [vRes, remRes, evRes, thRes] = await Promise.all([DB.vehicles.list(user.id || user.email), DB.reminders.list(user.id), DB.events.list(), DB.threads.list(user.id)]);
      const vMap = {};
      (vRes.data || []).forEach(v => vMap[v.id] = v);
      setVehicles(vMap);
      const lMap = {};
      await Promise.all((vRes.data || []).map(async v => {
        const r = await DB.logbook.list(v.id);
        lMap[v.id] = r.data || [];
      }));
      setLogbook(lMap);
      setReminders(remRes.data || []);
      // Merge saved events with demo events
      const savedEvs = evRes.data || [];
      if (savedEvs.length > 0) {
        const evMap = {
          ...DEMO_EVENTS
        };
        savedEvs.forEach(e => evMap[e.id] = e);
        setEvents(evMap);
      }
      const pMap = {};
      await Promise.all(Object.keys(events).map(async eid => {
        const r = await DB.events.participants(eid);
        pMap[eid] = r.data || [];
      }));
      setParticipants(pMap);
      const tMap = {};
      (thRes.data || []).forEach(t => tMap[t.id] = t);
      setThreads(tMap);
      // Load each vehicle's live status from DB
      const sMap = {};
      await Promise.all((vRes.data || []).map(async v => {
        const r = await DB.vehicles.getStatus(v.id);
        if (r.data) sMap[v.id] = r.data;
      }));
      setVehicleStatus(sMap);
      setMe(user);
    };

    // ── Session restore ───────────────────────────────────────────────────────────
    (0, _react.useEffect)(() => {
      (async () => {
        const params = new URLSearchParams(window.location.search);
        const qarId = params.get("v");
        if (qarId && /^QAR-[A-Z2-9]{8}$/.test(qarId)) {
          const DB = window.PCN_DB;
          // First check demo data (works offline / before DB configured)
          let v = Object.values(DEMO_VEHICLES).find(v => v.qarId === qarId);
          // Then check real database — this is the real QR scan path for user-created vehicles
          if (!v && DB) {
            const {
              data: realV
            } = await DB.vehicles.getPublic(qarId);
            if (realV) v = realV;
          }
          if (v) {
            setPublicV({
              ...v,
              privacy: {
                ...DEF_PRIVACY,
                ...(v.privacy || {})
              }
            });
            setScreen("public");
            if (DB) loadStatusFor(v.id);
            return;
          } else {
            toast_("Fahrzeug nicht gefunden: " + qarId, "err");
          }
        }
        const DB = window.PCN_DB;
        if (!DB) return;
        const {
          data: session
        } = await DB.auth.session();
        if (session) {
          await refreshAll(session);
          setScreen("app");
        }
      })();
    }, []);

    // ── Live message polling — checks for new messages every 5s while logged in ──
    // (No real-time websockets in this MVP, so we poll. Cheap on Supabase free tier.)
    (0, _react.useEffect)(() => {
      if (!me) return;
      const DB = window.PCN_DB;
      if (!DB) return;
      const poll = async () => {
        const {
          data: liveThreads
        } = await DB.threads.list(me.id);
        if (!liveThreads) return;
        setThreads(prev => {
          const next = {
            ...prev
          };
          liveThreads.forEach(t => {
            next[t.id] = t;
          });
          return next;
        });
      };
      const interval = setInterval(poll, 5000);
      return () => clearInterval(interval);
    }, [me?.id]);

    // ── Scanner ──────────────────────────────────────────────────────────────────
    const openScanner = () => {
      setScannerOpen(true);
      setScannerError(null);
      setScannerStatus("loading");
    };
    const closeScanner = () => {
      setScannerOpen(false);
      setScannerStatus("idle");
      setScannerError(null);
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    };
    const handleScanResult = async data => {
      const match = data.match(/QAR-[A-Z2-9]{8}/);
      if (!match) return;
      const qarId = match[0];
      let v = Object.values(vehicles).find(v => v.qarId === qarId) || Object.values(DEMO_VEHICLES).find(v => v.qarId === qarId);
      // Also check real DB in case the scanned vehicle isn't in local state (e.g. someone else's car)
      if (!v) {
        const DB = window.PCN_DB;
        if (DB) {
          const {
            data: realV
          } = await DB.vehicles.getPublic(qarId);
          if (realV) v = realV;
        }
      }
      setScannerStatus("found");
      setTimeout(async () => {
        closeScanner();
        if (v) {
          setPublicV({
            ...v,
            privacy: {
              ...DEF_PRIVACY,
              ...(v.privacy || {})
            }
          });
          setScreen("public");
          await loadStatusFor(v.id);
        } else toast_("Fahrzeug nicht gefunden: " + qarId, "err");
      }, 600);
    };
    (0, _react.useEffect)(() => {
      if (!scannerOpen || scannerStatus !== "loading") return;
      const loadjsQR = () => new Promise((res, rej) => {
        if (window.jsQR) {
          res();
          return;
        }
        const s = document.createElement("script");
        s.src = "jsQR.js";
        s.onload = () => window.jsQR ? res() : rej(new Error("jsQR nicht geladen"));
        s.onerror = () => rej(new Error("jsQR nicht gefunden"));
        document.head.appendChild(s);
      });
      loadjsQR().then(() => {
        setScannerStatus("scanning");
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment"
          }
        }).then(stream => {
          const video = videoRef.current;
          if (!video) return;
          video.srcObject = stream;
          video.setAttribute("playsinline", true);
          video.play();
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          let last = "";
          let lastT = 0;
          let running = true;
          const scan = () => {
            if (!running || !scannerOpen) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = window.jsQR(img.data, img.width, img.height, {
                inversionAttempts: "dontInvert"
              });
              if (code && (code.data !== last || Date.now() - lastT > 3000)) {
                last = code.data;
                lastT = Date.now();
                handleScanResult(code.data);
              }
            }
            requestAnimationFrame(scan);
          };
          requestAnimationFrame(scan);
          return () => {
            running = false;
            stream.getTracks().forEach(t => t.stop());
          };
        }).catch(e => {
          setScannerError(e.name === "NotAllowedError" ? "Kamera-Zugriff verweigert.\n\nEinstellungen → Safari → Kamera → Erlauben" : "Kamera-Fehler: " + e.message);
          setScannerStatus("error");
        });
      }).catch(e => {
        setScannerError(e.message);
        setScannerStatus("error");
      });
      return () => {
        if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      };
    }, [scannerOpen, scannerStatus]);

    // ── Actions ──────────────────────────────────────────────────────────────────
    const addVehicle = async () => {
      if (!addVForm.modell || !addVForm.kennzeichen) return toast_("Modell und Kennzeichen angeben", "err");
      const DB = window.PCN_DB;
      const v = {
        qarId: genQARId(),
        userId: me.id,
        owner: me.email,
        ...addVForm,
        images: addVForm.images || [],
        image: (addVForm.images || [])[0] || "",
        privacy: {
          ...DEF_PRIVACY
        }
      };
      const {
        data: saved,
        error
      } = await DB.vehicles.save(v);
      if (error) {
        toast_("Fehler: " + error, "err");
        return;
      }
      setVehicles(prev => ({
        ...prev,
        [saved.id]: saved
      }));
      setShowAddV(false);
      setAddVForm({
        hersteller: "Porsche",
        modell: "",
        baujahr: "",
        kennzeichen: "",
        farbe: "",
        kraftstoff: "Benzin",
        getriebe: "",
        images: []
      });
      toast_("Fahrzeug hinzugefügt ✓");
    };
    const addLogEntry = async vehicleId => {
      if (!addLogForm.km) return toast_("Kilometerstand angeben", "err");
      const DB = window.PCN_DB;
      const {
        data: e,
        error
      } = await DB.logbook.add(vehicleId, {
        date: today(),
        ...addLogForm
      });
      if (error) {
        toast_("Fehler", "err");
        return;
      }
      setLogbook(prev => ({
        ...prev,
        [vehicleId]: [e, ...(prev[vehicleId] || [])]
      }));
      setShowAddLog(null);
      setAddLogForm({
        type: "Ölwechsel",
        km: "",
        notes: "",
        workshop: ""
      });
      toast_("Eintrag gespeichert ✓");
    };
    const joinEvent = async (eventId, vehicleId, cls) => {
      if (!vehicleId) return toast_("Fahrzeug wählen", "err");
      const DB = window.PCN_DB;
      const {
        data: p,
        error
      } = await DB.events.join(eventId, me.id, vehicleId, cls);
      if (error) {
        toast_("Fehler: " + error, "err");
        return;
      }
      setParticipants(prev => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), p]
      }));
      setScreen("app");
      setTab("events");
      toast_(`Angemeldet — Startnr. #${p.startNr} ✓`);
    };
    const openEditVehicle = v => {
      setEditForm({
        hersteller: v.hersteller || "",
        modell: v.modell || "",
        baujahr: v.baujahr || "",
        kennzeichen: v.kennzeichen || "",
        farbe: v.farbe || "",
        kraftstoff: v.kraftstoff || "Benzin",
        getriebe: v.getriebe || "PDK",
        kilometerstand: v.kilometerstand || "",
        tuev_faelligkeit: v.tuev_faelligkeit || "",
        zustand: v.zustand || "",
        besonderheiten: v.besonderheiten || "",
        phone: v.phone || ""
      });
      setShowEditVehicle(v.id);
    };
    const saveVehicleEdit = async () => {
      const v = vehicles[showEditVehicle];
      if (!v) return;
      if (!editForm.modell || !editForm.kennzeichen) {
        toast_("Modell und Kennzeichen angeben", "err");
        return;
      }
      const updated = {
        ...v,
        ...editForm
      };
      setVehicles(prev => ({
        ...prev,
        [v.id]: updated
      }));
      if (viewV?.id === v.id) setViewV(updated);
      const DB = window.PCN_DB;
      if (DB) await DB.vehicles.save(updated);
      setShowEditVehicle(null);
      toast_("Fahrzeugdaten gespeichert ✓");
    };
    const togglePrivacy = async (vehicleId, key) => {
      const v = vehicles[vehicleId];
      const updated = {
        ...v,
        privacy: {
          ...(v.privacy || DEF_PRIVACY),
          [key]: !v.privacy?.[key]
        }
      };
      setVehicles(prev => ({
        ...prev,
        [vehicleId]: updated
      }));
      if (viewV?.id === vehicleId) setViewV(updated);
      const DB = window.PCN_DB;
      await DB.vehicles.save(updated);
    };
    const updateVehicleImage = async (vehicleId, dataUrl) => {
      const v = vehicles[vehicleId];
      if (!v) return;
      const updated = {
        ...v,
        image: dataUrl
      };
      setVehicles(prev => ({
        ...prev,
        [vehicleId]: updated
      }));
      if (viewV?.id === vehicleId) setViewV(updated);
      const DB = window.PCN_DB;
      await DB.vehicles.save(updated);
    };
    const sendMsg = async (threadId, text) => {
      if (!text.trim()) return;
      const DB = window.PCN_DB;
      const {
        data: msg,
        error
      } = await DB.threads.send(threadId, me.id, text.trim());
      if (error) {
        toast_("Fehler", "err");
        return;
      }
      setThreads(prev => ({
        ...prev,
        [threadId]: {
          ...prev[threadId],
          messages: [...(prev[threadId].messages || []), msg]
        }
      }));
    };
    const startContact = async vehicleId => {
      const DB = window.PCN_DB;
      // Always fetch the authoritative vehicle record from the DB first —
      // local `vehicles` state is empty for guests, and DEMO_VEHICLES is stale/static.
      let v = vehicles[vehicleId];
      if (!v && DB) {
        const qarGuess = Object.values(DEMO_VEHICLES).find(dv => dv.id === vehicleId)?.qarId;
        if (qarGuess) {
          const {
            data: realV
          } = await DB.vehicles.getPublic(qarGuess);
          if (realV) v = realV;
        }
      }
      if (!v) v = DEMO_VEHICLES[vehicleId]; // last-resort fallback for pure offline demo
      if (!v) {
        toast_("Fahrzeug nicht gefunden", "err");
        return;
      }
      if (v.owner === me?.email || v.userId === me?.id) {
        toast_("Das ist dein eigenes Fahrzeug", "err");
        return;
      }
      const ownerId = v.userId || v.owner; // v.userId is the real Supabase UUID after _mapVehicle
      if (!ownerId) {
        toast_("Besitzer nicht gefunden", "err");
        return;
      }
      if (!allUsers[ownerId]) {
        setAllUsers(prev => ({
          ...prev,
          [ownerId]: {
            id: ownerId,
            name: "PCN-Mitglied",
            email: v.owner,
            role: "member"
          }
        }));
      }
      // Check for existing thread (re-check from DB in case state is stale)
      const {
        data: myThreadsLive
      } = DB ? await DB.threads.list(me.id) : {
        data: []
      };
      const existing = (myThreadsLive || Object.values(threads)).find(t => t.vehicleId === vehicleId && t.participants.includes(me.id));
      if (existing) {
        setThreads(prev => ({
          ...prev,
          [existing.id]: existing
        }));
        setActiveThread(existing.id);
        setScreen("chat");
        return;
      }
      const {
        data: t,
        error
      } = await DB.threads.create([me.id, ownerId], vehicleId, `${v.hersteller} ${v.modell}`);
      if (error) {
        toast_("Fehler: " + error, "err");
        return;
      }
      await DB.threads.send(t.id, "system", `Kontakt über QAR-ID: ${v.qarId}`);
      const newThread = {
        ...t,
        messages: [{
          id: uid(),
          from: "system",
          text: `Kontakt über QAR-ID: ${v.qarId}`,
          ts: fmtTime(),
          isSystem: true,
          read: true
        }]
      };
      setThreads(prev => ({
        ...prev,
        [t.id]: newThread
      }));
      setActiveThread(t.id);
      setScreen("chat");
      toast_("Anonyme Nachricht gestartet 🔒");
    };

    // ── Triggered from the public-view "Nachricht senden" sheet ──
    // Logs in / registers / creates guest, then immediately opens the chat
    const handleContactAuth = async () => {
      const DB = window.PCN_DB;
      const {
        name,
        email,
        code
      } = contactAuthForm;
      if (!email) {
        toast_("E-Mail angeben", "err");
        return;
      }
      let result;
      if (contactAuthMode === "guest") {
        if (!name) {
          toast_("Name angeben", "err");
          return;
        }
        result = await DB.auth.registerGuest(name, email);
      } else if (contactAuthMode === "register") {
        if (!name) {
          toast_("Name angeben", "err");
          return;
        }
        if (code.toUpperCase() !== CLUB_CODE) {
          toast_("Falscher Club-Code", "err");
          return;
        }
        result = await DB.auth.register(name, email, code);
      } else {
        result = await DB.auth.login(email);
      }
      if (result.error) {
        toast_(result.error, "err");
        return;
      }
      const u = result.data;
      setMe(u);
      setAllUsers(prev => ({
        ...prev,
        [u.id]: u
      }));
      const vehicleId = showContactAuth;
      setShowContactAuth(null);
      setContactAuthForm({
        name: "",
        email: "",
        code: ""
      });
      toast_(`Willkommen, ${u.name}! 🏁`);
      await startContact(vehicleId);
    };
    const loadDemo = async () => {
      const DB = window.PCN_DB;
      if (DB && DB.backend === "local") {
        // Local backend: seed via localStorage directly (fast path)
        const stored = JSON.parse(localStorage.getItem("pcn_v1") || "{}");
        stored.users = {
          ...stored.users,
          ...DEMO_USERS
        };
        stored.session = DEMO_USERS.u1;
        stored.vehicles = DEMO_VEHICLES;
        stored.logbook = DEMO_LOGBOOK;
        stored.events = DEMO_EVENTS;
        stored.participants = DEMO_PARTICIPANTS;
        stored.threads = DEMO_THREADS;
        stored.reminders = {
          "u1": [{
            id: "R1",
            vehicleId: "V001",
            title: "PCN TrackDay — Fahrzeug vorbereiten",
            date: dPlus(10),
            done: false
          }, {
            id: "R2",
            vehicleId: "V002",
            title: "Sommerreifenwechsel",
            date: dPlus(4),
            done: false
          }, {
            id: "R3",
            vehicleId: "V001",
            title: "TÜV Termin vereinbaren",
            date: dPlus(45),
            done: false
          }]
        };
        localStorage.setItem("pcn_v1", JSON.stringify(stored));
        await refreshAll(DEMO_USERS.u1);
      } else {
        // Supabase/API backend: demo runs purely in-memory, not persisted to DB
        // (avoids polluting the real database with fake demo data)
        setMe(DEMO_USERS.u1);
        setVehicles(DEMO_VEHICLES);
        setLogbook(DEMO_LOGBOOK);
        setParticipants(DEMO_PARTICIPANTS);
        setThreads(DEMO_THREADS);
        setReminders([{
          id: "R1",
          vehicleId: "V001",
          title: "PCN TrackDay — Fahrzeug vorbereiten",
          date: dPlus(10),
          done: false
        }, {
          id: "R2",
          vehicleId: "V002",
          title: "Sommerreifenwechsel",
          date: dPlus(4),
          done: false
        }, {
          id: "R3",
          vehicleId: "V001",
          title: "TÜV Termin vereinbaren",
          date: dPlus(45),
          done: false
        }]);
      }
      setAllUsers({
        ...DEMO_USERS
      });
      setScreen("app");
      setTab("dashboard");
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
    .btn{background:${C.red};color:#fff;border:none;border-radius:9px;padding:12px 18px;font-weight:700;font-size:14px;cursor:pointer;font-family:'Barlow',sans-serif;transition:opacity .15s}
    .btn:active{opacity:.8}
    .btn.ghost{background:transparent;color:${C.white};border:1px solid ${C.border}}
    .btn.sm{padding:7px 13px;font-size:12px}
    .inp{background:${C.card};border:1px solid ${C.border};border-radius:9px;padding:12px 14px;color:${C.white};font-size:16px;width:100%;transition:border-color .15s;font-family:'Barlow',sans-serif}
    .inp:focus{border-color:${C.red}}
    .toast{position:fixed;bottom:80px;left:14px;right:14px;z-index:999;background:${C.dark};border:1px solid #333;border-radius:12px;padding:13px 16px;font-size:13px;font-weight:600;animation:slideUp .2s;box-shadow:0 8px 24px rgba(0,0,0,.8);white-space:pre-line}
    .toast.ok{border-color:${C.red}44;color:${C.white}}
    .toast.err{border-color:#ef444466;color:#ef4444}
    .tab-bar{position:fixed;bottom:0;left:0;right:0;background:${C.dark};border-top:1px solid ${C.border};display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,0)}
    .tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px 2px;border:none;background:transparent;cursor:pointer;gap:2px;font-family:'Barlow',sans-serif;color:${C.muted};transition:color .15s;position:relative}
    .tab-btn.on{color:${C.red}}
    .tab-btn .ico{font-size:21px;line-height:1}
    .tab-btn .lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
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
    const ScannerOverlay = scannerOpen ? /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 300,
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: "14px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "linear-gradient(to bottom,rgba(0,0,0,.8),transparent)"
      }
    }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 18,
        fontWeight: 800,
        color: "#fff"
      }
    }, "QR-Code scannen"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 11,
        color: "rgba(255,255,255,.5)"
      }
    }, "Halte die Kamera über den QAR-Code")), /*#__PURE__*/_react.default.createElement("button", {
      onClick: closeScanner,
      style: {
        background: "rgba(0,0,0,.6)",
        border: "1px solid rgba(255,255,255,.2)",
        borderRadius: 8,
        padding: "8px 14px",
        color: "#fff",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "'Barlow',sans-serif"
      }
    }, "✕ Schließen")), /*#__PURE__*/_react.default.createElement("video", {
      ref: videoRef,
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      },
      muted: true,
      playsInline: true
    }), /*#__PURE__*/_react.default.createElement("canvas", {
      ref: canvasRef,
      style: {
        display: "none"
      }
    }), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none"
      }
    }, scannerStatus === "found" ? /*#__PURE__*/_react.default.createElement("div", {
      style: {
        width: 220,
        height: 220,
        border: "3px solid #22c55e",
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(34,197,94,.15)"
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 64,
        color: "#22c55e"
      }
    }, "✓")) : /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "relative",
        width: 220,
        height: 220
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: 32,
        height: 32,
        borderTop: `3px solid ${C.red}`,
        borderLeft: `3px solid ${C.red}`,
        borderRadius: "8px 0 0 0"
      }
    }), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 32,
        height: 32,
        borderTop: `3px solid ${C.red}`,
        borderRight: `3px solid ${C.red}`,
        borderRadius: "0 8px 0 0"
      }
    }), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 32,
        height: 32,
        borderBottom: `3px solid ${C.red}`,
        borderLeft: `3px solid ${C.red}`,
        borderRadius: "0 0 0 8px"
      }
    }), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderBottom: `3px solid ${C.red}`,
        borderRight: `3px solid ${C.red}`,
        borderRadius: "0 0 8px 0"
      }
    }), scannerStatus === "scanning" && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        left: 4,
        right: 4,
        height: 2,
        background: `linear-gradient(90deg,transparent,${C.red},transparent)`,
        animation: "scanline 1.8s ease-in-out infinite"
      }
    }))), scannerError && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
        background: "rgba(0,0,0,.95)",
        border: "1px solid #ef4444",
        borderRadius: 14,
        padding: "16px"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        color: "#ef4444",
        fontWeight: 700,
        fontSize: 14,
        marginBottom: 6
      }
    }, "⚠️ Kein Kamera-Zugriff"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        color: "#999",
        fontSize: 12,
        lineHeight: 1.7,
        marginBottom: 12,
        whiteSpace: "pre-line"
      }
    }, scannerError), /*#__PURE__*/_react.default.createElement("button", {
      onClick: () => {
        setScannerError(null);
        setScannerStatus("loading");
      },
      style: {
        background: C.red,
        border: "none",
        borderRadius: 8,
        padding: "10px",
        color: "#fff",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        width: "100%",
        fontFamily: "'Barlow',sans-serif"
      }
    }, "Erneut versuchen")), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "14px 16px",
        background: "linear-gradient(to top,rgba(0,0,0,.95),transparent)",
        paddingBottom: "calc(20px + env(safe-area-inset-bottom,0))"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 11,
        color: "rgba(255,255,255,.4)",
        textAlign: "center",
        marginBottom: 8
      }
    }, "Oder UID manuell eingeben"), /*#__PURE__*/_react.default.createElement("input", {
      placeholder: "QAR-XXXXXXXX",
      onChange: e => {
        const v = e.target.value.toUpperCase();
        if (/^QAR-[A-Z2-9]{8}$/.test(v)) handleScanResult(v);
      },
      style: {
        width: "100%",
        background: "rgba(255,255,255,.1)",
        border: "1px solid rgba(255,255,255,.2)",
        borderRadius: 8,
        padding: "10px 12px",
        color: "#fff",
        fontSize: 14,
        fontFamily: "monospace",
        textTransform: "uppercase",
        letterSpacing: 1
      }
    }))) : null;

    // ══════════════════════════════════════════════════════════════════════════════
    // SPLASH
    // ══════════════════════════════════════════════════════════════════════════════
    if (screen === "splash") return /*#__PURE__*/_react.default.createElement("div", {
      style: {
        minHeight: "100vh",
        background: C.black,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px 44px"
      }
    }, /*#__PURE__*/_react.default.createElement("style", null, CSS), toast && /*#__PURE__*/_react.default.createElement("div", {
      className: `toast ${toast.type}`
    }, toast.msg), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        width: "100%",
        textAlign: "center",
        paddingTop: 60
      }
    }, /*#__PURE__*/_react.default.createElement("img", {
      src: LOGO_URL,
      alt: "PCN",
      onError: e => e.target.style.display = "none",
      style: {
        width: 200,
        maxWidth: "65%",
        objectFit: "contain",
        marginBottom: 20
      }
    }), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        width: 32,
        height: 2,
        background: C.red,
        margin: "0 auto 18px"
      }
    }), /*#__PURE__*/_react.default.createElement("h1", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 30,
        fontWeight: 900,
        color: C.white,
        lineHeight: 1,
        marginBottom: 8
      }
    }, "DIGITALE", /*#__PURE__*/_react.default.createElement("br", null), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        color: C.red
      }
    }, "CLUBPLATTFORM")), /*#__PURE__*/_react.default.createElement("p", {
      style: {
        fontSize: 12,
        color: C.muted,
        marginTop: 8,
        lineHeight: 1.7
      }
    }, "Fahrzeugakte · Events · QR-Code", /*#__PURE__*/_react.default.createElement("br", null), "für alle PCN-Mitglieder")), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 360
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 10,
        fontSize: 12,
        color: C.muted
      }
    }, loginForm.mode === "register" ? "Bereits Mitglied? " : "Noch kein Account? ", /*#__PURE__*/_react.default.createElement("span", {
      style: {
        color: C.red,
        fontWeight: 700,
        cursor: "pointer"
      },
      onClick: () => setLoginForm(p => ({
        ...p,
        mode: p.mode === "register" ? "login" : "register"
      }))
    }, loginForm.mode === "register" ? "→ Anmelden" : "→ Registrieren")), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        background: "#111",
        borderRadius: 10,
        padding: 3,
        marginBottom: 14
      }
    }, [["register", "Registrieren"], ["login", "Anmelden"]].map(([m, label]) => /*#__PURE__*/_react.default.createElement("button", {
      key: m,
      onClick: () => setLoginForm(p => ({
        ...p,
        mode: m
      })),
      style: {
        flex: 1,
        padding: "9px",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontFamily: "'Barlow',sans-serif",
        fontWeight: 700,
        fontSize: 13,
        background: loginForm.mode === m ? C.red : "transparent",
        color: loginForm.mode === m ? "#fff" : C.muted,
        transition: "all .15s"
      }
    }, label))), loginForm.mode === "register" && /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("input", {
      className: "inp",
      placeholder: "Club-Code",
      value: loginForm.code,
      onChange: e => setLoginForm(p => ({
        ...p,
        code: e.target.value
      })),
      style: {
        textTransform: "uppercase",
        letterSpacing: 3,
        textAlign: "center",
        fontWeight: 800,
        fontSize: 18,
        marginBottom: 8
      }
    }), loginForm.code.toUpperCase() === CLUB_CODE && /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("input", {
      className: "inp",
      placeholder: "Dein Name",
      style: {
        marginBottom: 8
      },
      value: loginForm.name,
      onChange: e => setLoginForm(p => ({
        ...p,
        name: e.target.value
      }))
    }), /*#__PURE__*/_react.default.createElement("input", {
      className: "inp",
      placeholder: "E-Mail",
      type: "email",
      style: {
        marginBottom: 10
      },
      value: loginForm.email,
      onChange: e => setLoginForm(p => ({
        ...p,
        email: e.target.value
      }))
    })), loginForm.code.toUpperCase() === CLUB_CODE && loginForm.name && loginForm.email ? /*#__PURE__*/_react.default.createElement("button", {
      className: "btn",
      style: {
        width: "100%"
      },
      onClick: async () => {
        const DB = window.PCN_DB;
        const {
          data: u,
          error
        } = await DB.auth.register(loginForm.name, loginForm.email, loginForm.code);
        if (error) {
          toast_(error, "err");
          return;
        }
        // Seed events
        const stored = JSON.parse(localStorage.getItem("pcn_v1") || "{}");
        if (!stored.events || Object.keys(stored.events).length === 0) {
          stored.events = DEMO_EVENTS;
          localStorage.setItem("pcn_v1", JSON.stringify(stored));
        }
        setMe(u);
        setAllUsers(p => ({
          ...p,
          [u.id]: u
        }));
        setEvents(DEMO_EVENTS);
        setScreen("app");
        toast_("Willkommen, " + u.name + "! 🏁");
      }
    }, "Konto erstellen →") : /*#__PURE__*/_react.default.createElement("button", {
      className: "btn",
      style: {
        width: "100%",
        opacity: .4
      },
      disabled: true
    }, !loginForm.code ? "Club-Code eingeben" : loginForm.code.toUpperCase() !== CLUB_CODE ? "Falscher Club-Code ✗" : "Name & E-Mail eingeben")), loginForm.mode === "login" && /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("input", {
      className: "inp",
      placeholder: "E-Mail-Adresse",
      type: "email",
      style: {
        marginBottom: 10
      },
      value: loginForm.email,
      onChange: e => setLoginForm(p => ({
        ...p,
        email: e.target.value
      }))
    }), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn",
      style: {
        width: "100%",
        opacity: loginForm.email ? 1 : .4
      },
      disabled: !loginForm.email,
      onClick: async () => {
        const DB = window.PCN_DB;
        const {
          data: u,
          error
        } = await DB.auth.login(loginForm.email);
        if (error) {
          toast_(error, "err");
          return;
        }
        await refreshAll(u);
        setScreen("app");
        toast_("Willkommen zurück, " + u.name + "! 🏁");
      }
    }, "Anmelden →"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        textAlign: "center",
        marginTop: 8,
        fontSize: 11,
        color: C.muted
      }
    }, "Kein Passwort nötig — nur deine Club-E-Mail")), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn ghost",
      style: {
        width: "100%",
        marginTop: 10,
        fontSize: 12
      },
      onClick: loadDemo
    }, "Demo ansehen"), /*#__PURE__*/_react.default.createElement("p", {
      style: {
        textAlign: "center",
        fontSize: 10,
        color: "#333",
        marginTop: 12
      }
    }, "Powered by ", /*#__PURE__*/_react.default.createElement("span", {
      style: {
        color: C.gold
      }
    }, "QAR.Gallery"))));

    // ══════════════════════════════════════════════════════════════════════════════
    // PUBLIC VIEW
    // ══════════════════════════════════════════════════════════════════════════════
    if (screen === "public" && publicV) {
      const v = publicV;
      const priv = v.privacy || DEF_PRIVACY;
      const vHist = eventHistory.filter(h => h.vehicleId === v.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const kz = fmtKz(v.kennzeichen, v.baujahr);
      const vParts = Object.values(participants).flat().filter(p => p.vehicleId === v.id);
      const nextEvent = vParts.map(p => ({
        ...p,
        ev: events[p.eventId]
      })).filter(p => p.ev && daysUntil(p.ev.date) > 0).sort((a, b) => daysUntil(a.ev.date) - daysUntil(b.ev.date))[0];
      return /*#__PURE__*/_react.default.createElement("div", {
        style: {
          minHeight: "100vh",
          background: C.black,
          paddingBottom: 40
        }
      }, /*#__PURE__*/_react.default.createElement("style", null, CSS), toast && /*#__PURE__*/_react.default.createElement("div", {
        className: `toast ${toast.type}`
      }, toast.msg), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: C.dark,
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }
      }, /*#__PURE__*/_react.default.createElement("img", {
        src: LOGO_URL,
        alt: "PCN",
        onError: e => e.target.style.display = "none",
        style: {
          height: 28,
          objectFit: "contain"
        }
      }), /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, "Digitale Fahrzeugakte")), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          height: 200,
          position: "relative",
          overflow: "hidden",
          background: "#111"
        }
      }, v.image && /*#__PURE__*/_react.default.createElement("img", {
        src: v.image,
        alt: "",
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover"
        },
        onError: e => e.target.style.display = "none"
      }), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom,transparent 30%,#000000f0)"
        }
      }), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          position: "absolute",
          bottom: 14,
          left: 16,
          right: 16
        }
      }, /*#__PURE__*/_react.default.createElement("h1", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 24,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1,
          marginBottom: 8
        }
      }, v.hersteller, " ", v.modell), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          background: "#fff",
          border: "2px solid #222",
          borderRadius: 5,
          padding: "3px 10px"
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 800,
          color: "#111",
          letterSpacing: 2,
          fontFamily: "Arial,sans-serif"
        }
      }, kz)))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          padding: "12px 14px",
          background: C.dark,
          borderBottom: `1px solid ${C.border}`
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 520,
          margin: "0 auto"
        }
      }, priv.pub_phone === true && v.phone && v.phone.trim() && /*#__PURE__*/_react.default.createElement("a", {
        href: `tel:${(v.phone || "").replace(/[^+\d]/g, "")}`,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#16a34a",
          border: "none",
          borderRadius: 12,
          padding: "14px 16px",
          textDecoration: "none",
          color: "#fff",
          cursor: "pointer"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(255,255,255,.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0
        }
      }, "📞"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontWeight: 800,
          fontSize: 15,
          color: "#fff"
        }
      }, "Direkt anrufen"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 12,
          color: "rgba(255,255,255,.7)",
          marginTop: 1
        }
      }, v.phone)), /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 20,
          color: "rgba(255,255,255,.7)"
        }
      }, "›")), (!me || v.owner !== me.email && v.userId !== me.id) && /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => {
          if (me) {
            startContact(v.id);
          } else {
            setContactAuthMode("guest");
            setShowContactAuth(v.id);
          }
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: C.red,
          border: "none",
          borderRadius: 12,
          padding: "14px 16px",
          cursor: "pointer",
          fontFamily: "'Barlow',sans-serif",
          color: "#fff",
          width: "100%"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(255,255,255,.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0
        }
      }, "💬"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1,
          textAlign: "left"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontWeight: 800,
          fontSize: 15
        }
      }, "Nachricht an Fahrer(in) senden"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 12,
          color: "rgba(255,255,255,.7)",
          marginTop: 1
        }
      }, "Anonym · Besitzer antwortet per App")), /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 20,
          color: "rgba(255,255,255,.7)"
        }
      }, "›")))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          padding: "14px 16px",
          maxWidth: 520,
          margin: "0 auto"
        }
      }, (() => {
        const s = getActiveStatus(v.id);
        if (!s) return null;
        const minsLeft = s.expiresAt ? Math.ceil((s.expiresAt - Date.now()) / 60000) : null;
        return /*#__PURE__*/_react.default.createElement("div", {
          style: {
            background: `${C.amber}18`,
            border: `2px solid ${C.amber}66`,
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 14,
            animation: "fadeIn .3s ease"
          }
        }, /*#__PURE__*/_react.default.createElement("div", {
          style: {
            display: "flex",
            gap: 10,
            alignItems: "center"
          }
        }, /*#__PURE__*/_react.default.createElement("span", {
          style: {
            fontSize: 28,
            flexShrink: 0
          }
        }, s.icon), /*#__PURE__*/_react.default.createElement("div", {
          style: {
            flex: 1
          }
        }, /*#__PURE__*/_react.default.createElement("div", {
          style: {
            fontWeight: 800,
            fontSize: 16,
            color: C.amber,
            lineHeight: 1.2
          }
        }, s.text), minsLeft && minsLeft > 0 && /*#__PURE__*/_react.default.createElement("div", {
          style: {
            fontSize: 11,
            color: C.muted,
            marginTop: 3
          }
        }, "Noch ca. ", minsLeft, " Min"))));
      })(), nextEvent && priv.pub_events && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: `${C.red}11`,
          border: `1px solid ${C.red}33`,
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 14
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 9,
          color: C.red,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 3
        }
      }, "🏁 Nächste Veranstaltung — in ", daysUntil(nextEvent.ev.date), " Tagen"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: C.white
        }
      }, nextEvent.ev.name), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginTop: 2
        }
      }, "Startnr. ", /*#__PURE__*/_react.default.createElement("span", {
        style: {
          color: C.gold,
          fontWeight: 700
        }
      }, "#", nextEvent.startNr), " · ", nextEvent.class)), /*#__PURE__*/_react.default.createElement("div", {
        className: "card",
        style: {
          padding: 16,
          marginBottom: 14
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 10
        }
      }, "Fahrzeugdaten"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10
        }
      }, [["Baujahr", "baujahr"], ["Kraftstoff", "kraftstoff"], ["Getriebe", "getriebe"], ["Farbe", "farbe"], ["Kilometerstand", "kilometerstand"], ["TÜV", "tuev_faelligkeit"]].filter(([, k]) => priv[k] !== false && v[k]).map(([label, key]) => /*#__PURE__*/_react.default.createElement("div", {
        key: key
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 9,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: .5
        }
      }, label), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 600,
          color: C.white,
          marginTop: 2
        }
      }, key === "kilometerstand" ? parseInt(v[key]).toLocaleString("de-DE") + " km" : v[key])))), v.besonderheiten && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${C.border}`,
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.6
        }
      }, "ℹ️ ", v.besonderheiten)), priv.pub_events && vHist.length > 0 && /*#__PURE__*/_react.default.createElement("div", {
        className: "card",
        style: {
          padding: 16,
          marginBottom: 14
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 10
        }
      }, "Veranstaltungshistorie"), vHist.map(h => /*#__PURE__*/_react.default.createElement("div", {
        key: h.id,
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "8px 0",
          borderBottom: `1px solid ${C.border}`
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: `${C.red}22`,
          border: `1px solid ${C.red}44`,
          borderRadius: 6,
          padding: "2px 8px",
          fontWeight: 800,
          fontSize: 12,
          color: C.red,
          flexShrink: 0
        }
      }, "#", h.startNr), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: C.white,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, h.eventName), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, fmtDate(h.date), " · ", h.class), h.note && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.gold
        }
      }, h.note)), /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: h.result === "Teilnahme" ? C.muted : C.gold,
          flexShrink: 0
        }
      }, h.result)))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          textAlign: "center",
          padding: "12px 0",
          borderTop: `1px solid ${C.border}`
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 9,
          color: "#333",
          letterSpacing: 2,
          marginBottom: 4
        }
      }, "VERIFIZIERT DURCH QAR.GALLERY"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "monospace",
          fontSize: 11,
          color: "#444"
        }
      }, v.qarId)), me && /*#__PURE__*/_react.default.createElement("button", {
        className: "btn sm ghost",
        style: {
          width: "100%",
          marginTop: 10
        },
        onClick: () => setScreen(viewV ? "vehicle" : "app")
      }, "← Zurück")), showContactAuth && /*#__PURE__*/_react.default.createElement("div", {
        className: "overlay",
        style: {
          zIndex: 550
        },
        onClick: e => {
          if (e.target === e.currentTarget) {
            setShowContactAuth(null);
            setContactAuthForm({
              name: "",
              email: "",
              code: ""
            });
          }
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 4
        }
      }, "💬 Nachricht senden"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 18
        }
      }, "Um eine Nachricht zu senden, identifiziere dich kurz"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          background: "#111",
          borderRadius: 10,
          padding: 3,
          marginBottom: 16
        }
      }, [["guest", "Als Gast"], ["login", "Anmelden"], ["register", "Registrieren"]].map(([m, label]) => /*#__PURE__*/_react.default.createElement("button", {
        key: m,
        onClick: () => setContactAuthMode(m),
        style: {
          flex: 1,
          padding: "9px 4px",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: "'Barlow',sans-serif",
          fontWeight: 700,
          fontSize: 12,
          background: contactAuthMode === m ? C.red : "transparent",
          color: contactAuthMode === m ? "#fff" : C.muted,
          transition: "all .15s"
        }
      }, label))), contactAuthMode === "guest" && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: "#141414",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px",
          marginBottom: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.6,
          marginBottom: 10
        }
      }, "Kein Account nötig — nur Name und E-Mail für die Zustellung deiner Nachricht."), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.gold,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8
        }
      }, "Als PCN-Mitglied bekommst du zusätzlich"), [["🚗", "Eigene digitale Fahrzeugakte"], ["📱", "QR-Code fürs eigene Auto"], ["🏁", "Direkte Anmeldung zu Club-Events"]].map(([icon, text]) => /*#__PURE__*/_react.default.createElement("div", {
        key: text,
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontSize: 12,
          color: C.white,
          marginBottom: 5
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 13,
          flexShrink: 0
        }
      }, icon), /*#__PURE__*/_react.default.createElement("span", null, text))), /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => setContactAuthMode("register"),
        style: {
          background: "none",
          border: "none",
          color: C.red,
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          marginTop: 8,
          fontFamily: "'Barlow',sans-serif"
        }
      }, "Stattdessen Mitglied werden →")), (contactAuthMode === "guest" || contactAuthMode === "register") && /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Dein Name",
        style: {
          marginBottom: 8
        },
        value: contactAuthForm.name,
        onChange: e => setContactAuthForm(p => ({
          ...p,
          name: e.target.value
        }))
      }), contactAuthMode === "register" && /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Club-Code",
        style: {
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 2,
          textAlign: "center",
          fontWeight: 700
        },
        value: contactAuthForm.code,
        onChange: e => setContactAuthForm(p => ({
          ...p,
          code: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "E-Mail",
        type: "email",
        style: {
          marginBottom: 16
        },
        value: contactAuthForm.email,
        onChange: e => setContactAuthForm(p => ({
          ...p,
          email: e.target.value
        })),
        onKeyDown: e => {
          if (e.key === "Enter") handleContactAuth();
        }
      }), /*#__PURE__*/_react.default.createElement("button", {
        className: "btn",
        style: {
          width: "100%"
        },
        onClick: handleContactAuth
      }, contactAuthMode === "guest" ? "Weiter zur Nachricht →" : contactAuthMode === "login" ? "Anmelden →" : "Konto erstellen →"), contactAuthMode === "login" && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          textAlign: "center",
          marginTop: 10,
          fontSize: 11,
          color: C.muted
        }
      }, "Kein Passwort nötig — nur deine E-Mail"))), showStatusPicker && /*#__PURE__*/_react.default.createElement("div", {
        className: "overlay",
        style: {
          zIndex: 500
        },
        onClick: e => {
          if (e.target === e.currentTarget) setShowStatusPicker(null);
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 4
        }
      }, "📍 Status setzen"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 16
        }
      }, "Sichtbar wenn jemand deinen QR-Code scannt"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 16
        }
      }, STATUS_PRESETS.map((p, i) => /*#__PURE__*/_react.default.createElement("button", {
        key: i,
        onClick: () => setStatus(showStatusPicker, p),
        style: {
          display: "flex",
          gap: 12,
          alignItems: "center",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px",
          cursor: "pointer",
          fontFamily: "'Barlow',sans-serif",
          textAlign: "left"
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 24,
          flexShrink: 0
        }
      }, p.icon), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 700,
          color: C.white
        }
      }, p.text), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, "Läuft ab nach ", p.mins, " Min"))))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          borderTop: `1px solid ${C.border}`,
          paddingTop: 14,
          marginBottom: 10
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 8
        }
      }, "Eigener Text"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 8
        }
      }, /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "z.B. Bin gleich beim Einlass...",
        value: statusCustom,
        onChange: e => setStatusCustom(e.target.value),
        onKeyDown: e => {
          if (e.key === "Enter" && statusCustom.trim()) setStatus(showStatusPicker, {
            icon: "💬",
            mins: 30
          }, statusCustom);
        },
        style: {
          flex: 1
        }
      }), /*#__PURE__*/_react.default.createElement("button", {
        className: "btn",
        disabled: !statusCustom.trim(),
        onClick: () => {
          if (statusCustom.trim()) setStatus(showStatusPicker, {
            icon: "💬",
            mins: 30
          }, statusCustom);
        },
        style: {
          flexShrink: 0,
          opacity: statusCustom.trim() ? 1 : .4
        }
      }, "OK"))), getActiveStatus(showStatusPicker) && /*#__PURE__*/_react.default.createElement("button", {
        className: "btn ghost",
        style: {
          width: "100%",
          marginTop: 4,
          color: "#ef4444",
          borderColor: "#ef444444"
        },
        onClick: () => {
          clearStatus(showStatusPicker);
          setShowStatusPicker(null);
          toast_("Status gelöscht");
        }
      }, "Status löschen"))), lightbox && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.97)",
          zIndex: 600,
          display: "flex",
          flexDirection: "column"
        },
        onClick: () => setLightbox(null)
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          flexShrink: 0
        },
        onClick: e => e.stopPropagation()
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 13,
          color: "rgba(255,255,255,.6)"
        }
      }, lightbox.index + 1, " / ", lightbox.images.length), /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => setLightbox(null),
        style: {
          background: "rgba(255,255,255,.1)",
          border: "none",
          color: "#fff",
          fontSize: 20,
          width: 40,
          height: 40,
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, "✕")), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          position: "relative"
        },
        onClick: e => e.stopPropagation()
      }, /*#__PURE__*/_react.default.createElement("img", {
        src: lightbox.images[lightbox.index],
        alt: "",
        style: {
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 8
        }
      }), lightbox.images.length > 1 && /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => setLightbox(p => ({
          ...p,
          index: Math.max(0, p.index - 1)
        })),
        style: {
          position: "absolute",
          left: 8,
          background: "rgba(255,255,255,.15)",
          border: "none",
          color: "#fff",
          fontSize: 28,
          width: 44,
          height: 44,
          borderRadius: "50%",
          cursor: "pointer",
          display: lightbox.index === 0 ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, "‹"), /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => setLightbox(p => ({
          ...p,
          index: Math.min(p.images.length - 1, p.index + 1)
        })),
        style: {
          position: "absolute",
          right: 8,
          background: "rgba(255,255,255,.15)",
          border: "none",
          color: "#fff",
          fontSize: 28,
          width: 44,
          height: 44,
          borderRadius: "50%",
          cursor: "pointer",
          display: lightbox.index === lightbox.images.length - 1 ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, "›"))), lightbox.images.length > 1 && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 6,
          justifyContent: "center",
          padding: "16px",
          flexShrink: 0
        },
        onClick: e => e.stopPropagation()
      }, lightbox.images.map((_, i) => /*#__PURE__*/_react.default.createElement("div", {
        key: i,
        onClick: () => setLightbox(p => ({
          ...p,
          index: i
        })),
        style: {
          width: i === lightbox.index ? 20 : 6,
          height: 6,
          borderRadius: 99,
          background: i === lightbox.index ? "#fff" : "rgba(255,255,255,.3)",
          transition: "all .2s",
          cursor: "pointer"
        }
      })))));
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // VEHICLE DETAIL
    // ══════════════════════════════════════════════════════════════════════════════
    if (screen === "vehicle" && viewV) {
      const v = viewV;
      const vLog = logbook[v.id] || [];
      const vParts = Object.values(participants).flat().filter(p => p.vehicleId === v.id);
      const vHist = eventHistory.filter(h => h.vehicleId === v.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const isOwn = v.owner === me?.email || v.userId === me?.id || v.userId === me?.email;
      const tuevParts = (v.tuev_faelligkeit || "").split("/");
      const tuevDate = tuevParts.length === 2 ? new Date(parseInt(tuevParts[1]), parseInt(tuevParts[0]) - 1, 1) : null;
      const tuevDays = tuevDate ? Math.ceil((tuevDate - new Date()) / 86400000) : null;
      const tuevColor = !tuevDays ? C.muted : tuevDays < 0 ? C.red : tuevDays < 90 ? C.amber : C.green;
      const kz = fmtKz(v.kennzeichen, v.baujahr);
      const priv = v.privacy || DEF_PRIVACY;
      return /*#__PURE__*/_react.default.createElement("div", {
        style: {
          minHeight: "100vh",
          background: C.black,
          paddingBottom: 80
        }
      }, /*#__PURE__*/_react.default.createElement("style", null, CSS), toast && /*#__PURE__*/_react.default.createElement("div", {
        className: `toast ${toast.type}`
      }, toast.msg), ScannerOverlay, (() => {
        const imgs = getImages(v);
        const curIdx = Math.min(gallerySwipe[v.id] || 0, Math.max(0, imgs.length - 1));
        const curImg = imgs[curIdx];
        const goTo = i => setGallerySwipe(p => ({
          ...p,
          [v.id]: Math.max(0, Math.min(imgs.length - 1, i))
        }));
        // Touch swipe state
        let touchStartX = 0;
        const onTouchStart = e => {
          touchStartX = e.touches[0].clientX;
        };
        const onTouchEnd = e => {
          const dx = e.changedTouches[0].clientX - touchStartX;
          if (Math.abs(dx) > 40) goTo(curIdx + (dx < 0 ? 1 : -1));
        };
        return /*#__PURE__*/_react.default.createElement("div", {
          style: {
            height: 280,
            position: "relative",
            overflow: "hidden",
            background: "#111"
          },
          onTouchStart: onTouchStart,
          onTouchEnd: onTouchEnd
        }, curImg ? /*#__PURE__*/_react.default.createElement("img", {
          src: curImg,
          alt: "",
          draggable: false,
          style: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            cursor: "zoom-in",
            userSelect: "none",
            WebkitUserSelect: "none"
          },
          onClick: () => setLightbox({
            images: imgs,
            index: curIdx
          }),
          onError: e => e.target.style.display = "none"
        }) : isOwn && /*#__PURE__*/_react.default.createElement("label", {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: "pointer",
            height: "100%",
            color: C.muted
          }
        }, /*#__PURE__*/_react.default.createElement("input", {
          type: "file",
          accept: "image/*",
          style: {
            display: "none"
          },
          onChange: e => handleImageUpload(e.target.files[0], url => addImageToVehicle(v.id, url))
        }), /*#__PURE__*/_react.default.createElement("span", {
          style: {
            fontSize: 40
          }
        }, "📷"), /*#__PURE__*/_react.default.createElement("span", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: C.white
          }
        }, "Erstes Foto hinzufügen"), /*#__PURE__*/_react.default.createElement("span", {
          style: {
            fontSize: 11,
            color: C.muted
          }
        }, "Tippe um Foto oder Bibliothek zu öffnen")), /*#__PURE__*/_react.default.createElement("div", {
          style: {
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom,rgba(0,0,0,.45) 0%,transparent 35%,transparent 50%,rgba(0,0,0,.75) 100%)",
            pointerEvents: "none"
          }
        }), imgs.length > 1 && /*#__PURE__*/_react.default.createElement("div", {
          style: {
            position: "absolute",
            bottom: 14,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            zIndex: 3
          }
        }, imgs.map((_, i) => /*#__PURE__*/_react.default.createElement("div", {
          key: i,
          onClick: e => {
            e.stopPropagation();
            goTo(i);
          },
          style: {
            width: i === curIdx ? 20 : 6,
            height: 6,
            borderRadius: 99,
            background: i === curIdx ? "#fff" : "rgba(255,255,255,.35)",
            transition: "width .2s, background .2s",
            cursor: "pointer"
          }
        }))), imgs.length > 1 && /*#__PURE__*/_react.default.createElement("div", {
          style: {
            position: "absolute",
            bottom: 14,
            right: 14,
            background: "rgba(0,0,0,.6)",
            backdropFilter: "blur(4px)",
            borderRadius: 6,
            padding: "3px 9px",
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(255,255,255,.9)",
            zIndex: 3,
            letterSpacing: .5
          }
        }, curIdx + 1, "/", imgs.length), /*#__PURE__*/_react.default.createElement("div", {
          style: {
            position: "absolute",
            top: 16,
            left: 14,
            zIndex: 5
          }
        }, /*#__PURE__*/_react.default.createElement("button", {
          onClick: () => setScreen("app"),
          style: {
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 10,
            padding: "8px 14px",
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Barlow',sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 6
          }
        }, "← Zurück")), /*#__PURE__*/_react.default.createElement("div", {
          style: {
            position: "absolute",
            top: 16,
            right: 14,
            display: "flex",
            gap: 8,
            zIndex: 5
          }
        }, isOwn && /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("label", {
          title: "Foto hinzufügen",
          style: {
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 10,
            padding: "8px 12px",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 38
          }
        }, /*#__PURE__*/_react.default.createElement("input", {
          type: "file",
          accept: "image/*",
          style: {
            display: "none"
          },
          onChange: e => handleImageUpload(e.target.files[0], url => addImageToVehicle(v.id, url))
        }), imgUploading ? "⏳" : "📷"), /*#__PURE__*/_react.default.createElement("button", {
          title: "QR-Sichtbarkeit",
          onClick: () => setShowPrivacy(v.id),
          style: {
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 10,
            padding: "8px 12px",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            minWidth: 38
          }
        }, "🔒")), /*#__PURE__*/_react.default.createElement("button", {
          title: "Öffentliche Ansicht",
          onClick: () => {
            setPublicV({
              ...v,
              privacy: priv
            });
            setScreen("public");
            loadStatusFor(v.id);
          },
          style: {
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 10,
            padding: "8px 12px",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            minWidth: 38
          }
        }, "👁")));
      })(), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          padding: "16px",
          maxWidth: 520,
          margin: "0 auto"
        }
      }, /*#__PURE__*/_react.default.createElement("h1", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 26,
          fontWeight: 900,
          color: C.white,
          lineHeight: 1,
          marginBottom: 8
        }
      }, v.hersteller, " ", v.modell), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          background: "#fff",
          border: "2px solid #222",
          borderRadius: 5,
          padding: "3px 10px"
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 14,
          fontWeight: 800,
          color: "#111",
          letterSpacing: 2,
          fontFamily: "Arial,sans-serif"
        }
      }, kz)), isOwn && /*#__PURE__*/_react.default.createElement("button", {
        className: "btn sm ghost",
        style: {
          fontSize: 11
        },
        onClick: () => setShowStatusPicker(v.id)
      }, getActiveStatus(v.id) ? `${getActiveStatus(v.id).icon} Status` : "📍 Status"), isOwn && /*#__PURE__*/_react.default.createElement("button", {
        className: "btn sm ghost",
        style: {
          fontSize: 11
        },
        onClick: () => openEditVehicle(v)
      }, "✏️ Bearbeiten"), !isOwn && /*#__PURE__*/_react.default.createElement("button", {
        className: "btn sm ghost",
        style: {
          fontSize: 11
        },
        onClick: () => startContact(v.id)
      }, "💬 Kontakt")), (() => {
        const s = getActiveStatus(v.id);
        if (!s || !isOwn) return null;
        return /*#__PURE__*/_react.default.createElement("div", {
          style: {
            background: `${C.amber}18`,
            border: `1px solid ${C.amber}44`,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            display: "flex",
            gap: 10,
            alignItems: "center"
          }
        }, /*#__PURE__*/_react.default.createElement("span", {
          style: {
            fontSize: 20
          }
        }, s.icon), /*#__PURE__*/_react.default.createElement("div", {
          style: {
            flex: 1
          }
        }, /*#__PURE__*/_react.default.createElement("div", {
          style: {
            fontSize: 13,
            fontWeight: 700,
            color: C.amber
          }
        }, s.text), s.expiresAt && /*#__PURE__*/_react.default.createElement("div", {
          style: {
            fontSize: 10,
            color: C.muted
          }
        }, "Läuft ab in ", Math.max(0, Math.ceil((s.expiresAt - Date.now()) / 60000)), " Min")), /*#__PURE__*/_react.default.createElement("button", {
          onClick: () => clearStatus(v.id),
          style: {
            background: "none",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            fontSize: 16,
            padding: 4
          }
        }, "✕"));
      })(), (() => {
        const imgs = getImages(v);
        if (imgs.length <= 1) return null;
        const curIdx = Math.min(gallerySwipe[v.id] || 0, imgs.length - 1);
        return /*#__PURE__*/_react.default.createElement("div", {
          style: {
            display: "flex",
            gap: 8,
            overflowX: "auto",
            marginBottom: 14,
            padding: "2px 0 6px",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch"
          }
        }, imgs.map((img, i) => {
          const active = i === curIdx;
          return /*#__PURE__*/_react.default.createElement("div", {
            key: i,
            style: {
              position: "relative",
              flexShrink: 0,
              transition: "transform .15s",
              transform: active ? "scale(1.05)" : "scale(1)"
            }
          }, /*#__PURE__*/_react.default.createElement("img", {
            src: img,
            alt: "",
            onClick: () => setGallerySwipe(p => ({
              ...p,
              [v.id]: i
            })),
            style: {
              width: 68,
              height: 68,
              objectFit: "cover",
              borderRadius: 9,
              cursor: "pointer",
              display: "block",
              border: `2.5px solid ${active ? C.red : "transparent"}`,
              boxShadow: active ? `0 0 0 1px ${C.red}` : "none",
              transition: "border-color .15s"
            },
            onError: e => e.target.style.display = "none"
          }), isOwn && /*#__PURE__*/_react.default.createElement("button", {
            onClick: e => {
              e.stopPropagation();
              removeImageFromVehicle(v.id, i);
            },
            style: {
              position: "absolute",
              top: -4,
              right: -4,
              background: C.red,
              border: "2px solid #0a0a0a",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              width: 18,
              height: 18,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              fontFamily: "'Barlow',sans-serif"
            }
          }, "✕"));
        }), isOwn && /*#__PURE__*/_react.default.createElement("label", {
          style: {
            width: 68,
            height: 68,
            background: C.card,
            border: `1.5px dashed ${C.border}`,
            borderRadius: 9,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            gap: 2
          }
        }, /*#__PURE__*/_react.default.createElement("input", {
          type: "file",
          accept: "image/*",
          style: {
            display: "none"
          },
          onChange: e => handleImageUpload(e.target.files[0], url => addImageToVehicle(v.id, url))
        }), /*#__PURE__*/_react.default.createElement("span", {
          style: {
            fontSize: 18
          }
        }, "📷"), /*#__PURE__*/_react.default.createElement("span", {
          style: {
            fontSize: 8,
            color: C.muted,
            textAlign: "center"
          }
        }, "Hinzufügen")));
      })(), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 16
        }
      }, [[v.tuev_faelligkeit || "–", "TÜV", tuevColor], [parseInt(v.kilometerstand || 0).toLocaleString("de-DE") + " km", "Stand", C.muted], [["", "Sehr gut", "Gut", "Befriend.", "Ausreichend", "Mangelhaft"][parseInt(v.zustand)] || "–", "Zustand", C.gold]].map(([val, label, color], i) => /*#__PURE__*/_react.default.createElement("div", {
        key: i,
        style: {
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "10px 8px",
          textAlign: "center"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color,
          marginBottom: 2
        }
      }, val), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 9,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: .5
        }
      }, label)))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2
        }
      }, "📋 Logbuch (", vLog.length, ")"), isOwn && /*#__PURE__*/_react.default.createElement("button", {
        className: "btn sm ghost",
        onClick: () => setShowAddLog(v.id)
      }, "+ Eintrag")), vLog.length === 0 ? /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px",
          textAlign: "center",
          color: C.muted,
          fontSize: 12
        }
      }, "Noch leer — 3 Einträge schalten KI-Marktwert frei") : vLog.slice(0, 10).map(e => /*#__PURE__*/_react.default.createElement("div", {
        key: e.id,
        style: {
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "11px 14px",
          marginBottom: 6
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 13,
          color: C.white
        }
      }, e.type), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, fmtDate(e.date))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, e.km ? parseInt(e.km).toLocaleString("de-DE") + " km" : "", e.workshop ? " · " + e.workshop : ""), e.notes && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: "#555",
          marginTop: 3
        }
      }, e.notes)))), (vParts.length > 0 || vHist.length > 0) && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 8
        }
      }, "🏁 Veranstaltungen"), vParts.map(p => {
        const ev = events[p.eventId];
        if (!ev) return null;
        return /*#__PURE__*/_react.default.createElement("div", {
          key: p.id,
          style: {
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "11px 14px",
            marginBottom: 6,
            display: "flex",
            gap: 10,
            alignItems: "center",
            cursor: "pointer"
          },
          onClick: () => {
            setViewEv(ev);
            setScreen("event");
          }
        }, /*#__PURE__*/_react.default.createElement("div", {
          style: {
            background: `${C.red}22`,
            border: `1px solid ${C.red}44`,
            borderRadius: 7,
            padding: "3px 8px",
            fontWeight: 800,
            fontSize: 13,
            color: C.red,
            flexShrink: 0
          }
        }, "#", p.startNr), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
          style: {
            fontWeight: 600,
            fontSize: 13,
            color: C.white
          }
        }, ev.name), /*#__PURE__*/_react.default.createElement("div", {
          style: {
            fontSize: 11,
            color: C.muted
          }
        }, fmtDate(ev.date), " · ", p.class)), /*#__PURE__*/_react.default.createElement("div", {
          style: {
            marginLeft: "auto",
            fontSize: 10,
            color: C.amber,
            fontWeight: 600
          }
        }, "in ", daysUntil(ev.date), " T."));
      }), vHist.map(h => /*#__PURE__*/_react.default.createElement("div", {
        key: h.id,
        style: {
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "11px 14px",
          marginBottom: 6,
          display: "flex",
          gap: 10,
          alignItems: "center",
          opacity: .75
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: `${C.gold}22`,
          border: `1px solid ${C.gold}44`,
          borderRadius: 7,
          padding: "3px 8px",
          fontWeight: 800,
          fontSize: 13,
          color: C.gold,
          flexShrink: 0
        }
      }, "#", h.startNr), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontWeight: 600,
          fontSize: 13,
          color: C.white,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, h.eventName), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, fmtDate(h.date), h.note ? " · " + h.note : "")), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: h.result === "Teilnahme" ? C.muted : C.gold,
          fontWeight: 700,
          flexShrink: 0
        }
      }, h.result)))), isOwn && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 8
        }
      }, "📞 Kontakt"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center"
        }
      }, /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Telefonnummer",
        type: "tel",
        value: viewV.phone || "",
        onChange: e => {
          const val = e.target.value;
          const updated = {
            ...viewV,
            phone: val
          };
          setViewV(updated);
          setVehicles(prev => ({
            ...prev,
            [viewV.id]: updated
          }));
          // Debounced save
          clearTimeout(window._phoneSaveTimer);
          window._phoneSaveTimer = setTimeout(async () => {
            const DB = window.PCN_DB;
            if (DB) await DB.vehicles.save(updated);
          }, 800);
        },
        style: {
          flex: 1,
          fontSize: 14
        }
      }), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted,
          flexShrink: 0,
          lineHeight: 1.4,
          maxWidth: 100
        }
      }, priv.pub_phone ? "🔓 Öffentlich" : "🔒 Privat"))), /*#__PURE__*/_react.default.createElement("div", {
        className: "card",
        style: {
          padding: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 12
        }
      }, "📱 QR-Code"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 14,
          alignItems: "center"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: "#fff",
          borderRadius: 10,
          padding: 8,
          flexShrink: 0,
          cursor: "pointer"
        },
        onClick: () => {
          setPublicV({
            ...v,
            privacy: priv
          });
          setScreen("public");
          loadStatusFor(v.id);
        }
      }, /*#__PURE__*/_react.default.createElement(QRCodeCanvas, {
        value: `https://qar.gallery/pcn/?v=${v.qarId}`,
        size: 90
      })), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted,
          marginBottom: 3
        }
      }, "QAR-ID"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fontWeight: 700,
          color: C.white,
          letterSpacing: 1
        }
      }, v.qarId), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted,
          marginTop: 4
        }
      }, "FIN niemals öffentlich"), /*#__PURE__*/_react.default.createElement("button", {
        className: "btn sm ghost",
        style: {
          marginTop: 8,
          fontSize: 11
        },
        onClick: () => {
          setPublicV({
            ...v,
            privacy: priv
          });
          setScreen("public");
          loadStatusFor(v.id);
        }
      }, "Öffentliche Seite →"))))), showPrivacy === v.id && /*#__PURE__*/_react.default.createElement("div", {
        className: "overlay",
        onClick: e => {
          if (e.target === e.currentTarget) setShowPrivacy(null);
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 4
        }
      }, "🔒 QR-Sichtbarkeit"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 16
        }
      }, "Was ist auf der öffentlichen Fahrzeugseite sichtbar?"), [["Basis", [["kennzeichen", "Kennzeichen"], ["farbe", "Farbe"], ["kraftstoff", "Kraftstoff"], ["getriebe", "Getriebe"], ["baujahr", "Baujahr"]]], ["Details", [["kilometerstand", "Kilometerstand"], ["tuev_faelligkeit", "TÜV-Datum"], ["zustand", "Zustand"], ["marktwert", "Marktwert"]]], ["Abschnitte", [["pub_events", "Veranstaltungsteilnahmen"], ["pub_logbook", "Service-Logbuch"]]], ["Kontakt", [["pub_phone", "Telefonnummer (Direktanruf)"]]]].map(([group, fields]) => /*#__PURE__*/_react.default.createElement("div", {
        key: group,
        style: {
          marginBottom: 14
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 8
        }
      }, group), fields.map(([key, label]) => /*#__PURE__*/_react.default.createElement("div", {
        key: key,
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 0",
          borderBottom: `1px solid ${C.border}`
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 13,
          color: C.white
        }
      }, label), /*#__PURE__*/_react.default.createElement("button", {
        className: `tog ${priv[key] === true || priv[key] === undefined && DEF_PRIVACY[key] ? "on" : ""}`,
        onClick: () => togglePrivacy(v.id, key)
      }))))), /*#__PURE__*/_react.default.createElement("button", {
        className: "btn",
        style: {
          width: "100%",
          marginTop: 8
        },
        onClick: () => setShowPrivacy(null)
      }, "Fertig ✓"))), showEditVehicle === v.id && /*#__PURE__*/_react.default.createElement("div", {
        className: "overlay",
        style: {
          zIndex: 500
        },
        onClick: e => {
          if (e.target === e.currentTarget) setShowEditVehicle(null);
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 4
        }
      }, "✏️ Fahrzeugdaten bearbeiten"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 18
        }
      }, "Alle Angaben jederzeit änderbar"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 8
        }
      }, "Basis"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8
        }
      }, /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Hersteller",
        value: editForm.hersteller || "",
        onChange: e => setEditForm(p => ({
          ...p,
          hersteller: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Modell *",
        value: editForm.modell || "",
        onChange: e => setEditForm(p => ({
          ...p,
          modell: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Baujahr",
        value: editForm.baujahr || "",
        onChange: e => setEditForm(p => ({
          ...p,
          baujahr: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Kennzeichen *",
        value: editForm.kennzeichen || "",
        onChange: e => setEditForm(p => ({
          ...p,
          kennzeichen: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Farbe",
        value: editForm.farbe || "",
        onChange: e => setEditForm(p => ({
          ...p,
          farbe: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("select", {
        className: "inp",
        value: editForm.kraftstoff || "Benzin",
        onChange: e => setEditForm(p => ({
          ...p,
          kraftstoff: e.target.value
        }))
      }, ["Benzin", "Diesel", "Elektro", "Hybrid"].map(k => /*#__PURE__*/_react.default.createElement("option", {
        key: k
      }, k))), /*#__PURE__*/_react.default.createElement("select", {
        className: "inp",
        style: {
          gridColumn: "1/-1"
        },
        value: editForm.getriebe || "PDK",
        onChange: e => setEditForm(p => ({
          ...p,
          getriebe: e.target.value
        }))
      }, ["PDK", "7-Gang PDK", "6-Gang manuell", "8-Gang Automatik", "Stufenlos"].map(k => /*#__PURE__*/_react.default.createElement("option", {
        key: k
      }, k))))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 8
        }
      }, "Status & Technik"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8
        }
      }, /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        type: "number",
        inputMode: "numeric",
        placeholder: "Kilometerstand",
        value: editForm.kilometerstand || "",
        onChange: e => setEditForm(p => ({
          ...p,
          kilometerstand: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "TÜV (MM/JJJJ)",
        value: editForm.tuev_faelligkeit || "",
        onChange: e => setEditForm(p => ({
          ...p,
          tuev_faelligkeit: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("select", {
        className: "inp",
        style: {
          gridColumn: "1/-1"
        },
        value: editForm.zustand || "",
        onChange: e => setEditForm(p => ({
          ...p,
          zustand: e.target.value
        }))
      }, /*#__PURE__*/_react.default.createElement("option", {
        value: ""
      }, "Zustand wählen…"), /*#__PURE__*/_react.default.createElement("option", {
        value: "1"
      }, "1 — Sehr gut"), /*#__PURE__*/_react.default.createElement("option", {
        value: "2"
      }, "2 — Gut"), /*#__PURE__*/_react.default.createElement("option", {
        value: "3"
      }, "3 — Befriedigend"), /*#__PURE__*/_react.default.createElement("option", {
        value: "4"
      }, "4 — Ausreichend"), /*#__PURE__*/_react.default.createElement("option", {
        value: "5"
      }, "5 — Mangelhaft")))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 8
        }
      }, "Kontakt"), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        type: "tel",
        placeholder: "Telefonnummer (optional)",
        value: editForm.phone || "",
        onChange: e => setEditForm(p => ({
          ...p,
          phone: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted,
          marginTop: 6
        }
      }, "🔒 Sichtbarkeit über QR-Einstellungen steuerbar")), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          marginBottom: 18
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 8
        }
      }, "Besonderheiten"), /*#__PURE__*/_react.default.createElement("textarea", {
        className: "inp",
        placeholder: "Ausstattung, Extras, Hinweise...",
        rows: 3,
        value: editForm.besonderheiten || "",
        onChange: e => setEditForm(p => ({
          ...p,
          besonderheiten: e.target.value
        })),
        style: {
          resize: "vertical",
          fontFamily: "'Barlow',sans-serif"
        }
      })), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 8
        }
      }, /*#__PURE__*/_react.default.createElement("button", {
        className: "btn ghost",
        style: {
          flex: 1
        },
        onClick: () => setShowEditVehicle(null)
      }, "Abbrechen"), /*#__PURE__*/_react.default.createElement("button", {
        className: "btn",
        style: {
          flex: 1
        },
        onClick: saveVehicleEdit
      }, "Speichern ✓")))), showContactAuth && /*#__PURE__*/_react.default.createElement("div", {
        className: "overlay",
        style: {
          zIndex: 550
        },
        onClick: e => {
          if (e.target === e.currentTarget) {
            setShowContactAuth(null);
            setContactAuthForm({
              name: "",
              email: "",
              code: ""
            });
          }
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 4
        }
      }, "💬 Nachricht senden"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 18
        }
      }, "Um eine Nachricht zu senden, identifiziere dich kurz"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          background: "#111",
          borderRadius: 10,
          padding: 3,
          marginBottom: 16
        }
      }, [["guest", "Als Gast"], ["login", "Anmelden"], ["register", "Registrieren"]].map(([m, label]) => /*#__PURE__*/_react.default.createElement("button", {
        key: m,
        onClick: () => setContactAuthMode(m),
        style: {
          flex: 1,
          padding: "9px 4px",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: "'Barlow',sans-serif",
          fontWeight: 700,
          fontSize: 12,
          background: contactAuthMode === m ? C.red : "transparent",
          color: contactAuthMode === m ? "#fff" : C.muted,
          transition: "all .15s"
        }
      }, label))), contactAuthMode === "guest" && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          background: "#141414",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px",
          marginBottom: 16
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.6,
          marginBottom: 10
        }
      }, "Kein Account nötig — nur Name und E-Mail für die Zustellung deiner Nachricht."), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 800,
          color: C.gold,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8
        }
      }, "Als PCN-Mitglied bekommst du zusätzlich"), [["🚗", "Eigene digitale Fahrzeugakte"], ["📱", "QR-Code fürs eigene Auto"], ["🏁", "Direkte Anmeldung zu Club-Events"]].map(([icon, text]) => /*#__PURE__*/_react.default.createElement("div", {
        key: text,
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontSize: 12,
          color: C.white,
          marginBottom: 5
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 13,
          flexShrink: 0
        }
      }, icon), /*#__PURE__*/_react.default.createElement("span", null, text))), /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => setContactAuthMode("register"),
        style: {
          background: "none",
          border: "none",
          color: C.red,
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          marginTop: 8,
          fontFamily: "'Barlow',sans-serif"
        }
      }, "Stattdessen Mitglied werden →")), (contactAuthMode === "guest" || contactAuthMode === "register") && /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Dein Name",
        style: {
          marginBottom: 8
        },
        value: contactAuthForm.name,
        onChange: e => setContactAuthForm(p => ({
          ...p,
          name: e.target.value
        }))
      }), contactAuthMode === "register" && /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Club-Code",
        style: {
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 2,
          textAlign: "center",
          fontWeight: 700
        },
        value: contactAuthForm.code,
        onChange: e => setContactAuthForm(p => ({
          ...p,
          code: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "E-Mail",
        type: "email",
        style: {
          marginBottom: 16
        },
        value: contactAuthForm.email,
        onChange: e => setContactAuthForm(p => ({
          ...p,
          email: e.target.value
        })),
        onKeyDown: e => {
          if (e.key === "Enter") handleContactAuth();
        }
      }), /*#__PURE__*/_react.default.createElement("button", {
        className: "btn",
        style: {
          width: "100%"
        },
        onClick: handleContactAuth
      }, contactAuthMode === "guest" ? "Weiter zur Nachricht →" : contactAuthMode === "login" ? "Anmelden →" : "Konto erstellen →"), contactAuthMode === "login" && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          textAlign: "center",
          marginTop: 10,
          fontSize: 11,
          color: C.muted
        }
      }, "Kein Passwort nötig — nur deine E-Mail"))), showStatusPicker && /*#__PURE__*/_react.default.createElement("div", {
        className: "overlay",
        style: {
          zIndex: 500
        },
        onClick: e => {
          if (e.target === e.currentTarget) setShowStatusPicker(null);
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 4
        }
      }, "📍 Status setzen"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 16
        }
      }, "Sichtbar wenn jemand deinen QR-Code scannt"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 16
        }
      }, STATUS_PRESETS.map((p, i) => /*#__PURE__*/_react.default.createElement("button", {
        key: i,
        onClick: () => setStatus(showStatusPicker, p),
        style: {
          display: "flex",
          gap: 12,
          alignItems: "center",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px",
          cursor: "pointer",
          fontFamily: "'Barlow',sans-serif",
          textAlign: "left"
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 24,
          flexShrink: 0
        }
      }, p.icon), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 700,
          color: C.white
        }
      }, p.text), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, "Läuft ab nach ", p.mins, " Min"))))), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          borderTop: `1px solid ${C.border}`,
          paddingTop: 14,
          marginBottom: 10
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 8
        }
      }, "Eigener Text"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 8
        }
      }, /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "z.B. Bin gleich beim Einlass...",
        value: statusCustom,
        onChange: e => setStatusCustom(e.target.value),
        onKeyDown: e => {
          if (e.key === "Enter" && statusCustom.trim()) setStatus(showStatusPicker, {
            icon: "💬",
            mins: 30
          }, statusCustom);
        },
        style: {
          flex: 1
        }
      }), /*#__PURE__*/_react.default.createElement("button", {
        className: "btn",
        disabled: !statusCustom.trim(),
        onClick: () => {
          if (statusCustom.trim()) setStatus(showStatusPicker, {
            icon: "💬",
            mins: 30
          }, statusCustom);
        },
        style: {
          flexShrink: 0,
          opacity: statusCustom.trim() ? 1 : .4
        }
      }, "OK"))), getActiveStatus(showStatusPicker) && /*#__PURE__*/_react.default.createElement("button", {
        className: "btn ghost",
        style: {
          width: "100%",
          marginTop: 4,
          color: "#ef4444",
          borderColor: "#ef444444"
        },
        onClick: () => {
          clearStatus(showStatusPicker);
          setShowStatusPicker(null);
          toast_("Status gelöscht");
        }
      }, "Status löschen"))), lightbox && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.97)",
          zIndex: 600,
          display: "flex",
          flexDirection: "column"
        },
        onClick: () => setLightbox(null)
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          flexShrink: 0
        },
        onClick: e => e.stopPropagation()
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 13,
          color: "rgba(255,255,255,.6)"
        }
      }, lightbox.index + 1, " / ", lightbox.images.length), /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => setLightbox(null),
        style: {
          background: "rgba(255,255,255,.1)",
          border: "none",
          color: "#fff",
          fontSize: 20,
          width: 40,
          height: 40,
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, "✕")), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          position: "relative"
        },
        onClick: e => e.stopPropagation()
      }, /*#__PURE__*/_react.default.createElement("img", {
        src: lightbox.images[lightbox.index],
        alt: "",
        style: {
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 8
        }
      }), lightbox.images.length > 1 && /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => setLightbox(p => ({
          ...p,
          index: Math.max(0, p.index - 1)
        })),
        style: {
          position: "absolute",
          left: 8,
          background: "rgba(255,255,255,.15)",
          border: "none",
          color: "#fff",
          fontSize: 28,
          width: 44,
          height: 44,
          borderRadius: "50%",
          cursor: "pointer",
          display: lightbox.index === 0 ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, "‹"), /*#__PURE__*/_react.default.createElement("button", {
        onClick: () => setLightbox(p => ({
          ...p,
          index: Math.min(p.images.length - 1, p.index + 1)
        })),
        style: {
          position: "absolute",
          right: 8,
          background: "rgba(255,255,255,.15)",
          border: "none",
          color: "#fff",
          fontSize: 28,
          width: 44,
          height: 44,
          borderRadius: "50%",
          cursor: "pointer",
          display: lightbox.index === lightbox.images.length - 1 ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, "›"))), lightbox.images.length > 1 && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 6,
          justifyContent: "center",
          padding: "16px",
          flexShrink: 0
        },
        onClick: e => e.stopPropagation()
      }, lightbox.images.map((_, i) => /*#__PURE__*/_react.default.createElement("div", {
        key: i,
        onClick: () => setLightbox(p => ({
          ...p,
          index: i
        })),
        style: {
          width: i === lightbox.index ? 20 : 6,
          height: 6,
          borderRadius: 99,
          background: i === lightbox.index ? "#fff" : "rgba(255,255,255,.3)",
          transition: "all .2s",
          cursor: "pointer"
        }
      })))), showAddLog === v.id && /*#__PURE__*/_react.default.createElement("div", {
        className: "overlay",
        onClick: e => {
          if (e.target === e.currentTarget) setShowAddLog(null);
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 16
        }
      }, "Logbuch-Eintrag"), /*#__PURE__*/_react.default.createElement("select", {
        className: "inp",
        value: addLogForm.type,
        onChange: e => setAddLogForm(p => ({
          ...p,
          type: e.target.value
        })),
        style: {
          marginBottom: 8
        }
      }, ["Ölwechsel", "Inspektion", "Reifenwechsel", "Bremsenwechsel", "Hauptuntersuchung", "Trackday", "Sonstiges"].map(t => /*#__PURE__*/_react.default.createElement("option", {
        key: t
      }, t))), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        type: "number",
        inputMode: "numeric",
        placeholder: "Kilometerstand *",
        style: {
          marginBottom: 8
        },
        value: addLogForm.km,
        onChange: e => setAddLogForm(p => ({
          ...p,
          km: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Werkstatt",
        style: {
          marginBottom: 8
        },
        value: addLogForm.workshop,
        onChange: e => setAddLogForm(p => ({
          ...p,
          workshop: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("input", {
        className: "inp",
        placeholder: "Notizen",
        style: {
          marginBottom: 16
        },
        value: addLogForm.notes,
        onChange: e => setAddLogForm(p => ({
          ...p,
          notes: e.target.value
        }))
      }), /*#__PURE__*/_react.default.createElement("button", {
        className: "btn",
        style: {
          width: "100%"
        },
        onClick: () => addLogEntry(v.id)
      }, "Speichern ✓"))));
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // EVENT DETAIL (proper component — no useState-in-render bug)
    // ══════════════════════════════════════════════════════════════════════════════
    if (screen === "event" && viewEv) {
      return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("style", null, CSS), toast && /*#__PURE__*/_react.default.createElement("div", {
        className: `toast ${toast.type}`
      }, toast.msg), /*#__PURE__*/_react.default.createElement(EventDetail, {
        ev: viewEv,
        me: me,
        myVehicles: myVehicles,
        vehicles: vehicles,
        participants: participants,
        onBack: () => setScreen("app"),
        onJoin: joinEvent,
        onViewVehicle: v => {
          setViewV(v);
          setScreen("vehicle");
        }
      }));
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // CHAT (proper component — no useEffect-in-render bug)
    // ══════════════════════════════════════════════════════════════════════════════
    if (screen === "chat" && activeThread && threads[activeThread]) {
      const t = threads[activeThread];
      return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement("style", null, CSS), toast && /*#__PURE__*/_react.default.createElement("div", {
        className: `toast ${toast.type}`
      }, toast.msg), /*#__PURE__*/_react.default.createElement(ChatScreen, {
        thread: t,
        me: me,
        allUsers: allUsers,
        vehicles: vehicles,
        onBack: () => {
          setScreen("app");
          setTab("messages");
        },
        onSend: sendMsg,
        onMarkRead: tid => setThreads(prev => ({
          ...prev,
          [tid]: {
            ...prev[tid],
            messages: (prev[tid]?.messages || []).map(m => ({
              ...m,
              read: true
            }))
          }
        })),
        onViewVehicle: v => {
          setViewV(v);
          setScreen("vehicle");
        },
        onUpgrade: () => {
          // Pre-fill registration form with the guest's existing name/email — frictionless upgrade
          setLoginForm({
            mode: "register",
            code: "",
            name: me?.name || "",
            email: me?.email || ""
          });
          setScreen("splash");
          toast_("Fast geschafft — gib nur noch den Club-Code ein 🏁");
        }
      }));
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // MAIN APP TABS
    // ══════════════════════════════════════════════════════════════════════════════
    return /*#__PURE__*/_react.default.createElement("div", {
      style: {
        minHeight: "100vh",
        background: C.black,
        paddingBottom: 62
      }
    }, /*#__PURE__*/_react.default.createElement("style", null, CSS), toast && /*#__PURE__*/_react.default.createElement("div", {
      className: `toast ${toast.type}`
    }, toast.msg), ScannerOverlay, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: C.dark,
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100
      }
    }, /*#__PURE__*/_react.default.createElement("img", {
      src: LOGO_URL,
      alt: "PCN",
      onError: e => e.target.style.display = "none",
      style: {
        height: 30,
        objectFit: "contain"
      }
    }), /*#__PURE__*/_react.default.createElement("button", {
      onClick: openScanner,
      style: {
        background: C.red,
        border: "none",
        borderRadius: 8,
        padding: "7px 14px",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
        fontFamily: "'Barlow',sans-serif"
      }
    }, "📷 Scan"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: C.white
      }
    }, me?.name), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        color: C.muted
      }
    }, me?.memberNr))), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        padding: "14px 14px 0",
        maxWidth: 560,
        margin: "0 auto"
      }
    }, tab === "dashboard" && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, Object.values(events).filter(e => daysUntil(e.date) > 0 && daysUntil(e.date) <= 14).slice(0, 1).map(e => /*#__PURE__*/_react.default.createElement("div", {
      key: e.id,
      style: {
        background: `${C.red}11`,
        border: `1px solid ${C.red}33`,
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 14,
        cursor: "pointer"
      },
      onClick: () => {
        setViewEv(e);
        setScreen("event");
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 9,
        color: C.red,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 3
      }
    }, "🏁 In ", daysUntil(e.date), " Tagen"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: C.white
      }
    }, e.name), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 11,
        color: C.muted,
        marginTop: 2
      }
    }, fmtDate(e.date), " · ", e.location))), myReminders.slice(0, 3).map(r => {
      const days = daysUntil(r.date);
      const rv = vehicles[r.vehicleId];
      return /*#__PURE__*/_react.default.createElement("div", {
        key: r.id,
        style: {
          background: C.card,
          border: `1px solid ${days <= 3 ? C.amber + "44" : C.border}`,
          borderRadius: 10,
          padding: "11px 13px",
          marginBottom: 7,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }
      }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: days <= 3 ? C.amber : C.white
        }
      }, r.title), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted,
          marginTop: 2
        }
      }, rv ? rv.hersteller + " " + rv.modell + " · " : "", days <= 0 ? "Heute" : days === 1 ? "Morgen" : `in ${days} T.`)), /*#__PURE__*/_react.default.createElement("button", {
        onClick: async () => {
          const DB = window.PCN_DB;
          if (DB) await DB.reminders.done(me.id, r.id);
          setReminders(p => p.map(x => x.id === r.id ? {
            ...x,
            done: true
          } : x));
          toast_("Erledigt ✓");
        },
        style: {
          background: "none",
          border: "none",
          color: C.muted,
          cursor: "pointer",
          fontSize: 20,
          padding: "0 4px"
        }
      }, "✓"));
    }), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        marginTop: 6
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 2
      }
    }, "Meine Fahrzeuge"), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn sm ghost",
      onClick: () => setShowAddV(true)
    }, "+")), myVehicles.length === 0 ? /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: C.card,
        border: `1px dashed ${C.border}`,
        borderRadius: 12,
        padding: "28px",
        textAlign: "center",
        cursor: "pointer"
      },
      onClick: () => setShowAddV(true)
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 28,
        marginBottom: 6
      }
    }, "🏎️"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 13,
        color: C.white,
        fontWeight: 600
      }
    }, "Erstes Fahrzeug hinzufügen")) : myVehicles.map(v => /*#__PURE__*/_react.default.createElement("div", {
      key: v.id,
      style: {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        marginBottom: 10,
        overflow: "hidden",
        cursor: "pointer"
      },
      onClick: () => {
        setViewV(v);
        setScreen("vehicle");
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        height: 100,
        overflow: "hidden",
        background: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, v.image ? /*#__PURE__*/_react.default.createElement("img", {
      src: v.image,
      alt: "",
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      },
      onError: e => e.target.style.display = "none"
    }) : /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 32
      }
    }, "🏎️")), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        padding: "11px 13px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: C.white
      }
    }, v.hersteller, " ", v.modell), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 4,
        alignItems: "center"
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        background: "#fff",
        border: "1.5px solid #222",
        borderRadius: 4,
        padding: "1px 7px",
        fontSize: 10,
        fontWeight: 800,
        color: "#111",
        letterSpacing: 1,
        fontFamily: "Arial,sans-serif"
      }
    }, fmtKz(v.kennzeichen, v.baujahr)), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 10,
        color: C.muted
      }
    }, v.baujahr))), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        color: C.muted,
        fontSize: 18
      }
    }, "›")))), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginTop: 20,
        marginBottom: 10
      }
    }, "Features freischalten"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 8
      }
    }, LOCKED_FEATURES.map(f => {
      const unlocked = unlockedFeatures.has(f.id);
      return /*#__PURE__*/_react.default.createElement("div", {
        key: f.id,
        style: {
          background: unlocked ? "#1a1a1a" : "#111",
          border: `1px solid ${C.border}`,
          borderRadius: 11,
          padding: "13px 12px",
          opacity: unlocked ? 1 : .5,
          position: "relative"
        }
      }, !unlocked && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          position: "absolute",
          top: 8,
          right: 8,
          fontSize: 12
        }
      }, "🔒"), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 18,
          marginBottom: 5
        }
      }, f.icon), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: unlocked ? C.white : "#444",
          marginBottom: 2
        }
      }, f.label), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 9,
          color: unlocked ? C.green : "#333"
        }
      }, unlocked ? "✓ Freigeschaltet" : f.milestone));
    }))), tab === "events" && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 12
      }
    }, "Veranstaltungen 2026"), Object.values(events).sort((a, b) => new Date(a.date) - new Date(b.date)).map(ev => {
      const days = daysUntil(ev.date);
      const myReg = (participants[ev.id] || []).find(p => p.userId === me?.id);
      return /*#__PURE__*/_react.default.createElement("div", {
        key: ev.id,
        style: {
          background: C.card,
          border: `1px solid ${myReg ? C.red + "44" : C.border}`,
          borderRadius: 12,
          padding: "14px",
          marginBottom: 10,
          cursor: "pointer"
        },
        onClick: () => {
          setViewEv(ev);
          setScreen("event");
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          background: `${C.red}22`,
          color: C.red,
          borderRadius: 6,
          padding: "2px 8px",
          fontSize: 10,
          fontWeight: 700
        }
      }, ev.category), /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 11,
          color: days <= 7 ? C.amber : C.muted,
          fontWeight: 600
        }
      }, days <= 0 ? "Heute" : days === 1 ? "Morgen" : `in ${days} T.`)), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 15,
          color: C.white,
          marginBottom: 2
        }
      }, ev.name), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 8
        }
      }, fmtDate(ev.date), " · ", ev.location), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center"
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, ev.entryFee), myReg && /*#__PURE__*/_react.default.createElement("span", {
        style: {
          background: `${C.green}22`,
          color: C.green,
          borderRadius: 5,
          padding: "1px 8px",
          fontSize: 10,
          fontWeight: 700
        }
      }, "✓ #", myReg.startNr)));
    })), tab === "messages" && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "💬 Nachrichten"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 14,
        fontSize: 11,
        color: C.muted,
        lineHeight: 1.6
      }
    }, "🔒 Nachrichten werden anonym vermittelt — Name und E-Mail bleiben geschützt."), myThreads.length === 0 ? /*#__PURE__*/_react.default.createElement("div", {
      style: {
        textAlign: "center",
        padding: "40px 20px",
        color: C.muted
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 32,
        marginBottom: 8
      }
    }, "💬"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 14,
        color: C.white,
        marginBottom: 4
      }
    }, "Noch keine Nachrichten"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 12
      }
    }, "Scanne einen QR-Code am Fahrzeug oder tippe auf „Kontakt\" in der Fahrzeugakte")) : myThreads.map(t => {
      const other = Object.values(allUsers).find(u => t.participants.includes(u.id) && u.id !== me?.id) || {
        name: "Mitglied"
      };
      const last = t.messages.filter(m => !m.isSystem).pop();
      const unread = t.messages.some(m => m.from !== me?.id && !m.read && !m.isSystem);
      const tv = vehicles[t.vehicleId];
      return /*#__PURE__*/_react.default.createElement("div", {
        key: t.id,
        style: {
          background: C.card,
          border: `1.5px solid ${unread ? C.red + "44" : C.border}`,
          borderRadius: 12,
          padding: "14px",
          marginBottom: 8,
          display: "flex",
          gap: 12,
          alignItems: "center",
          cursor: "pointer"
        },
        onClick: () => {
          setActiveThread(t.id);
          setScreen("chat");
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: `${C.red}22`,
          color: C.red,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 16,
          flexShrink: 0
        }
      }, t.anonymous ? "🔒" : other.name[0]), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2
        }
      }, /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontWeight: unread ? 700 : 500,
          fontSize: 14,
          color: C.white
        }
      }, t.anonymous ? "Anonym" : other.name), /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, last?.ts || "")), tv && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: `${C.red}88`,
          marginBottom: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, tv.hersteller, " ", tv.modell), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 12,
          color: unread ? C.white : C.muted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, last ? (last.from === me?.id ? "Du: " : "") + last.text : "Neuer Chat")), unread && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: C.red,
          flexShrink: 0
        }
      }));
    })), tab === "reminders" && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 2
      }
    }, "Erinnerungen"), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn sm ghost",
      onClick: () => setShowAddRem(true)
    }, "+ Neu")), myReminders.length === 0 ? /*#__PURE__*/_react.default.createElement("div", {
      style: {
        textAlign: "center",
        padding: "40px 20px",
        color: C.muted
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 32,
        marginBottom: 8
      }
    }, "🎉"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        color: C.white
      }
    }, "Alles erledigt!")) : myReminders.map(r => {
      const days = daysUntil(r.date);
      const rv = vehicles[r.vehicleId];
      return /*#__PURE__*/_react.default.createElement("div", {
        key: r.id,
        style: {
          background: C.card,
          border: `1px solid ${days <= 3 ? C.amber + "55" : C.border}`,
          borderRadius: 11,
          padding: "13px",
          marginBottom: 8
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start"
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: days <= 3 ? C.amber : C.white,
          marginBottom: 2
        }
      }, r.title), rv && /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, rv.hersteller, " ", rv.modell), /*#__PURE__*/_react.default.createElement("div", {
        style: {
          fontSize: 10,
          color: days < 0 ? C.red : days <= 3 ? C.amber : C.muted,
          marginTop: 2
        }
      }, days < 0 ? "⚠️ Überfällig" : days === 0 ? "Heute" : days === 1 ? "Morgen" : `in ${days} Tagen`, " · ", fmtDate(r.date))), /*#__PURE__*/_react.default.createElement("button", {
        onClick: async () => {
          const DB = window.PCN_DB;
          if (DB) await DB.reminders.done(me.id, r.id);
          setReminders(p => p.map(x => x.id === r.id ? {
            ...x,
            done: true
          } : x));
          toast_("Erledigt ✓");
        },
        style: {
          background: C.red,
          border: "none",
          borderRadius: 8,
          padding: "8px 12px",
          color: "#fff",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          marginLeft: 10,
          fontFamily: "'Barlow',sans-serif"
        }
      }, "✓")));
    })), tab === "profile" && /*#__PURE__*/_react.default.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      className: "card",
      style: {
        padding: 20,
        textAlign: "center",
        marginBottom: 14
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        width: 56,
        height: 56,
        background: C.red,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        margin: "0 auto 10px"
      }
    }, "🏎️"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 22,
        fontWeight: 800,
        color: C.white
      }
    }, me?.name), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 11,
        color: C.muted,
        marginTop: 2
      }
    }, "Mitglied · ", me?.memberNr)), /*#__PURE__*/_react.default.createElement("div", {
      className: "card",
      style: {
        padding: 16,
        marginBottom: 12
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "Statistiken"), [["🚗", "Fahrzeuge", myVehicles.length], ["📋", "Logbuch-Einträge", Object.values(logbook).flat().length], ["🏁", "Event-Teilnahmen", myParticipations.length], ["💬", "Nachrichten", myThreads.length]].map(([icon, label, val]) => /*#__PURE__*/_react.default.createElement("div", {
      key: label,
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: `1px solid ${C.border}`
      }
    }, /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 13,
        color: C.muted
      }
    }, icon, " ", label), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: C.white
      }
    }, val)))), /*#__PURE__*/_react.default.createElement("div", {
      className: "card",
      style: {
        padding: 16,
        marginBottom: 14
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 10
      }
    }, "Milestones"), MILESTONES.map(m => {
      const done = m.check(appState);
      return /*#__PURE__*/_react.default.createElement("div", {
        key: m.id,
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "8px 0",
          borderBottom: `1px solid ${C.border}`
        }
      }, /*#__PURE__*/_react.default.createElement("div", {
        style: {
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: done ? C.green : C.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: done ? "#fff" : C.muted,
          flexShrink: 0,
          fontWeight: 700
        }
      }, done ? "✓" : ""), /*#__PURE__*/_react.default.createElement("span", {
        style: {
          fontSize: 13,
          color: done ? C.white : C.muted
        }
      }, m.label), done && /*#__PURE__*/_react.default.createElement("span", {
        style: {
          marginLeft: "auto",
          fontSize: 9,
          color: C.green,
          fontWeight: 700
        }
      }, "AKTIV"));
    })), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn ghost",
      style: {
        width: "100%"
      },
      onClick: async () => {
        const DB = window.PCN_DB;
        if (DB) await DB.auth.logout();
        setMe(null);
        setVehicles({});
        setLogbook({});
        setReminders([]);
        setParticipants({});
        setThreads({});
        setScreen("splash");
        setTab("dashboard");
      }
    }, "Abmelden"))), showAddV && /*#__PURE__*/_react.default.createElement("div", {
      className: "overlay",
      onClick: e => {
        if (e.target === e.currentTarget) setShowAddV(false);
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      className: "sheet"
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 20,
        fontWeight: 800,
        color: C.white,
        marginBottom: 14
      }
    }, "Fahrzeug hinzufügen"), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        marginBottom: 10
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        overflowX: "auto",
        marginBottom: 6
      }
    }, (addVForm.images || []).map((img, i) => /*#__PURE__*/_react.default.createElement("div", {
      key: i,
      style: {
        position: "relative",
        flexShrink: 0
      }
    }, /*#__PURE__*/_react.default.createElement("img", {
      src: img,
      alt: "",
      style: {
        width: 70,
        height: 70,
        objectFit: "cover",
        borderRadius: 8,
        border: `2px solid ${C.border}`
      }
    }), /*#__PURE__*/_react.default.createElement("button", {
      onClick: () => setAddVForm(p => ({
        ...p,
        images: p.images.filter((_, j) => j !== i)
      })),
      style: {
        position: "absolute",
        top: 2,
        right: 2,
        background: "rgba(0,0,0,.7)",
        border: "none",
        color: "#fff",
        fontSize: 10,
        width: 18,
        height: 18,
        borderRadius: "50%",
        cursor: "pointer"
      }
    }, "✕"))), /*#__PURE__*/_react.default.createElement("label", {
      style: {
        width: 70,
        height: 70,
        background: C.card,
        border: `1px dashed ${C.border}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        gap: 2
      }
    }, /*#__PURE__*/_react.default.createElement("input", {
      type: "file",
      accept: "image/*",
      style: {
        display: "none"
      },
      onChange: e => handleImageUpload(e.target.files[0], url => setAddVForm(p => ({
        ...p,
        images: [...(p.images || []), url]
      })))
    }), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 20
      }
    }, "📷"), /*#__PURE__*/_react.default.createElement("span", {
      style: {
        fontSize: 9,
        color: C.muted
      }
    }, "Foto"))), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 11,
        color: C.muted
      }
    }, "Mehrere Fotos möglich — erstes Foto = Titelbild")), [["Modell *", "modell", "Cayman GT4"], ["Kennzeichen *", "kennzeichen", "AW-PC 718"], ["Baujahr", "baujahr", "2023"], ["Farbe", "farbe", "Pythongrün"]].map(([ph, key, ex]) => /*#__PURE__*/_react.default.createElement("input", {
      key: key,
      className: "inp",
      placeholder: `${ph} (z.B. ${ex})`,
      style: {
        marginBottom: 8
      },
      value: addVForm[key] || "",
      onChange: e => setAddVForm(p => ({
        ...p,
        [key]: e.target.value
      }))
    })), /*#__PURE__*/_react.default.createElement("select", {
      className: "inp",
      value: addVForm.kraftstoff,
      onChange: e => setAddVForm(p => ({
        ...p,
        kraftstoff: e.target.value
      })),
      style: {
        marginBottom: 10
      }
    }, ["Benzin", "Diesel", "Elektro", "Hybrid"].map(k => /*#__PURE__*/_react.default.createElement("option", {
      key: k
    }, k))), /*#__PURE__*/_react.default.createElement("select", {
      className: "inp",
      value: addVForm.getriebe || "PDK",
      onChange: e => setAddVForm(p => ({
        ...p,
        getriebe: e.target.value
      })),
      style: {
        marginBottom: 8
      }
    }, ["PDK", "7-Gang PDK", "6-Gang manuell", "8-Gang Automatik", "Stufenlos"].map(k => /*#__PURE__*/_react.default.createElement("option", {
      key: k
    }, k))), /*#__PURE__*/_react.default.createElement("input", {
      className: "inp",
      placeholder: "Telefon (optional, für Direktanruf)",
      type: "tel",
      value: addVForm.phone || "",
      onChange: e => setAddVForm(p => ({
        ...p,
        phone: e.target.value
      })),
      style: {
        marginBottom: 6
      }
    }), /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontSize: 10,
        color: C.muted,
        marginBottom: 14
      }
    }, "🔒 Standardmäßig privat — Sichtbarkeit in QR-Einstellungen"), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn",
      style: {
        width: "100%"
      },
      onClick: addVehicle
    }, "Hinzufügen ✓"))), showAddRem && /*#__PURE__*/_react.default.createElement("div", {
      className: "overlay",
      onClick: e => {
        if (e.target === e.currentTarget) setShowAddRem(false);
      }
    }, /*#__PURE__*/_react.default.createElement("div", {
      className: "sheet"
    }, /*#__PURE__*/_react.default.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 20,
        fontWeight: 800,
        color: C.white,
        marginBottom: 14
      }
    }, "Erinnerung"), /*#__PURE__*/_react.default.createElement("input", {
      className: "inp",
      placeholder: "Titel *",
      style: {
        marginBottom: 8
      },
      value: remForm.title,
      onChange: e => setRemForm(p => ({
        ...p,
        title: e.target.value
      }))
    }), /*#__PURE__*/_react.default.createElement("input", {
      className: "inp",
      type: "date",
      style: {
        marginBottom: 8
      },
      value: remForm.date,
      onChange: e => setRemForm(p => ({
        ...p,
        date: e.target.value
      }))
    }), /*#__PURE__*/_react.default.createElement("select", {
      className: "inp",
      style: {
        marginBottom: 14
      },
      value: remForm.vehicleId,
      onChange: e => setRemForm(p => ({
        ...p,
        vehicleId: e.target.value
      }))
    }, /*#__PURE__*/_react.default.createElement("option", {
      value: ""
    }, "Kein Fahrzeug"), myVehicles.map(v => /*#__PURE__*/_react.default.createElement("option", {
      key: v.id,
      value: v.id
    }, v.hersteller, " ", v.modell))), /*#__PURE__*/_react.default.createElement("button", {
      className: "btn",
      style: {
        width: "100%"
      },
      onClick: async () => {
        if (!remForm.title || !remForm.date) {
          toast_("Titel und Datum angeben", "err");
          return;
        }
        const DB = window.PCN_DB;
        const {
          data: r,
          error
        } = await DB.reminders.save(me.id, {
          ...remForm,
          done: false
        });
        if (error) {
          toast_("Fehler", "err");
          return;
        }
        setReminders(prev => [...prev, r]);
        setShowAddRem(false);
        setRemForm({
          vehicleId: "",
          title: "",
          date: ""
        });
        toast_("Gespeichert ✓");
      }
    }, "Speichern ✓"))), /*#__PURE__*/_react.default.createElement("div", {
      className: "tab-bar"
    }, [["dashboard", "🏠", "Start"], ["events", "🏁", "Events"], ["messages", "💬", "Chat"], ["reminders", "🔔", "Termine"], ["profile", "👤", "Profil"]].map(([id, icon, label]) => /*#__PURE__*/_react.default.createElement("button", {
      key: id,
      className: `tab-btn ${tab === id ? "on" : ""}`,
      onClick: () => setTab(id)
    }, id === "messages" && unreadCount > 0 && /*#__PURE__*/_react.default.createElement("div", {
      className: "badge"
    }, unreadCount), /*#__PURE__*/_react.default.createElement("span", {
      className: "ico"
    }, icon), /*#__PURE__*/_react.default.createElement("span", {
      className: "lbl"
    }, label)))));
  }
});
