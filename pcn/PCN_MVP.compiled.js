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
  // PCN — Porsche Club Nürburgring · Digitale Clubplattform v2
  // Features: Fahrzeugakte · Events · QR-Code · Privacy · Logbuch · Erinnerungen · Messenger

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
    amber: "#f59e0b",
    blue: "#3b82f6"
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
    pub_events: true
  };

  // ─── QR Code (Canvas) ─────────────────────────────────────────────────────────
  function QRCodeCanvas({
    value,
    size = 140
  }) {
    const ref = (0, _react.useRef)(null);
    (0, _react.useEffect)(() => {
      if (!ref.current) return;
      const ctx = ref.current.getContext("2d");
      const s = size;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, s, s);
      // Finder patterns
      const cell = Math.floor(s / 25);
      const drawFinder = (ox, oy) => {
        [[0, 0, 7, 7, C.black], [1, 1, 5, 5, "#fff"], [2, 2, 3, 3, C.black]].forEach(([x, y, w, h, col]) => {
          ctx.fillStyle = col;
          ctx.fillRect((ox + x) * cell, (oy + y) * cell, w * cell, h * cell);
        });
      };
      drawFinder(0, 0);
      drawFinder(18, 0);
      drawFinder(0, 18);
      // Data modules (deterministic from value)
      ctx.fillStyle = C.black;
      let hash = 0;
      for (let i = 0; i < value.length; i++) hash = (hash << 5) - hash + value.charCodeAt(i) | 0;
      for (let r = 0; r < 25; r++) for (let c = 0; c < 25; c++) {
        if (r < 8 && (c < 8 || c > 16) || r > 16 && c < 8) continue;
        const bit = Math.abs(hash ^ (r * 25 + c) * 2654435761) % 3 === 0;
        if (bit) ctx.fillRect(c * cell, r * cell, cell, cell);
      }
      ctx.fillStyle = C.red;
      ctx.fillRect(10 * cell, 10 * cell, 5 * cell, 5 * cell);
    }, [value, size]);
    return /*#__PURE__*/React.createElement("canvas", {
      ref: ref,
      width: size,
      height: size,
      style: {
        borderRadius: 4,
        display: "block"
      }
    });
  }

  // ─── Club data ────────────────────────────────────────────────────────────────
  const CLUB_CODE = "PCN2026";
  const d = days => new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
  const past = days => new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const DEMO_USER = {
    id: "u1",
    name: "Max Mustermann",
    email: "max@pcn.de",
    role: "member",
    memberNr: "PCN-0847"
  };
  const DEMO_USER2 = {
    id: "u2",
    name: "Thomas Weber",
    email: "thomas@pcn.de",
    role: "member",
    memberNr: "PCN-0312"
  };
  const DEMO_USER3 = {
    id: "u3",
    name: "Anna Fischer",
    email: "anna@pcn.de",
    role: "member",
    memberNr: "PCN-0561"
  };
  const DEMO_VEHICLES = {
    "V001": {
      id: "V001",
      qarId: "QAR-R4T8W3NX",
      owner: "max@pcn.de",
      hersteller: "Porsche",
      modell: "911 Carrera 4S",
      baujahr: "2021",
      kraftstoff: "Benzin",
      getriebe: "PDK",
      farbe: "GT-Silbermetallic",
      kennzeichen: "AW-PC 911",
      fin: "WP0ZZZ99ZLS100001",
      kilometerstand: "32400",
      tuev_faelligkeit: "02/2027",
      marktwert: "138000",
      zustand: "1",
      besonderheiten: "Sport-Chrono, PASM, Sportabgasanlage, PCCB",
      image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80",
      privacy: {
        ...DEF_PRIVACY
      }
    },
    "V002": {
      id: "V002",
      qarId: "QAR-K9P2M7RW",
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
      privacy: {
        ...DEF_PRIVACY
      }
    },
    "V003": {
      id: "V003",
      qarId: "QAR-T7M3N9PX",
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
      date: d(12),
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
      date: d(22),
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
      date: d(41),
      location: "Nürburgring",
      category: "Rennsport",
      maxParticipants: 200,
      entryFee: "Eintritt ab € 29",
      description: "Gemeinsamer Besuch. PCN-Treffpunkt am Historischen Fahrerlager.",
      classes: ["Besucher", "Aktive Fahrer"]
    },
    "E004": {
      id: "E004",
      name: "PCN Clubabend",
      subtitle: "CHRSN x PCN im Kesselchen",
      date: d(51),
      location: "Historisches Fahrerlager",
      category: "Clubabend",
      maxParticipants: 80,
      entryFee: "kostenlos",
      description: "Monatlicher Clubabend. Austausch, Neuigkeiten, Gemeinschaft.",
      classes: ["Alle Mitglieder"]
    }
  };
  const DEMO_LOGBOOK = {
    "V001": [{
      id: "L1",
      date: past(60),
      type: "Ölwechsel",
      km: "31200",
      notes: "Mobil 1 5W-50",
      workshop: "Porsche Zentrum Koblenz"
    }, {
      id: "L2",
      date: past(120),
      type: "Inspektion",
      km: "27800",
      notes: "Großer Service — Bremsflüssigkeit, Luftfilter",
      workshop: "Porsche Zentrum Koblenz"
    }, {
      id: "L3",
      date: past(200),
      type: "Reifenwechsel",
      km: "24100",
      notes: "Pirelli P Zero Sommer",
      workshop: "Eigene Werkstatt"
    }],
    "V002": [{
      id: "L4",
      date: past(90),
      type: "Inspektion",
      km: "18200",
      notes: "Jahresinspektion",
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
  const EVENT_HISTORY = [{
    id: "H1",
    vehicleId: "V001",
    eventId: "E_HIST1",
    eventName: "PCN TrackDay 2025",
    date: past(280),
    startNr: "05",
    class: "Sport",
    result: "Finisher",
    note: "Bestzeit 9:43 min Nordschleife"
  }, {
    id: "H2",
    vehicleId: "V001",
    eventId: "E_HIST2",
    eventName: "After Work Classics Sep 2025",
    date: past(310),
    startNr: "11",
    class: "Alle Modelle",
    result: "Teilnahme",
    note: ""
  }, {
    id: "H3",
    vehicleId: "V003",
    eventId: "E_HIST1",
    eventName: "PCN TrackDay 2025",
    date: past(280),
    startNr: "02",
    class: "Race",
    result: "Schnellste Zeit",
    note: "7:58 min — neuer Clubrekord"
  }];

  // Demo threads (anonymous messenger)
  const DEMO_THREADS = {
    "T001": {
      id: "T001",
      participants: ["u1", "u2"],
      vehicleId: "V003",
      vehicleName: "Porsche 992 GT3 (V003)",
      messages: [{
        id: "M1",
        from: "u2",
        text: "Hallo! Ich habe deinen GT3 auf dem TrackDay bewundert — welche Reifengröße fährst du hinten?",
        ts: "Gestern 18:32",
        read: false
      }, {
        id: "M2",
        from: "system",
        text: "Kontakt über QAR-ID: QAR-T7M3N9PX",
        ts: "Gestern 18:31",
        isSystem: true
      }],
      anonymous: true
    }
  };

  // ─── Milestone System ─────────────────────────────────────────────────────────
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
    desc: "Nordschleife-Bestzeiten und Sektorzeiten tracken"
  }, {
    id: "fleet",
    icon: "📊",
    label: "Fuhrpark-Analyse",
    milestone: "2 Fahrzeuge",
    desc: "Kosten/km und Wertverlauf über alle Fahrzeuge"
  }, {
    id: "workshop",
    icon: "🔧",
    label: "Werkstatt-Zugang",
    milestone: "Partnerschaft aktiv",
    desc: "PCN-Partnerwerkstätten greifen direkt auf die Akte zu"
  }, {
    id: "insurer",
    icon: "🛡️",
    label: "Versicherer-Zugang",
    milestone: "Club-Partner",
    desc: "Allianz Classic sieht deine vollständige Dokumentation"
  }, {
    id: "token",
    icon: "🪙",
    label: "Digitaler Fahrzeugpass",
    milestone: "Beta-Programm",
    desc: "Blockchain-Eigentumsnachweis für Wettbewerbe & Verkauf"
  }];

  // ─── MAIN APP ─────────────────────────────────────────────────────────────────
  function PCN() {
    const [screen, setScreen] = (0, _react.useState)("splash");
    const [tab, setTab] = (0, _react.useState)("dashboard");
    const [me, setMe] = (0, _react.useState)(null);
    const [allUsers, setAllUsers] = (0, _react.useState)({
      u1: DEMO_USER,
      u2: DEMO_USER2,
      u3: DEMO_USER3
    });
    const [vehicles, setVehicles] = (0, _react.useState)({});
    const [logbook, setLogbook] = (0, _react.useState)({});
    const [reminders, setReminders] = (0, _react.useState)([]);
    const [participants, setParticipants] = (0, _react.useState)({});
    const [events] = (0, _react.useState)(DEMO_EVENTS);
    const [eventHistory] = (0, _react.useState)(EVENT_HISTORY);
    const [threads, setThreads] = (0, _react.useState)({});
    const [activeThread, setActiveThread] = (0, _react.useState)(null);
    const [msgInput, setMsgInput] = (0, _react.useState)("");
    const [viewV, setViewV] = (0, _react.useState)(null);
    const [viewEv, setViewEv] = (0, _react.useState)(null);
    const [publicV, setPublicV] = (0, _react.useState)(null); // QR public view
    const [loginForm, setLoginForm] = (0, _react.useState)({
      code: "",
      email: "",
      name: "",
      mode: "register"
    });
    const [toast, setToast] = (0, _react.useState)(null);
    const [showAddV, setShowAddV] = (0, _react.useState)(false);
    const [showAddLog, setShowAddLog] = (0, _react.useState)(null);
    const [showAddRem, setShowAddRem] = (0, _react.useState)(false);
    const [showPrivacy, setShowPrivacy] = (0, _react.useState)(null); // vehicleId
    const [addVForm, setAddVForm] = (0, _react.useState)({
      hersteller: "Porsche",
      modell: "",
      baujahr: "",
      kennzeichen: "",
      farbe: "",
      kraftstoff: "Benzin",
      getriebe: "",
      image: ""
    });
    const [imgUploading, setImgUploading] = (0, _react.useState)(false);
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
    const msgEndRef = (0, _react.useRef)(null);
    const videoRef = (0, _react.useRef)(null);
    const canvasRef = (0, _react.useRef)(null);
    const [scannerOpen, setScannerOpen] = (0, _react.useState)(false);
    const [scannerError, setScannerError] = (0, _react.useState)(null);
    const [scannerStatus, setScannerStatus] = (0, _react.useState)("idle"); // idle|loading|scanning|found

    const toast_ = (msg, type = "ok") => {
      setToast({
        msg,
        type
      });
      setTimeout(() => setToast(null), 3500);
    };

    // ── Image upload — converts to base64 dataURL ─────────────────────────────
    const handleImageUpload = (file, onDone) => {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast_("Bild zu groß — max. 5MB", "err");
        return;
      }
      setImgUploading(true);
      const reader = new FileReader();
      reader.onload = e => {
        // Resize to max 800px wide via canvas
        const img = new Image();
        img.onload = () => {
          const MAX = 800;
          const scale = Math.min(1, MAX / img.width, MAX / img.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          onDone(dataUrl);
          setImgUploading(false);
          toast_("Bild geladen ✓");
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    // ── Update vehicle image ──────────────────────────────────────────────────
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
      if (DB) await DB.vehicles.save(updated);
    };

    // ── DB refresh — loads all data for a user from storage layer ──────────────
    const refreshAll = async user => {
      if (!user) return;
      const DB = window.PCN_DB;
      const [vRes, remRes, evRes, thRes] = await Promise.all([DB.vehicles.list(user.id || user.email), DB.reminders.list(user.id), DB.events.list(), DB.threads.list(user.id)]);
      // Vehicles
      const vMap = {};
      (vRes.data || []).forEach(v => vMap[v.id] = v);
      setVehicles(vMap);
      // Logbook (load per vehicle)
      const lMap = {};
      await Promise.all((vRes.data || []).map(async v => {
        const r = await DB.logbook.list(v.id);
        lMap[v.id] = r.data || [];
      }));
      setLogbook(lMap);
      // Reminders
      setReminders(remRes.data || []);
      // Events (keep demo events always)
      // Participants (load per event)
      const pMap = {};
      await Promise.all((evRes.data || []).map(async ev => {
        const r = await DB.events.participants(ev.id);
        pMap[ev.id] = r.data || [];
      }));
      setParticipants(pMap);
      // Threads
      const tMap = {};
      (thRes.data || []).forEach(t => tMap[t.id] = t);
      setThreads(tMap);
      // Set user
      setMe(user);
    };

    // ── Session restore + QR URL param handling ───────────────────────────────
    (0, _react.useEffect)(() => {
      (async () => {
        // Check for QR-Code URL param: ?v=QAR-XXXXXXXX
        const urlParams = new URLSearchParams(window.location.search);
        const qarId = urlParams.get('v');
        if (qarId && qarId.match(/^QAR-[A-Z2-9]{8}$/)) {
          // Find vehicle by QAR-ID (public lookup, no auth needed)
          const v = Object.values(DEMO_VEHICLES).find(v => v.qarId === qarId);
          if (v) {
            setPublicV({
              ...v,
              privacy: {
                ...DEF_PRIVACY,
                ...(v.privacy || {})
              }
            });
            setScreen("public");
            return;
          }
        }
        // Normal session restore
        const DB = window.PCN_DB;
        if (!DB) {
          return;
        }
        const {
          data: session
        } = await DB.auth.session();
        if (session) {
          await refreshAll(session);
          setScreen("app");
        }
      })();
    }, []);

    // ── QR Scanner ──────────────────────────────────────────────────────────────
    const openScanner = () => {
      setScannerOpen(true);
      setScannerError(null);
      setScannerStatus("loading");
    };
    const closeScanner = () => {
      setScannerOpen(false);
      setScannerStatus("idle");
      setScannerError(null);
      if (window.QRScannerModule) window.QRScannerModule.stop();
    };
    const handleScanResult = data => {
      // Parse QAR-ID from URL: https://.../pcn/#/v/QAR-XXXXXXXX or plain QAR-XXXXXXXX
      const match = data.match(/QAR-[A-Z2-9]{8}/);
      if (match) {
        const qarId = match[0];
        const v = Object.values(vehicles).find(veh => veh.qarId === qarId);
        setScannerStatus("found");
        if (window.QRScannerModule) window.QRScannerModule.stop();
        setTimeout(() => {
          closeScanner();
          if (v) {
            setPublicV({
              ...v,
              privacy: v.privacy || DEF_PRIVACY
            });
            setScreen("public");
          } else {
            toast_("Fahrzeug nicht in dieser Demo bekannt: " + qarId, "err");
          }
        }, 600);
      }
    };
    const handleScanError = e => {
      setScannerError(e.message && e.message.includes("jsQR") ? "HTTPS erforderlich für den Scanner. Bitte öffne: https://gpk2026.github.io/qar-gallery/pcn/ — oder warte bis qar.gallery HTTPS-Zertifikat erhält (heute Nacht)." : e.name === "NotAllowedError" ? "Kamera-Zugriff verweigert. Einstellungen → Safari → Kamera → Erlauben." : e.name === "NotFoundError" ? "Keine Kamera gefunden." : "Kamera-Fehler: " + e.message);
      setScannerStatus("error");
    };
    (0, _react.useEffect)(() => {
      if (scannerOpen && scannerStatus === "loading" && videoRef.current && canvasRef.current) {
        const loadScript = () => new Promise((res, rej) => {
          // jsQR is bundled in index.html — should always be available
          if (window.jsQR) {
            res();
            return;
          }
          // Fallback: try loading from same origin
          const s = document.createElement("script");
          s.src = "jsQR.js";
          s.onload = () => window.jsQR ? res() : rej(new Error("jsQR nicht verfügbar"));
          s.onerror = () => rej(new Error("jsQR konnte nicht geladen werden"));
          document.head.appendChild(s);
        });
        loadScript().then(() => {
          setScannerStatus("scanning");
          const video = videoRef.current;
          const canvas = canvasRef.current;
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment"
            }
          }).then(stream => {
            video.srcObject = stream;
            video.setAttribute("playsinline", true);
            video.play();
            const ctx = canvas.getContext("2d");
            let last = "";
            let lastT = 0;
            const scan = () => {
              if (!scannerOpen) return;
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
          }).catch(handleScanError);
        }).catch(() => setScannerError("jsQR konnte nicht geladen werden"));
      }
      return () => {
        if (!scannerOpen && window.QRScannerModule) window.QRScannerModule.stop();
      };
    }, [scannerOpen, scannerStatus]);

    // Derived
    const myVehicles = Object.values(vehicles).filter(v => v.owner === me?.email);
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
    (0, _react.useEffect)(() => {
      msgEndRef.current?.scrollIntoView({
        behavior: "smooth"
      });
    }, [activeThread, threads]);
    const loadDemo = async () => {
      // Seed demo data into localStorage so DB layer persists it
      const stored = JSON.parse(localStorage.getItem("pcn_v1") || "{}");
      stored.users = stored.users || {};
      stored.users[DEMO_USER.email] = DEMO_USER;
      stored.session = DEMO_USER;
      stored.vehicles = DEMO_VEHICLES;
      stored.logbook = DEMO_LOGBOOK;
      stored.events = DEMO_EVENTS;
      stored.participants = DEMO_PARTICIPANTS;
      stored.threads = DEMO_THREADS;
      stored.reminders = {
        [DEMO_USER.id]: [{
          id: "R1",
          vehicleId: "V001",
          title: "PCN TrackDay — Fahrzeug vorbereiten",
          date: d(10),
          done: false
        }, {
          id: "R2",
          vehicleId: "V002",
          title: "Sommerreifenwechsel",
          date: d(4),
          done: false
        }, {
          id: "R3",
          vehicleId: "V001",
          title: "TÜV Termin vereinbaren",
          date: d(45),
          done: false
        }]
      };
      stored.eventHistory = {
        "V001": EVENT_HISTORY.filter(h => h.vehicleId === "V001"),
        "V002": [],
        "V003": EVENT_HISTORY.filter(h => h.vehicleId === "V003")
      };
      localStorage.setItem("pcn_v1", JSON.stringify(stored));
      // Load from DB layer
      await refreshAll(DEMO_USER);
      setAllUsers({
        u1: DEMO_USER,
        u2: DEMO_USER2,
        u3: DEMO_USER3
      });
      setScreen("app");
      setTab("dashboard");
      toast_("Willkommen, Max! 🏁");
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
      toast_(`Angemeldet — Startnr. #${p.startNr} ✓`);
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
        toast_("Fehler: " + error, "err");
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
    const addVehicle = async () => {
      if (!addVForm.modell || !addVForm.kennzeichen) return toast_("Modell und Kennzeichen angeben", "err");
      const DB = window.PCN_DB;
      const v = {
        qarId: genQARId(),
        userId: me.id,
        owner: me.email,
        ...addVForm,
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
        getriebe: ""
      });
      toast_("Fahrzeug hinzugefügt ✓");
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
      const DB = window.PCN_DB;
      await DB.vehicles.save(updated); // persist
    };
    const sendMsg = async threadId => {
      if (!msgInput.trim()) return;
      const DB = window.PCN_DB;
      const {
        data: msg,
        error
      } = await DB.threads.send(threadId, me.id, msgInput.trim());
      if (error) {
        toast_("Fehler: " + error, "err");
        return;
      }
      setThreads(prev => ({
        ...prev,
        [threadId]: {
          ...prev[threadId],
          messages: [...(prev[threadId].messages || []), msg]
        }
      }));
      setMsgInput("");
    };
    const startContact = async vehicleId => {
      const v = vehicles[vehicleId];
      if (!v || v.owner === me.email) return;
      const ownerId = Object.values(allUsers).find(u => u.email === v.owner)?.id || v.userId;
      if (!ownerId) {
        toast_("Besitzer nicht gefunden", "err");
        return;
      }
      const existing = Object.values(threads).find(t => t.vehicleId === vehicleId && t.participants.includes(me.id));
      if (existing) {
        setActiveThread(existing.id);
        setTab("messages");
        setScreen("app");
        return;
      }
      const DB = window.PCN_DB;
      const {
        data: t,
        error
      } = await DB.threads.create([me.id, ownerId], vehicleId, `${v.hersteller} ${v.modell}`);
      if (error) {
        toast_("Fehler: " + error, "err");
        return;
      }
      // Add system message
      await DB.threads.send(t.id, "system", `Kontakt über QAR-ID: ${v.qarId}`);
      const updated = {
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
        [t.id]: updated
      }));
      setActiveThread(t.id);
      setTab("messages");
      setScreen("app");
      toast_("Anonyme Nachricht gestartet 🔒");
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
    ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:99px}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .btn{background:${C.red};color:#fff;border:none;border-radius:9px;padding:12px 18px;font-weight:700;font-size:14px;cursor:pointer;font-family:'Barlow',sans-serif;transition:all .15s}
    .btn:active{transform:scale(.97)}
    .btn.ghost{background:transparent;color:${C.white};border:1px solid ${C.border}}
    .btn.ghost:active{border-color:${C.red};color:${C.red}}
    .btn.sm{padding:7px 13px;font-size:12px}
    .inp{background:${C.card};border:1px solid ${C.border};border-radius:9px;padding:12px 14px;color:${C.white};font-size:16px;width:100%;transition:border-color .15s;font-family:'Barlow',sans-serif}
    .inp:focus{border-color:${C.red}}
    .toast{position:fixed;bottom:80px;left:14px;right:14px;z-index:999;background:${C.dark};border:1px solid #333;border-radius:12px;padding:13px 16px;font-size:13px;font-weight:600;animation:slideUp .2s;box-shadow:0 8px 24px rgba(0,0,0,.8)}
    .toast.ok{border-color:${C.red}44;color:${C.white}}
    .toast.err{border-color:#ef444466;color:#ef4444}
    .tab-bar{position:fixed;bottom:0;left:0;right:0;background:${C.dark};border-top:1px solid ${C.border};display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,0)}
    .tab-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px 2px;border:none;background:transparent;cursor:pointer;gap:2px;font-family:'Barlow',sans-serif;color:${C.muted};transition:color .15s;position:relative}
    .tab-btn.on{color:${C.red}}
    .tab-btn .ico{font-size:21px;line-height:1}
    .tab-btn .lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .badge{position:absolute;top:6px;right:calc(50% - 16px);background:${C.red};color:#fff;border-radius:99px;padding:1px 5px;font-size:9px;font-weight:800;min-width:16px;text-align:center}
    .card{background:${C.card};border:1px solid ${C.border};border-radius:14px}
    .p16{padding:16px}
    .sec{font-size:10px;font-weight:800;color:${C.muted};text-transform:uppercase;letter-spacing:2px;margin-bottom:10px}
    .tog{width:44px;height:24px;border-radius:99px;border:none;cursor:pointer;transition:background .2s;flex-shrink:0;position:relative}
    .tog::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:99px;background:#fff;transition:transform .2s}
    .tog.on{background:${C.red}} .tog.on::after{transform:translateX(20px)}
    .tog.off{background:${C.border}}
    .row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid ${C.border}}
    .row:last-child{border-bottom:none}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:200;display:flex;align-items:flex-end}
    .sheet{background:${C.dark};border-radius:20px 20px 0 0;width:100%;border-top:1px solid ${C.border};padding:24px 16px;animation:slideUp .2s;max-height:88vh;overflow-y:auto}
    .chip{display:inline-flex;align-items:center;gap:4px;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
    @keyframes scanline{0%{top:4px}50%{top:calc(100% - 6px)}100%{top:4px}}
  `;

    // ══════════════════════════════════════════════════════════════════════════
    // SPLASH
    // ══════════════════════════════════════════════════════════════════════════
    if (screen === "splash") return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        background: C.black,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px 44px"
      }
    }, /*#__PURE__*/React.createElement("style", null, CSS), toast && /*#__PURE__*/React.createElement("div", {
      className: `toast ${toast.type}`
    }, toast.msg), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        textAlign: "center",
        paddingTop: 64
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: LOGO_URL,
      alt: "PCN",
      onError: e => e.target.style.display = "none",
      style: {
        width: 200,
        maxWidth: "65%",
        objectFit: "contain",
        marginBottom: 20,
        filter: "brightness(1.1)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 2,
        background: C.red,
        margin: "0 auto 18px"
      }
    }), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 30,
        fontWeight: 900,
        color: C.white,
        lineHeight: 1,
        marginBottom: 8
      }
    }, "DIGITALE", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.red
      }
    }, "CLUBPLATTFORM")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 12,
        color: C.muted,
        marginTop: 8,
        lineHeight: 1.7
      }
    }, "Fahrzeugakte · Events · QR-Code", /*#__PURE__*/React.createElement("br", null), "für alle PCN-Mitglieder")), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 360
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 6,
        fontSize: 12,
        color: C.muted
      }
    }, loginForm.mode === "register" ? "Bereits Mitglied?" : "Noch kein Account?", /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.red,
        fontWeight: 700,
        marginLeft: 6,
        cursor: "pointer"
      },
      onClick: () => setLoginForm(p => ({
        ...p,
        mode: p.mode === "register" ? "login" : "register"
      }))
    }, loginForm.mode === "register" ? "→ Anmelden" : "→ Registrieren")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        background: "#111",
        borderRadius: 10,
        padding: 3,
        marginBottom: 14
      }
    }, [["register", "Registrieren"], ["login", "Anmelden"]].map(([m, label]) => /*#__PURE__*/React.createElement("button", {
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
    }, label))), loginForm.mode === "register" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
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
    }), loginForm.code.toUpperCase() === CLUB_CODE && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
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
    }), /*#__PURE__*/React.createElement("input", {
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
    })), loginForm.code.toUpperCase() === CLUB_CODE && loginForm.name && loginForm.email ? /*#__PURE__*/React.createElement("button", {
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
        const {
          data: evs
        } = await DB.events.list();
        if (!evs || evs.length === 0) {
          Object.values(DEMO_EVENTS).forEach(e => {
            const all = JSON.parse(localStorage.getItem("pcn_v1") || "{}");
            all.events = all.events || {};
            all.events[e.id] = e;
            localStorage.setItem("pcn_v1", JSON.stringify(all));
          });
        }
        setMe(u);
        setAllUsers(p => ({
          ...p,
          [u.id]: u
        }));
        setScreen("app");
        toast_("Willkommen, " + u.name + "! 🏁");
      }
    }, "Konto erstellen →") : /*#__PURE__*/React.createElement("button", {
      className: "btn",
      style: {
        width: "100%",
        opacity: .4
      },
      disabled: true
    }, loginForm.code.length === 0 ? "Club-Code eingeben" : loginForm.code.toUpperCase() !== CLUB_CODE ? "Falscher Club-Code" : "Name & E-Mail eingeben")), loginForm.mode === "login" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
      className: "inp",
      placeholder: "E-Mail",
      type: "email",
      style: {
        marginBottom: 8
      },
      value: loginForm.email,
      onChange: e => setLoginForm(p => ({
        ...p,
        email: e.target.value
      }))
    }), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      style: {
        width: "100%",
        opacity: loginForm.email ? 1 : .4
      },
      disabled: !loginForm.email,
      onClick: async () => {
        if (!loginForm.email) return;
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
    }, "Anmelden →"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginTop: 10,
        fontSize: 11,
        color: C.muted
      }
    }, "Kein Passwort nötig — nur deine Club-E-Mail")), /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      style: {
        width: "100%",
        marginTop: 10,
        fontSize: 12
      },
      onClick: loadDemo
    }, "Demo ansehen"), /*#__PURE__*/React.createElement("p", {
      style: {
        textAlign: "center",
        fontSize: 10,
        color: "#333",
        marginTop: 12
      }
    }, "Powered by ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.gold
      }
    }, "QAR.Gallery"))));

    // ══════════════════════════════════════════════════════════════════════════
    // PUBLIC QR VIEW
    // ══════════════════════════════════════════════════════════════════════════
    if (screen === "public" && publicV) {
      const v = publicV;
      const priv = v.privacy || DEF_PRIVACY;
      const vHist = eventHistory.filter(h => h.vehicleId === v.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const isH = v.baujahr && new Date().getFullYear() - parseInt(v.baujahr) >= 30;
      const kz = isH ? (v.kennzeichen || "").replace(/\s*H\s*$/, "").trim() + " H" : v.kennzeichen || "";
      const vParts = Object.values(participants).flat().filter(p => p.vehicleId === v.id);
      const nextEvent = vParts.map(p => ({
        ...p,
        ev: events[p.eventId]
      })).filter(p => p.ev && daysUntil(p.ev.date) > 0).sort((a, b) => daysUntil(a.ev.date) - daysUntil(b.ev.date))[0];
      return /*#__PURE__*/React.createElement("div", {
        style: {
          minHeight: "100vh",
          background: C.black
        }
      }, /*#__PURE__*/React.createElement("style", null, CSS), /*#__PURE__*/React.createElement("div", {
        style: {
          background: C.dark,
          borderBottom: `1px solid ${C.border}`,
          padding: "8px 16px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between"
        }
      }, /*#__PURE__*/React.createElement("img", {
        src: LOGO_URL,
        alt: "PCN",
        onError: e => e.target.style.display = "none",
        style: {
          height: 28,
          objectFit: "contain"
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, "Digitale Fahrzeugakte")), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 220,
          position: "relative",
          overflow: "hidden",
          background: "#111"
        }
      }, v.image ? /*#__PURE__*/React.createElement("img", {
        src: v.image,
        alt: "",
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover"
        },
        onError: e => e.target.style.display = "none"
      }) : isOwn && /*#__PURE__*/React.createElement("label", {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          height: "100%",
          color: C.muted
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "file",
        accept: "image/*",
        capture: "environment",
        style: {
          display: "none"
        },
        onChange: e => handleImageUpload(e.target.files[0], url => updateVehicleImage(v.id, url))
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 36
        }
      }, "📷"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 600
        }
      }, "Foto hinzufügen")), /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom,transparent 30%,#000000f0)"
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          bottom: 16,
          left: 16,
          right: 16
        }
      }, /*#__PURE__*/React.createElement("h1", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 26,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1,
          marginBottom: 8
        }
      }, v.hersteller, " ", v.modell), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          background: "#fff",
          border: "2px solid #222",
          borderRadius: 5,
          padding: "3px 10px"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14,
          fontWeight: 800,
          color: "#111",
          letterSpacing: 2,
          fontFamily: "Arial,sans-serif"
        }
      }, kz)))), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "16px",
          maxWidth: 520,
          margin: "0 auto"
        }
      }, nextEvent && priv.pub_events && /*#__PURE__*/React.createElement("div", {
        style: {
          background: `${C.red}11`,
          border: `1px solid ${C.red}33`,
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: C.red,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 3
        }
      }, "🏁 Nächste Veranstaltung — in ", daysUntil(nextEvent.ev.date), " Tagen"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: C.white
        }
      }, nextEvent.ev.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginTop: 2
        }
      }, "Startnr. ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: C.gold,
          fontWeight: 700
        }
      }, "#", nextEvent.startNr), " · ", nextEvent.class)), /*#__PURE__*/React.createElement("div", {
        className: "card p16",
        style: {
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "sec"
      }, "Fahrzeugdaten"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10
        }
      }, [["Baujahr", "baujahr"], ["Kraftstoff", "kraftstoff"], ["Getriebe", "getriebe"], ["Farbe", "farbe"], ["Kilometerstand", "kilometerstand"], ["TÜV", "tuev_faelligkeit"], ["Zustand", "zustand"]].filter(([, k]) => priv[k] !== false && v[k]).map(([label, key]) => /*#__PURE__*/React.createElement("div", {
        key: key
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }
      }, label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 600,
          color: C.white,
          marginTop: 2
        }
      }, key === "kilometerstand" ? parseInt(v[key]).toLocaleString("de-DE") + " km" : key === "zustand" ? ["", "Sehr gut", "Gut", "Befriedigend", "Ausreichend", "Mangelhaft"][parseInt(v[key])] || v[key] : v[key])))), v.besonderheiten && /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${C.border}`,
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.6
        }
      }, "ℹ️ ", v.besonderheiten)), priv.pub_events && vHist.length > 0 && /*#__PURE__*/React.createElement("div", {
        className: "card p16",
        style: {
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "sec"
      }, "Veranstaltungshistorie"), vHist.map(h => /*#__PURE__*/React.createElement("div", {
        key: h.id,
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "8px 0",
          borderBottom: `1px solid ${C.border}`
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          background: `${C.red}22`,
          border: `1px solid ${C.red}44`,
          borderRadius: 6,
          padding: "3px 8px",
          fontWeight: 800,
          fontSize: 13,
          color: C.red,
          flexShrink: 0
        }
      }, "#", h.startNr), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: C.white,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, h.eventName), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, fmtDate(h.date), " · ", h.class), h.note && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: C.gold,
          marginTop: 1
        }
      }, h.note)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: h.result === "Teilnahme" ? C.muted : C.gold,
          flexShrink: 0
        }
      }, h.result)))), me && v.owner !== me.email && /*#__PURE__*/React.createElement("button", {
        className: "btn ghost",
        style: {
          width: "100%",
          marginBottom: 12
        },
        onClick: () => startContact(v.id)
      }, "💬 Anonym kontaktieren"), /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "center",
          paddingTop: 12,
          borderTop: `1px solid ${C.border}`
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: C.border,
          letterSpacing: 2,
          marginBottom: 4
        }
      }, "VERIFIZIERT DURCH QAR.GALLERY"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: "monospace",
          fontSize: 11,
          color: "#333"
        }
      }, v.qarId)), me && /*#__PURE__*/React.createElement("button", {
        className: "btn sm ghost",
        style: {
          width: "100%",
          marginTop: 12
        },
        onClick: () => setScreen("app")
      }, "← Zurück zur App")));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VEHICLE DETAIL
    // ══════════════════════════════════════════════════════════════════════════
    if (screen === "vehicle" && viewV) {
      const v = viewV;
      const vLog = logbook[v.id] || [];
      const vParts = Object.values(participants).flat().filter(p => p.vehicleId === v.id);
      const vHist = eventHistory.filter(h => h.vehicleId === v.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const isOwn = v.owner === me?.email;
      const tuev = v.tuev_faelligkeit;
      const tuevParts = tuev ? tuev.split("/") : null;
      const tuevDate = tuevParts ? new Date(parseInt(tuevParts[1]), parseInt(tuevParts[0]) - 1, 1) : null;
      const tuevDays = tuevDate ? Math.ceil((tuevDate - new Date()) / 86400000) : null;
      const tuevColor = !tuevDays ? C.muted : tuevDays < 0 ? C.red : tuevDays < 90 ? C.amber : C.green;
      const isH = v.baujahr && new Date().getFullYear() - parseInt(v.baujahr) >= 30;
      const kz = isH ? (v.kennzeichen || "").replace(/\s*H\s*$/, "").trim() + " H" : v.kennzeichen || "";
      const priv = v.privacy || DEF_PRIVACY;
      return /*#__PURE__*/React.createElement("div", {
        style: {
          minHeight: "100vh",
          background: C.black,
          paddingBottom: 80,
          animation: "fadeIn .2s"
        }
      }, /*#__PURE__*/React.createElement("style", null, CSS), toast && /*#__PURE__*/React.createElement("div", {
        className: `toast ${toast.type}`
      }, toast.msg), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 220,
          position: "relative",
          overflow: "hidden",
          background: "#111"
        }
      }, v.image && /*#__PURE__*/React.createElement("img", {
        src: v.image,
        alt: "",
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover"
        },
        onError: e => e.target.style.display = "none"
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom,rgba(0,0,0,.3) 0%,#000000ee 100%)"
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          top: 14,
          left: 14,
          display: "flex",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setScreen("app"),
        style: {
          background: "rgba(0,0,0,.6)",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "7px 12px",
          color: C.white,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700
        }
      }, "← Zurück")), /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          top: 14,
          right: 14,
          display: "flex",
          gap: 8
        }
      }, isOwn && /*#__PURE__*/React.createElement("button", {
        onClick: () => setShowPrivacy(v.id),
        style: {
          background: "rgba(0,0,0,.6)",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "7px 12px",
          color: C.white,
          cursor: "pointer",
          fontSize: 12
        }
      }, "🔒 QR"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          setPublicV({
            ...v,
            privacy: priv
          });
          setScreen("public");
        },
        style: {
          background: "rgba(0,0,0,.6)",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "7px 12px",
          color: C.white,
          cursor: "pointer",
          fontSize: 12
        }
      }, "👁 Vorschau"))), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "16px",
          maxWidth: 520,
          margin: "0 auto"
        }
      }, /*#__PURE__*/React.createElement("h1", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 26,
          fontWeight: 900,
          color: C.white,
          lineHeight: 1,
          marginBottom: 8
        }
      }, v.hersteller, " ", v.modell), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          background: "#fff",
          border: "2px solid #222",
          borderRadius: 5,
          padding: "3px 10px"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14,
          fontWeight: 800,
          color: "#111",
          letterSpacing: 2,
          fontFamily: "Arial,sans-serif"
        }
      }, kz)), isOwn && /*#__PURE__*/React.createElement("label", {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: 12,
          color: C.muted,
          fontFamily: "'Barlow',sans-serif"
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "file",
        accept: "image/*",
        capture: "environment",
        style: {
          display: "none"
        },
        onChange: e => handleImageUpload(e.target.files[0], url => updateVehicleImage(v.id, url))
      }), imgUploading ? "⏳ Lädt…" : "📷 Foto")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 16
        }
      }, [[tuev || "–", "TÜV", tuevColor], [parseInt(v.kilometerstand || 0).toLocaleString("de-DE") + " km", "Stand", C.muted], [["", "Sehr gut", "Gut", "Befriend.", "Ausreichend", "Mangelhaft"][parseInt(v.zustand)] || "–", "Zustand", C.gold]].map(([val, label, color], i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "10px 8px",
          textAlign: "center"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color,
          marginBottom: 2
        }
      }, val), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: .5
        }
      }, label)))), /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "sec",
        style: {
          margin: 0
        }
      }, "📋 Service-Logbuch (", vLog.length, ")"), isOwn && /*#__PURE__*/React.createElement("button", {
        className: "btn sm ghost",
        onClick: () => setShowAddLog(v.id)
      }, "+ Eintrag")), vLog.length === 0 ? /*#__PURE__*/React.createElement("div", {
        style: {
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "20px",
          textAlign: "center",
          color: C.muted,
          fontSize: 12
        }
      }, "Noch leer — 3 Einträge schalten KI-Marktwert frei") : vLog.slice().reverse().map(e => /*#__PURE__*/React.createElement("div", {
        key: e.id,
        style: {
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "11px 14px",
          marginBottom: 6
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 13,
          color: C.white
        }
      }, e.type), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, fmtDate(e.date))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, e.km ? parseInt(e.km).toLocaleString("de-DE") + " km" : "", e.workshop ? " · " + e.workshop : ""), e.notes && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#555",
          marginTop: 3
        }
      }, e.notes)))), (vParts.length > 0 || vHist.length > 0) && /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "sec"
      }, "🏁 Veranstaltungen"), vParts.map(p => {
        const ev = events[p.eventId];
        if (!ev) return null;
        return /*#__PURE__*/React.createElement("div", {
          key: p.id,
          style: {
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "11px 14px",
            marginBottom: 6,
            display: "flex",
            gap: 10,
            alignItems: "center"
          }
        }, /*#__PURE__*/React.createElement("div", {
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
        }, "#", p.startNr), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontWeight: 600,
            fontSize: 13,
            color: C.white
          }
        }, ev.name), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: C.muted
          }
        }, fmtDate(ev.date), " · ", p.class)), /*#__PURE__*/React.createElement("div", {
          style: {
            marginLeft: "auto",
            fontSize: 10,
            color: C.amber,
            fontWeight: 600
          }
        }, "in ", daysUntil(ev.date), " T."));
      }), vHist.map(h => /*#__PURE__*/React.createElement("div", {
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
          opacity: .8
        }
      }, /*#__PURE__*/React.createElement("div", {
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
      }, "#", h.startNr), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 600,
          fontSize: 13,
          color: C.white
        }
      }, h.eventName), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, fmtDate(h.date), h.note ? " · " + h.note : "")), /*#__PURE__*/React.createElement("div", {
        style: {
          marginLeft: "auto",
          fontSize: 10,
          color: h.result === "Teilnahme" ? C.muted : C.gold,
          fontWeight: 700
        }
      }, h.result)))), /*#__PURE__*/React.createElement("div", {
        className: "card p16"
      }, /*#__PURE__*/React.createElement("div", {
        className: "sec"
      }, "📱 QR-Code & Fahrzeug-ID"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 14,
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("div", {
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
        }
      }, /*#__PURE__*/React.createElement(QRCodeCanvas, {
        value: `https://gpk2026.github.io/qar-gallery/pcn/#/v/${v.qarId}`,
        size: 90
      })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted,
          marginBottom: 3
        }
      }, "QAR-ID (öffentlich)"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: "monospace",
          fontSize: 13,
          fontWeight: 700,
          color: C.white,
          letterSpacing: 1
        }
      }, v.qarId), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted,
          marginTop: 6
        }
      }, "FIN niemals öffentlich sichtbar"), /*#__PURE__*/React.createElement("button", {
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
        }
      }, "Öffentliche Seite →")))), !isOwn && me && /*#__PURE__*/React.createElement("button", {
        className: "btn ghost",
        style: {
          width: "100%",
          marginTop: 12
        },
        onClick: () => startContact(v.id)
      }, "💬 Besitzer anonym kontaktieren")), showPrivacy === v.id && /*#__PURE__*/React.createElement("div", {
        className: "overlay",
        onClick: e => {
          if (e.target === e.currentTarget) setShowPrivacy(null);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 4
        }
      }, "🔒 QR-Sichtbarkeit"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 16
        }
      }, "Was ist auf der öffentlichen Fahrzeugseite sichtbar?"), [["Fahrzeugdaten", [["kennzeichen", "Kennzeichen"], ["farbe", "Farbe"], ["kraftstoff", "Kraftstoff"], ["getriebe", "Getriebe"], ["baujahr", "Baujahr (immer öffentlich)"]]], ["Details (optional)", [["kilometerstand", "Kilometerstand"], ["tuev_faelligkeit", "TÜV-Datum"], ["zustand", "Zustand"], ["marktwert", "Marktwert"]]], ["Abschnitte", [["pub_events", "Veranstaltungsteilnahmen"], ["pub_logbook", "Service-Logbuch"]]]].map(([group, fields]) => /*#__PURE__*/React.createElement("div", {
        key: group,
        style: {
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "sec"
      }, group), fields.map(([key, label]) => /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "row"
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          color: C.white
        }
      }, label), /*#__PURE__*/React.createElement("button", {
        className: `tog ${priv[key] !== false ? "on" : "off"}`,
        onClick: () => togglePrivacy(v.id, key)
      }))))), /*#__PURE__*/React.createElement("button", {
        className: "btn",
        style: {
          width: "100%",
          marginTop: 8
        },
        onClick: () => setShowPrivacy(null)
      }, "Speichern ✓"))), showAddLog === v.id && /*#__PURE__*/React.createElement("div", {
        className: "overlay",
        onClick: e => {
          if (e.target === e.currentTarget) setShowAddLog(null);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "sheet"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          marginBottom: 16
        }
      }, "Logbuch-Eintrag"), /*#__PURE__*/React.createElement("select", {
        className: "inp",
        value: addLogForm.type,
        onChange: e => setAddLogForm(p => ({
          ...p,
          type: e.target.value
        })),
        style: {
          marginBottom: 8
        }
      }, ["Ölwechsel", "Inspektion", "Reifenwechsel", "Bremsenwechsel", "Hauptuntersuchung", "Trackday", "Sonstiges"].map(t => /*#__PURE__*/React.createElement("option", {
        key: t
      }, t))), /*#__PURE__*/React.createElement("input", {
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
      }), /*#__PURE__*/React.createElement("input", {
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
      }), /*#__PURE__*/React.createElement("input", {
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
      }), /*#__PURE__*/React.createElement("button", {
        className: "btn",
        onClick: () => addLogEntry(v.id)
      }, "Speichern ✓"))));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EVENT DETAIL
    // ══════════════════════════════════════════════════════════════════════════
    if (screen === "event" && viewEv) {
      const ev = viewEv;
      const evParts = participants[ev.id] || [];
      const myReg = evParts.find(p => p.userId === me?.id);
      const [selV, setSelV] = (0, _react.useState)(myVehicles[0]?.id || "");
      const [selC, setSelC] = (0, _react.useState)(ev.classes[0]);
      const days = daysUntil(ev.date);
      return /*#__PURE__*/React.createElement("div", {
        style: {
          minHeight: "100vh",
          background: C.black,
          paddingBottom: 40,
          animation: "fadeIn .2s"
        }
      }, /*#__PURE__*/React.createElement("style", null, CSS), toast && /*#__PURE__*/React.createElement("div", {
        className: `toast ${toast.type}`
      }, toast.msg), /*#__PURE__*/React.createElement("div", {
        style: {
          background: C.dark,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 16px"
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setScreen("app"),
        style: {
          background: "none",
          border: "none",
          color: C.muted,
          cursor: "pointer",
          fontSize: 13,
          padding: 0,
          marginBottom: 10
        }
      }, "← Events"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 6
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "chip",
        style: {
          background: `${C.red}22`,
          color: C.red
        }
      }, ev.category), /*#__PURE__*/React.createElement("span", {
        className: "chip",
        style: {
          background: `${days <= 7 ? C.amber : C.border}22`,
          color: days <= 7 ? C.amber : C.muted
        }
      }, days <= 0 ? "Heute" : days === 1 ? "Morgen" : `in ${days} T.`)), /*#__PURE__*/React.createElement("h1", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 24,
          fontWeight: 900,
          color: C.white,
          lineHeight: 1.1
        }
      }, ev.name), /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginTop: 3
        }
      }, ev.subtitle)), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "16px",
          maxWidth: 520,
          margin: "0 auto"
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "card p16",
        style: {
          marginBottom: 14
        }
      }, [["📅", fmtDate(ev.date), "Datum"], ["📍", ev.location, "Ort"], ["💶", ev.entryFee, "Nenngeld"], ["👥", `${evParts.length} / ${ev.maxParticipants}`, "Plätze"]].map(([icon, val, label]) => /*#__PURE__*/React.createElement("div", {
        key: label,
        style: {
          display: "flex",
          gap: 10,
          marginBottom: 8,
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 20,
          textAlign: "center"
        }
      }, icon), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: C.muted,
          minWidth: 56
        }
      }, label), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          color: C.white,
          fontWeight: 600
        }
      }, val))), /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.7,
          marginTop: 8,
          paddingTop: 8,
          borderTop: `1px solid ${C.border}`
        }
      }, ev.description)), myReg ? /*#__PURE__*/React.createElement("div", {
        style: {
          background: `${C.green}11`,
          border: `1px solid ${C.green}44`,
          borderRadius: 12,
          padding: "14px 16px",
          textAlign: "center",
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          color: C.green,
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 3
        }
      }, "✓ Angemeldet — #", myReg.startNr), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: C.muted
        }
      }, myReg.class, " · ", fmtDate(ev.date))) : me && myVehicles.length > 0 ? /*#__PURE__*/React.createElement("div", {
        className: "card p16",
        style: {
          marginBottom: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 17,
          fontWeight: 800,
          color: C.white,
          marginBottom: 12
        }
      }, "Jetzt anmelden"), /*#__PURE__*/React.createElement("select", {
        className: "inp",
        value: selV,
        onChange: e => setSelV(e.target.value),
        style: {
          marginBottom: 8
        }
      }, myVehicles.map(v => /*#__PURE__*/React.createElement("option", {
        key: v.id,
        value: v.id
      }, v.hersteller, " ", v.modell, " · ", v.kennzeichen))), /*#__PURE__*/React.createElement("select", {
        className: "inp",
        value: selC,
        onChange: e => setSelC(e.target.value),
        style: {
          marginBottom: 14
        }
      }, ev.classes.map(c => /*#__PURE__*/React.createElement("option", {
        key: c
      }, c))), /*#__PURE__*/React.createElement("button", {
        className: "btn",
        onClick: () => joinEvent(ev.id, selV, selC),
        style: {
          width: "100%"
        }
      }, "Anmelden ✓")) : null, evParts.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "sec"
      }, "Teilnehmer (", evParts.length, ")"), evParts.map(p => {
        const v = vehicles[p.vehicleId];
        return /*#__PURE__*/React.createElement("div", {
          key: p.id,
          style: {
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "10px 0",
            borderBottom: `1px solid ${C.border}`,
            cursor: "pointer"
          },
          onClick: () => {
            setViewV(v);
            setScreen("vehicle");
          }
        }, /*#__PURE__*/React.createElement("div", {
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
        }, "#", p.startNr), /*#__PURE__*/React.createElement("div", {
          style: {
            flex: 1,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: C.white,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        }, v ? `${v.hersteller} ${v.modell}` : "Fahrzeug"), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: C.muted
          }
        }, p.class, v?.kennzeichen ? " · " + v.kennzeichen : "")), /*#__PURE__*/React.createElement("span", {
          style: {
            color: C.muted,
            fontSize: 16
          }
        }, "›"));
      }))));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CHAT (Thread view)
    // ══════════════════════════════════════════════════════════════════════════
    if (screen === "chat" && activeThread && threads[activeThread]) {
      const t = threads[activeThread];
      const other = Object.values(allUsers).find(u => t.participants.includes(u.id) && u.id !== me?.id) || {
        name: "Unbekannt"
      };
      const v = vehicles[t.vehicleId];
      // Mark as read
      (0, _react.useEffect)(() => {
        setThreads(prev => ({
          ...prev,
          [activeThread]: {
            ...prev[activeThread],
            messages: prev[activeThread].messages.map(m => ({
              ...m,
              read: true
            }))
          }
        }));
      }, [activeThread]);
      return /*#__PURE__*/React.createElement("div", {
        style: {
          height: "100vh",
          background: C.black,
          display: "flex",
          flexDirection: "column"
        }
      }, /*#__PURE__*/React.createElement("style", null, CSS), /*#__PURE__*/React.createElement("div", {
        style: {
          background: C.dark,
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexShrink: 0
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          setScreen("app");
          setTab("messages");
        },
        style: {
          background: "none",
          border: "none",
          color: C.muted,
          cursor: "pointer",
          fontSize: 18,
          padding: 0
        }
      }, "←"), /*#__PURE__*/React.createElement("div", {
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
      }, other.name[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: C.white
        }
      }, t.anonymous ? "🔒 Anonym" : other.name), v && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, "Bezüglich: ", v.hersteller, " ", v.modell)), v && /*#__PURE__*/React.createElement("button", {
        className: "btn sm ghost",
        style: {
          marginLeft: "auto",
          fontSize: 11
        },
        onClick: () => {
          setViewV(v);
          setScreen("vehicle");
        }
      }, "Akte →")), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8
        }
      }, t.messages.map(m => {
        if (m.isSystem) return /*#__PURE__*/React.createElement("div", {
          key: m.id,
          style: {
            textAlign: "center",
            fontSize: 10,
            color: "#444",
            margin: "4px 0"
          }
        }, "— ", m.text, " —");
        const mine = m.from === me?.id;
        return /*#__PURE__*/React.createElement("div", {
          key: m.id,
          style: {
            display: "flex",
            justifyContent: mine ? "flex-end" : "flex-start"
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            maxWidth: "80%",
            background: mine ? C.red : "#1e1e1e",
            border: mine ? "none" : `1px solid ${C.border}`,
            borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            padding: "10px 14px"
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 14,
            color: "#fff",
            lineHeight: 1.5
          }
        }, m.text), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 9,
            color: mine ? "rgba(255,255,255,.5)" : C.muted,
            marginTop: 3,
            textAlign: "right"
          }
        }, m.ts)));
      }), /*#__PURE__*/React.createElement("div", {
        ref: msgEndRef
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "10px 12px",
          background: C.dark,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          gap: 8,
          flexShrink: 0,
          paddingBottom: "calc(10px + env(safe-area-inset-bottom,0))"
        }
      }, /*#__PURE__*/React.createElement("input", {
        className: "inp",
        placeholder: "Nachricht…",
        value: msgInput,
        onChange: e => setMsgInput(e.target.value),
        onKeyDown: e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMsg(activeThread);
          }
        },
        style: {
          flex: 1,
          padding: "10px 14px"
        }
      }), /*#__PURE__*/React.createElement("button", {
        className: "btn",
        style: {
          padding: "10px 18px",
          flexShrink: 0
        },
        onClick: () => sendMsg(activeThread)
      }, "↑")));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MAIN APP
    // ══════════════════════════════════════════════════════════════════════════
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "100vh",
        background: C.black,
        paddingBottom: 62
      }
    }, /*#__PURE__*/React.createElement("style", null, CSS), toast && /*#__PURE__*/React.createElement("div", {
      className: `toast ${toast.type}`
    }, toast.msg), /*#__PURE__*/React.createElement("div", {
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
    }, /*#__PURE__*/React.createElement("img", {
      src: LOGO_URL,
      alt: "PCN",
      onError: e => e.target.style.display = "none",
      style: {
        height: 30,
        objectFit: "contain"
      }
    }), /*#__PURE__*/React.createElement("button", {
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
    }, "📷 Scan"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.muted,
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: C.white,
        fontWeight: 700,
        fontSize: 13
      }
    }, me?.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10
      }
    }, me?.memberNr))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 14px 0",
        maxWidth: 560,
        margin: "0 auto"
      }
    }, tab === "dashboard" && /*#__PURE__*/React.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, Object.values(events).filter(e => daysUntil(e.date) > 0 && daysUntil(e.date) <= 14).slice(0, 1).map(e => /*#__PURE__*/React.createElement("div", {
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
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: C.red,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 3
      }
    }, "🏁 In ", daysUntil(e.date), " Tagen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: C.white
      }
    }, e.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.muted,
        marginTop: 2
      }
    }, fmtDate(e.date), " · ", e.location))), myReminders.slice(0, 3).map(r => {
      const days = daysUntil(r.date);
      const v = vehicles[r.vehicleId];
      return /*#__PURE__*/React.createElement("div", {
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
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: days <= 3 ? C.amber : C.white
        }
      }, r.title), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted,
          marginTop: 2
        }
      }, v ? v.hersteller + " " + v.modell + " · " : "", days <= 0 ? "Heute" : days === 1 ? "Morgen" : `in ${days} T.`)), /*#__PURE__*/React.createElement("button", {
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
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sec",
      style: {
        margin: 0
      }
    }, "Meine Fahrzeuge"), /*#__PURE__*/React.createElement("button", {
      className: "btn sm ghost",
      onClick: () => setShowAddV(true)
    }, "+")), myVehicles.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: C.card,
        border: `1px dashed ${C.border}`,
        borderRadius: 12,
        padding: "28px",
        textAlign: "center",
        cursor: "pointer"
      },
      onClick: () => setShowAddV(true)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        marginBottom: 6
      }
    }, "🏎️"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: C.white,
        fontWeight: 600
      }
    }, "Erstes Fahrzeug hinzufügen")) : myVehicles.map(v => /*#__PURE__*/React.createElement("div", {
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
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 100,
        overflow: "hidden",
        position: "relative"
      }
    }, v.image ? /*#__PURE__*/React.createElement("img", {
      src: v.image,
      alt: "",
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      },
      onError: e => e.target.style.display = "none"
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        background: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32
      }
    }, "🏎️")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "11px 13px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: C.white
      }
    }, v.hersteller, " ", v.modell), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 4,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
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
    }, new Date().getFullYear() - parseInt(v.baujahr || 0) >= 30 ? (v.kennzeichen || "").replace(/\s*H$/, "").trim() + " H" : v.kennzeichen || ""), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: C.muted
      }
    }, v.baujahr))), /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.muted,
        fontSize: 18
      }
    }, "›")))), /*#__PURE__*/React.createElement("div", {
      className: "sec",
      style: {
        marginTop: 20
      }
    }, "Features freischalten"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 8
      }
    }, LOCKED_FEATURES.map(f => {
      const unlocked = unlockedFeatures.has(f.id);
      return /*#__PURE__*/React.createElement("div", {
        key: f.id,
        style: {
          background: unlocked ? "#1a1a1a" : "#111",
          border: `1px solid ${unlocked ? C.border + "88" : C.border}`,
          borderRadius: 11,
          padding: "13px 12px",
          opacity: unlocked ? 1 : .55,
          position: "relative",
          overflow: "hidden"
        }
      }, !unlocked && /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          top: 8,
          right: 8,
          fontSize: 12
        }
      }, "🔒"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 18,
          marginBottom: 5
        }
      }, f.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: unlocked ? C.white : "#444",
          marginBottom: 2
        }
      }, f.label), !unlocked && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: "#3a3a3a"
        }
      }, f.milestone), unlocked && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: C.green
        }
      }, "✓ Freigeschaltet"));
    }))), tab === "events" && /*#__PURE__*/React.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sec"
    }, "Veranstaltungen 2026"), Object.values(events).sort((a, b) => new Date(a.date) - new Date(b.date)).map(ev => {
      const days = daysUntil(ev.date);
      const myReg = participants[ev.id]?.find(p => p.userId === me?.id);
      return /*#__PURE__*/React.createElement("div", {
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
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "chip",
        style: {
          background: `${C.red}22`,
          color: C.red
        }
      }, ev.category), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: days <= 7 ? C.amber : C.muted,
          fontWeight: 600
        }
      }, days <= 0 ? "Heute" : days === 1 ? "Morgen" : `in ${days} T.`)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 15,
          color: C.white,
          marginBottom: 2
        }
      }, ev.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: C.muted,
          marginBottom: 8
        }
      }, fmtDate(ev.date), " · ", ev.location), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, ev.entryFee), myReg && /*#__PURE__*/React.createElement("span", {
        className: "chip",
        style: {
          background: `${C.green}22`,
          color: C.green
        }
      }, "✓ #", myReg.startNr)));
    })), tab === "messages" && /*#__PURE__*/React.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sec"
    }, "💬 Anonyme Nachrichten"), /*#__PURE__*/React.createElement("div", {
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
    }, "🔒 Nachrichten werden anonym über QAR-IDs vermittelt. Weder Name noch E-Mail wird ohne deine Zustimmung weitergegeben."), myThreads.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "40px 20px",
        color: C.muted
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 32,
        marginBottom: 8
      }
    }, "💬"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: C.white,
        marginBottom: 4
      }
    }, "Noch keine Nachrichten"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12
      }
    }, "Scanne einen QR-Code am Fahrzeug um Kontakt aufzunehmen")) : myThreads.map(t => {
      const other = Object.values(allUsers).find(u => t.participants.includes(u.id) && u.id !== me?.id) || {
        name: "?"
      };
      const last = t.messages.filter(m => !m.isSystem).pop();
      const unread = t.messages.some(m => m.from !== me?.id && !m.read && !m.isSystem);
      const v = vehicles[t.vehicleId];
      return /*#__PURE__*/React.createElement("div", {
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
      }, /*#__PURE__*/React.createElement("div", {
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
      }, t.anonymous ? "🔒" : other.name[0]), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: unread ? 700 : 500,
          fontSize: 14,
          color: C.white
        }
      }, t.anonymous ? "Anonym" : other.name), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, last?.ts || "")), v && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: `${C.red}88`,
          marginBottom: 2
        }
      }, v.hersteller, " ", v.modell), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: unread ? C.white : C.muted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, last ? (last.from === me?.id ? "Du: " : "") + last.text : "…")), unread && /*#__PURE__*/React.createElement("div", {
        style: {
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: C.red,
          flexShrink: 0
        }
      }));
    })), tab === "reminders" && /*#__PURE__*/React.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sec",
      style: {
        margin: 0
      }
    }, "Erinnerungen"), /*#__PURE__*/React.createElement("button", {
      className: "btn sm ghost",
      onClick: () => setShowAddRem(true)
    }, "+ Neu")), myReminders.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "40px 20px",
        color: C.muted
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 32,
        marginBottom: 8
      }
    }, "🎉"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: C.white
      }
    }, "Alles erledigt!")) : myReminders.map(r => {
      const days = daysUntil(r.date);
      const v = vehicles[r.vehicleId];
      return /*#__PURE__*/React.createElement("div", {
        key: r.id,
        style: {
          background: C.card,
          border: `1px solid ${days <= 3 ? C.amber + "55" : C.border}`,
          borderRadius: 11,
          padding: "13px",
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: days <= 3 ? C.amber : C.white,
          marginBottom: 2
        }
      }, r.title), v && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: C.muted
        }
      }, v.hersteller, " ", v.modell), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: days < 0 ? C.red : days <= 3 ? C.amber : C.muted,
          marginTop: 2
        }
      }, days < 0 ? "⚠️ Überfällig" : days === 0 ? "Heute" : days === 1 ? "Morgen" : `in ${days} Tagen`, " · ", fmtDate(r.date))), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
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
          marginLeft: 10
        }
      }, "✓")));
    })), tab === "profile" && /*#__PURE__*/React.createElement("div", {
      style: {
        animation: "fadeIn .2s"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "card p16",
      style: {
        textAlign: "center",
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
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
    }, "🏎️"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 22,
        fontWeight: 800,
        color: C.white
      }
    }, me?.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.muted,
        marginTop: 2
      }
    }, "Mitglied · ", me?.memberNr)), /*#__PURE__*/React.createElement("div", {
      className: "card p16",
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sec"
    }, "Statistiken"), [["🚗", "Fahrzeuge", myVehicles.length], ["📋", "Logbuch-Einträge", Object.values(logbook).flat().length], ["🏁", "Events", myParticipations.length], ["💬", "Nachrichten", myThreads.length]].map(([icon, label, val]) => /*#__PURE__*/React.createElement("div", {
      key: label,
      className: "row"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: C.muted
      }
    }, icon, " ", label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: C.white
      }
    }, val)))), /*#__PURE__*/React.createElement("div", {
      className: "card p16",
      style: {
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sec"
    }, "Milestones"), MILESTONES.map(m => {
      const done = m.check(appState);
      return /*#__PURE__*/React.createElement("div", {
        key: m.id,
        className: "row"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("div", {
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
          flexShrink: 0
        }
      }, done ? "✓" : ""), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          color: done ? C.white : C.muted
        }
      }, m.label)), done && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 9,
          color: C.green,
          fontWeight: 700
        }
      }, "✓ AKTIV"));
    })), /*#__PURE__*/React.createElement("button", {
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
      }
    }, "Abmelden"))), scannerOpen && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 300,
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("div", {
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
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 18,
        fontWeight: 800,
        color: "#fff"
      }
    }, "QR-Code scannen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "rgba(255,255,255,.5)"
      }
    }, "Halte die Kamera über den QAR-Code")), /*#__PURE__*/React.createElement("button", {
      onClick: closeScanner,
      style: {
        background: "rgba(0,0,0,.6)",
        border: "1px solid rgba(255,255,255,.2)",
        borderRadius: 8,
        padding: "8px 14px",
        color: "#fff",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700
      }
    }, "✕ Schließen")), /*#__PURE__*/React.createElement("video", {
      ref: videoRef,
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      },
      muted: true,
      playsInline: true
    }), /*#__PURE__*/React.createElement("canvas", {
      ref: canvasRef,
      style: {
        display: "none"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none"
      }
    }, scannerStatus === "found" ? /*#__PURE__*/React.createElement("div", {
      style: {
        width: 220,
        height: 220,
        border: "3px solid #22c55e",
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(34,197,94,.1)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 48
      }
    }, "✓")) : /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: 220,
        height: 220
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width: 32,
        height: 32,
        borderTop: "3px solid #e30613",
        borderLeft: "3px solid #e30613",
        borderRadius: "8px 0 0 0"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 32,
        height: 32,
        borderTop: "3px solid #e30613",
        borderRight: "3px solid #e30613",
        borderRadius: "0 8px 0 0"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 32,
        height: 32,
        borderBottom: "3px solid #e30613",
        borderLeft: "3px solid #e30613",
        borderRadius: "0 0 0 8px"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderBottom: "3px solid #e30613",
        borderRight: "3px solid #e30613",
        borderRadius: "0 0 8px 0"
      }
    }), scannerStatus === "scanning" && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: 4,
        right: 4,
        height: 2,
        background: "linear-gradient(90deg,transparent,#e30613,transparent)",
        animation: "scanline 1.8s ease-in-out infinite"
      }
    }))), scannerError && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 40,
        left: 20,
        right: 20,
        background: "rgba(0,0,0,.9)",
        border: "1px solid #ef4444",
        borderRadius: 14,
        padding: "16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#ef4444",
        fontWeight: 700,
        fontSize: 14,
        marginBottom: 6
      }
    }, "⚠️ Kein Kamera-Zugriff"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#999",
        fontSize: 12,
        lineHeight: 1.6,
        marginBottom: 12
      }
    }, scannerError), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setScannerError(null);
        setScannerStatus("loading");
      },
      style: {
        background: C.red,
        border: "none",
        borderRadius: 8,
        padding: "10px 18px",
        color: "#fff",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        width: "100%"
      }
    }, "Erneut versuchen")), !scannerError && scannerStatus === "loading" && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        textAlign: "center",
        color: "rgba(255,255,255,.6)",
        fontSize: 13
      }
    }, "Kamera wird gestartet…"), !scannerError && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "14px 16px",
        background: "linear-gradient(to top,rgba(0,0,0,.95),transparent)",
        paddingBottom: "calc(14px + env(safe-area-inset-bottom,0))"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "rgba(255,255,255,.4)",
        textAlign: "center",
        marginBottom: 8
      }
    }, "Oder UID manuell eingeben"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("input", {
      placeholder: "QAR-XXXXXXXX",
      style: {
        flex: 1,
        background: "rgba(255,255,255,.1)",
        border: "1px solid rgba(255,255,255,.2)",
        borderRadius: 8,
        padding: "10px 12px",
        color: "#fff",
        fontSize: 14,
        fontFamily: "monospace",
        textTransform: "uppercase",
        letterSpacing: 1
      },
      onChange: e => {
        const v = e.target.value.toUpperCase();
        if (v.match(/^QAR-[A-Z2-9]{8}$/)) handleScanResult(v);
      }
    })))), showAddV && /*#__PURE__*/React.createElement("div", {
      className: "overlay",
      onClick: e => {
        if (e.target === e.currentTarget) setShowAddV(false);
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sheet"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 20,
        fontWeight: 800,
        color: C.white,
        marginBottom: 14
      }
    }, "Fahrzeug hinzufügen"), /*#__PURE__*/React.createElement("label", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: C.card,
        border: `1px dashed ${C.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        marginBottom: 10,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "file",
      accept: "image/*",
      capture: "environment",
      style: {
        display: "none"
      },
      onChange: e => handleImageUpload(e.target.files[0], url => setAddVForm(p => ({
        ...p,
        image: url
      })))
    }), addVForm.image ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
      src: addVForm.image,
      alt: "",
      style: {
        width: 52,
        height: 52,
        objectFit: "cover",
        borderRadius: 7,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: C.white
      }
    }, "Foto geladen ✓"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.muted
      }
    }, "Erneut tippen zum Ändern"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 28
      }
    }, "📷"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: C.white
      }
    }, "Fahrzeugfoto hinzufügen"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.muted
      }
    }, "Kamera oder Bibliothek · max. 5MB")))), [["Modell *", "modell", "Cayman GT4"], ["Kennzeichen *", "kennzeichen", "AW-PC 718"], ["Baujahr", "baujahr", "2023"], ["Farbe", "farbe", "Pythongrün"]].map(([ph, key, ex]) => /*#__PURE__*/React.createElement("input", {
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
    })), /*#__PURE__*/React.createElement("select", {
      className: "inp",
      value: addVForm.kraftstoff,
      onChange: e => setAddVForm(p => ({
        ...p,
        kraftstoff: e.target.value
      })),
      style: {
        marginBottom: 10
      }
    }, ["Benzin", "Diesel", "Elektro", "Hybrid"].map(k => /*#__PURE__*/React.createElement("option", {
      key: k
    }, k))), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      style: {
        width: "100%"
      },
      onClick: addVehicle
    }, "Hinzufügen ✓"))), showAddRem && /*#__PURE__*/React.createElement("div", {
      className: "overlay",
      onClick: e => {
        if (e.target === e.currentTarget) setShowAddRem(false);
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sheet"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 20,
        fontWeight: 800,
        color: C.white,
        marginBottom: 14
      }
    }, "Erinnerung"), /*#__PURE__*/React.createElement("input", {
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
    }), /*#__PURE__*/React.createElement("input", {
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
    }), /*#__PURE__*/React.createElement("select", {
      className: "inp",
      style: {
        marginBottom: 14
      },
      value: remForm.vehicleId,
      onChange: e => setRemForm(p => ({
        ...p,
        vehicleId: e.target.value
      }))
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Kein Fahrzeug"), myVehicles.map(v => /*#__PURE__*/React.createElement("option", {
      key: v.id,
      value: v.id
    }, v.hersteller, " ", v.modell))), /*#__PURE__*/React.createElement("button", {
      className: "btn",
      style: {
        width: "100%"
      },
      onClick: async () => {
        if (!remForm.title || !remForm.date) return toast_("Titel und Datum angeben", "err");
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
    }, "Speichern ✓"))), /*#__PURE__*/React.createElement("div", {
      className: "tab-bar"
    }, [["dashboard", "🏠", "Start"], ["events", "🏁", "Events"], ["messages", "💬", "Nachrichten"], ["reminders", "🔔", "Erinnerungen"], ["profile", "👤", "Profil"]].map(([id, icon, label]) => /*#__PURE__*/React.createElement("button", {
      key: id,
      className: `tab-btn ${tab === id ? "on" : "inactive"}`,
      onClick: () => {
        setTab(id);
        setScreen("app");
      }
    }, id === "messages" && unreadCount > 0 && /*#__PURE__*/React.createElement("div", {
      className: "badge"
    }, unreadCount), /*#__PURE__*/React.createElement("span", {
      className: "ico"
    }, icon), /*#__PURE__*/React.createElement("span", {
      className: "lbl"
    }, label)))));
  }
});
