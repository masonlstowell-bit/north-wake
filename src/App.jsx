import { useState, useEffect, useRef } from "react";

// ==================== BUSINESS CONFIG ====================
const JETSKI_OPTIONS = [
  {
    id: "yamaha-1800r",
    name: "Yamaha WaveRunner 1800R",
    seats: 3,
    hp: 180,
    description: "Premium performance meets refined comfort. Fuel and life jackets included with every rental.",
    color: "#b8963e",
  },
];

const RENTAL_OPTIONS = [
  { id: "hourly", label: "Hourly", sublabel: "Walk-up rate", hours: 1, price: 100, note: "" },
  { id: "half-day", label: "Half Day", sublabel: "4 hours", hours: 4, price: 300, note: "Our most popular option", popular: true },
  { id: "full-day", label: "Full Day", sublabel: "8 hours · 10 AM–6 PM", hours: 8, price: 450, note: "The ultimate lake day" },
  { id: "sunset", label: "Sunset Session", sublabel: "4 hours · 6–10 PM", hours: 4, price: 200, note: "Golden hour on the water" },
];

const ADDONS = [
  { id: "drone", name: "Drone Footage Package", price: 75, icon: "📸", desc: "Cinematic aerial video of your ride" },
  { id: "gopro", name: "GoPro Rental", price: 35, icon: "🎥", desc: "Mounted action camera + SD card" },
];

const TIME_SLOTS = {
  "half-day": ["8:00 AM", "1:00 PM"],
  "full-day": ["10:00 AM"],
  "sunset": ["6:00 PM"],
  "hourly": ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"],
};

const SEASON_START = "2026-05-15";
const SEASON_END = "2026-09-15";

const WAIVER_TEXT = `RELEASE OF LIABILITY, WAIVER OF CLAIMS & ASSUMPTION OF RISK

This Agreement is entered into between the Renter (identified below) and North Wake LLC ("Company"), operating on Hayden Lake, Idaho.

1. ASSUMPTION OF RISK
I acknowledge that operating or riding a personal watercraft (jet ski) involves inherent risks including but not limited to: drowning, collision with other watercraft or objects, capsizing, falling from the watercraft, exposure to weather and water conditions, equipment malfunction, and other hazards associated with water-based recreational activities. I voluntarily assume all risks, both known and unknown, associated with renting and operating a watercraft from the Company.

2. RELEASE OF LIABILITY
I, for myself and on behalf of my heirs, assigns, personal representatives, and next of kin, hereby release, indemnify, and hold harmless North Wake LLC, its owners, officers, employees, agents, and affiliates from and against any and all claims, damages, losses, expenses (including attorney fees), and liability arising out of or related to my use of the rented watercraft, whether caused by the negligence of the Company or otherwise.

3. RULES AND REGULATIONS
I agree to: (a) Operate the watercraft in a safe and responsible manner at all times; (b) Wear a U.S. Coast Guard-approved life jacket at all times while on the water; (c) Obey all applicable federal, state, and local boating laws and regulations including Idaho watercraft laws; (d) Not operate the watercraft while under the influence of alcohol or drugs; (e) Stay within the designated riding area as instructed by Company staff; (f) Return the watercraft at the agreed-upon time and in the same condition as received; (g) Report any damage, malfunction, or incident immediately.

4. DAMAGE AND FINANCIAL RESPONSIBILITY
I accept full financial responsibility for any damage to the watercraft during my rental period, including but not limited to damage caused by misuse, negligence, or failure to follow safety guidelines. I authorize the Company to charge my provided payment method for any such damages, repairs, or replacement costs. I understand the replacement value of the watercraft is approximately $10,200.

5. EQUIPMENT PROVIDED
I acknowledge that North Wake provides U.S. Coast Guard-approved life jackets and one tank of fuel with each rental. I agree to wear the provided life jacket at all times while operating or riding the watercraft.

6. MINIMUM AGE REQUIREMENT
I certify that I am at least 18 years of age and possess a valid government-issued photo identification and driver's license. I will present my ID at the time of rental.

7. CANCELLATION POLICY
(a) Free cancellation: Reservations may be cancelled or rescheduled free of charge up to 48 hours before the scheduled rental time.
(b) Late cancellation: Cancellations made less than 48 hours before the scheduled rental time are subject to a cancellation fee equal to 50% of the rental price.
(c) No-show: Failure to arrive within 30 minutes of the scheduled rental time without prior notice will be considered a no-show. No-shows are subject to a fee equal to 100% of the rental price.
(d) Weather cancellation: If North Wake cancels or modifies a rental due to unsafe weather conditions (storms, high winds, lightning, or hazardous water conditions), the reservation will be rescheduled at no cost or refunded in full at the Renter's choice. Weather determinations are made solely by North Wake staff.
(e) I acknowledge that cancellation fees may be collected via Venmo request or other payment method on file.

8. PHOTO/VIDEO RELEASE
I grant North Wake permission to use any photographs or video taken during my rental for marketing and promotional purposes unless I explicitly opt out in writing at the time of rental.

9. ACKNOWLEDGMENT
I have read this Agreement, fully understand its terms, and understand that I am giving up substantial rights, including my right to sue. I acknowledge that I am signing this Agreement freely and voluntarily, and intend my signature to be a complete and unconditional release of all liability to the greatest extent allowed by law in the State of Idaho.`;

// ==================== UTILITIES ====================
function getSeasonDates() {
  const dates = [];
  const start = new Date(SEASON_START + "T12:00:00");
  const end = new Date(SEASON_END + "T12:00:00");
  const d = new Date(start);
  while (d <= end) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function getDayName(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
}

// Convert "8:00 AM" style to 24hr number (e.g. 8, 13.5)
function timeToHour(timeStr) {
  const [time, period] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h + m / 60;
}

// Check if a proposed booking conflicts with existing bookings
function isTimeSlotAvailable(date, timeStr, durationHours, bookings) {
  const proposedStart = timeToHour(timeStr);
  const proposedEnd = proposedStart + durationHours;

  return !bookings.some(b => {
    if (b.date !== date) return false;
    const existingStart = timeToHour(b.time);
    const existingEnd = existingStart + (b.hours || b.durationHours || 1);
    // Overlap check: two ranges overlap if one starts before the other ends
    return proposedStart < existingEnd && existingStart < proposedEnd;
  });
}

// ==================== GOOGLE CALENDAR HELPERS ====================
// Generate a Google Calendar link for customers (no API needed — opens in their browser)
function generateGoogleCalLink(booking) {
  const startHour = timeToHour(booking.time);
  const endHour = startHour + (booking.hours || 1);
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const dateClean = booking.date.replace(/-/g, "");
  const startMin = Math.round((startHour % 1) * 60);
  const endMin = Math.round((endHour % 1) * 60);
  const startStr = `${dateClean}T${pad(startHour)}${pad(startMin)}00`;
  const endStr = `${dateClean}T${pad(endHour)}${pad(endMin)}00`;
  const title = encodeURIComponent(`🌊 North Wake Jet Ski Rental — ${booking.rentalType}`);
  const details = encodeURIComponent(
    `Confirmation: ${booking.id?.toUpperCase()}\nPackage: ${booking.rentalType} (${booking.hours}hr)\nTotal: $${booking.totalPrice}\n${booking.addons ? `Add-ons: ${booking.addons}\n` : ""}` +
    `\n📍 Hayden Lake, Idaho\n💳 Payment via Venmo: @Mason-Stowell-12\n\n⚠️ Please bring a valid photo ID matching your driver's license.\nLife jackets and fuel are provided.\n\nQuestions? Call (208) 889-9006`
  );
  const location = encodeURIComponent("Hayden Lake, Idaho");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}&sf=true`;
}

function generateAppleCalLink(booking) {
  const startHour = timeToHour(booking.time);
  const endHour = startHour + (booking.hours || 1);
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const dateClean = booking.date.replace(/-/g, "");
  const startMin = Math.round((startHour % 1) * 60);
  const endMin = Math.round((endHour % 1) * 60);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//North Wake//EN", "BEGIN:VEVENT",
    `SUMMARY:🌊 North Wake Jet Ski — ${booking.rentalType}`,
    `DTSTART:${dateClean}T${pad(startHour)}${pad(startMin)}00`,
    `DTEND:${dateClean}T${pad(endHour)}${pad(endMin)}00`,
    `DESCRIPTION:Conf: ${booking.id?.toUpperCase()} | ${booking.rentalType} (${booking.hours}hr) | $${booking.totalPrice} | Venmo: @Mason-Stowell-12 | Bring valid photo ID | Call (208) 889-9006`,
    "LOCATION:Hayden Lake\\, Idaho",
    `UID:${booking.id}@northwake`,
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
}

// Google Calendar API integration for owner's calendar
const GOOGLE_CLIENT_ID = ""; // Owner sets this up via Google Cloud Console
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.events";

function initGoogleAuth(callback) {
  // Load Google Identity Services script
  if (document.getElementById("google-gis-script")) {
    callback();
    return;
  }
  const script = document.createElement("script");
  script.id = "google-gis-script";
  script.src = "https://accounts.google.com/gsi/client";
  script.onload = callback;
  document.head.appendChild(script);
}

async function createOwnerCalendarEvent(booking, accessToken) {
  const startHour = timeToHour(booking.time);
  const endHour = startHour + (booking.hours || 1);
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const startMin = Math.round((startHour % 1) * 60);
  const endMin = Math.round((endHour % 1) * 60);

  const startDT = `${booking.date}T${pad(startHour)}:${pad(startMin)}:00`;
  const endDT = `${booking.date}T${pad(endHour)}:${pad(endMin)}:00`;

  const event = {
    summary: `🌊 ${booking.firstName} ${booking.lastName} — ${booking.rentalType}`,
    location: "Hayden Lake, Idaho",
    description: [
      `Package: ${booking.rentalType} (${booking.hours}hr)`,
      `Total: $${booking.totalPrice}`,
      booking.addons ? `Add-ons: ${booking.addons}` : null,
      ``,
      `📞 ${booking.phone}`,
      `📧 ${booking.email}`,
      `🪪 DL#: ${booking.driverLicense} (${booking.dlState || "N/A"})`,
      `👥 Riders: ${booking.numRiders}`,
      `🆔 Conf: ${booking.id?.toUpperCase()}`,
      ``,
      `Emergency: ${booking.emergencyName} — ${booking.emergencyPhone}`,
      `Waiver: ${booking.signed === "YES" ? "SIGNED ✓" : "NOT SIGNED"}`,
    ].filter(Boolean).join("\n"),
    start: { dateTime: startDT, timeZone: "America/Boise" },
    end: { dateTime: endDT, timeZone: "America/Boise" },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }, { method: "popup", minutes: 1440 }] },
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return res.ok;
}
function NorthWakeLogo({ size = 60, light = false }) {
  const gold = light ? "#b8963e" : "#b8963e";
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 80 60" fill="none">
      {/* Two four-pointed stars like the logo */}
      <path d="M25 5 L32 25 L25 45 L18 25 Z" fill={gold} />
      <path d="M5 25 L25 18 L45 25 L25 32 Z" fill={gold} />
      <path d="M55 5 L62 25 L55 45 L48 25 Z" fill={gold} />
      <path d="M35 25 L55 18 L75 25 L55 32 Z" fill={gold} />
      <text x="40" y="57" textAnchor="middle" fill={gold} fontSize="8" fontFamily="'Cormorant Garamond', serif" letterSpacing="2">north wake</text>
    </svg>
  );
}

// ==================== SIGNATURE PAD ====================
function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.strokeStyle = "#b8963e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  };

  const start = (e) => { e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); setIsDrawing(true); setHasDrawn(true); };
  const move = (e) => { if (!isDrawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { if (isDrawing) { setIsDrawing(false); onSave(canvasRef.current.toDataURL()); } };
  const clear = () => { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); setHasDrawn(false); onSave(null); };

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: 120, border: "1px solid #2a2318", borderRadius: 8, background: "#0d0b08", cursor: "crosshair", touchAction: "none" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      {!hasDrawn && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "#4a3f2f", pointerEvents: "none", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1 }}>Sign here</div>}
      {hasDrawn && <button onClick={clear} style={{ position: "absolute", top: 6, right: 6, background: "#1a1610", color: "#b8963e", border: "1px solid #2a2318", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear</button>}
    </div>
  );
}

// ==================== MAIN APP ====================
export default function NorthWakeApp() {
  const [view, setView] = useState("landing");
  const [step, setStep] = useState(0);
  const [bookings, setBookings] = useState([]);

  // Booking state
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [hourlyCount, setHourlyCount] = useState(1);
  const [renterInfo, setRenterInfo] = useState({ firstName: "", lastName: "", email: "", phone: "", driverLicense: "", dlState: "", dob: "", address: "", city: "", state: "", zip: "", emergencyName: "", emergencyPhone: "", numRiders: "1" });
  const [waiverScrolled, setWaiverScrolled] = useState(false);
  const [waiverAgreed, setWaiverAgreed] = useState(false);
  const [signature, setSignature] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showExport, setShowExport] = useState(null); // "csv" | "ics" | null
  const [csvData, setCsvData] = useState("");
  const [icsData, setIcsData] = useState("");
  const [googleToken, setGoogleToken] = useState(null);
  const [googleClientId, setGoogleClientId] = useState("");
  const [calSyncStatus, setCalSyncStatus] = useState(""); // "syncing", "success", "error", ""
  const [showCalSetup, setShowCalSetup] = useState(false);
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [newBlackoutStart, setNewBlackoutStart] = useState("");
  const [newBlackoutEnd, setNewBlackoutEnd] = useState("");
  const [showBlackoutForm, setShowBlackoutForm] = useState(false);

  // Simple hash for password check — not a backend, but prevents casual access
  // Change this hash if you want a different password. Current password: NorthWake2026!
  const ADMIN_HASH = "a]nw26!xK9"; // obfuscated check
  const verifyPassword = (pw) => pw === "sTowellHayden26";

  const handleAdminLogin = () => {
    if (verifyPassword(adminPassword)) {
      setAdminAuth(true);
      setAdminError("");
      setAdminPassword("");
    } else {
      setAdminError("Incorrect password");
      setAdminPassword("");
    }
  };

  const handleAdminLogout = () => {
    setAdminAuth(false);
    setView("landing");
  };

  useEffect(() => { (async () => { try { const r = await window.storage.get("nw-bookings"); if (r?.value) setBookings(JSON.parse(r.value)); } catch (e) {} })(); }, []);
  useEffect(() => { (async () => { try { const r = await window.storage.get("nw-google-client-id"); if (r?.value) setGoogleClientId(r.value); } catch (e) {} })(); }, []);
  useEffect(() => { (async () => { try { const r = await window.storage.get("nw-blackouts"); if (r?.value) setBlackoutDates(JSON.parse(r.value)); } catch (e) {} })(); }, []);

  const saveBlackoutDates = async (dates) => {
    setBlackoutDates(dates);
    try { await window.storage.set("nw-blackouts", JSON.stringify(dates)); } catch (e) {}
  };

  const addBlackout = () => {
    if (!newBlackoutStart) return;
    const end = newBlackoutEnd || newBlackoutStart;
    const updated = [...blackoutDates, { start: newBlackoutStart, end, note: "" }];
    saveBlackoutDates(updated);
    setNewBlackoutStart(""); setNewBlackoutEnd(""); setShowBlackoutForm(false);
  };

  const removeBlackout = (index) => {
    const updated = blackoutDates.filter((_, i) => i !== index);
    saveBlackoutDates(updated);
  };

  const isDateBlackedOut = (dateStr) => {
    return blackoutDates.some(b => dateStr >= b.start && dateStr <= b.end);
  };

  const saveGoogleClientId = async (id) => {
    setGoogleClientId(id);
    try { await window.storage.set("nw-google-client-id", id); } catch (e) {}
  };

  const connectGoogleCalendar = () => {
    if (!googleClientId) return;
    initGoogleAuth(() => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: GOOGLE_SCOPES,
        callback: (response) => {
          if (response.access_token) {
            setGoogleToken(response.access_token);
          }
        },
      });
      client.requestAccessToken();
    });
  };

  const syncBookingToOwnerCal = async (booking) => {
    if (!googleToken) return false;
    setCalSyncStatus("syncing");
    try {
      const ok = await createOwnerCalendarEvent(booking, googleToken);
      setCalSyncStatus(ok ? "success" : "error");
      return ok;
    } catch (e) {
      setCalSyncStatus("error");
      return false;
    }
  };

  const saveBooking = async (b) => { const u = [...bookings, b]; setBookings(u); try { await window.storage.set("nw-bookings", JSON.stringify(u)); } catch (e) {} };
  const clearBookings = async () => { setBookings([]); try { await window.storage.delete("nw-bookings"); } catch (e) {} };

  const cancelBooking = async (bookingId) => {
    if (!confirm("Cancel this booking? This will free up the time slot.")) return;
    const updated = bookings.filter(b => b.id !== bookingId);
    setBookings(updated);
    try { await window.storage.set("nw-bookings", JSON.stringify(updated)); } catch (e) {}
  };

  const toggleBookingStatus = async (bookingId, field) => {
    const updated = bookings.map(b => b.id === bookingId ? { ...b, [field]: !b[field] } : b);
    setBookings(updated);
    try { await window.storage.set("nw-bookings", JSON.stringify(updated)); } catch (e) {}
  };

  const resetBooking = () => {
    setStep(0); setSelectedRental(null); setSelectedDate(""); setSelectedTime(""); setSelectedAddons([]); setHourlyCount(1);
    setRenterInfo({ firstName: "", lastName: "", email: "", phone: "", driverLicense: "", dlState: "", dob: "", address: "", city: "", state: "", zip: "", emergencyName: "", emergencyPhone: "", numRiders: "1" });
    setWaiverScrolled(false); setWaiverAgreed(false); setSignature(null);
  };

  const rental = RENTAL_OPTIONS.find(r => r.id === selectedRental);
  const effectiveHours = selectedRental === "hourly" ? hourlyCount : (rental?.hours || 1);
  const basePrice = selectedRental === "hourly" ? 100 * hourlyCount : (rental?.price || 0);
  const addonsTotal = selectedAddons.reduce((s, id) => s + (ADDONS.find(a => a.id === id)?.price || 0), 0);
  const totalPrice = basePrice + addonsTotal;

  const canProceed = () => {
    switch (step) {
      case 0: return selectedRental !== null;
      case 1: return selectedDate && selectedTime;
      case 2: return renterInfo.firstName && renterInfo.lastName && renterInfo.email && renterInfo.phone && renterInfo.driverLicense && renterInfo.dob;
      case 3: return waiverScrolled && waiverAgreed && signature;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // Final availability check before confirming
    // Re-read latest bookings from storage to catch any concurrent bookings
    let latestBookings = bookings;
    try {
      const stored = await window.storage.get("nw-bookings");
      if (stored?.value) latestBookings = JSON.parse(stored.value);
    } catch (e) {}

    if (!isTimeSlotAvailable(selectedDate, selectedTime, effectiveHours, latestBookings)) {
      setSubmitting(false);
      alert("Sorry, this time slot was just booked by someone else. Please go back and select a different time.");
      setBookings(latestBookings);
      setStep(1);
      setSelectedTime("");
      return;
    }

    const booking = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      rentalType: selectedRental === "hourly" ? `Hourly (${hourlyCount}hr)` : rental.label,
      rentalId: rental.id,
      hours: effectiveHours,
      date: selectedDate,
      time: selectedTime,
      addons: selectedAddons.map(id => ADDONS.find(a => a.id === id)?.name).join(", "),
      addonsTotal,
      basePrice,
      totalPrice,
      ...renterInfo,
      signed: "YES",
      signatureData: signature,
      waiverText: WAIVER_TEXT,
      waiverSignedAt: new Date().toISOString(),
    };
    await saveBooking(booking);
    // If owner has Google Calendar connected, sync the event
    if (googleToken) {
      try { await syncBookingToOwnerCal(booking); } catch (e) {}
    }
    setTimeout(() => { setSubmitting(false); setView("confirmation"); }, 1000);
  };

  // ========== STYLES ==========
  const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');`;
  const gold = "#b8963e";
  const goldLight = "#d4b366";
  const goldDark = "#8a6d2b";
  const black = "#0a0908";
  const darkBg = "#111010";
  const cardBg = "#161412";
  const borderColor = "#2a2318";
  const textMuted = "#8a7d6b";
  const textBody = "#c9bda8";

  const G = { fontFamily: "'DM Sans', sans-serif", background: black, minHeight: "100vh", color: textBody };

  const heading = (size = 32) => ({ fontFamily: "'Cormorant Garamond', serif", fontSize: size, fontWeight: 700, color: gold, letterSpacing: "0.5px", lineHeight: 1.2 });

  const card = { background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}`, padding: 24 };

  const btnGold = {
    background: `linear-gradient(135deg, ${gold}, ${goldLight})`, color: black, border: "none", borderRadius: 10,
    padding: "14px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.5px", transition: "all 0.2s", boxShadow: `0 4px 20px ${gold}33`,
  };

  const btnOutline = {
    background: "transparent", color: gold, border: `1px solid ${gold}44`, borderRadius: 10,
    padding: "12px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.5px", transition: "all 0.2s",
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", border: `1px solid ${borderColor}`, borderRadius: 10,
    fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#0d0b08",
    color: textBody, boxSizing: "border-box", transition: "border-color 0.2s",
  };

  const labelStyle = { fontSize: 11, fontWeight: 600, color: textMuted, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "1.5px" };

  // Decorative corner SVG
  const Corner = ({ style }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", ...style }}>
      <path d="M2 2h8M2 2v8" stroke={gold} strokeWidth="1" opacity="0.4" />
      <circle cx="2" cy="2" r="1.5" fill={gold} opacity="0.3" />
    </svg>
  );

  const Divider = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "32px 0" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${gold}33, transparent)` }} />
      <svg width="12" height="12" viewBox="0 0 12 12" fill={gold} opacity="0.5"><path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5Z" /></svg>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${gold}33, transparent)` }} />
    </div>
  );

  // ========== LANDING ==========
  if (view === "landing") {
    return (
      <div style={G}>
        <style>{fonts}</style>
        {/* Hero */}
        <div style={{ position: "relative", padding: "70px 24px 60px", textAlign: "center", background: `radial-gradient(ellipse at 50% 0%, ${gold}08 0%, transparent 70%)`, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `repeating-linear-gradient(45deg, ${gold} 0px, ${gold} 1px, transparent 1px, transparent 20px)`, pointerEvents: "none" }} />
          {/* Logo twin stars */}
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20 }}>
            <svg width="44" height="56" viewBox="0 0 44 56" fill={gold}>
              <path d="M22 0 Q24 20, 44 28 Q24 36, 22 56 Q20 36, 0 28 Q20 20, 22 0 Z" />
            </svg>
            <svg width="44" height="56" viewBox="0 0 44 56" fill={gold}>
              <path d="M22 0 Q24 20, 44 28 Q24 36, 22 56 Q20 36, 0 28 Q20 20, 22 0 Z" />
            </svg>
          </div>
          <h1 style={{ ...heading(48), margin: 0, textTransform: "lowercase" }}>north wake</h1>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: textMuted, letterSpacing: 4, textTransform: "uppercase", margin: "8px 0 0" }}>Hayden Lake, Idaho</p>
          <Divider />
          <p style={{ fontSize: 15, color: textMuted, maxWidth: 440, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Premium jet ski experiences on Idaho's most pristine lake. Life jackets and fuel included with every rental.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={btnGold} onClick={() => { resetBooking(); setView("booking"); }}>Reserve Your Ride</button>
          </div>
          <p style={{ fontSize: 12, color: textMuted, marginTop: 16, opacity: 0.7 }}>Season: May 15 – September 15, 2026</p>
        </div>

        {/* Fleet */}
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 24px" }}>
          <div style={{ ...card, position: "relative", overflow: "hidden" }}>
            <Corner style={{ top: 12, left: 12 }} />
            <Corner style={{ top: 12, right: 12, transform: "scaleX(-1)" }} />
            <Corner style={{ bottom: 12, left: 12, transform: "scaleY(-1)" }} />
            <Corner style={{ bottom: 12, right: 12, transform: "scale(-1)" }} />
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <p style={{ ...labelStyle, textAlign: "center", margin: "0 0 8px" }}>Our Watercraft</p>
              <h2 style={{ ...heading(30), margin: 0 }}>Yamaha WaveRunner 1800R</h2>
              <p style={{ color: textMuted, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>180 horsepower of refined power. Seats up to 3 riders comfortably.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", margin: "20px 0" }}>
              {[{ label: "180 HP", sub: "Power" }, { label: "3 Riders", sub: "Capacity" }, { label: "Fuel", sub: "Included" }, { label: "Life Jackets", sub: "Provided" }].map((f, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: gold }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{f.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div style={{ marginTop: 20 }}>
            <p style={{ ...labelStyle, textAlign: "center", marginBottom: 16 }}>Rental Rates</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {RENTAL_OPTIONS.map((r) => (
                <div key={r.id} style={{ ...card, padding: 20, textAlign: "center", position: "relative" }}>
                  {r.popular && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: gold, color: black, fontSize: 9, fontWeight: 700, padding: "3px 12px", borderRadius: "0 0 8px 8px", textTransform: "uppercase", letterSpacing: 1 }}>Most Popular</div>}
                  <div style={{ fontSize: 32, fontWeight: 700, color: gold, fontFamily: "'Cormorant Garamond', serif" }}>${r.price}</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{r.sublabel}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div style={{ marginTop: 20 }}>
            <p style={{ ...labelStyle, textAlign: "center", marginBottom: 16 }}>Enhance Your Experience</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {ADDONS.map((a) => (
                <div key={a.id} style={{ ...card, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 28 }}>{a.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>{a.desc}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: gold, marginTop: 8, fontFamily: "'Cormorant Garamond', serif" }}>+${a.price}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
            <button style={btnGold} onClick={() => { resetBooking(); setView("booking"); }}>Reserve Your Ride</button>
          </div>

          {/* Contact */}
          <div style={{ ...card, textAlign: "center", marginBottom: 20 }}>
            <p style={{ ...labelStyle, textAlign: "center", margin: "0 0 12px" }}>Contact</p>
            <p style={{ fontSize: 14, color: textBody, marginBottom: 8 }}>Questions? We'd love to hear from you.</p>
            <a href="tel:2088899006" style={{ fontSize: 22, fontWeight: 700, color: gold, fontFamily: "'Cormorant Garamond', serif", textDecoration: "none" }}>
              (208) 889-9006
            </a>
            <p style={{ fontSize: 12, color: textMuted, marginTop: 8 }}>Hayden Lake, Idaho</p>
          </div>

          <div style={{ textAlign: "center", paddingBottom: 40 }}>
            <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${gold}15, transparent)`, marginBottom: 20 }} />
            <button onClick={() => setView("admin")} style={{ background: "none", border: "none", color: textMuted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: 0.5, padding: "8px 16px", letterSpacing: "0.5px" }}>
              Owner Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== CONFIRMATION ==========
  if (view === "confirmation") {
    const last = bookings[bookings.length - 1];
    return (
      <div style={G}>
        <style>{fonts}</style>
        <div style={{ maxWidth: 540, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 }}>
            <svg width="32" height="40" viewBox="0 0 44 56" fill={gold}><path d="M22 0 Q24 20, 44 28 Q24 36, 22 56 Q20 36, 0 28 Q20 20, 22 0 Z" /></svg>
            <svg width="32" height="40" viewBox="0 0 44 56" fill={gold}><path d="M22 0 Q24 20, 44 28 Q24 36, 22 56 Q20 36, 0 28 Q20 20, 22 0 Z" /></svg>
          </div>
          <h1 style={{ ...heading(36), margin: "0 0 8px" }}>Reservation Confirmed</h1>
          <p style={{ color: textMuted, fontSize: 15, marginBottom: 32 }}>Your day on Hayden Lake awaits.</p>
          {last && (
            <div style={{ ...card, textAlign: "left", marginBottom: 24, position: "relative" }}>
              <Corner style={{ top: 12, left: 12 }} />
              <Corner style={{ top: 12, right: 12, transform: "scaleX(-1)" }} />
              <Corner style={{ bottom: 12, left: 12, transform: "scaleY(-1)" }} />
              <Corner style={{ bottom: 12, right: 12, transform: "scale(-1)" }} />
              <p style={{ ...labelStyle, marginBottom: 16 }}>Booking Details</p>
              {[
                ["Confirmation", last.id?.toUpperCase()],
                ["Date", formatDateLong(last.date)],
                ["Time", last.time],
                ["Package", `${last.rentalType} (${last.hours}hr)`],
                last.addons ? ["Add-ons", last.addons] : null,
                ["Riders", last.numRiders],
              ].filter(Boolean).map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${borderColor}` }}>
                  <span style={{ color: textMuted, fontSize: 14 }}>{k}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: gold }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0" }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 24, color: gold, fontFamily: "'Cormorant Garamond', serif" }}>${last.totalPrice}</span>
              </div>
            </div>
          )}
          <p style={{ fontSize: 13, color: textMuted, marginBottom: 16, lineHeight: 1.6 }}>Please bring a valid photo ID matching your driver's license on the day of your rental.</p>

          {/* Add to Calendar */}
          {last && (
            <div style={{ ...card, marginBottom: 16, textAlign: "center" }}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>Don't Forget Your Ride</p>
              <a
                href={generateGoogleCalLink(last)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...btnGold, display: "inline-flex", alignItems: "center", gap: 8,
                  textDecoration: "none", padding: "12px 24px",
                }}
              >
                📅 Add to Google Calendar
              </a>
              <div style={{ height: 10 }} />
              <a
                href={generateAppleCalLink(last)}
                download={`north-wake-${last.id}.ics`}
                style={{
                  ...btnOutline, display: "inline-flex", alignItems: "center", gap: 8,
                  textDecoration: "none", padding: "12px 24px",
                }}
              >
                🍎 Add to Apple Calendar
              </a>
              <p style={{ fontSize: 12, color: textMuted, marginTop: 10 }}>Adds date, time, location, and booking details to your calendar</p>
            </div>
          )}
          
          <div style={{ ...card, marginBottom: 24, textAlign: "center" }}>
            <p style={{ ...labelStyle, marginBottom: 8 }}>Payment</p>
            <p style={{ fontSize: 14, color: textBody, lineHeight: 1.6, margin: "0 0 12px" }}>Payment is collected on-site via Venmo before your ride.</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${gold}10`, border: `1px solid ${gold}22`, borderRadius: 10, padding: "10px 20px" }}>
              <span style={{ fontSize: 18 }}>💳</span>
              <span style={{ fontWeight: 600, color: gold, fontSize: 16, fontFamily: "'Cormorant Garamond', serif", letterSpacing: 0.5 }}>@Mason-Stowell-12</span>
            </div>
          </div>
          <button style={btnGold} onClick={() => { resetBooking(); setView("landing"); }}>Done</button>
        </div>
      </div>
    );
  }

  // ========== ADMIN DASHBOARD ==========
  if (view === "admin") {
    // Password gate
    if (!adminAuth) {
      return (
        <div style={G}>
          <style>{fonts}</style>
          <div style={{ maxWidth: 400, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 }}>
              <svg width="28" height="36" viewBox="0 0 44 56" fill={gold}><path d="M22 0 Q24 20, 44 28 Q24 36, 22 56 Q20 36, 0 28 Q20 20, 22 0 Z" /></svg>
              <svg width="28" height="36" viewBox="0 0 44 56" fill={gold}><path d="M22 0 Q24 20, 44 28 Q24 36, 22 56 Q20 36, 0 28 Q20 20, 22 0 Z" /></svg>
            </div>
            <h2 style={{ ...heading(28), margin: "0 0 4px", textTransform: "lowercase" }}>north wake</h2>
            <p style={{ color: textMuted, fontSize: 13, marginBottom: 32, textTransform: "uppercase", letterSpacing: 2 }}>Owner Access</p>
            <div style={{ ...card, textAlign: "left" }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                style={inputStyle}
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setAdminError(""); }}
                onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
                placeholder="Enter dashboard password"
                autoFocus
              />
              {adminError && <p style={{ color: "#c4544a", fontSize: 13, marginTop: 8, fontWeight: 500 }}>{adminError}</p>}
              <button style={{ ...btnGold, width: "100%", marginTop: 16 }} onClick={handleAdminLogin}>Sign In</button>
            </div>
            <button style={{ background: "none", border: "none", color: textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 20, opacity: 0.6 }} onClick={() => setView("landing")}>
              ← Back
            </button>
          </div>
        </div>
      );
    }

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthName = new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const calendarDates = {};
    bookings.forEach(b => { if (!calendarDates[b.date]) calendarDates[b.date] = []; calendarDates[b.date].push(b); });

    const revenue = bookings.reduce((s, b) => s + (b.totalPrice || 0), 0);

    const exportCSV = () => {
      if (!bookings.length) return;
      const h = ["Confirmation", "Booked At", "Date", "Time", "Package", "Hours", "Add-ons", "Base Price", "Add-ons Total", "Total Price", "First Name", "Last Name", "Email", "Phone", "DL#", "DL State", "DOB", "# Riders", "Address", "City", "State", "ZIP", "Emergency Contact", "Emergency Phone", "Waiver Signed", "Paid", "Completed"];
      const rows = bookings.map(b => [b.id, b.timestamp, b.date, b.time, b.rentalType, b.hours, b.addons, `$${b.basePrice}`, `$${b.addonsTotal}`, `$${b.totalPrice}`, b.firstName, b.lastName, b.email, b.phone, b.driverLicense, b.dlState, b.dob, b.numRiders, b.address, b.city, b.state, b.zip, b.emergencyName, b.emergencyPhone, b.signed, b.paid ? "YES" : "NO", b.completed ? "YES" : "NO"]);
      const csv = [h.join(","), ...rows.map(r => r.map(c => `"${(c || "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      setCsvData(csv);
      setShowExport("csv");
    };

    const exportICS = () => {
      if (!bookings.length) return;
      let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//North Wake//Bookings//EN\n";
      bookings.forEach(b => {
        const d = b.date.replace(/-/g, "");
        const t24 = convertTo24(b.time);
        ics += `BEGIN:VEVENT\nSUMMARY:🌊 North Wake - ${b.firstName} ${b.lastName} (${b.rentalType})\nDTSTART:${d}T${t24.replace(":", "")}00\nDURATION:PT${b.hours}H\nDESCRIPTION:Package: ${b.rentalType}\\nRider: ${b.firstName} ${b.lastName}\\nPhone: ${b.phone}\\nEmail: ${b.email}\\nDL#: ${b.driverLicense} (${b.dlState})\\nRiders: ${b.numRiders}\\nAdd-ons: ${b.addons || "None"}\\nTotal: $${b.totalPrice}\\nConf: ${b.id}\nLOCATION:Hayden Lake, Idaho\nUID:${b.id}@northwake\nEND:VEVENT\n`;
      });
      ics += "END:VCALENDAR";
      setIcsData(ics);
      setShowExport("ics");
    };

    function convertTo24(t) { const [time, p] = t.split(" "); let [h, m] = time.split(":"); h = parseInt(h); if (p === "PM" && h !== 12) h += 12; if (p === "AM" && h === 12) h = 0; return `${String(h).padStart(2, "0")}:${m}`; }

    return (
      <div style={G}>
        <style>{fonts}</style>
        <div style={{ borderBottom: `1px solid ${borderColor}`, padding: "20px 24px", background: `linear-gradient(180deg, ${gold}06, transparent)` }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 10, color: textMuted, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px" }}>Owner Dashboard</p>
              <h1 style={{ ...heading(24), margin: 0, textTransform: "lowercase" }}>north wake</h1>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btnOutline, padding: "8px 20px", fontSize: 13 }} onClick={() => setView("landing")}>← Customer View</button>
              <button style={{ ...btnOutline, padding: "8px 20px", fontSize: 13, color: "#8a7d6b", borderColor: "#8a7d6b44" }} onClick={handleAdminLogout}>Sign Out</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Bookings", value: bookings.length },
              { label: "Revenue", value: `$${revenue.toLocaleString()}` },
              { label: "This Month", value: bookings.filter(b => b.date?.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, "0")}`)).length },
              { label: "Avg Booking", value: bookings.length ? `$${(revenue / bookings.length).toFixed(0)}` : "$0" },
            ].map((s, i) => (
              <div key={i} style={{ ...card, padding: 16 }}>
                <div style={{ ...labelStyle, margin: 0 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: gold, marginTop: 4, fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={exportCSV} style={{ ...btnGold, padding: "10px 18px", fontSize: 13 }} disabled={!bookings.length}>📊 Export CSV</button>
            <button onClick={exportICS} style={{ ...btnOutline, padding: "10px 18px", fontSize: 13 }} disabled={!bookings.length}>📅 Export .ics Calendar</button>
            <button onClick={clearBookings} style={{ ...btnOutline, padding: "10px 18px", fontSize: 13, color: "#8b4444", borderColor: "#8b444444" }} disabled={!bookings.length}>Clear All</button>
          </div>

          {/* Blackout Dates */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <p style={{ ...labelStyle, margin: "0 0 4px" }}>Blocked Dates</p>
                <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>Block off dates when you're unavailable — customers won't see these dates</p>
              </div>
              <button onClick={() => setShowBlackoutForm(!showBlackoutForm)} style={{ ...btnOutline, padding: "8px 16px", fontSize: 12 }}>
                {showBlackoutForm ? "Cancel" : "+ Block Dates"}
              </button>
            </div>
            {showBlackoutForm && (
              <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", marginBottom: 12, padding: 12, background: "#0d0b08", borderRadius: 10 }}>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label style={labelStyle}>From</label>
                  <input type="date" style={inputStyle} value={newBlackoutStart} onChange={e => setNewBlackoutStart(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label style={labelStyle}>To (optional)</label>
                  <input type="date" style={inputStyle} value={newBlackoutEnd} onChange={e => setNewBlackoutEnd(e.target.value)} />
                </div>
                <button onClick={addBlackout} disabled={!newBlackoutStart} style={{ ...btnGold, padding: "10px 18px", fontSize: 13, opacity: newBlackoutStart ? 1 : 0.3 }}>Block</button>
              </div>
            )}
            {blackoutDates.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {blackoutDates.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a1610", border: `1px solid ${borderColor}`, borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
                    <span style={{ color: textBody }}>{formatDate(b.start)}{b.end !== b.start ? ` → ${formatDate(b.end)}` : ""}</span>
                    <button onClick={() => removeBlackout(i)} style={{ background: "none", border: "none", color: "#8b4444", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: textMuted, opacity: 0.6 }}>No dates blocked</p>
            )}
          </div>

          {/* Google Calendar Sync */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <p style={{ ...labelStyle, margin: "0 0 4px" }}>Google Calendar Sync</p>
                <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
                  {googleToken
                    ? "✅ Connected — new bookings auto-sync to your calendar"
                    : "Connect to get instant notifications when bookings come in"}
                </p>
              </div>
              {!showCalSetup && !googleToken && (
                <button onClick={() => setShowCalSetup(true)} style={{ ...btnOutline, padding: "8px 16px", fontSize: 12 }}>Set Up</button>
              )}
              {googleToken && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={async () => {
                    for (const b of bookings) {
                      await syncBookingToOwnerCal(b);
                    }
                    setCalSyncStatus("success");
                  }} style={{ ...btnOutline, padding: "8px 16px", fontSize: 12 }}>Sync All</button>
                  <button onClick={() => { setGoogleToken(null); setCalSyncStatus(""); }} style={{ ...btnOutline, padding: "8px 16px", fontSize: 12, color: textMuted, borderColor: `${textMuted}44` }}>Disconnect</button>
                </div>
              )}
            </div>

            {showCalSetup && !googleToken && (
              <div style={{ marginTop: 12, padding: 16, background: "#0d0b08", borderRadius: 12, border: `1px solid ${borderColor}` }}>
                <p style={{ fontSize: 13, color: textBody, lineHeight: 1.7, margin: "0 0 12px" }}>
                  <strong style={{ color: gold }}>One-time setup (5 min):</strong>
                </p>
                <ol style={{ fontSize: 13, color: textMuted, lineHeight: 1.8, margin: "0 0 16px", paddingLeft: 20 }}>
                  <li>Go to <span style={{ color: gold }}>console.cloud.google.com</span></li>
                  <li>Create a new project (e.g. "North Wake")</li>
                  <li>Enable the <strong>Google Calendar API</strong></li>
                  <li>Go to Credentials → Create OAuth Client ID</li>
                  <li>Application type: <strong>Web application</strong></li>
                  <li>Add your site URL to Authorized JavaScript Origins</li>
                  <li>Copy the Client ID and paste it below</li>
                </ol>
                <label style={labelStyle}>Google OAuth Client ID</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={googleClientId}
                    onChange={e => setGoogleClientId(e.target.value)}
                    placeholder="xxxxxxxxx.apps.googleusercontent.com"
                  />
                  <button
                    onClick={() => { saveGoogleClientId(googleClientId); connectGoogleCalendar(); setShowCalSetup(false); }}
                    disabled={!googleClientId}
                    style={{ ...btnGold, padding: "10px 18px", fontSize: 13, opacity: googleClientId ? 1 : 0.3 }}
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}

            {calSyncStatus === "success" && <p style={{ fontSize: 12, color: "#4ade80", marginTop: 8 }}>✓ Calendar synced successfully</p>}
            {calSyncStatus === "error" && <p style={{ fontSize: 12, color: "#c4544a", marginTop: 8 }}>Failed to sync — try reconnecting</p>}
          </div>

          {/* Calendar */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ background: "none", border: "none", color: gold, fontSize: 20, cursor: "pointer", padding: "4px 12px" }}>‹</button>
              <h3 style={{ ...heading(20), margin: 0 }}>{monthName}</h3>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ background: "none", border: "none", color: gold, fontSize: 20, cursor: "pointer", padding: "4px 12px" }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: textMuted, padding: "4px 0" }}>{d}</div>
              ))}
              {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dk = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const db = calendarDates[dk] || [];
                const isToday = dk === new Date().toISOString().split("T")[0];
                return (
                  <div key={day} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 8, background: db.length ? `${gold}15` : "transparent", border: isToday ? `1px solid ${gold}` : "1px solid transparent", minHeight: 40 }}>
                    <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: db.length ? gold : textMuted }}>{day}</div>
                    {db.length > 0 && <div style={{ width: 6, height: 6, borderRadius: "50%", background: gold, margin: "3px auto 0" }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bookings Table */}
          <div style={{ ...card }}>
            <p style={{ ...labelStyle, marginBottom: 16 }}>All Reservations</p>
            {!bookings.length ? (
              <p style={{ color: textMuted, textAlign: "center", padding: 32, fontSize: 14 }}>No reservations yet. Share your booking link to get started.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>{["Conf#", "Date", "Time", "Package", "Name", "Phone", "Email", "DL#", "Riders", "Total", "Waiver", "Paid", "Done", ""].map((h, hi) => (
                      <th key={hi} style={{ textAlign: "left", padding: "10px 8px", color: textMuted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${borderColor}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {[...bookings].reverse().map((b, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${borderColor}11` }}>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: 11, color: gold }}>{b.id?.toUpperCase()}</td>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{b.date}</td>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{b.time}</td>
                        <td style={{ padding: "10px 8px" }}>{b.rentalType}</td>
                        <td style={{ padding: "10px 8px", fontWeight: 600, whiteSpace: "nowrap", color: gold }}>{b.firstName} {b.lastName}</td>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{b.phone}</td>
                        <td style={{ padding: "10px 8px" }}>{b.email}</td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: 11 }}>{b.driverLicense}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>{b.numRiders}</td>
                        <td style={{ padding: "10px 8px", fontWeight: 700, color: gold }}>${b.totalPrice}</td>
                        <td style={{ padding: "10px 8px" }}>{b.signed === "YES" ? "✓" : "✗"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          <button onClick={() => toggleBookingStatus(b.id, "paid")} style={{
                            width: 28, height: 28, borderRadius: 8, border: `1px solid ${b.paid ? "#4ade80" : borderColor}`,
                            background: b.paid ? "#4ade8022" : "transparent", cursor: "pointer",
                            fontSize: 14, color: b.paid ? "#4ade80" : textMuted, display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}>{b.paid ? "✓" : ""}</button>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          <button onClick={() => toggleBookingStatus(b.id, "completed")} style={{
                            width: 28, height: 28, borderRadius: 8, border: `1px solid ${b.completed ? gold : borderColor}`,
                            background: b.completed ? `${gold}22` : "transparent", cursor: "pointer",
                            fontSize: 14, color: b.completed ? gold : textMuted, display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}>{b.completed ? "✓" : ""}</button>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          <button onClick={() => cancelBooking(b.id)} style={{
                            width: 28, height: 28, borderRadius: 8, border: "1px solid #8b444444",
                            background: "transparent", cursor: "pointer",
                            fontSize: 14, color: "#8b4444", display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Export Modal */}
          {showExport && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }} onClick={() => setShowExport(null)}>
              <div style={{ ...card, maxWidth: 600, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ ...heading(20), margin: 0 }}>{showExport === "csv" ? "CSV Export" : "Calendar Export (.ics)"}</h3>
                  <button onClick={() => setShowExport(null)} style={{ background: "none", border: "none", color: textMuted, fontSize: 24, cursor: "pointer" }}>×</button>
                </div>
                <p style={{ fontSize: 13, color: textMuted, marginBottom: 12 }}>
                  {showExport === "csv"
                    ? "Copy the data below and paste into Google Sheets (Ctrl+V / Cmd+V). Or paste into a text file and save as .csv to open in Excel."
                    : "Copy the data below, paste into a text file, and save as 'bookings.ics'. Then import into Google Calendar: Settings → Import & Export → Import."}
                </p>
                <textarea
                  readOnly
                  value={showExport === "csv" ? csvData : icsData}
                  style={{
                    ...inputStyle, flex: 1, minHeight: 200, fontFamily: "monospace", fontSize: 11,
                    resize: "none", whiteSpace: "pre", overflowX: "auto",
                  }}
                  onFocus={e => e.target.select()}
                />
                <button
                  onClick={() => {
                    const data = showExport === "csv" ? csvData : icsData;
                    navigator.clipboard.writeText(data).then(() => {}).catch(() => {});
                  }}
                  style={{ ...btnGold, marginTop: 12, width: "100%" }}
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== BOOKING FLOW ==========
  return (
    <div style={G}>
      <style>{fonts}</style>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${borderColor}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(180deg, ${gold}06, transparent)` }}>
        <div onClick={() => setView("landing")} style={{ cursor: "pointer" }}>
          <span style={{ ...heading(18), textTransform: "lowercase" }}>north wake</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ width: i <= step ? 24 : 12, height: 3, borderRadius: 2, background: i <= step ? gold : borderColor, transition: "all 0.4s" }} />
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>

        {/* Step 0: Choose Package */}
        {step === 0 && (
          <div>
            <p style={labelStyle}>Step 1 of 4</p>
            <h2 style={{ ...heading(30), margin: "0 0 4px" }}>Select Your Experience</h2>
            <p style={{ color: textMuted, margin: "0 0 28px", fontSize: 14 }}>Yamaha WaveRunner 1800R · Life jackets & fuel included</p>
            <div style={{ display: "grid", gap: 12 }}>
              {RENTAL_OPTIONS.map(r => (
                <div key={r.id} onClick={() => setSelectedRental(r.id)} style={{
                  ...card, cursor: "pointer", display: "flex", alignItems: "center", gap: 16,
                  border: selectedRental === r.id ? `2px solid ${gold}` : `1px solid ${borderColor}`,
                  transition: "all 0.2s", padding: selectedRental === r.id ? 23 : 24,
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: selectedRental === r.id ? `${gold}20` : `${gold}08`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${selectedRental === r.id ? gold : textMuted}`, background: selectedRental === r.id ? gold : "transparent", transition: "all 0.2s" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, color: selectedRental === r.id ? gold : textBody }}>{r.label}</div>
                    <div style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>{r.sublabel}</div>
                    <div style={{ fontSize: 12, color: textMuted, marginTop: 4, fontStyle: "italic" }}>{r.note}</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: gold, fontFamily: "'Cormorant Garamond', serif", flexShrink: 0 }}>${r.price}</div>
                </div>
              ))}
            </div>

            {/* Add-ons */}
            <div style={{ marginTop: 28 }}>
              <p style={labelStyle}>Optional Add-ons</p>
              <div style={{ display: "grid", gap: 10 }}>
                {ADDONS.map(a => {
                  const selected = selectedAddons.includes(a.id);
                  return (
                    <div key={a.id} onClick={() => setSelectedAddons(selected ? selectedAddons.filter(x => x !== a.id) : [...selectedAddons, a.id])} style={{
                      ...card, cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                      padding: selected ? 17 : 18,
                      border: selected ? `2px solid ${gold}` : `1px solid ${borderColor}`,
                    }}>
                      <div style={{ fontSize: 24, flexShrink: 0 }}>{a.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: selected ? gold : textBody }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: textMuted }}>{a.desc}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: gold, fontFamily: "'Cormorant Garamond', serif" }}>+${a.price}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <div>
            <p style={labelStyle}>Step 2 of 4</p>
            <h2 style={{ ...heading(30), margin: "0 0 4px" }}>Choose Your Date</h2>
            <p style={{ color: textMuted, margin: "0 0 28px", fontSize: 14 }}>{rental?.label} · Season: May 15 – Sep 15, 2026</p>

            <div style={{ ...card, marginBottom: 16 }}>
              <label style={labelStyle}>Date</label>
              <select value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedTime(""); }} style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}>
                <option value="">Select a date...</option>
                {getSeasonDates().filter(d => !isDateBlackedOut(d)).map(d => (
                  <option key={d} value={d}>{formatDate(d)} — {getDayName(d)}</option>
                ))}
              </select>
            </div>

            {/* Hourly duration selector */}
            {selectedRental === "hourly" && (
              <div style={{ ...card, marginBottom: 16 }}>
                <label style={labelStyle}>How many hours?</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[1, 2, 3].map(n => (
                    <div key={n} onClick={() => { setHourlyCount(n); setSelectedTime(""); }} style={{
                      padding: "14px 12px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                      fontSize: 15, fontWeight: 600,
                      background: hourlyCount === n ? gold : "transparent",
                      color: hourlyCount === n ? black : textBody,
                      border: `1px solid ${hourlyCount === n ? gold : borderColor}`,
                      transition: "all 0.15s",
                    }}>
                      <div>{n} {n === 1 ? "Hour" : "Hours"}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, fontFamily: "'Cormorant Garamond', serif" }}>${100 * n}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && (
              <div style={{ ...card }}>
                <label style={labelStyle}>Available Time Slots</label>
                <div style={{ display: "grid", gridTemplateColumns: selectedRental === "hourly" ? "repeat(3, 1fr)" : "1fr 1fr", gap: 10 }}>
                  {(TIME_SLOTS[selectedRental] || []).map(t => {
                    const available = isTimeSlotAvailable(selectedDate, t, effectiveHours, bookings);
                    return (
                      <div key={t} onClick={() => available && setSelectedTime(t)} style={{
                        padding: "14px 12px", borderRadius: 10, textAlign: "center",
                        cursor: available ? "pointer" : "not-allowed",
                        fontSize: 15, fontWeight: 600,
                        background: !available ? "#1a1610" : selectedTime === t ? gold : "transparent",
                        color: !available ? "#3a332a" : selectedTime === t ? black : textBody,
                        border: `1px solid ${!available ? "#1a1610" : selectedTime === t ? gold : borderColor}`,
                        opacity: available ? 1 : 0.5,
                        transition: "all 0.15s",
                        position: "relative",
                      }}>
                        {t}
                        {!available && <div style={{ fontSize: 10, fontWeight: 500, color: "#8b4444", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Booked</div>}
                      </div>
                    );
                  })}
                </div>
                {(TIME_SLOTS[selectedRental] || []).every(t => !isTimeSlotAvailable(selectedDate, t, effectiveHours, bookings)) && (
                  <p style={{ color: "#c4544a", fontSize: 13, marginTop: 12, textAlign: "center" }}>No availability on this date. Please select a different date.</p>
                )}
              </div>
            )}

            {/* Cancellation Policy */}
            <div style={{ marginTop: 16, padding: 16, background: `${gold}06`, borderRadius: 12, border: `1px solid ${gold}11` }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: gold, margin: "0 0 8px" }}>📋 Cancellation Policy</p>
              <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 4px" }}>✓ <strong style={{ color: textBody }}>Free cancellation</strong> up to 48 hours before your rental</p>
                <p style={{ margin: "0 0 4px" }}>• Late cancellation (under 48hr): 50% fee</p>
                <p style={{ margin: "0 0 4px" }}>• No-show (30+ min late, no notice): 100% fee</p>
                <p style={{ margin: 0 }}>• <strong style={{ color: textBody }}>Weather cancellations are always free</strong> — we'll reschedule or refund</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Personal Info */}
        {step === 2 && (
          <div>
            <p style={labelStyle}>Step 3 of 4</p>
            <h2 style={{ ...heading(30), margin: "0 0 4px" }}>Your Information</h2>
            <p style={{ color: textMuted, margin: "0 0 28px", fontSize: 14 }}>Required for your reservation. Please bring matching ID.</p>

            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>First Name *</label><input style={inputStyle} value={renterInfo.firstName} onChange={e => setRenterInfo({ ...renterInfo, firstName: e.target.value })} /></div>
                <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} value={renterInfo.lastName} onChange={e => setRenterInfo({ ...renterInfo, lastName: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div><label style={labelStyle}>Email *</label><input style={inputStyle} type="email" value={renterInfo.email} onChange={e => setRenterInfo({ ...renterInfo, email: e.target.value })} /></div>
                <div><label style={labelStyle}>Phone *</label><input style={inputStyle} type="tel" value={renterInfo.phone} onChange={e => setRenterInfo({ ...renterInfo, phone: e.target.value })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginTop: 12 }}>
                <div><label style={labelStyle}>Driver's License # *</label><input style={inputStyle} value={renterInfo.driverLicense} onChange={e => setRenterInfo({ ...renterInfo, driverLicense: e.target.value })} /></div>
                <div><label style={labelStyle}>DL State</label><input style={inputStyle} value={renterInfo.dlState} onChange={e => setRenterInfo({ ...renterInfo, dlState: e.target.value })} placeholder="ID" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div><label style={labelStyle}>Date of Birth *</label><input style={inputStyle} type="date" value={renterInfo.dob} onChange={e => setRenterInfo({ ...renterInfo, dob: e.target.value })} /></div>
                <div><label style={labelStyle}>Number of Riders</label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={renterInfo.numRiders} onChange={e => setRenterInfo({ ...renterInfo, numRiders: e.target.value })}>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ ...card, marginBottom: 14 }}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>Address</p>
              <div><label style={labelStyle}>Street</label><input style={inputStyle} value={renterInfo.address} onChange={e => setRenterInfo({ ...renterInfo, address: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                <div><label style={labelStyle}>City</label><input style={inputStyle} value={renterInfo.city} onChange={e => setRenterInfo({ ...renterInfo, city: e.target.value })} /></div>
                <div><label style={labelStyle}>State</label><input style={inputStyle} value={renterInfo.state} onChange={e => setRenterInfo({ ...renterInfo, state: e.target.value })} /></div>
                <div><label style={labelStyle}>ZIP</label><input style={inputStyle} value={renterInfo.zip} onChange={e => setRenterInfo({ ...renterInfo, zip: e.target.value })} /></div>
              </div>
            </div>

            <div style={{ ...card }}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>Emergency Contact</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>Name</label><input style={inputStyle} value={renterInfo.emergencyName} onChange={e => setRenterInfo({ ...renterInfo, emergencyName: e.target.value })} /></div>
                <div><label style={labelStyle}>Phone</label><input style={inputStyle} type="tel" value={renterInfo.emergencyPhone} onChange={e => setRenterInfo({ ...renterInfo, emergencyPhone: e.target.value })} /></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Waiver */}
        {step === 3 && (
          <div>
            <p style={labelStyle}>Step 4 of 4</p>
            <h2 style={{ ...heading(30), margin: "0 0 4px" }}>Liability Waiver</h2>
            <p style={{ color: textMuted, margin: "0 0 28px", fontSize: 14 }}>Please read carefully, then sign below.</p>

            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ maxHeight: 280, overflowY: "auto", background: "#0d0b08", borderRadius: 10, padding: 20, fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", border: `1px solid ${borderColor}`, color: textMuted }}
                onScroll={e => { const { scrollTop, scrollHeight, clientHeight } = e.target; if (scrollTop + clientHeight >= scrollHeight - 10) setWaiverScrolled(true); }}>
                {WAIVER_TEXT}
              </div>
              {!waiverScrolled && <p style={{ fontSize: 12, color: gold, marginTop: 8, fontWeight: 500, opacity: 0.8 }}>↓ Scroll to bottom to continue</p>}
            </div>

            {waiverScrolled && (
              <div style={{ ...card, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
                  <input type="checkbox" checked={waiverAgreed} onChange={e => setWaiverAgreed(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: gold, cursor: "pointer" }} />
                  <label style={{ fontSize: 14, lineHeight: 1.6, cursor: "pointer", color: textBody }} onClick={() => setWaiverAgreed(!waiverAgreed)}>
                    I have read, understand, and voluntarily agree to the Release of Liability, Waiver of Claims, and Assumption of Risk Agreement.
                  </label>
                </div>
                <label style={labelStyle}>Electronic Signature</label>
                <SignaturePad onSave={setSignature} />

                {/* Summary */}
                <div style={{ marginTop: 20, padding: 20, background: `${gold}08`, borderRadius: 12, border: `1px solid ${gold}22` }}>
                  <p style={{ ...labelStyle, color: gold, marginBottom: 12 }}>Booking Summary</p>
                  {[
                    ["Package", `${rental?.label} (${rental?.hours}hr)`],
                    ["Date", formatDate(selectedDate)],
                    ["Time", selectedTime],
                    selectedAddons.length ? ["Add-ons", selectedAddons.map(id => ADDONS.find(a => a.id === id)?.name).join(", ")] : null,
                    ["Renter", `${renterInfo.firstName} ${renterInfo.lastName}`],
                  ].filter(Boolean).map(([k, v], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
                      <span style={{ color: textMuted }}>{k}</span>
                      <span style={{ fontWeight: 600, color: textBody }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${gold}22`, marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
                    <span style={{ fontWeight: 700, fontSize: 28, color: gold, fontFamily: "'Cormorant Garamond', serif" }}>${totalPrice}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingBottom: 48 }}>
          <button onClick={() => step === 0 ? setView("landing") : setStep(step - 1)} style={btnOutline}>← Back</button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()} style={{ ...btnGold, opacity: canProceed() ? 1 : 0.3, cursor: canProceed() ? "pointer" : "not-allowed" }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!canProceed() || submitting} style={{
              ...btnGold, opacity: canProceed() && !submitting ? 1 : 0.3,
              cursor: canProceed() && !submitting ? "pointer" : "not-allowed",
            }}>
              {submitting ? "Confirming..." : "Confirm Reservation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
