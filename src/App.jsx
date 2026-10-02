import LocationPicker from "./components/LocationPicker";
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";
import { BorderBeam } from "border-beam";
import { MetalFx, MetalText, MetalBadge } from "metal-fx";
import { VoiceBeam, useMicrophone } from "voice-glow";
import { BotAvatar } from "bot-avatars";
import { ThinkingOrb } from "thinking-orbs";

const categories = [
  { name: "All Services", icon: "🌍" },
  { name: "Food & Annadhanam", icon: "🍲" },
  { name: "Medical Help", icon: "🩺" },
  { name: "Blood Donation", icon: "🩸" },
  { name: "Education", icon: "📚" },
  { name: "Jobs & Skills", icon: "💼" },
  { name: "Shelter & Essentials", icon: "🏠" },
  { name: "Donations & Volunteering", icon: "🤝" },
  { name: "Community Events", icon: "🎉" },
  { name: "Other Help", icon: "💛" },
];



const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


const FIND_HELP_TEXT = {
  en: {
    title: "Find Help",
    desc: "Choose a category or use the filters to find community support.",
  },
  te: {
    title: "సహాయం కనుగొనండి",
    desc: "కమ్యూనిటీ సహాయం కోసం ఒక కేటగిరీని ఎంచుకోండి లేదా ఫిల్టర్లను ఉపయోగించండి.",
  },
  hi: {
    title: "मदद खोजें",
    desc: "कम्युनिटी मदद पाने के लिए कैटेगरी चुनें या फ़िल्टर इस्तेमाल करें।",
  },
  ta: {
    title: "உதவியைத் தேடுங்கள்",
    desc: "சமூக உதவியை கண்டறிய ஒரு வகையைத் தேர்வு செய்யவும் அல்லது filters பயன்படுத்தவும்.",
  },
  kn: {
    title: "ಸಹಾಯ ಹುಡುಕಿ",
    desc: "ಸಮುದಾಯ ಸಹಾಯವನ್ನು ಹುಡುಕಲು ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ filters ಬಳಸಿ.",
  },
  bn: {
    title: "সাহায্য খুঁজুন",
    desc: "কমিউনিটি সাহায্য খুঁজতে একটি ক্যাটাগরি বেছে নিন বা ফিল্টার ব্যবহার করুন।",
  },
  ur: {
    title: "مدد تلاش کریں",
    desc: "کمیونٹی مدد تلاش کرنے کے لیے زمرہ منتخب کریں یا filters استعمال کریں۔",
  },
  mr: {
    title: "मदत शोधा",
    desc: "कम्युनिटी मदत शोधण्यासाठी श्रेणी निवडा किंवा filters वापरा.",
  },
  ml: {
    title: "സഹായം കണ്ടെത്തുക",
    desc: "കമ്മ്യൂണിറ്റി സഹായം കണ്ടെത്താൻ ഒരു വിഭാഗം തിരഞ്ഞെടുക്കുക അല്ലെങ്കിൽ filters ഉപയോഗിക്കുക.",
  },
  bho: {
    title: "मदद खोजीं",
    desc: "कम्युनिटी मदद खोजे खातिर एगो श्रेणी चुनीं या filters के इस्तेमाल करीं।",
  },
};


const initialForm = {
  title: "",
  category: "Food & Annadhanam",
  area: "",
  address: "",
  latitude: null,
  longitude: null,
  date: today(),
  start: "12:00",
  end: "14:30",
  notes: "",
};

function formatTime(time) {
  if (!time) return "";

  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";

  return `${hour % 12 || 12}:${String(minute).padStart(
    2,
    "0"
  )} ${suffix}`;
}

function formatServiceSchedule(service) {
  if (!service?.date) return "";

  const [year, month, day] = service.date.split("-").map(Number);
  const serviceDate = new Date(year, month - 1, day);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const isToday = serviceDate.getTime() === todayDate.getTime();

  const dateLabel = isToday
    ? "Today"
    : serviceDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });

  const start = formatTime(service.start);
  const end = formatTime(service.end);
  const timeLabel = start && end ? `${start} – ${end}` : start || end;

  return timeLabel ? `${dateLabel} • ${timeLabel}` : dateLabel;
}

function isServiceActive(service) {
  if (!service.date || !service.start || !service.end) {
    return false;
  }

  const now = new Date();

  const start = new Date(
    `${service.date}T${service.start}:00`
  );

  const end = new Date(
    `${service.date}T${service.end}:00`
  );

  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  return now >= start && now <= end;
}

function getServiceStatus(service) {
  if (!service.date || !service.start || !service.end) {
    return "upcoming";
  }

  const now = new Date();

  const start = new Date(
    `${service.date}T${service.start}:00`
  );

  const end = new Date(
    `${service.date}T${service.end}:00`
  );

  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  if (now < start) {
    return "upcoming";
  }

  if (now >= start && now <= end) {
    return "active";
  }

  return "completed";
}

function getDistanceKm(latitude1, longitude1, latitude2, longitude2) {
  const lat1 = Number(latitude1);
  const lon1 = Number(longitude1);
  const lat2 = Number(latitude2);
  const lon2 = Number(longitude2);

  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function formatDistanceKm(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "";
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}


function normalizeAssistantText(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[“”‘’]/g, '"')
    .replace(/[^\p{L}\p{N}\s&+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAssistantCategory(message = "") {
  const q = normalizeAssistantText(message);
  const categoryMap = [
    { name: "Food & Annadhanam", keys: ["food","annadhanam","meal","lunch","dinner","breakfast","bhojan","ఆహారం","అన్నదానం","భోజనం","खाना","भोजन","अन्नदान"] },
    { name: "Medical Help", keys: ["medical","doctor","hospital","clinic","medicine","health","treatment","camp","ambulance","pharmacy","వైద్య","ఆరోగ్య","డాక్టర్","హాస్పిటల్","మెడికల్","చికిత్స","इलाज","डॉक्टर","अस्पताल","मेडिकल","स्वास्थ्य","दवा"] },
    { name: "Blood Donation", keys: ["blood","donor","donate blood","blood bank","రక్త","రక్తదానం","బ్లడ్","रक्त","रक्तदान","ब्लड","डोनर"] },
    { name: "Education", keys: ["education","school","college","student","study","tuition","scholarship","books","learning","teacher","విద్య","స్కూల్","కాలేజ్","చదువు","విద్యార్థి","शिक्षा","स्कूल","कॉलेज","पढ़ाई","छात्र"] },
    { name: "Jobs & Skills", keys: ["job","jobs","employment","work","skill","skills","training","career","vacancy","hiring","ఉద్యోగ","జాబ్","పని","స్కిల్స్","శిక్షణ","उद्योग","नौकरी","रोजगार","काम","स्किल","प्रशिक्षण"] },
    { name: "Shelter & Essentials", keys: ["shelter","essentials","clothes","clothing","blanket","home","stay","accommodation","groceries","ఆశ్రయం","దుస్తులు","బట్టలు","వసతి","నిత్యావసరాలు","आश्रय","कपड़े","रहने","राशन"] },
    { name: "Donations & Volunteering", keys: ["donation","donations","volunteer","volunteering","charity","contribute","విరాళం","దానం","వాలంటీర్","సేవ చేయాలి","दान","स्वयंसेवक","वालंटियर","योगदान"] },
    { name: "Community Events", keys: ["event","events","festival","community event","program","meeting","ఈవెంట్","కార్యక్రమం","పండుగ","సమావేశం","कार्यक्रम","इवेंट","त्योहार"] },
    { name: "Other Help", keys: ["other help","general help","support","ఇతర సహాయం","సహాయం","సపోర్ట్","अन्य मदद","मदद","सहायता"] },
  ];
  return categoryMap.find((item) =>
    item.keys.some((key) => q.includes(normalizeAssistantText(key)))
  )?.name || "";
}

function getAssistantIntent(message = "") {
  const q = normalizeAssistantText(message);
  if (!q) return "welcome";
  if (/^(hi|hello|hey|namaste|good morning|good evening|నమస్కారం|హాయ్|హలో|नमस्ते|हाय)$/.test(q)) return "welcome";
  if (/(what can you do|how can you help|features|capabilities|మీరు ఏమి|ఏం చేయగల|क्या कर सकते|कैसे मदद)/.test(q)) return "capabilities";
  if (/(share|publish|add a service|post a service|community service.*(share|add|post)|షేర్|పంచ|పోస్ట్|సేవ.*పంచ|सेवा.*शेयर|सेवा.*जोड़)/.test(q)) return "share";
  if (/(privacy|private|login|sign in|account|లాగిన్|ప్రైవసీ|ఖాతా|लॉग.?इन|गोपनीय)/.test(q)) return "privacy";
  if (/(how.*work|how does|ఎలా పనిచేస్తుంది|ఎలా పని|कैसे काम)/.test(q)) return "how";
  if (/(what services|all services|available services|services available|ఏ సేవలు|సేవలు ఏవి|कौन सी सेवाएं|सभी सेवाएं)/.test(q)) return "all";
  if (/(active now|active services|currently active|right now|ఇప్పుడు active|ఇప్పుడు ఉన్న|अभी active)/.test(q)) return "active";
  if (/(today|ఈరోజు|నేడు|आज)/.test(q)) return "today";
  if (/(upcoming|coming|soon|next services|తర్వాత|రాబోయే|आने वाली|अगली)/.test(q)) return "upcoming";
  if (/(near me|nearby|around me|close to me|నా దగ్గర|దగ్గరలో|मेरे पास|पास में|आसपास)/.test(q)) return "near";
  if (/(completed|ended|finished|పూర్తైన|ముగిసిన|समाप्त|खत्म)/.test(q)) return "completed";
  if (/(suggest|recommend|what should i|help me choose|సజెస్ట్|సూచించు|सुझाव|सलाह)/.test(q)) return "suggest";
  if (/(directions|direction|how to reach|route|దారి|ఎలా వెళ్లాలి|రూట్|रास्ता|दिशा|कैसे पहुंच)/.test(q)) return "directions";
  if (/(details|more details|వివరాలు|వివరాలు చూపించు|विवरण)/.test(q)) return "details";
  if (getAssistantCategory(message)) return "category";
  return "search";
}

function canonicalAssistantCategory(value = "") {
  const normalized = normalizeAssistantText(value);
  const aliases = {
    "food": "Food & Annadhanam",
    "annadhanam": "Food & Annadhanam",
    "food & annadhanam": "Food & Annadhanam",
    "medical": "Medical Help",
    "medical help": "Medical Help",
    "health": "Medical Help",
    "blood": "Blood Donation",
    "blood donation": "Blood Donation",
    "education": "Education",
    "jobs": "Jobs & Skills",
    "jobs & skills": "Jobs & Skills",
    "shelter": "Shelter & Essentials",
    "shelter & essentials": "Shelter & Essentials",
    "donations": "Donations & Volunteering",
    "donations & volunteering": "Donations & Volunteering",
    "volunteering": "Donations & Volunteering",
    "events": "Community Events",
    "community events": "Community Events",
    "other help": "Other Help",
  };
  return aliases[normalized] || value;
}

function serviceMatchesCategory(service, category) {
  if (!category) return false;
  const wanted = normalizeAssistantText(category);
  const actual = normalizeAssistantText(service?.category || "");
  if (actual === wanted) return true;

  const keywordGroups = {
    "medical help": ["medical", "doctor", "hospital", "clinic", "health", "medicine", "treatment"],
    "blood donation": ["blood", "donor", "donation"],
    "food & annadhanam": ["food", "annadhanam", "meal", "lunch", "dinner"],
    "education": ["education", "school", "college", "student", "tuition", "scholarship"],
    "jobs & skills": ["job", "employment", "work", "skill", "training", "career"],
    "shelter & essentials": ["shelter", "essential", "clothes", "blanket", "accommodation", "groceries"],
    "donations & volunteering": ["donation", "volunteer", "charity", "contribute"],
    "community events": ["event", "festival", "program", "meeting"],
    "other help": ["other", "general help", "support"],
  };
  return (keywordGroups[wanted] || []).some((key) => actual.includes(key));
}

function findAssistantServices(message, services) {
  const q = normalizeAssistantText(message);
  const category = getAssistantCategory(message);

  // The main Jeevadanam service list hides completed services.
  // The assistant must follow the same rule and only search
  // services that are still active or upcoming.
  const availableServices = services.filter(
    (service) => getServiceStatus(service) !== "completed"
  );

  return availableServices.filter((service) => {
    const haystack = normalizeAssistantText(
      `${service.title || ""} ${service.category || ""} ${service.notes || ""} ${service.area || ""} ${service.address || ""}`
    );
    if (category && serviceMatchesCategory(service, category)) return true;

    const tokens = q.split(" ").filter((token) => token.length >= 3);
    if (!tokens.length) return false;
    return tokens.filter((token) => haystack.includes(token)).length >= Math.min(2, tokens.length);
  });
}

function getLocalAssistantReply(message, language, services) {
  const q = normalizeAssistantText(message);
  const availableServices = services.filter(
    (service) => getServiceStatus(service) !== "completed"
  );
  const active = availableServices.filter(isServiceActive);
  const upcoming = availableServices.filter((s) => getServiceStatus(s) === "upcoming");
  const todayServices = availableServices.filter((s) => s.date === today());
  const category = getAssistantCategory(message);
  const intent = getAssistantIntent(message);

  const r = {
    en: {
      welcome: "Hi 👋 I’m Jeevadanam Assistant. Ask me to find a service, filter services, use Near Me, open details, get directions, share a new service inside this chat, or explain anything on this website.",
      capabilities: "I can operate the Jeevadanam website for you: find services, filter medical/blood/food/education and other categories, use Near Me, show today/active/upcoming services, open details, open Maps directions, and complete a new service share from this panel.",
      all: `There are ${availableServices.length} currently available community service(s). Completed services are not included. I can narrow them by category, keyword, area or status.`,
      active: active.length ? `I found ${active.length} service(s) active right now: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "There are no services marked Active Now at the moment.",
      today: todayServices.length ? `I found ${todayServices.length} service(s) scheduled for today: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "I don't see any services scheduled for today.",
      upcoming: upcoming.length ? `I found ${upcoming.length} upcoming service(s): ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "I don't see any upcoming services right now.",
      completed: "Completed services are hidden from the main service list.",
      share: "Yes. We can publish a community service completely inside this AI panel. I’ll collect the service name, category, location, date, time and notes, then let you review and publish it here.",
      privacy: "Jeevadanam is an open community service platform. The service form does not ask for your name, phone number or email. Near Me is used only when you choose it.",
      how: "You can search by category, service or area, use Near Me, open details, get Directions, use Interested/Report, and share a new service. I can guide and trigger these actions from this panel.",
      suggest: "Tell me what kind of help you need and I’ll suggest matching services from the services currently loaded.",
      noServices: `I couldn't find a matching ${category || "community"} service in the currently loaded services. I won't invent a service. Try another keyword or area, or use Near Me.`,
      help: "Try: “medical help”, “blood donation”, “food near me”, “active services”, “today services”, “open Free Medical Camp”, “directions to Free Medical Camp”, or “I want to share a community service”.",
    },
    te: {
      welcome: "హాయ్ 👋 నేను Jeevadanam Assistant. Service వెతకడం, filters మార్చడం, Near Me, details, directions, కొత్త service ని ఈ chat లోనే share చేయడం మరియు website లోని features గురించి help చేయగలను.",
      capabilities: "నేను Jeevadanam website లోనే పని చేయగలను: medical/blood/food/education వంటి categories filter చేయడం, Near Me, today/active/upcoming services చూపించడం, details/directions తెరవడం, Interested/Report guide చేయడం, ఈ panel లోనే కొత్త service publish చేయడం.",
      all: `ప్రస్తుతం ${availableServices.length} community service(s) మాత్రమే available గా ఉన్నాయి. Completed services ని include చేయను. Category, keyword, area లేదా status ద్వారా filter చేయగలను.`,
      active: active.length ? `ఇప్పుడు ${active.length} service(s) active గా ఉన్నాయి: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "ప్రస్తుతం Active Now గా ఏ service లేదు.",
      today: todayServices.length ? `ఈరోజు ${todayServices.length} service(s) ఉన్నాయి: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "ఈరోజు services కనిపించలేదు.",
      upcoming: upcoming.length ? `రాబోయే ${upcoming.length} service(s) ఉన్నాయి: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "ప్రస్తుతం upcoming services కనిపించలేదు.",
      completed: "Completed services main service list లో కనిపించవు.",
      share: "అవును. Community service ని ఈ AI panel లోనే పూర్తిగా publish చేయవచ్చు. Service name, category, location, date, time, notes అడిగి review తర్వాత ఇక్కడే publish చేయిస్తాను.",
      privacy: "Jeevadanam open community service platform. Service form లో పేరు, phone number లేదా email అడగదు. Near Me మీరు ఎంచుకున్నప్పుడు మాత్రమే location ఉపయోగిస్తుంది.",
      how: "Category/search ద్వారా service వెతకవచ్చు, Near Me ఉపయోగించవచ్చు, details/directions చూడవచ్చు, Interested/Report చేయవచ్చు, కొత్త service share చేయవచ్చు. ఈ actions ని panel నుంచే guide చేయగలను.",
      suggest: "మీకు ఏ help కావాలో చెప్పండి. ప్రస్తుతం load అయిన Jeevadanam services నుంచి matching suggestions ఇస్తాను.",
      noServices: `ప్రస్తుతం load అయిన services లో ${category || "ఈ"} కి matching service కనిపించలేదు. మరో keyword/area ప్రయత్నించండి లేదా Near Me ఉపయోగించండి.`,
      help: "ఉదాహరణ: “medical help”, “blood donation”, “నా దగ్గర food”, “active services చూపించు”, “ఈరోజు services”, “Free Medical Camp details”, “ఈ service కి directions”, “community service share చేయాలి”.",
    },
    hi: {
      welcome: "नमस्ते 👋 मैं Jeevadanam Assistant हूँ। मैं service खोज सकता हूँ, filters बदल सकता हूँ, Near Me चला सकता हूँ, details/directions दिखा सकता हूँ, इसी chat में नई service publish करवा सकता हूँ और website समझा सकता हूँ।",
      capabilities: "मैं Jeevadanam website में काम कर सकता हूँ: medical/blood/food/education जैसी categories filter करना, Near Me, today/active/upcoming services, details/directions, Interested/Report की मदद और इसी panel में नई service publish करना।",
      all: `अभी ${availableServices.length} community service(s) उपलब्ध हैं। Completed services को count नहीं करूँगा। मैं category, keyword, area या status के अनुसार filter कर सकता हूँ।`,
      active: active.length ? `अभी ${active.length} service(s) active हैं: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "अभी कोई service Active Now नहीं है।",
      today: todayServices.length ? `आज ${todayServices.length} service(s) हैं: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "आज कोई service नहीं मिली।",
      upcoming: upcoming.length ? `${upcoming.length} upcoming service(s) हैं: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "अभी कोई upcoming service नहीं मिली।",
      completed: "Completed services main service list में hidden रहती हैं।",
      share: "हाँ। Community service को इसी AI panel में पूरा publish कर सकते हैं। मैं service name, category, location, date, time और notes लेकर review के बाद यहीं publish करवा दूँगा।",
      privacy: "Jeevadanam एक open community service platform है। Service form में नाम, phone number या email नहीं मांगा जाता। Near Me तभी location इस्तेमाल करता है जब आप उसे चुनते हैं।",
      how: "Category/search से service खोजें, Near Me इस्तेमाल करें, details/directions देखें, Interested/Report करें या नई service share करें। इन actions में मैं इसी panel से मदद कर सकता हूँ।",
      suggest: "आपको किस तरह की मदद चाहिए बताइए। मैं अभी loaded Jeevadanam services में से matching suggestions दूँगा।",
      noServices: `अभी loaded services में ${category || "इस"} के लिए matching service नहीं मिली। दूसरा keyword/area आज़माएँ या Near Me इस्तेमाल करें।`,
      help: "उदाहरण: “medical help”, “blood donation”, “मेरे पास food”, “active services दिखाओ”, “आज की services”, “Free Medical Camp details”, “इस service के directions”, “community service share करना है”.",
    },
    ta: {
      welcome: "வணக்கம் 👋 நான் Jeevadanam Assistant. சேவையைத் தேட, filters மாற்ற, Near Me பயன்படுத்த, details/directions பார்க்க, இந்த chat-லேயே புதிய service publish செய்ய உதவுவேன்.",
      capabilities: "Jeevadanam website-ஐ பயன்படுத்த நான் உதவலாம்: medical/blood/food/education போன்ற categories filter, Near Me, today/active/upcoming services, details/directions மற்றும் புதிய service publish.",
      all: `தற்போது ${availableServices.length} community service(s) கிடைக்கின்றன. Completed services சேர்க்கப்படாது.`,
      active: active.length ? `இப்போது ${active.length} service(s) active: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "இப்போது Active Now service எதுவும் இல்லை.",
      today: todayServices.length ? `இன்று ${todayServices.length} service(s) உள்ளன: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "இன்று எந்த service-மும் கிடைக்கவில்லை.",
      upcoming: upcoming.length ? `${upcoming.length} upcoming service(s) உள்ளன: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "upcoming services எதுவும் இல்லை.",
      completed: "Completed services main service list-ல் காட்டப்படாது.",
      share: "ஆம். இந்த AI panel-லேயே community service publish செய்யலாம். Service name, category, location, date, time மற்றும் notes எடுத்துக்கொண்டு review பிறகு publish செய்ய உதவுவேன்.",
      privacy: "Jeevadanam ஒரு open community service platform. Service form-ல் name, phone அல்லது email தேவையில்லை. Near Me நீங்கள் தேர்வு செய்தால் மட்டுமே location பயன்படுத்தப்படும்.",
      how: "Category/search மூலம் service தேடலாம், Near Me பயன்படுத்தலாம், details/directions பார்க்கலாம் மற்றும் புதிய service share செய்யலாம்.",
      suggest: "உங்களுக்கு எந்த உதவி வேண்டும் என்று சொல்லுங்கள். தற்போது உள்ள Jeevadanam services-ல் matching service-களை காட்டுவேன்.",
      noServices: `தற்போது ${category || "community"}க்கு matching service கிடைக்கவில்லை. வேறு keyword/area முயற்சிக்கவும் அல்லது Near Me பயன்படுத்தவும்.`,
      help: "உதாரணம்: “medical help”, “blood donation”, “food near me”, “active services”, “today services”, “Free Medical Camp details”.",
    },
    kn: {
      welcome: "ನಮಸ್ಕಾರ 👋 ನಾನು Jeevadanam Assistant. ಸೇವೆ ಹುಡುಕಲು, filters ಬದಲಿಸಲು, Near Me ಬಳಸಲು, details/directions ನೋಡಲು ಮತ್ತು ಈ chat ನಲ್ಲೇ ಹೊಸ service publish ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.",
      capabilities: "Jeevadanam website ನಲ್ಲಿ medical/blood/food/education categories filter, Near Me, today/active/upcoming services, details/directions ಮತ್ತು ಹೊಸ service publish ಮಾಡಲು ಸಹಾಯ ಮಾಡಬಹುದು.",
      all: `ಈಗ ${availableServices.length} community service(s) ಲಭ್ಯವಿವೆ. Completed services ಸೇರಿಸಲಾಗುವುದಿಲ್ಲ.`,
      active: active.length ? `ಈಗ ${active.length} service(s) active ಇವೆ: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "ಈಗ Active Now service ಇಲ್ಲ.",
      today: todayServices.length ? `ಇಂದು ${todayServices.length} service(s) ಇವೆ: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "ಇಂದು ಯಾವುದೇ service ಸಿಗಲಿಲ್ಲ.",
      upcoming: upcoming.length ? `${upcoming.length} upcoming service(s) ಇವೆ: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "ಯಾವುದೇ upcoming service ಇಲ್ಲ.",
      completed: "Completed services main service list ನಲ್ಲಿ ಕಾಣಿಸುವುದಿಲ್ಲ.",
      share: "ಹೌದು. ಈ AI panel ನಲ್ಲೇ community service publish ಮಾಡಬಹುದು. Service name, category, location, date, time ಮತ್ತು notes ಪಡೆದು review ನಂತರ publish ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.",
      privacy: "Jeevadanam open community service platform. Service form ನಲ್ಲಿ name, phone ಅಥವಾ email ಅಗತ್ಯವಿಲ್ಲ. Near Me ಆಯ್ಕೆ ಮಾಡಿದಾಗ ಮಾತ್ರ location ಬಳಸಲಾಗುತ್ತದೆ.",
      how: "Category/search ಮೂಲಕ service ಹುಡುಕಬಹುದು, Near Me ಬಳಸಬಹುದು, details/directions ನೋಡಬಹುದು ಮತ್ತು ಹೊಸ service share ಮಾಡಬಹುದು.",
      suggest: "ನಿಮಗೆ ಯಾವ ಸಹಾಯ ಬೇಕು ಎಂದು ಹೇಳಿ. ಪ್ರಸ್ತುತ Jeevadanam services ನಲ್ಲಿ matching services ತೋರಿಸುತ್ತೇನೆ.",
      noServices: `ಪ್ರಸ್ತುತ ${category || "community"}ಗೆ matching service ಸಿಗಲಿಲ್ಲ. ಬೇರೆ keyword/area ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ Near Me ಬಳಸಿ.`,
      help: "ಉದಾಹರಣೆ: “medical help”, “blood donation”, “food near me”, “active services”, “today services”.",
    },
    bn: {
      welcome: "নমস্কার 👋 আমি Jeevadanam Assistant। service খুঁজতে, filters বদলাতে, Near Me ব্যবহার করতে, details/directions দেখতে এবং এই chat থেকেই নতুন service publish করতে সাহায্য করব।",
      capabilities: "Jeevadanam website-এ medical/blood/food/education category filter, Near Me, today/active/upcoming services, details/directions এবং নতুন service publish করতে সাহায্য করতে পারি।",
      all: `এখন ${availableServices.length}টি community service available। Completed services ধরা হবে না।`,
      active: active.length ? `এখন ${active.length}টি service active: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "এখন কোনো Active Now service নেই।",
      today: todayServices.length ? `আজ ${todayServices.length}টি service আছে: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "আজ কোনো service পাওয়া যায়নি।",
      upcoming: upcoming.length ? `${upcoming.length}টি upcoming service আছে: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "কোনো upcoming service নেই।",
      completed: "Completed services main service list-এ দেখানো হয় না।",
      share: "হ্যাঁ। এই AI panel থেকেই community service publish করা যাবে। Service name, category, location, date, time এবং notes নিয়ে review-এর পরে publish করতে সাহায্য করব।",
      privacy: "Jeevadanam একটি open community service platform। Service form-এ name, phone বা email প্রয়োজন নেই। Near Me বেছে নিলে তবেই location ব্যবহার করা হয়।",
      how: "Category/search দিয়ে service খুঁজুন, Near Me ব্যবহার করুন, details/directions দেখুন এবং নতুন service share করুন।",
      suggest: "আপনার কী সাহায্য দরকার বলুন। বর্তমান Jeevadanam services থেকে matching service দেখাব।",
      noServices: `বর্তমান services-এ ${category || "community"}-এর জন্য matching service পাওয়া যায়নি। অন্য keyword/area চেষ্টা করুন বা Near Me ব্যবহার করুন।`,
      help: "উদাহরণ: “medical help”, “blood donation”, “food near me”, “active services”, “today services”.",
    },
    ur: {
      welcome: "السلام علیکم 👋 میں Jeevadanam Assistant ہوں۔ میں service تلاش کرنے، filters بدلنے، Near Me استعمال کرنے، details/directions دیکھنے اور اسی chat میں نئی service publish کرنے میں مدد کر سکتا ہوں۔",
      capabilities: "میں Jeevadanam website پر medical/blood/food/education categories filter، Near Me، today/active/upcoming services، details/directions اور نئی service publish کرنے میں مدد کر سکتا ہوں۔",
      all: `اس وقت ${availableServices.length} community service(s) دستیاب ہیں۔ Completed services شامل نہیں ہیں۔`,
      active: active.length ? `اس وقت ${active.length} service(s) active ہیں: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "اس وقت کوئی Active Now service نہیں ہے۔",
      today: todayServices.length ? `آج ${todayServices.length} service(s) ہیں: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "آج کوئی service نہیں ملی۔",
      upcoming: upcoming.length ? `${upcoming.length} upcoming service(s) ہیں: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "کوئی upcoming service نہیں ہے۔",
      completed: "Completed services main service list میں نہیں دکھائی جاتی ہیں۔",
      share: "جی ہاں۔ اسی AI panel میں community service publish کی جا سکتی ہے۔ میں service name, category, location, date, time اور notes لے کر review کے بعد publish میں مدد کروں گا۔",
      privacy: "Jeevadanam ایک open community service platform ہے۔ Service form میں name, phone یا email ضروری نہیں۔ Near Me صرف آپ کے انتخاب پر location استعمال کرتا ہے۔",
      how: "Category/search سے service تلاش کریں، Near Me استعمال کریں، details/directions دیکھیں اور نئی service share کریں۔",
      suggest: "آپ کو کس مدد کی ضرورت ہے بتائیں۔ میں موجود Jeevadanam services میں matching services دکھاؤں گا۔",
      noServices: `موجودہ services میں ${category || "community"} کے لیے matching service نہیں ملی۔ دوسرا keyword/area آزمائیں یا Near Me استعمال کریں۔`,
      help: "مثال: “medical help”, “blood donation”, “food near me”, “active services”, “today services”.",
    },
    mr: {
      welcome: "नमस्कार 👋 मी Jeevadanam Assistant आहे. Service शोधणे, filters बदलणे, Near Me वापरणे, details/directions पाहणे आणि याच chat मध्ये नवीन service publish करण्यास मदत करेन.",
      capabilities: "मी Jeevadanam website वर medical/blood/food/education categories filter, Near Me, today/active/upcoming services, details/directions आणि नवीन service publish करण्यात मदत करू शकतो.",
      all: `सध्या ${availableServices.length} community service(s) उपलब्ध आहेत. Completed services समाविष्ट नाहीत.`,
      active: active.length ? `सध्या ${active.length} service(s) active आहेत: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "सध्या कोणतीही Active Now service नाही.",
      today: todayServices.length ? `आज ${todayServices.length} service(s) आहेत: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "आज कोणतीही service मिळाली नाही.",
      upcoming: upcoming.length ? `${upcoming.length} upcoming service(s) आहेत: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "कोणतीही upcoming service नाही.",
      completed: "Completed services main service list मध्ये दिसत नाहीत.",
      share: "होय. याच AI panel मध्ये community service publish करता येते. Service name, category, location, date, time आणि notes घेऊन review नंतर publish करण्यात मदत करेन.",
      privacy: "Jeevadanam हे open community service platform आहे. Service form मध्ये name, phone किंवा email आवश्यक नाही. Near Me निवडल्यानंतरच location वापरली जाते.",
      how: "Category/search ने service शोधा, Near Me वापरा, details/directions पहा आणि नवीन service share करा.",
      suggest: "तुम्हाला कोणती मदत हवी ते सांगा. सध्या उपलब्ध Jeevadanam services मधून matching services दाखवेन.",
      noServices: `सध्या ${category || "community"} साठी matching service मिळाली नाही. दुसरा keyword/area वापरा किंवा Near Me वापरा.`,
      help: "उदाहरण: “medical help”, “blood donation”, “food near me”, “active services”, “today services”.",
    },
    ml: {
      welcome: "നമസ്കാരം 👋 ഞാൻ Jeevadanam Assistant ആണ്. Service കണ്ടെത്താനും filters മാറ്റാനും Near Me ഉപയോഗിക്കാനും details/directions കാണാനും ഈ chat-ൽ തന്നെ പുതിയ service publish ചെയ്യാനും സഹായിക്കും.",
      capabilities: "Jeevadanam website-ൽ medical/blood/food/education categories filter, Near Me, today/active/upcoming services, details/directions, പുതിയ service publish എന്നിവയിൽ സഹായിക്കാം.",
      all: `ഇപ്പോൾ ${availableServices.length} community service(s) ലഭ്യമാണ്. Completed services ഉൾപ്പെടുത്തില്ല.`,
      active: active.length ? `ഇപ്പോൾ ${active.length} service(s) active ആണ്: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "ഇപ്പോൾ Active Now service ഒന്നുമില്ല.",
      today: todayServices.length ? `ഇന്ന് ${todayServices.length} service(s) ഉണ്ട്: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "ഇന്ന് service ഒന്നും കണ്ടെത്താനായില്ല.",
      upcoming: upcoming.length ? `${upcoming.length} upcoming service(s) ഉണ്ട്: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "upcoming service ഒന്നുമില്ല.",
      completed: "Completed services main service list-ൽ കാണിക്കില്ല.",
      share: "അതെ. ഈ AI panel-ൽ തന്നെ community service publish ചെയ്യാം. Service name, category, location, date, time, notes എന്നിവ എടുത്ത് review കഴിഞ്ഞ് publish ചെയ്യാൻ സഹായിക്കും.",
      privacy: "Jeevadanam ഒരു open community service platform ആണ്. Service form-ൽ name, phone, email ആവശ്യമില്ല. Near Me തിരഞ്ഞെടുക്കുമ്പോൾ മാത്രം location ഉപയോഗിക്കും.",
      how: "Category/search ഉപയോഗിച്ച് service കണ്ടെത്താം, Near Me ഉപയോഗിക്കാം, details/directions കാണാം, പുതിയ service share ചെയ്യാം.",
      suggest: "നിങ്ങൾക്ക് എന്ത് സഹായമാണ് വേണ്ടത് പറയൂ. നിലവിലെ Jeevadanam services-ൽ matching services കാണിക്കും.",
      noServices: `നിലവിലെ services-ൽ ${category || "community"}-ന് matching service കണ്ടെത്താനായില്ല. മറ്റൊരു keyword/area പരീക്ഷിക്കുക അല്ലെങ്കിൽ Near Me ഉപയോഗിക്കുക.`,
      help: "ഉദാഹരണം: “medical help”, “blood donation”, “food near me”, “active services”, “today services”.",
    },
    bho: {
      welcome: "प्रणाम 👋 हम Jeevadanam Assistant बानी। Service खोजे, filters बदले, Near Me चलावे, details/directions देखे आ एह chat में नया service publish करे में मदद करब।",
      capabilities: "हम Jeevadanam website पर medical/blood/food/education category filter, Near Me, today/active/upcoming services, details/directions आ नया service publish करे में मदद कर सकतानी।",
      all: `अभी ${availableServices.length} community service(s) उपलब्ध बा। Completed services के गिनती ना होई।`,
      active: active.length ? `अभी ${active.length} service(s) active बा: ${active.slice(0,5).map(s=>s.title).join(", ")}.` : "अभी Active Now में कवनो service नइखे।",
      today: todayServices.length ? `आज ${todayServices.length} service(s) बा: ${todayServices.slice(0,5).map(s=>s.title).join(", ")}.` : "आज कवनो service ना मिलल।",
      upcoming: upcoming.length ? `${upcoming.length} upcoming service(s) बा: ${upcoming.slice(0,5).map(s=>s.title).join(", ")}.` : "कवनो upcoming service नइखे।",
      completed: "Completed services main service list में ना देखाई।",
      share: "हाँ। एह AI panel में community service publish कर सकतानी। Service name, category, location, date, time आ notes लेके review के बाद publish करे में मदद करब।",
      privacy: "Jeevadanam open community service platform बा। Service form में name, phone या email जरूरी नइखे। Near Me तबे location इस्तेमाल करेला जब रउआ चुनिले।",
      how: "Category/search से service खोजीं, Near Me इस्तेमाल करीं, details/directions देखीं आ नया service share करीं।",
      suggest: "रउआ के कइसन मदद चाहीं बताईं। अभी के Jeevadanam services में matching services देखाईं।",
      noServices: `अभी ${category || "community"} खातिर matching service ना मिलल। दोसर keyword/area आजमाईं या Near Me इस्तेमाल करीं।`,
      help: "उदाहरण: “medical help”, “blood donation”, “food near me”, “active services”, “today services”.",
    },
  }[language] || null;

  if (!q || intent === "welcome") return r.welcome;
  if (intent === "capabilities") return r.capabilities;
  if (intent === "share") return r.share;
  if (intent === "privacy") return r.privacy;
  if (intent === "how") return r.how;
  if (intent === "all") return r.all;
  if (intent === "active") return r.active;
  if (intent === "today") return r.today;
  if (intent === "upcoming") return r.upcoming;
  if (intent === "completed") return r.completed;
  if (intent === "suggest") {
    const matches = findAssistantServices(message, services);
    if (matches.length) {
      const names = matches.slice(0, 5).map((s) => s.title).join(", ");
      if (language === "te") return `మీ request కి matching గా ఇవి కనిపించాయి: ${names}.`;
      if (language === "hi") return `आपकी जरूरत से matching ये services मिलीं: ${names}.`;
      return `Based on your request, these matching services are available: ${names}.`;
    }
    return r.suggest;
  }

  const matches = findAssistantServices(message, services);

  if (["category","search","details","directions"].includes(intent)) {
    if (!matches.length) return r.noServices;
    const names = matches.slice(0,5).map(s=>s.title).join(", ");
    if (intent === "details") return language === "te" ? `${matches[0].title} details తెరవడానికి సిద్ధంగా ఉంది.` : language === "hi" ? `${matches[0].title} की details खोलने के लिए तैयार है।` : `I found ${matches[0].title}. I can open its full details for you.`;
    if (intent === "directions") return language === "te" ? `${matches[0].title} కి directions తెరవగలను.` : language === "hi" ? `${matches[0].title} के लिए directions खोल सकता हूँ।` : `I found ${matches[0].title}. I can open Google Maps directions for you.`;
    return language === "te" ? `${category ? `${category} లో ` : ""}${matches.length} matching service(s) కనిపించాయి: ${names}.` : language === "hi" ? `${category ? `${category} में ` : ""}${matches.length} matching service(s) मिलीं: ${names}.` : `I found ${matches.length} matching service(s): ${names}.`;
  }

  return r.help;
}

const JEEVADANAM_LANGUAGES = [
  ["en", "English", "English"],
  ["te", "తెలుగు", "తెలుగు"],
  ["hi", "हिन्दी", "हिन्दी"],
  ["ta", "தமிழ்", "தமிழ்"],
  ["kn", "ಕನ್ನಡ", "ಕನ್ನಡ"],
  ["bn", "বাংলা", "বাংলা"],
  ["ur", "اردو", "اردو"],
  ["mr", "मराठी", "मराठी"],
  ["ml", "മലയാളം", "മലയാളം"],
  ["bho", "भोजपुरी", "भोजपुरी"],
];

function App() {
  const [showJeevadanamIntro, setShowJeevadanamIntro] = useState(true);

  // Refresh service status automatically so Upcoming -> Active Now -> Completed
  // changes according to the real date/time even while the page stays open.
  const [serviceStatusTick, setServiceStatusTick] = useState(0);
  useEffect(() => {
  if (showJeevadanamIntro) return;

  const statusTimer = window.setInterval(() => {
    setServiceStatusTick((value) => value + 1);
  }, 30000);

  return () => window.clearInterval(statusTimer);
}, [showJeevadanamIntro]);
  // WEBSITE LANGUAGE: controls only the Jeevadanam site UI. Never sync this with aiLanguage.
  const [siteLanguage, setSiteLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem("jeevadanam-site-language");
      return JEEVADANAM_LANGUAGES.some(([code]) => code === saved) ? saved : "en";
    } catch {
      return "en";
    }
  });

  const SITE_TEXT = {
    en: { open:"Open Community Service", eyebrow:"INDIA • OPEN TO EVERYONE", title1:"Small acts of kindness.", title2:"A stronger community.", desc:"Find help, share resources and discover community services across India. Everyone is welcome.", share:"＋ Share a Community Service", simple:"SIMPLE • OPEN • COMMUNITY", how:"How does Jeevadanam work?", howDesc:"Find the help you need or share a service that can help someone in your community.", need:"I Need Help", findNear:"Find a community service near you.", choose:"Choose a category", find:"Find a service", get:"Get help", want:"I Want to Help", all:"All Services", today:"🟢 Today Only", active:"🔥 Active Now", near:"📍 Near Me", results:"All Community Services", feed:"Community feed", no:"No services found", reset:"Reset Search", details:"View Details", directions:"📍 Directions", shareBottom:"Have something to share?", cancel:"Cancel", findDesc:"Food, medical help, blood donation, education, jobs and more.", searchDesc:"Search by service, area or landmark. You can also use Near Me.", getDesc:"Check the details and use Directions to reach the location.", findCommunity:"Find Community Help →", wantDesc:"Share a useful service with others.", shareService:"Share a service", shareServiceDesc:"Add the name and category of the community service.", addLocation:"Add location & timing", addLocationDesc:"Add the public location, date and available time.", publishCommunity:"Publish for the community", publishCommunityDesc:"People can discover your service without creating an account.", shareAction:"＋ Share a Community Service", publish:"✓ Publish Service" },
    te: { open:"ఓపెన్ కమ్యూనిటీ సేవ", eyebrow:"ఖమ్మం • అందరికీ అందుబాటులో", title1:"చిన్న చిన్న సహాయాలు.", title2:"బలమైన సమాజం.", desc:"ఖమ్మంలో సహాయం, వనరులు మరియు కమ్యూనిటీ సేవలను కనుగొనండి. అందరికీ స్వాగతం.", share:"＋ కమ్యూనిటీ సేవను షేర్ చేయండి", simple:"సింపుల్ • ఓపెన్ • కమ్యూనిటీ", how:"Jeevadanam ఎలా పనిచేస్తుంది?", howDesc:"మీకు కావాల్సిన సహాయాన్ని కనుగొనండి లేదా మీ కమ్యూనిటీకి ఉపయోగపడే సేవను షేర్ చేయండి.", need:"నాకు సహాయం కావాలి", findNear:"మీ దగ్గర కమ్యూనిటీ సేవను కనుగొనండి.", choose:"కేటగిరీ ఎంచుకోండి", find:"సేవను కనుగొనండి", get:"సహాయం పొందండి", want:"నేను సహాయం చేయాలనుకుంటున్నాను", all:"అన్ని సేవలు", today:"🟢 ఈరోజు మాత్రమే", active:"🔥 ప్రస్తుతం యాక్టివ్", near:"📍 నా దగ్గర", results:"అన్ని కమ్యూనిటీ సేవలు", feed:"కమ్యూనిటీ ఫీడ్", no:"సేవలు కనిపించలేదు", reset:"సెర్చ్ రీసెట్", details:"వివరాలు చూడండి", directions:"📍 దారి చూపించు", shareBottom:"మీ దగ్గర షేర్ చేయడానికి ఏదైనా ఉందా?", cancel:"రద్దు", findDesc:"ఆహారం, వైద్య సహాయం, రక్తదానం, విద్య, ఉద్యోగాలు ఇంకా మరెన్నో.", searchDesc:"సేవ, ప్రాంతం లేదా ల్యాండ్‌మార్క్ ద్వారా వెతకండి. Near Me కూడా ఉపయోగించవచ్చు.", getDesc:"వివరాలు చూసి Directions ఉపయోగించి స్థానానికి చేరుకోండి.", findCommunity:"కమ్యూనిటీ సహాయం కనుగొనండి →", wantDesc:"ఇతరులతో ఉపయోగకరమైన సేవను పంచుకోండి.", shareService:"సేవను షేర్ చేయండి", shareServiceDesc:"కమ్యూనిటీ సేవ పేరు మరియు కేటగిరీని జోడించండి.", addLocation:"లొకేషన్ & సమయాన్ని జోడించండి", addLocationDesc:"పబ్లిక్ లొకేషన్, తేదీ మరియు అందుబాటులో ఉన్న సమయాన్ని జోడించండి.", publishCommunity:"కమ్యూనిటీ కోసం పబ్లిష్ చేయండి", publishCommunityDesc:"అకౌంట్ క్రియేట్ చేయకుండా ప్రజలు మీ సేవను కనుగొనగలరు.", shareAction:"＋ కమ్యూనిటీ సేవను షేర్ చేయండి", publish:"✓ సేవను పబ్లిష్ చేయండి" },
    hi: { open:"ओपन कम्युनिटी सर्विस", eyebrow:"खम्मम • सभी के लिए खुला", title1:"दयालुता के छोटे-छोटे काम।", title2:"एक मजबूत समुदाय।", desc:"खम्मम में मदद, संसाधन और कम्युनिटी सेवाएँ खोजें। सभी का स्वागत है।", share:"＋ कम्युनिटी सर्विस शेयर करें", simple:"सरल • खुला • समुदाय", how:"Jeevadanam कैसे काम करता है?", howDesc:"अपनी जरूरत की मदद खोजें या अपने समुदाय के लिए उपयोगी सेवा शेयर करें।", need:"मुझे मदद चाहिए", findNear:"अपने पास कम्युनिटी सर्विस खोजें।", choose:"कैटेगरी चुनें", find:"सर्विस खोजें", get:"मदद लें", want:"मैं मदद करना चाहता हूँ", all:"सभी सेवाएँ", today:"🟢 केवल आज", active:"🔥 अभी सक्रिय", near:"📍 मेरे पास", results:"सभी कम्युनिटी सेवाएँ", feed:"कम्युनिटी फीड", no:"कोई सेवा नहीं मिली", reset:"सर्च रीसेट", details:"विवरण देखें", directions:"📍 Directions", shareBottom:"क्या आपके पास शेयर करने के लिए कुछ है?", cancel:"रद्द करें", findDesc:"भोजन, चिकित्सा सहायता, रक्तदान, शिक्षा, नौकरियाँ और बहुत कुछ।", searchDesc:"सेवा, क्षेत्र या लैंडमार्क से खोजें। आप Near Me भी इस्तेमाल कर सकते हैं।", getDesc:"विवरण देखें और स्थान तक पहुँचने के लिए Directions का उपयोग करें।", findCommunity:"कम्युनिटी मदद खोजें →", wantDesc:"दूसरों के साथ उपयोगी सेवा साझा करें।", shareService:"सर्विस शेयर करें", shareServiceDesc:"कम्युनिटी सर्विस का नाम और कैटेगरी जोड़ें।", addLocation:"स्थान और समय जोड़ें", addLocationDesc:"सार्वजनिक स्थान, तारीख और उपलब्ध समय जोड़ें।", publishCommunity:"कम्युनिटी के लिए पब्लिश करें", publishCommunityDesc:"लोग बिना अकाउंट बनाए आपकी सेवा खोज सकते हैं।", shareAction:"＋ कम्युनिटी सर्विस शेयर करें", publish:"✓ सर्विस पब्लिश करें" },
    ta: { open:"திறந்த சமூக சேவை", eyebrow:"கம்மம் • அனைவருக்கும்", title1:"சிறிய கருணை செயல்கள்.", title2:"வலுவான சமூகம்.", desc:"கம்மத்தில் உதவி மற்றும் சமூக சேவைகளை கண்டறியுங்கள். அனைவரும் வரவேற்கப்படுகிறார்கள்.", share:"＋ சமூக சேவையைப் பகிரவும்", simple:"எளிமை • திறந்தது • சமூகம்", how:"Jeevadanam எப்படி செயல்படுகிறது?", howDesc:"உங்களுக்கு தேவையான உதவியை கண்டறியுங்கள் அல்லது சமூகத்திற்கு பயனுள்ள சேவையைப் பகிருங்கள்.", need:"எனக்கு உதவி வேண்டும்", findNear:"உங்கள் அருகிலுள்ள சமூக சேவையை கண்டறியுங்கள்.", choose:"வகையைத் தேர்வு செய்யவும்", find:"சேவையை கண்டறியவும்", get:"உதவி பெறுங்கள்", want:"நான் உதவ விரும்புகிறேன்", all:"அனைத்து சேவைகள்", today:"🟢 இன்று மட்டும்", active:"🔥 இப்போது செயலில்", near:"📍 அருகில்", results:"அனைத்து சமூக சேவைகள்", feed:"சமூக ஊட்டம்", no:"சேவைகள் எதுவும் கிடைக்கவில்லை", reset:"தேடலை மீட்டமை", details:"விவரங்களைப் பார்க்கவும்", directions:"📍 வழிகள்", shareBottom:"பகிர ஏதாவது உள்ளதா?", cancel:"ரத்து", findDesc:"உணவு, மருத்துவ உதவி, இரத்த தானம், கல்வி, வேலைகள் மற்றும் பல.", searchDesc:"சேவை, பகுதி அல்லது அடையாள இடம் மூலம் தேடுங்கள். Near Me-யையும் பயன்படுத்தலாம்.", getDesc:"விவரங்களைப் பார்த்து Directions மூலம் இடத்தை அடையுங்கள்.", findCommunity:"சமூக உதவியை கண்டறியுங்கள் →", wantDesc:"பயனுள்ள சேவையை மற்றவர்களுடன் பகிருங்கள்.", shareService:"சேவையைப் பகிரவும்", shareServiceDesc:"சமூக சேவையின் பெயர் மற்றும் வகையைச் சேர்க்கவும்.", addLocation:"இடம் & நேரத்தைச் சேர்க்கவும்", addLocationDesc:"பொது இடம், தேதி மற்றும் கிடைக்கும் நேரத்தைச் சேர்க்கவும்.", publishCommunity:"சமூகத்திற்காக வெளியிடவும்", publishCommunityDesc:"கணக்கு உருவாக்காமல் மக்கள் உங்கள் சேவையை கண்டறியலாம்.", shareAction:"＋ சமூக சேவையைப் பகிரவும்", publish:"✓ சேவையை வெளியிடவும்" },
    kn: { open:"ತೆರೆದ ಸಮುದಾಯ ಸೇವೆ", eyebrow:"ಖಮ್ಮಂ • ಎಲ್ಲರಿಗೂ ಮುಕ್ತ", title1:"ಚಿಕ್ಕ ದಯೆಯ ಕೆಲಸಗಳು.", title2:"ಬಲವಾದ ಸಮುದಾಯ.", desc:"ಖಮ್ಮಂನಲ್ಲಿ ಸಹಾಯ ಮತ್ತು ಸಮುದಾಯ ಸೇವೆಗಳನ್ನು ಹುಡುಕಿ. ಎಲ್ಲರಿಗೂ ಸ್ವಾಗತ.", share:"＋ ಸಮುದಾಯ ಸೇವೆಯನ್ನು ಹಂಚಿಕೊಳ್ಳಿ", simple:"ಸರಳ • ಮುಕ್ತ • ಸಮುದಾಯ", how:"Jeevadanam ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?", howDesc:"ನಿಮಗೆ ಬೇಕಾದ ಸಹಾಯವನ್ನು ಹುಡುಕಿ ಅಥವಾ ಸಮುದಾಯಕ್ಕೆ ಉಪಯುಕ್ತ ಸೇವೆಯನ್ನು ಹಂಚಿಕೊಳ್ಳಿ.", need:"ನನಗೆ ಸಹಾಯ ಬೇಕು", findNear:"ನಿಮ್ಮ ಹತ್ತಿರದ ಸಮುದಾಯ ಸೇವೆಯನ್ನು ಹುಡುಕಿ.", choose:"ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ", find:"ಸೇವೆಯನ್ನು ಹುಡುಕಿ", get:"ಸಹಾಯ ಪಡೆಯಿರಿ", want:"ನಾನು ಸಹಾಯ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ", all:"ಎಲ್ಲಾ ಸೇವೆಗಳು", today:"🟢 ಇಂದು ಮಾತ್ರ", active:"🔥 ಈಗ ಸಕ್ರಿಯ", near:"📍 ನನ್ನ ಹತ್ತಿರ", results:"ಎಲ್ಲಾ ಸಮುದಾಯ ಸೇವೆಗಳು", feed:"ಸಮುದಾಯ ಫೀಡ್", no:"ಯಾವುದೇ ಸೇವೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ", reset:"ಹುಡುಕಾಟ ಮರುಹೊಂದಿಸಿ", details:"ವಿವರಗಳನ್ನು ನೋಡಿ", directions:"📍 ದಾರಿ", shareBottom:"ಹಂಚಿಕೊಳ್ಳಲು ಏನಾದರೂ ಇದೆಯೇ?", cancel:"ರದ್ದು", findDesc:"ಆಹಾರ, ವೈದ್ಯಕೀಯ ಸಹಾಯ, ರಕ್ತದಾನ, ಶಿಕ್ಷಣ, ಉದ್ಯೋಗಗಳು ಮತ್ತು ಇನ್ನಷ್ಟು.", searchDesc:"ಸೇವೆ, ಪ್ರದೇಶ ಅಥವಾ ಲ್ಯಾಂಡ್‌ಮಾರ್ಕ್ ಮೂಲಕ ಹುಡುಕಿ. Near Me ಕೂಡ ಬಳಸಬಹುದು.", getDesc:"ವಿವರಗಳನ್ನು ನೋಡಿ ಮತ್ತು ಸ್ಥಳ ತಲುಪಲು Directions ಬಳಸಿ.", findCommunity:"ಸಮುದಾಯ ಸಹಾಯ ಹುಡುಕಿ →", wantDesc:"ಉಪಯುಕ್ತ ಸೇವೆಯನ್ನು ಇತರರೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳಿ.", shareService:"ಸೇವೆಯನ್ನು ಹಂಚಿಕೊಳ್ಳಿ", shareServiceDesc:"ಸಮುದಾಯ ಸೇವೆಯ ಹೆಸರು ಮತ್ತು ವರ್ಗವನ್ನು ಸೇರಿಸಿ.", addLocation:"ಸ್ಥಳ & ಸಮಯ ಸೇರಿಸಿ", addLocationDesc:"ಸಾರ್ವಜನಿಕ ಸ್ಥಳ, ದಿನಾಂಕ ಮತ್ತು ಲಭ್ಯ ಸಮಯವನ್ನು ಸೇರಿಸಿ.", publishCommunity:"ಸಮುದಾಯಕ್ಕಾಗಿ ಪ್ರಕಟಿಸಿ", publishCommunityDesc:"ಖಾತೆ ರಚಿಸದೆ ಜನರು ನಿಮ್ಮ ಸೇವೆಯನ್ನು ಕಂಡುಹಿಡಿಯಬಹುದು.", shareAction:"＋ ಸಮುದಾಯ ಸೇವೆಯನ್ನು ಹಂಚಿಕೊಳ್ಳಿ", publish:"✓ ಸೇವೆ ಪ್ರಕಟಿಸಿ" },
    bn: { open:"ওপেন কমিউনিটি সার্ভিস", eyebrow:"খাম্মাম • সবার জন্য উন্মুক্ত", title1:"ছোট ছোট দয়ার কাজ।", title2:"একটি শক্তিশালী সম্প্রদায়।", desc:"খাম্মামে সাহায্য ও কমিউনিটি পরিষেবা খুঁজুন। সবাই স্বাগত।", share:"＋ কমিউনিটি সার্ভিস শেয়ার করুন", simple:"সহজ • উন্মুক্ত • কমিউনিটি", how:"Jeevadanam কীভাবে কাজ করে?", howDesc:"আপনার প্রয়োজনের সাহায্য খুঁজুন অথবা কমিউনিটির জন্য দরকারী পরিষেবা শেয়ার করুন।", need:"আমার সাহায্য দরকার", findNear:"আপনার কাছের কমিউনিটি সার্ভিস খুঁজুন।", choose:"ক্যাটাগরি বেছে নিন", find:"সার্ভিস খুঁজুন", get:"সাহায্য নিন", want:"আমি সাহায্য করতে চাই", all:"সব সার্ভিস", today:"🟢 শুধু আজ", active:"🔥 এখন সক্রিয়", near:"📍 আমার কাছে", results:"সব কমিউনিটি সার্ভিস", feed:"কমিউনিটি ফিড", no:"কোনও সার্ভিস পাওয়া যায়নি", reset:"সার্চ রিসেট", details:"বিস্তারিত দেখুন", directions:"📍 দিকনির্দেশ", shareBottom:"শেয়ার করার মতো কিছু আছে?", cancel:"বাতিল", findDesc:"খাবার, চিকিৎসা সহায়তা, রক্তদান, শিক্ষা, চাকরি এবং আরও অনেক কিছু।", searchDesc:"সার্ভিস, এলাকা বা ল্যান্ডমার্ক দিয়ে খুঁজুন। Near Me-ও ব্যবহার করতে পারেন।", getDesc:"বিস্তারিত দেখুন এবং Directions ব্যবহার করে অবস্থানে পৌঁছান।", findCommunity:"কমিউনিটি সাহায্য খুঁজুন →", wantDesc:"অন্যদের সঙ্গে একটি দরকারী সার্ভিস শেয়ার করুন।", shareService:"সার্ভিস শেয়ার করুন", shareServiceDesc:"কমিউনিটি সার্ভিসের নাম ও ক্যাটাগরি যোগ করুন।", addLocation:"লোকেশন ও সময় যোগ করুন", addLocationDesc:"পাবলিক লোকেশন, তারিখ এবং উপলব্ধ সময় যোগ করুন।", publishCommunity:"কমিউনিটির জন্য প্রকাশ করুন", publishCommunityDesc:"অ্যাকাউন্ট তৈরি না করেই মানুষ আপনার সার্ভিস খুঁজে পেতে পারে।", shareAction:"＋ কমিউনিটি সার্ভিস শেয়ার করুন", publish:"✓ সার্ভিস প্রকাশ করুন" },
    ur: { open:"اوپن کمیونٹی سروس", eyebrow:"کھمم • سب کے لیے کھلا", title1:"مہربانی کے چھوٹے کام۔", title2:"ایک مضبوط برادری۔", desc:"کھمم میں مدد اور کمیونٹی خدمات تلاش کریں۔ سب کا خیرمقدم ہے۔", share:"＋ کمیونٹی سروس شیئر کریں", simple:"آسان • کھلا • کمیونٹی", how:"Jeevadanam کیسے کام کرتا ہے؟", howDesc:"اپنی ضرورت کی مدد تلاش کریں یا کمیونٹی کے لیے مفید سروس شیئر کریں۔", need:"مجھے مدد چاہیے", findNear:"اپنے قریب کمیونٹی سروس تلاش کریں۔", choose:"زمرہ منتخب کریں", find:"سروس تلاش کریں", get:"مدد حاصل کریں", want:"میں مدد کرنا چاہتا ہوں", all:"تمام سروسز", today:"🟢 صرف آج", active:"🔥 ابھی فعال", near:"📍 میرے قریب", results:"تمام کمیونٹی سروسز", feed:"کمیونٹی فیڈ", no:"کوئی سروس نہیں ملی", reset:"تلاش ری سیٹ", details:"تفصیلات دیکھیں", directions:"📍 راستہ", shareBottom:"کیا آپ کے پاس شیئر کرنے کے لیے کچھ ہے؟", cancel:"منسوخ", findDesc:"کھانا، طبی مدد، خون کا عطیہ، تعلیم، ملازمتیں اور بہت کچھ۔", searchDesc:"سروس، علاقے یا لینڈ مارک کے ذریعے تلاش کریں۔ Near Me بھی استعمال کر سکتے ہیں۔", getDesc:"تفصیلات دیکھیں اور مقام تک پہنچنے کے لیے Directions استعمال کریں۔", findCommunity:"کمیونٹی مدد تلاش کریں →", wantDesc:"دوسروں کے ساتھ مفید سروس شیئر کریں۔", shareService:"سروس شیئر کریں", shareServiceDesc:"کمیونٹی سروس کا نام اور زمرہ شامل کریں۔", addLocation:"مقام اور وقت شامل کریں", addLocationDesc:"عوامی مقام، تاریخ اور دستیاب وقت شامل کریں۔", publishCommunity:"کمیونٹی کے لیے شائع کریں", publishCommunityDesc:"لوگ اکاؤنٹ بنائے بغیر آپ کی سروس تلاش کر سکتے ہیں۔", shareAction:"＋ کمیونٹی سروس شیئر کریں", publish:"✓ سروس شائع کریں" },
    mr: { open:"ओपन कम्युनिटी सर्व्हिस", eyebrow:"खम्मम • सर्वांसाठी खुले", title1:"दयाळूपणाची छोटी कामे.", title2:"एक मजबूत समुदाय.", desc:"खम्मममध्ये मदत आणि कम्युनिटी सेवा शोधा. सर्वांचे स्वागत आहे.", share:"＋ कम्युनिटी सर्व्हिस शेअर करा", simple:"सोपे • खुले • समुदाय", how:"Jeevadanam कसे काम करते?", howDesc:"तुम्हाला हवी असलेली मदत शोधा किंवा समुदायासाठी उपयुक्त सेवा शेअर करा.", need:"मला मदत हवी", findNear:"तुमच्या जवळची कम्युनिटी सेवा शोधा.", choose:"श्रेणी निवडा", find:"सेवा शोधा", get:"मदत मिळवा", want:"मला मदत करायची आहे", all:"सर्व सेवा", today:"🟢 फक्त आज", active:"🔥 सध्या सक्रिय", near:"📍 माझ्या जवळ", results:"सर्व कम्युनिटी सेवा", feed:"कम्युनिटी फीड", no:"कोणतीही सेवा सापडली नाही", reset:"शोध रीसेट", details:"तपशील पहा", directions:"📍 दिशा", shareBottom:"शेअर करण्यासाठी काही आहे का?", cancel:"रद्द करा", findDesc:"अन्न, वैद्यकीय मदत, रक्तदान, शिक्षण, नोकऱ्या आणि बरेच काही.", searchDesc:"सेवा, परिसर किंवा लँडमार्कनुसार शोधा. Near Me देखील वापरू शकता.", getDesc:"तपशील पहा आणि ठिकाणी पोहोचण्यासाठी Directions वापरा.", findCommunity:"कम्युनिटी मदत शोधा →", wantDesc:"उपयुक्त सेवा इतरांसोबत शेअर करा.", shareService:"सेवा शेअर करा", shareServiceDesc:"कम्युनिटी सेवेचे नाव आणि श्रेणी जोडा.", addLocation:"ठिकाण आणि वेळ जोडा", addLocationDesc:"सार्वजनिक ठिकाण, तारीख आणि उपलब्ध वेळ जोडा.", publishCommunity:"कम्युनिटीसाठी प्रकाशित करा", publishCommunityDesc:"अकाउंट न बनवता लोक तुमची सेवा शोधू शकतात.", shareAction:"＋ कम्युनिटी सेवा शेअर करा", publish:"✓ सेवा प्रकाशित करा" },
    ml: { open:"ഓപ്പൺ കമ്മ്യൂണിറ്റി സർവീസ്", eyebrow:"ഖമ്മം • എല്ലാവർക്കും തുറന്നത്", title1:"ചെറിയ കരുണാപ്രവർത്തികൾ.", title2:"ശക്തമായ ഒരു സമൂഹം.", desc:"ഖമ്മത്തിൽ സഹായവും കമ്മ്യൂണിറ്റി സേവനങ്ങളും കണ്ടെത്തുക. എല്ലാവർക്കും സ്വാഗതം.", share:"＋ കമ്മ്യൂണിറ്റി സർവീസ് പങ്കിടുക", simple:"ലളിതം • തുറന്നത് • കമ്മ്യൂണിറ്റി", how:"Jeevadanam എങ്ങനെ പ്രവർത്തിക്കുന്നു?", howDesc:"നിങ്ങൾക്ക് ആവശ്യമുള്ള സഹായം കണ്ടെത്തുക അല്ലെങ്കിൽ സമൂഹത്തിന് ഉപകാരപ്പെടുന്ന സേവനം പങ്കിടുക.", need:"എനിക്ക് സഹായം വേണം", findNear:"നിങ്ങളുടെ അടുത്തുള്ള കമ്മ്യൂണിറ്റി സേവനം കണ്ടെത്തുക.", choose:"വിഭാഗം തിരഞ്ഞെടുക്കുക", find:"സേവനം കണ്ടെത്തുക", get:"സഹായം നേടുക", want:"എനിക്ക് സഹായിക്കണം", all:"എല്ലാ സേവനങ്ങളും", today:"🟢 ഇന്ന് മാത്രം", active:"🔥 ഇപ്പോൾ സജീവം", near:"📍 എന്റെ സമീപം", results:"എല്ലാ കമ്മ്യൂണിറ്റി സേവനങ്ങളും", feed:"കമ്മ്യൂണിറ്റി ഫീഡ്", no:"സേവനങ്ങളൊന്നും കണ്ടെത്തിയില്ല", reset:"തിരയൽ റീസെറ്റ്", details:"വിശദാംശങ്ങൾ കാണുക", directions:"📍 ദിശകൾ", shareBottom:"പങ്കിടാൻ എന്തെങ്കിലും ഉണ്ടോ?", cancel:"റദ്ദാക്കുക", findDesc:"ഭക്ഷണം, വൈദ്യസഹായം, രക്തദാനം, വിദ്യാഭ്യാസം, ജോലികൾ എന്നിവയും മറ്റു സഹായങ്ങളും.", searchDesc:"സേവനം, പ്രദേശം അല്ലെങ്കിൽ ലാൻഡ്മാർക്ക് ഉപയോഗിച്ച് തിരയുക. Near Meയും ഉപയോഗിക്കാം.", getDesc:"വിശദാംശങ്ങൾ പരിശോധിച്ച് Directions ഉപയോഗിച്ച് സ്ഥലത്ത് എത്തുക.", findCommunity:"കമ്മ്യൂണിറ്റി സഹായം കണ്ടെത്തുക →", wantDesc:"ഉപകാരപ്രദമായ ഒരു സേവനം മറ്റുള്ളവരുമായി പങ്കിടുക.", shareService:"സേവനം പങ്കിടുക", shareServiceDesc:"കമ്മ്യൂണിറ്റി സേവനത്തിന്റെ പേരും വിഭാഗവും ചേർക്കുക.", addLocation:"ലൊക്കേഷനും സമയവും ചേർക്കുക", addLocationDesc:"പൊതു ലൊക്കേഷൻ, തീയതി, ലഭ്യമായ സമയം എന്നിവ ചേർക്കുക.", publishCommunity:"കമ്മ്യൂണിറ്റിക്കായി പ്രസിദ്ധീകരിക്കുക", publishCommunityDesc:"അക്കൗണ്ട് സൃഷ്ടിക്കാതെ ആളുകൾക്ക് നിങ്ങളുടെ സേവനം കണ്ടെത്താം.", shareAction:"＋ കമ്മ്യൂണിറ്റി സേവനം പങ്കിടുക", publish:"✓ സേവനം പ്രസിദ്ധീകരിക്കുക" },
    bho: { open:"ओपन कम्युनिटी सेवा", eyebrow:"खम्मम • सभे खातिर खुलल", title1:"नेकी के छोट-छोट काम।", title2:"मजबूत समाज।", desc:"खम्मम में मदद आ कम्युनिटी सेवा खोजीं। सभे के स्वागत बा।", share:"＋ कम्युनिटी सेवा शेयर करीं", simple:"सरल • खुलल • कम्युनिटी", how:"Jeevadanam कइसे काम करेला?", howDesc:"अपना जरूरत के मदद खोजीं या समाज खातिर उपयोगी सेवा शेयर करीं।", need:"हमरा मदद चाहीं", findNear:"अपना लगे कम्युनिटी सेवा खोजीं।", choose:"श्रेणी चुनीं", find:"सेवा खोजीं", get:"मदद लीं", want:"हम मदद करे चाहतानी", all:"सभे सेवा", today:"🟢 खाली आज", active:"🔥 अभी चालू", near:"📍 हमरा लगे", results:"सभे कम्युनिटी सेवा", feed:"कम्युनिटी फीड", no:"कवनो सेवा ना मिलल", reset:"सर्च रीसेट", details:"विवरण देखीं", directions:"📍 रास्ता", shareBottom:"शेयर करे खातिर कुछ बा?", cancel:"रद्द करीं", findDesc:"खाना, इलाज के मदद, रक्तदान, पढ़ाई, नौकरी आ अउरी बहुत कुछ।", searchDesc:"सेवा, इलाका या लैंडमार्क से खोजीं। Near Me भी इस्तेमाल कर सकतानी।", getDesc:"विवरण देखीं आ Directions से जगह पर पहुँचीं।", findCommunity:"कम्युनिटी मदद खोजीं →", wantDesc:"काम के सेवा दोसरा लोग के साथ शेयर करीं।", shareService:"सेवा शेयर करीं", shareServiceDesc:"कम्युनिटी सेवा के नाम आ श्रेणी जोड़ीं।", addLocation:"जगह आ समय जोड़ीं", addLocationDesc:"पब्लिक जगह, तारीख आ उपलब्ध समय जोड़ीं।", publishCommunity:"कम्युनिटी खातिर पब्लिश करीं", publishCommunityDesc:"बिना अकाउंट बनवले लोग रउआ के सेवा खोज सकेला।", shareAction:"＋ कम्युनिटी सेवा शेयर करीं", publish:"✓ सेवा पब्लिश करीं" },
  };

  const siteT = (key) => SITE_TEXT[siteLanguage]?.[key] || SITE_TEXT.en[key] || key;
  // CATEGORY LABELS
  // Do NOT pass "food"/"medical"/"blood" through SITE_TEXT keys.
  // Those keys do not exist there, which was the reason the UI
  // displayed the short database/alias names.
  const siteCategory = (category) => {
    const canonical = canonicalAssistantCategory(category);

    const labels = {
      en: {
        "All Services": "All Services",
        "Food & Annadhanam": "Food & Annadhanam",
        "Medical Help": "Medical Help",
        "Blood Donation": "Blood Donation",
        "Education": "Education",
        "Jobs & Skills": "Jobs & Skills",
        "Shelter & Essentials": "Shelter & Essentials",
        "Donations & Volunteering": "Donations & Volunteering",
        "Community Events": "Community Events",
        "Other Help": "Other Help",
      },
      te: {
        "All Services": "అన్ని సేవలు",
        "Food & Annadhanam": "ఆహారం & అన్నదానం",
        "Medical Help": "వైద్య సహాయం",
        "Blood Donation": "రక్తదానం",
        "Education": "విద్య",
        "Jobs & Skills": "ఉద్యోగాలు & నైపుణ్యాలు",
        "Shelter & Essentials": "ఆశ్రయం & నిత్యావసరాలు",
        "Donations & Volunteering": "విరాళాలు & స్వచ్ఛంద సేవ",
        "Community Events": "కమ్యూనిటీ ఈవెంట్స్",
        "Other Help": "ఇతర సహాయం",
      },
      hi: {
        "All Services": "सभी सेवाएँ",
        "Food & Annadhanam": "भोजन और अन्नदान",
        "Medical Help": "चिकित्सा सहायता",
        "Blood Donation": "रक्तदान",
        "Education": "शिक्षा",
        "Jobs & Skills": "नौकरी और कौशल",
        "Shelter & Essentials": "आश्रय और आवश्यक वस्तुएँ",
        "Donations & Volunteering": "दान और स्वयंसेवा",
        "Community Events": "कम्युनिटी इवेंट्स",
        "Other Help": "अन्य सहायता",
      },
      ta: {
        "All Services": "அனைத்து சேவைகள்",
        "Food & Annadhanam": "உணவு & அன்னதானம்",
        "Medical Help": "மருத்துவ உதவி",
        "Blood Donation": "இரத்த தானம்",
        "Education": "கல்வி",
        "Jobs & Skills": "வேலைகள் & திறன்கள்",
        "Shelter & Essentials": "தங்குமிடம் & அத்தியாவசியங்கள்",
        "Donations & Volunteering": "நன்கொடைகள் & தன்னார்வ சேவை",
        "Community Events": "சமூக நிகழ்வுகள்",
        "Other Help": "பிற உதவி",
      },
      kn: {
        "All Services": "ಎಲ್ಲಾ ಸೇವೆಗಳು",
        "Food & Annadhanam": "ಆಹಾರ & ಅನ್ನದಾನ",
        "Medical Help": "ವೈದ್ಯಕೀಯ ಸಹಾಯ",
        "Blood Donation": "ರಕ್ತದಾನ",
        "Education": "ಶಿಕ್ಷಣ",
        "Jobs & Skills": "ಉದ್ಯೋಗಗಳು & ಕೌಶಲ್ಯಗಳು",
        "Shelter & Essentials": "ಆಶ್ರಯ & ಅಗತ್ಯ ವಸ್ತುಗಳು",
        "Donations & Volunteering": "ದೇಣಿಗೆಗಳು & ಸ್ವಯಂಸೇವೆ",
        "Community Events": "ಸಮುದಾಯ ಕಾರ್ಯಕ್ರಮಗಳು",
        "Other Help": "ಇತರೆ ಸಹಾಯ",
      },
      bn: {
        "All Services": "সব সার্ভিস",
        "Food & Annadhanam": "খাবার ও অন্নদান",
        "Medical Help": "চিকিৎসা সহায়তা",
        "Blood Donation": "রক্তদান",
        "Education": "শিক্ষা",
        "Jobs & Skills": "চাকরি ও দক্ষতা",
        "Shelter & Essentials": "আশ্রয় ও প্রয়োজনীয় জিনিস",
        "Donations & Volunteering": "দান ও স্বেচ্ছাসেবা",
        "Community Events": "কমিউনিটি ইভেন্ট",
        "Other Help": "অন্যান্য সাহায্য",
      },
      ur: {
        "All Services": "تمام سروسز",
        "Food & Annadhanam": "کھانا اور انا دان",
        "Medical Help": "طبی مدد",
        "Blood Donation": "خون کا عطیہ",
        "Education": "تعلیم",
        "Jobs & Skills": "ملازمتیں اور ہنر",
        "Shelter & Essentials": "پناہ اور ضروریات",
        "Donations & Volunteering": "عطیات اور رضاکارانہ خدمت",
        "Community Events": "کمیونٹی ایونٹس",
        "Other Help": "دیگر مدد",
      },
      mr: {
        "All Services": "सर्व सेवा",
        "Food & Annadhanam": "अन्न व अन्नदान",
        "Medical Help": "वैद्यकीय मदत",
        "Blood Donation": "रक्तदान",
        "Education": "शिक्षण",
        "Jobs & Skills": "नोकरी व कौशल्ये",
        "Shelter & Essentials": "निवारा व आवश्यक वस्तू",
        "Donations & Volunteering": "देणगी व स्वयंसेवा",
        "Community Events": "समुदाय कार्यक्रम",
        "Other Help": "इतर मदत",
      },
      ml: {
        "All Services": "എല്ലാ സേവനങ്ങളും",
        "Food & Annadhanam": "ഭക്ഷണം & അന്നദാനം",
        "Medical Help": "വൈദ്യസഹായം",
        "Blood Donation": "രക്തദാനം",
        "Education": "വിദ്യാഭ്യാസം",
        "Jobs & Skills": "ജോലികളും കഴിവുകളും",
        "Shelter & Essentials": "അഭയവും അവശ്യസാധനങ്ങളും",
        "Donations & Volunteering": "സംഭാവനകളും സന്നദ്ധസേവനവും",
        "Community Events": "കമ്മ്യൂണിറ്റി ഇവന്റുകൾ",
        "Other Help": "മറ്റ് സഹായം",
      },
      bho: {
        "All Services": "सभे सेवा",
        "Food & Annadhanam": "खाना आ अन्नदान",
        "Medical Help": "इलाज के मदद",
        "Blood Donation": "रक्तदान",
        "Education": "शिक्षा",
        "Jobs & Skills": "नौकरी आ कौशल",
        "Shelter & Essentials": "आश्रय आ जरूरी सामान",
        "Donations & Volunteering": "दान आ स्वेच्छा सेवा",
        "Community Events": "कम्युनिटी कार्यक्रम",
        "Other Help": "दोसरा मदद",
      },
    };

    return labels[siteLanguage]?.[canonical] || labels.en[canonical] || canonical || category;
  };
  const changeSiteLanguage = (language) => {
    const next = JEEVADANAM_LANGUAGES.some(([code]) => code === language) ? language : "en";
    setSiteLanguage(next);
    try { localStorage.setItem("jeevadanam-site-language", next); } catch {}
    setLanguageMenuOpen(false);
  };

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState("");

  /*
    -------------------------------------------------------
    GLOBAL BROWSER ID
    One browser gets one ID.
    No login required.
    -------------------------------------------------------
  */
  const [clientId] = useState(() => {
    let id = localStorage.getItem("jeevadanam-client-id");

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("jeevadanam-client-id", id);
    }

    return id;
  });

  /*
    -------------------------------------------------------
    GLOBAL REACTIONS FROM SUPABASE
    -------------------------------------------------------
  */
  const [reactions, setReactions] = useState([]);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] =
    useState("All Services");

  const [categoryDropdownOpen, setCategoryDropdownOpen] =
    useState(false);

  useEffect(() => {
    if (!categoryDropdownOpen) return;

    const closeCategoryDropdown = (event) => {
      const dropdown = event.target.closest?.(".service-category-dropdown");
      if (!dropdown) {
        setCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeCategoryDropdown);
    return () => {
      document.removeEventListener("pointerdown", closeCategoryDropdown);
    };
  }, [categoryDropdownOpen]);

  const [filter, setFilter] = useState("all");

  // Viewer location used only by the Near Me feed filter.
  // This is separate from the location stored for a shared community service.
  const [currentUserLocation, setCurrentUserLocation] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [selected, setSelected] = useState(null);

  

  /*
    -------------------------------------------------------
    LOAD REACTIONS
    -------------------------------------------------------
  */
  async function loadReactions() {
    const { data, error } = await supabase
      .from("service_reactions")
      .select(
        "id, service_id, client_id, reaction_type"
      );

    if (error) {
      console.error(
        "Reaction loading error:",
        error
      );
      return;
    }

    setReactions(data || []);
  }

  /*
    -------------------------------------------------------
    LOAD SERVICES
    -------------------------------------------------------
  */
  async function loadServices() {
    setLoadingServices(true);
    setServicesError("");

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setServicesError(error.message);
      setLoadingServices(false);
      return;
    }

    const mappedServices = (data || []).map(
      (item) => ({
        ...item,

        // Keep one category source of truth across the entire UI.
        // Older database rows may contain short values such as
        // "food", "medical", "blood"; convert them to the full
        // Jeevadanam category names when loading.
        category: canonicalAssistantCategory(item.category || ""),

        area: item.area || "",

        start: item.start_time
          ? new Date(item.start_time)
              .toTimeString()
              .slice(0, 5)
          : "",

        end: item.end_time
          ? new Date(item.end_time)
              .toTimeString()
              .slice(0, 5)
          : "",

        date: item.start_time
          ? new Date(item.start_time)
              .toISOString()
              .slice(0, 10)
          : "",

        notes: item.description || "",

        interestedCount:
          item.interested_count || 0,

        reportCount: 0,

        status: "public",
      })
    );

    setServices(mappedServices);
    setLoadingServices(false);
  }

  /*
    -------------------------------------------------------
    INITIAL LOAD
    -------------------------------------------------------
  */
  useEffect(() => {
    loadServices();
    loadReactions();
  }, []);

  /*
    -------------------------------------------------------
    REACTION COUNT
    -------------------------------------------------------
  */
  function getReactionCount(
    serviceId,
    reactionType
  ) {
    return reactions.filter(
      (reaction) =>
        reaction.service_id === serviceId &&
        reaction.reaction_type === reactionType
    ).length;
  }

  /*
    -------------------------------------------------------
    CHECK WHETHER CURRENT BROWSER REACTED
    -------------------------------------------------------
  */
  function hasReacted(
    serviceId,
    reactionType
  ) {
    return reactions.some(
      (reaction) =>
        reaction.service_id === serviceId &&
        reaction.client_id === clientId &&
        reaction.reaction_type === reactionType
    );
  }

  /*
    -------------------------------------------------------
    GLOBAL INTERESTED / REPORT TOGGLE
    -------------------------------------------------------
  */
  async function handleReaction(
    serviceId,
    reactionType
  ) {
    /*
      Sample/demo cards don't exist in Supabase,
      so don't try to insert reactions for them.
    */
    if (String(serviceId).startsWith("demo-")) {
      return;
    }

    const existingReaction =
      reactions.find(
        (reaction) =>
          reaction.service_id === serviceId &&
          reaction.client_id === clientId &&
          reaction.reaction_type ===
            reactionType
      );

    /*
      If already clicked:
      REMOVE reaction
    */
    if (existingReaction) {
      const { error } = await supabase
        .from("service_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (error) {
        console.error(
          "Remove reaction error:",
          error
        );
        return;
      }
    }

    /*
      If not clicked:
      ADD reaction
    */
    else {
      const { error } = await supabase
        .from("service_reactions")
        .insert({
          service_id: serviceId,
          client_id: clientId,
          reaction_type: reactionType,
        });

      if (error) {
        console.error(
          "Add reaction error:",
          error
        );
        return;
      }
    }

    /*
      Refresh global data
    */
    await loadReactions();
  }

  /*
    -------------------------------------------------------
    ALL SERVICES
    -------------------------------------------------------
  */
  const allServices = useMemo(
  () => services,
  [services]
);

  /*
    -------------------------------------------------------
    FILTER SERVICES
    -------------------------------------------------------
  */
  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = allServices.filter((service) => {
      /*
        Automatically hide completed services
      */
      const status = getServiceStatus(service);

      if (status === "completed") {
        return false;
      }

      // Near Me is a location filter, not a text search.
      if (filter === "near") {
        if (!currentUserLocation) return false;

        const distanceKm = getDistanceKm(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          service.latitude,
          service.longitude
        );

        // Services without saved coordinates cannot be placed on the Near Me feed.
        // Keep the radius practical for a local community-service directory.
        if (distanceKm === null || distanceKm > 25) {
          return false;
        }
      }

      const matchesSearch =
        filter === "near"
          ? true
          : [
              service.title,
              service.category,
              service.area,
              service.address,
              service.notes,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);

      const matchesCategory =
        activeCategory === "All Services" ||
        service.category === activeCategory;

      const matchesDate =
        filter !== "today" ||
        service.date === today();

      const matchesActive =
        filter !== "active" ||
        isServiceActive(service);

      const matchesUpcoming =
        filter !== "upcoming" ||
        status === "upcoming";

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDate &&
        matchesActive &&
        matchesUpcoming
      );
    });

    if (filter === "near" && currentUserLocation) {
      return [...filtered].sort((a, b) => {
        const distanceA = getDistanceKm(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          a.latitude,
          a.longitude
        );
        const distanceB = getDistanceKm(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          b.latitude,
          b.longitude
        );

        return (distanceA ?? Infinity) - (distanceB ?? Infinity);
      });
    }

    // Keep Active Now services above Upcoming services.
    // Status is calculated from the current date/time and refreshed automatically.
    // Within each status, keep the earliest scheduled service first.
    return [...filtered].sort((a, b) => {
      const statusRank = {
        active: 0,
        upcoming: 1,
        completed: 2,
      };

      const rankA = statusRank[getServiceStatus(a)] ?? 3;
      const rankB = statusRank[getServiceStatus(b)] ?? 3;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      const scheduleA = `${a.date || ""}T${a.start || "00:00"}`;
      const scheduleB = `${b.date || ""}T${b.start || "00:00"}`;

      return scheduleA.localeCompare(scheduleB);
    });
  }, [
    allServices,
    search,
    activeCategory,
    filter,
    currentUserLocation,
    serviceStatusTick,
  ]);

  /*
    -------------------------------------------------------
    RESET SEARCH
    -------------------------------------------------------
  */
  function resetSearch() {
    setSearch("");
    setActiveCategory("All Services");
    setFilter("all");
    setCurrentUserLocation(null);
  }

  /*
    -------------------------------------------------------
    FORM UPDATE
    -------------------------------------------------------
  */
  function updateForm(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /*
    -------------------------------------------------------
    OPEN SHARE FORM
    -------------------------------------------------------
  */
  function openForm() {
    setError("");
    setLocationError("");
    setForm(initialForm);
    setModalOpen(true);
    fetchCurrentLocation();
  }

  /*
    -------------------------------------------------------
    CURRENT LOCATION
    -------------------------------------------------------
  */
  async function fetchCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError(
        "Location is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        try {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
  );

  if (!response.ok) {
    throw new Error("Location lookup failed");
  }

  const data = await response.json();

  const fullAddress =
    data.display_name ||
    latitude + ", " + longitude;

  setForm((previous) => ({
    ...previous,
    area: fullAddress,
    address: fullAddress,
    latitude,
    longitude,
  }));
} catch {
  setForm((previous) => ({
    ...previous,
    area:
      latitude.toFixed(5) +
      ", " +
      longitude.toFixed(5),
    address:
      latitude +
      ", " +
      longitude,
    latitude,
    longitude,
  }));

  setLocationError(
    "Full address could not be fetched. Coordinates added instead."
  );
} finally {
  setLocationLoading(false);
}
      },

      (geoError) => {
        setLocationLoading(false);

        if (geoError.code === 1) {
          setLocationError(
            "Location permission denied. Please enter your area manually."
          );
        } else {
          setLocationError(
            "Unable to fetch location. Please enter your area manually."
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  /*
    -------------------------------------------------------
    PUBLISH SERVICE
    -------------------------------------------------------
  */
  async function publishService(event) {
    event.preventDefault();
    setError("");

    if (
      !form.area.trim() ||
      !form.address.trim() ||
      !form.date ||
      !form.start ||
      !form.end ||
      !form.notes.trim()
    ) {
      setError(
        "Please complete all required fields."
      );
      return;
    }

    if (form.end <= form.start) {
      setError(
        "End time must be after start time."
      );
      return;
    }

    const startDateTime = new Date(
      `${form.date}T${form.start}:00`
    );

    const endDateTime = new Date(
      `${form.date}T${form.end}:00`
    );

    const {
      data,
      error: insertError,
    } = await supabase
      .from("services")
      .insert({
        title: form.title.trim() || form.category,
        description: form.notes.trim(),
        category: form.category,
        area: form.area.trim(),
        address: form.address.trim(),
        latitude:
          form.latitude ?? null,
        longitude:
          form.longitude ?? null,
        start_time:
          startDateTime.toISOString(),
        end_time:
          endDateTime.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const newService = {
      ...data,

      area: form.area.trim(),

      title: form.title.trim() || form.category,

      date: form.date,

      start: form.start,

      end: form.end,

      notes: form.notes.trim(),

      interestedCount: 0,

      reportCount: 0,

      status: "public",
    };

    setServices((previous) => [
      newService,
      ...previous,
    ]);

    setModalOpen(false);
    setForm(initialForm);
    setSearch("");
    setActiveCategory("All Services");
    setFilter("all");
    setCurrentUserLocation(null);
  }

  /*
    -------------------------------------------------------
    NEAR ME
    -------------------------------------------------------
  */
  function useMyLocation() {
    if (!navigator.geolocation) {
      alert(
        "Location is not supported by this browser."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        // Near Me filters the existing Jeevadanam feed.
        // It must not open Google Maps and it must not turn GPS coordinates into a search query.
        setSearch("");
        setFilter("near");
      },

      () => {
        setCurrentUserLocation(null);
        setFilter("all");
        alert(
          "Location permission was not granted."
        );
      }
    );
  }

  /*
    -------------------------------------------------------
    GOOGLE MAPS DIRECTIONS
    -------------------------------------------------------
  */
  function openDirections(
    address,
    latitude,
    longitude
  ) {
    // Directions has its own location-permission flow.
    // It does NOT silently use the service location or GPS.
    if (!navigator.geolocation) {
      alert(
        "Location is not supported by this browser."
      );
      return;
    }

    // Directions opens Google Maps directly in a NEW TAB.
    // Jeevadanam stays open in the current tab.
    let destination = address || "";

    if (
      latitude !== null &&
      latitude !== undefined &&
      longitude !== null &&
      longitude !== undefined
    ) {
      destination = `${latitude},${longitude}`;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const origin = `${coords.latitude},${coords.longitude}`;

        const url =
          `https://www.google.com/maps/dir/?api=1` +
          `&origin=${encodeURIComponent(origin)}` +
          `&destination=${encodeURIComponent(
            destination
          )}` +
          `&travelmode=driving`;

        // Navigate directly to Google Maps.
        // This avoids opening an unwanted about:blank tab.
        window.location.assign(url);
      },
      () => {
        alert(
          "Location permission is required to get directions from your current location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
    if (!destination) {
      alert("This service does not have a valid location.");
      return;
    }

    const openMaps = (origin = "") => {
      const url =
        `https://www.google.com/maps/dir/?api=1` +
        (origin
          ? `&origin=${encodeURIComponent(origin)}`
          : "") +
        `&destination=${encodeURIComponent(destination)}` +
        `&travelmode=driving`;

      window.open(url, "_blank", "noopener,noreferrer");
    };

    // Do not change the existing location-permission flow.
    // If location permission is already granted, use a fresh GPS position
    // as the Maps origin. Otherwise, open Maps using its normal current-location behavior.
    if (!navigator.permissions || !navigator.geolocation) {
      openMaps();
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state !== "granted") {
          openMaps();
          return;
        }

        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            openMaps(`${coords.latitude},${coords.longitude}`);
          },
          () => {
            openMaps();
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      })
      .catch(() => {
        openMaps();
      });
  }

  /* -------------------------------------------------------
     JEEVADANAM AI ASSISTANT
     The assistant can control the existing Jeevadanam UI and
     can also complete service sharing inside this panel.
  ------------------------------------------------------- */
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLanguage, setAiLanguage] = useState(() => {
    try {
      return localStorage.getItem("jeevadanam-ai-language") || "en";
    } catch {
      return "en";
    }
  });
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const languageMenuRef = useRef(null);

  // Close the website-language dropdown when the user taps/clicks anywhere outside it.
  useEffect(() => {
    if (!languageMenuOpen) return;

    const handleOutsideLanguageClick = (event) => {
      if (!languageMenuRef.current?.contains(event.target)) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideLanguageClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideLanguageClick);
    };
  }, [languageMenuOpen]);
  const [aiInput, setAiInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [aiThinkMode, setAiThinkMode] = useState(false);
  const [aiListening, setAiListening] = useState(false);
  const aiRecognitionRef = useRef(null);
  const aiMic = useMicrophone();
  const [aiShareOpen, setAiShareOpen] = useState(false);
  const [aiShareDraft, setAiShareDraft] = useState({
    title: "",
    category: "Food & Annadhanam",
    area: "",
    address: "",
    pincode: "",
    latitude: null,
    longitude: null,
    date: today(),
    start: "12:00",
    end: "14:30",
    notes: "",
  });

  // Never silently choose the first geocoding result. Village names can be
  // duplicated, so the user must confirm the exact place before publishing.
  const [aiLocationCandidates, setAiLocationCandidates] = useState([]);

  const aiChatMessagesRef = useRef(null);

  const [aiMessages, setAiMessages] = useState(() => [
    {
      role: "assistant",
      text: getLocalAssistantReply("", "en", []),
    },
  ]);

  function toggleAIListening() {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (aiListening && aiRecognitionRef.current) {
      aiRecognitionRef.current.stop();
      try {
        aiMic.stop();
      } catch {
        // VoiceBeam microphone may already be stopped.
      }
      return;
    }

    try {
      aiMic.start();
    } catch {
      // SpeechRecognition can still work if the VoiceBeam microphone cannot start.
    }

    const recognition = new Recognition();
    recognition.lang =
      aiLanguage === "te"
        ? "te-IN"
        : aiLanguage === "hi"
        ? "hi-IN"
        : "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setAiListening(true);
    recognition.onend = () => {
      setAiListening(false);
      aiRecognitionRef.current = null;
      try {
        aiMic.stop();
      } catch {
        // Ignore if the microphone is already stopped.
      }
    };
    recognition.onerror = () => {
      setAiListening(false);
      aiRecognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setAiInput(transcript);
    };

    aiRecognitionRef.current = recognition;
    recognition.start();
  }

  function addAIMessage(text, extra = {}) {
    setAiMessages((previous) => [
      ...previous,
      { role: "assistant", text, ...extra },
    ]);
  }

  // Always keep the latest user/assistant message visible.
  // This also handles typing indicators and the in-panel share form.
  useEffect(() => {
    const chat = aiChatMessagesRef.current;
    if (!chat) return;

    const scrollToLatestMessage = () => {
      chat.scrollTo({
        top: chat.scrollHeight,
        behavior: "smooth",
      });
    };

    // Wait for the new message/form to be painted before measuring scrollHeight.
    requestAnimationFrame(scrollToLatestMessage);
    const timer = window.setTimeout(scrollToLatestMessage, 80);

    return () => window.clearTimeout(timer);
  }, [aiMessages, aiTyping, aiShareOpen]);

  function scrollToServices() {
    setTimeout(() => {
      document.querySelector(".services-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }

  function getSpecificAssistantService(message) {
    const q = normalizeAssistantText(message);
    if (!q) return null;

    const direct = allServices.find((service) => {
      const title = normalizeAssistantText(service.title || "");
      return title && (q.includes(title) || title.includes(q));
    });

    if (direct) return direct;

    const tokens = q
      .split(" ")
      .filter((token) => token.length >= 3)
      .filter(
        (token) =>
          ![
            "open",
            "show",
            "details",
            "detail",
            "service",
            "the",
            "this",
            "give",
            "directions",
            "direction",
            "route",
            "to",
          ].includes(token)
      );

    if (!tokens.length) return null;

    return allServices.find((service) => {
      const haystack = normalizeAssistantText(
        `${service.title || ""} ${service.area || ""} ${service.address || ""}`
      );
      return tokens.filter((token) => haystack.includes(token)).length >= Math.min(2, tokens.length);
    }) || null;
  }

  function startAIShare() {
    setAiShareOpen(true);
    setAiShareDraft({
      title: "",
      category: "Food & Annadhanam",
      area: "",
      address: "",
      latitude: null,
      longitude: null,
      date: today(),
      start: "12:00",
      end: "14:30",
      notes: "",
    });

    const text =
      aiLanguage === "te"
        ? "సరే 👍 ఈ panel లోనే service publish చేద్దాం. క్రింద details fill చేయండి. Location కోసం “Use my location” కూడా నొక్కవచ్చు."
        : aiLanguage === "hi"
        ? "ठीक है 👍 इसी panel में service publish करते हैं। नीचे details भरें। Location के लिए “Use my location” भी दबा सकते हैं।"
        : "Sure 👍 Let’s publish the service completely inside this panel. Fill the details below. You can also use “Use my location” for the location.";

    addAIMessage(text);
  }

  async function useAILocation() {
    if (!navigator.geolocation) {
      addAIMessage(
        aiLanguage === "te"
          ? "ఈ browser location support చేయడం లేదు. Area/address manually ఇవ్వండి."
          : aiLanguage === "hi"
          ? "इस browser में location support नहीं है। Area/address manually भरें।"
          : "This browser does not support location. Please enter the area/address manually."
      );
      return;
    }

    setAiTyping(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`
          );

          const data = response.ok ? await response.json() : null;
          const address =
            data?.display_name ||
            `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;

          setAiShareDraft((previous) => ({
            ...previous,
            area: address,
            address,
            pincode: data?.address?.postcode || "",
            latitude: coords.latitude,
            longitude: coords.longitude,
          }));

          addAIMessage(
            aiLanguage === "te"
              ? `📍 Location తీసుకున్నాను: ${address}`
              : aiLanguage === "hi"
              ? `📍 Location मिल गई: ${address}`
              : `📍 Location captured: ${address}`
          );
        } catch {
          setAiShareDraft((previous) => ({
            ...previous,
            area: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
            address: `${coords.latitude}, ${coords.longitude}`,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }));

          addAIMessage(
            aiLanguage === "te"
              ? "📍 Coordinates తీసుకున్నాను. Area/address verify చేసి publish చేయండి."
              : aiLanguage === "hi"
              ? "📍 Coordinates मिल गए। Publish करने से पहले area/address verify करें।"
              : "📍 Coordinates captured. Please verify the area/address before publishing."
          );
        } finally {
          setAiTyping(false);
        }
      },
      () => {
        setAiTyping(false);
        addAIMessage(
          aiLanguage === "te"
            ? "Location permission రాలేదు. Area/address manually ఇవ్వండి."
            : aiLanguage === "hi"
            ? "Location permission नहीं मिली। Area/address manually भरें।"
            : "Location permission was not granted. Please enter the area/address manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  async function searchAIServiceLocation(query) {
    const text = String(query || "").trim();
    if (!text) {
      addAIMessage(
        aiLanguage === "te"
          ? "📍 Village/area, landmark లేదా PIN code enter చేయండి."
          : aiLanguage === "hi"
          ? "📍 Village/area, landmark या PIN code दर्ज करें।"
          : "📍 Enter a village/area, landmark or PIN code."
      );
      return;
    }

    setAiTyping(true);
    setAiLocationCandidates([]);
    try {
      // Keep the search inside India. Do not use result #1 automatically because
      // a village name may exist in multiple nearby places.
      const isPin = /^\d{6}$/.test(text);
      const queryText = isPin ? text : text;
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=in&dedupe=1` +
        `&q=${encodeURIComponent(queryText)}`;

      const response = await fetch(url);
      const results = response.ok ? await response.json() : [];

      if (!results.length) {
        addAIMessage(
          aiLanguage === "te"
            ? `❌ “${text}” exact location దొరకలేదు. Village + mandal + district + state లేదా 6-digit PIN code తో try చేయండి.`
            : aiLanguage === "hi"
            ? `❌ “${text}” exact location नहीं मिली। Village + mandal + district + state या 6-digit PIN code से try करें।`
            : `❌ I couldn't find an exact place for “${text}”. Try village + mandal + district + state, or the 6-digit PIN code.`
        );
        return;
      }

      const candidates = results.map((result) => {
        const a = result.address || {};
        return {
          raw: result,
          display: result.display_name || text,
          area:
            a.village ||
            a.town ||
            a.city ||
            a.municipality ||
            a.suburb ||
            a.county ||
            "",
          district: a.state_district || a.district || a.county || "",
          mandal: a.mandal || a.subdistrict || "",
          state: a.state || "",
          pincode: a.postcode || "",
          latitude: Number(result.lat),
          longitude: Number(result.lon),
          type: result.type || result.class || "place",
        };
      });

      // Remove duplicate coordinates/addresses while preserving useful alternatives.
      const unique = candidates.filter((item, index, arr) =>
        index ===
        arr.findIndex(
          (x) =>
            x.display === item.display ||
            (x.latitude === item.latitude && x.longitude === item.longitude)
        )
      );

      setAiLocationCandidates(unique);

      addAIMessage(
        aiLanguage === "te"
          ? `📍 ${unique.length} possible location${unique.length > 1 ? "s" : ""} దొరికాయి. తప్పు village select కాకుండా కింద సరైన location ని మీరు confirm చేయండి.`
          : aiLanguage === "hi"
          ? `📍 ${unique.length} possible location${unique.length > 1 ? "s" : ""} मिलीं। गलत village select न हो, इसलिए नीचे सही location confirm करें।`
          : `📍 I found ${unique.length} possible location${unique.length > 1 ? "s" : ""}. I won't automatically choose one, because village names can be duplicated. Select the exact service location below.`,
        { locationCandidates: true }
      );
    } catch {
      addAIMessage(
        aiLanguage === "te"
          ? "❌ Location search లో problem వచ్చింది. Village + district + state లేదా PIN code తో మళ్లీ try చేయండి."
          : aiLanguage === "hi"
          ? "❌ Location search में समस्या आई। Village + district + state या PIN code से फिर try करें।"
          : "❌ Location search failed. Try the village + district + state or the PIN code again."
      );
    } finally {
      setAiTyping(false);
    }
  }

  function selectAIServiceLocation(candidate) {
    const { area, district, mandal, state, pincode, display, latitude, longitude } = candidate;
    const locationLabel = [area, mandal, district, state].filter(Boolean).join(", ");

    setAiShareDraft((previous) => ({
      ...previous,
      area: area || previous.area,
      address: display,
      pincode: pincode || previous.pincode,
      latitude,
      longitude,
    }));
    setAiLocationCandidates([]);

    addAIMessage(
      aiLanguage === "te"
        ? `✅ Service location confirm చేశాను.\n📍 ${locationLabel || display}${pincode ? `\nPIN: ${pincode}` : "\n⚠️ PIN code దొరకలేదు — publish ముందు 6-digit PIN code enter చేయండి."}`
        : aiLanguage === "hi"
        ? `✅ Service location confirm कर दी।\n📍 ${locationLabel || display}${pincode ? `\nPIN: ${pincode}` : "\n⚠️ PIN code नहीं मिला — publish से पहले 6-digit PIN code दर्ज करें।"}`
        : `✅ Service location confirmed.\n📍 ${locationLabel || display}${pincode ? `\nPIN: ${pincode}` : "\n⚠️ PIN code was not found — enter the 6-digit PIN before publishing."}`
    );
  }

  async function publishAIService() {
    const draft = aiShareDraft;

    if (
      !draft.title.trim() ||
      !draft.area.trim() ||
      !draft.address.trim() ||
      !/^\d{6}$/.test(String(draft.pincode || "").trim()) ||
      !draft.date ||
      !draft.start ||
      !draft.end
    ) {
      addAIMessage(
        aiLanguage === "te"
          ? "⚠️ Title, category, area, address, date, start time, end time పూర్తి చేయండి."
          : aiLanguage === "hi"
          ? "⚠️ Title, category, area, address, date, start time और end time पूरा करें।"
          : "⚠️ Please complete the title, category, area, address, date, start time and end time."
      );
      return;
    }

    if (draft.end <= draft.start) {
      addAIMessage(
        aiLanguage === "te"
          ? "⚠️ End time start time కంటే తర్వాత ఉండాలి."
          : aiLanguage === "hi"
          ? "⚠️ End time, start time के बाद होना चाहिए।"
          : "⚠️ End time must be after start time."
      );
      return;
    }

    setAiTyping(true);

    try {
      const startDateTime = new Date(`${draft.date}T${draft.start}:00`);
      const endDateTime = new Date(`${draft.date}T${draft.end}:00`);

      const { data, error: insertError } = await supabase
        .from("services")
        .insert({
          title: draft.title.trim(),
          description: draft.notes.trim(),
          category: draft.category,
          area: draft.area.trim(),
          address: `${draft.address.trim()}${draft.pincode ? `, PIN: ${draft.pincode}` : ""}`,
          latitude: draft.latitude ?? null,
          longitude: draft.longitude ?? null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newService = {
        ...data,
        area: draft.area.trim(),
        date: draft.date,
        start: draft.start,
        end: draft.end,
        notes: draft.notes.trim(),
        interestedCount: 0,
        reportCount: 0,
        status: "public",
      };

      setServices((previous) => [newService, ...previous]);
      setSearch("");
      setActiveCategory("All Services");
      setFilter("all");
      setAiShareOpen(false);

      addAIMessage(
        aiLanguage === "te"
          ? `✅ Service publish అయింది: ${newService.title}. ఇప్పుడు Jeevadanam services లో కనిపిస్తుంది.`
          : aiLanguage === "hi"
          ? `✅ Service publish हो गई: ${newService.title}. अब यह Jeevadanam services में दिखाई देगी।`
          : `✅ Service published: ${newService.title}. It is now available in Jeevadanam services.`
      );
    } catch (error) {
      console.error("AI service publish error:", error);
      addAIMessage(
        aiLanguage === "te"
          ? `❌ Service publish కాలేదు: ${error?.message || "Unknown error"}`
          : aiLanguage === "hi"
          ? `❌ Service publish नहीं हुई: ${error?.message || "Unknown error"}`
          : `❌ The service could not be published: ${error?.message || "Unknown error"}`
      );
    } finally {
      setAiTyping(false);
    }
  }

  async function sendAIMessage(event) {
    event?.preventDefault();
    const message = aiInput.trim();
    if (!message || aiTyping) return;

    setAiMessages((previous) => [
      ...previous,
      { role: "user", text: message },
    ]);
    setAiInput("");

    // During the share flow, natural-language replies can fill the form.
    if (aiShareOpen) {
      const q = normalizeAssistantText(message);

      if (/(cancel|close|వద్దు|రద్దు|बंद|रद्द)/.test(q)) {
        setAiShareOpen(false);
        addAIMessage(
          aiLanguage === "te"
            ? "సరే, service sharing cancel చేశాను."
            : aiLanguage === "hi"
            ? "ठीक है, service sharing cancel कर दी।"
            : "Okay, I cancelled the service sharing flow."
        );
        return;
      }

      if (/(use my location|my location|నా location|నా లొకేషన్|నా దగ్గర location|मेरी location|मेरा location)/.test(q)) {
        await useAILocation();
        return;
      }

      // If title is empty, treat the message as the service title.
      if (!aiShareDraft.title.trim()) {
        setAiShareDraft((previous) => ({ ...previous, title: message }));
        addAIMessage(
          aiLanguage === "te"
            ? "👍 Service name save చేశాను. ఇప్పుడు category select చేయండి లేదా category name type చేయండి."
            : aiLanguage === "hi"
            ? "👍 Service name save कर लिया। अब category चुनें या category का नाम लिखें।"
            : "👍 Service name saved. Now choose a category or type the category name."
        );
        return;
      }

      const category = getAssistantCategory(message);
      if (category) {
        setAiShareDraft((previous) => ({ ...previous, category }));
        addAIMessage(
          aiLanguage === "te"
            ? `✅ Category: ${category}. ఇప్పుడు Area / public location ఇవ్వండి.`
            : aiLanguage === "hi"
            ? `✅ Category: ${category}. अब Area / public location दें।`
            : `✅ Category: ${category}. Now enter the area / public location.`
        );
        return;
      }

      if (!aiShareDraft.area.trim()) {
        setAiShareDraft((previous) => ({
          ...previous,
          area: message,
          address: previous.address || message,
        }));
        addAIMessage(
          aiLanguage === "te"
            ? "📍 Area save చేశాను. Exact public address/landmark కూడా ఇవ్వండి లేదా Use my location నొక్కండి."
            : aiLanguage === "hi"
            ? "📍 Area save कर लिया। Exact public address/landmark दें या Use my location दबाएँ।"
            : "📍 Area saved. Now enter the public address/landmark, or use Use my location."
        );
        return;
      }

      if (!aiShareDraft.address.trim()) {
        setAiShareDraft((previous) => ({ ...previous, address: message }));
        addAIMessage(
          aiLanguage === "te"
            ? "📌 Address save చేశాను. ఇప్పుడు date ఇవ్వండి (YYYY-MM-DD)."
            : aiLanguage === "hi"
            ? "📌 Address save कर लिया। अब date दें (YYYY-MM-DD)।"
            : "📌 Address saved. Now enter the date (YYYY-MM-DD)."
        );
        return;
      }

      if (!aiShareDraft.date || aiShareDraft.date === today()) {
        const dateMatch = message.match(/\b\d{4}-\d{2}-\d{2}\b/);
        if (dateMatch) {
          setAiShareDraft((previous) => ({ ...previous, date: dateMatch[0] }));
          addAIMessage(
            aiLanguage === "te"
              ? "📅 Date save చేశాను. Start time మరియు end time ఇవ్వండి, ఉదా: 10:00 - 13:00."
              : aiLanguage === "hi"
              ? "📅 Date save कर ली। Start और end time दें, जैसे 10:00 - 13:00।"
              : "📅 Date saved. Now give start and end time, for example 10:00 - 13:00."
          );
          return;
        }
      }

      const timeMatches = message.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/g);
      if (timeMatches?.length >= 2) {
        setAiShareDraft((previous) => ({
          ...previous,
          start: timeMatches[0],
          end: timeMatches[1],
        }));
        addAIMessage(
          aiLanguage === "te"
            ? "🕒 Time save చేశాను. ఇప్పుడు notes ఇవ్వండి లేదా Skip అని type చేయండి."
            : aiLanguage === "hi"
            ? "🕒 Time save कर लिया। अब notes दें या Skip लिखें।"
            : "🕒 Time saved. Now enter notes, or type Skip."
        );
        return;
      }

      if (!aiShareDraft.notes && !/(skip|no notes|లేదు|వద్దు|नहीं|skip)/.test(q)) {
        setAiShareDraft((previous) => ({ ...previous, notes: message }));
        addAIMessage(
          aiLanguage === "te"
            ? "📝 Notes save చేశాను. ఇప్పుడు క్రింద Review & Publish నొక్కండి."
            : aiLanguage === "hi"
            ? "📝 Notes save कर लिए। अब नीचे Review & Publish दबाएँ।"
            : "📝 Notes saved. Now use Review & Publish below."
        );
        return;
      }

      addAIMessage(
        aiLanguage === "te"
          ? "క్రింద Review & Publish నొక్కి service ని publish చేయండి."
          : aiLanguage === "hi"
          ? "नीचे Review & Publish दबाकर service publish करें।"
          : "Use Review & Publish below to publish the service."
      );
      return;
    }

    setAiTyping(true);

    const intent = getAssistantIntent(message);
    const category = getAssistantCategory(message);

    // The AI panel can operate the existing website UI.
    if (intent === "share") {
      startAIShare();
      setAiTyping(false);
      return;
    } else if (intent === "category" && category) {
      setFilter("all");
      setActiveCategory(category);
      setSearch("");
      scrollToServices();
    } else if (intent === "active") {
      setFilter("active");
      setActiveCategory("All Services");
      setSearch("");
      scrollToServices();
    } else if (intent === "today") {
      setFilter("today");
      setActiveCategory("All Services");
      setSearch("");
      scrollToServices();
    } else if (intent === "upcoming") {
      setFilter("upcoming");
      setActiveCategory("All Services");
      setSearch("");
      scrollToServices();
    } else if (intent === "near") {
      setFilter("near");
      setActiveCategory("All Services");
      setSearch("");
      scrollToServices();
      setTimeout(() => useMyLocation(), 150);
    } else if (intent === "search") {
      setFilter("all");
      setActiveCategory("All Services");
      setSearch(message);
      scrollToServices();
    } else if (intent === "details") {
      const service = getSpecificAssistantService(message);
      if (service) {
        setSelected(service.id);
      }
    } else if (intent === "directions") {
      const service = getSpecificAssistantService(message);
      if (service) {
        openDirections(service.address, service.latitude, service.longitude);
      }
    } else if (intent === "suggest") {
      setFilter("all");
      setActiveCategory(category || "All Services");
      setSearch("");
      scrollToServices();
    }

    try {
      const endpoint = import.meta.env.VITE_AI_ASSISTANT_URL;

      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            language: aiLanguage,
            services: allServices.map((service) => ({
              id: service.id,
              title: service.title,
              category: service.category,
              area: service.area,
              address: service.address,
              date: service.date,
              start: service.start,
              end: service.end,
              notes: service.notes,
            })),
          }),
        });

        if (!response.ok) throw new Error("AI endpoint failed");

        const data = await response.json();
        const reply = data.reply || data.message;

        if (reply) {
          setAiMessages((previous) => [
            ...previous,
            { role: "assistant", text: reply },
          ]);
          setAiTyping(false);
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

      let reply = getLocalAssistantReply(message, aiLanguage, allServices);
      const matched = findAssistantServices(message, allServices);

      if (intent === "category" && category) {
        if (matched.length) {
          const names = matched.slice(0, 6).map((service) => service.title).filter(Boolean);
          const suffix = names.length ? names.join(", ") : "";
          reply = aiLanguage === "te"
            ? `🔎 ${category} లో ${matched.length} service(s) కనిపించాయి. ${suffix ? `ఉదాహరణలు: ${suffix}.` : "Services section లో చూపిస్తున్నాను."}`
            : aiLanguage === "hi"
            ? `🔎 ${category} में ${matched.length} service(s) मिलीं। ${suffix ? `उदाहरण: ${suffix}.` : "Services section में दिखा रहा हूँ।"}`
            : `🔎 I found ${matched.length} ${category} service(s). ${suffix ? `Examples: ${suffix}.` : "I’m showing them in the Services section."}`;
        } else {
          reply = aiLanguage === "te"
            ? `🔎 ${category} category select చేశాను, కానీ ప్రస్తుతం loaded data లో matching service లేదు. నేను service invent చేయను. మరో keyword/area లేదా Near Me ప్రయత్నించండి.`
            : aiLanguage === "hi"
            ? `🔎 ${category} category select कर दी है, लेकिन अभी loaded data में matching service नहीं है। मैं service invent नहीं करूँगा। दूसरा keyword/area या Near Me आज़माएँ।`
            : `🔎 I selected ${category}, but there is no matching service in the currently loaded data. I won’t invent a service. Try another keyword/area or Near Me.`;
        }
      }

      setAiMessages((previous) => [
        ...previous,
        { role: "assistant", text: reply },
      ]);
    } catch (aiError) {
      console.error("AI Assistant error:", aiError);
      setAiMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: getLocalAssistantReply(message, aiLanguage, allServices),
        },
      ]);
    } finally {
      setAiTyping(false);
    }
  }

  function changeAILanguage(language) {
    const nextLanguage = JEEVADANAM_LANGUAGES.some(([code]) => code === language)
      ? language
      : "en";

    setAiLanguage(nextLanguage);
    try {
      localStorage.setItem("jeevadanam-ai-language", nextLanguage);
    } catch {
      // Ignore storage errors; the in-memory language still works.
    }

    const welcome = getLocalAssistantReply("", nextLanguage, allServices);
    setAiMessages((previous) => [
      ...previous,
      { role: "assistant", text: welcome },
    ]);
  }

  const selectedService =
    allServices.find(
      (service) =>
        service.id === selected
    );

  return (
    <>
      {showJeevadanamIntro && (
        <div className="jeevadanam-intro" role="status" aria-label="Opening Jeevadanam">
          <video
            className="jeevadanam-intro-video"
           autoPlay
  muted
  playsInline
  onLoadedMetadata={(e) => {
    e.currentTarget.playbackRate = 2.0;
  }}
  onEnded={() => setShowJeevadanamIntro(false)}
            onError={() => setShowJeevadanamIntro(false)}
            aria-label="Jeevadanam 3D opening animation"
          >
            <source
              src="/jeevadanam-opening-8s.mp4"
              type="video/mp4"
            />
          </video>
        </div>
      )}

      <div className="app">

      <style>{`
        @keyframes jeevadanamAiRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes jeevadanamAiRingPulse {
          0%, 100% { opacity: .78; transform: scale(.98); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes jeevadanamAiGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(0,196,255,.42), 0 0 24px rgba(132,70,255,.28), 0 10px 30px rgba(0,0,0,.28); }
          50% { box-shadow: 0 0 16px rgba(255,45,198,.58), 0 0 34px rgba(255,166,0,.26), 0 10px 30px rgba(0,0,0,.28); }
        }
        .jeevadanam-ai-orb-host {
          position: fixed;
          right: 22px;
          bottom: 22px;
          width: 76px;
          height: 76px;
          z-index: 9997;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }
        .jeevadanam-ai-orb-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(from 0deg, #00eaff 0deg, #4169ff 72deg, #b63cff 145deg, #ff2dc6 215deg, #ff6b35 278deg, #ffd84d 320deg, #00eaff 360deg);
          animation: jeevadanamAiRingSpin 2.8s linear infinite, jeevadanamAiRingPulse 2.2s ease-in-out infinite;
          filter: blur(.2px);
          box-shadow: 0 0 14px rgba(0, 210, 255, .38), 0 0 28px rgba(185, 52, 255, .28);
        }
        .jeevadanam-ai-orb-ring::after {
          content: "";
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          background: #07152d;
        }
        .jeevadanam-ai-orb-core {
          position: relative;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: radial-gradient(circle at 35% 28%, #243d66 0%, #101f3b 38%, #050d1c 100%);
          border: 1px solid rgba(255,255,255,.20);
          animation: jeevadanamAiGlow 2.8s ease-in-out infinite;
        }
        .jeevadanam-ai-orb-core::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,.18), transparent 38%, rgba(0,0,0,.24));
          pointer-events: none;
        }
        .jeevadanam-ai-orb-core > * { position: relative; z-index: 2; }
        .jeevadanam-ai-orb-host .border-beam { border-radius: 50% !important; }

        @media (max-width: 700px) {
          .header-actions > div:first-child button {
            width: 52px !important;
            font-size: 0 !important;
          }
          .header-actions > div:first-child button span:first-child {
            font-size: 18px !important;
          }
        }
        @media (max-width: 600px) {
          .jeevadanam-ai-orb-host { right: 14px; bottom: 14px; transform: scale(.94); transform-origin: bottom right; }
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        className="header"
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          gap: 0,
          columnGap: 0,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {/* Drawer menu — kept on the left side of the app bar */}
        <button
          type="button"
          className="social-icon jeevadanam-menu-left"
          onClick={() => {
            setLanguageMenuOpen(false);
            setDrawerOpen(true);
          }}
          aria-label="Open menu"
          title="Menu"
          style={{
            width: 56,
            height: 52,
            flex: "0 0 56px",
            gap: 0,
            fontSize: 22,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span aria-hidden="true">☰</span>
        </button>

        <div
          className="brand"
          style={{
            flex: "0 1 auto",
            minWidth: 0,
            marginLeft: 0,
            gap: 10,
          }}
        >
          <div className="brand-icon">
            💛
          </div>

          <div>
            <h1 className="brand-title">
  <span className="brand-jeevadanam">Jeevadanam</span><span className="brand-spots">spots</span>
</h1>

            <p>
              {siteT("open")} • 
            </p>
          </div>
        </div>

        <div
          className="header-actions"
          style={{
            marginLeft: "auto",
          }}
        >

          {/* Instagram */}
          <a
            href="https://www.instagram.com/jeevadanamspots/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            aria-label="Instagram"
            title="Instagram"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />

              <circle
                cx="12"
                cy="12"
                r="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />

              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
              />
            </svg>
          </a>


          {/* Language selector */}
          <div ref={languageMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                setLanguageMenuOpen((open) => !open);
              }}
              className="social-icon"
              aria-label="Choose language"
              title="Choose language"
              style={{
                width: 52,
                height: 52,
                gap: 0,
                fontSize: 13,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 20 }}>🌐</span>
            </button>

            {languageMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "fixed",
                  top: "76px",
                  right: "12px",
                  width: "min(190px, calc(100vw - 24px))",
                  maxHeight: "calc(100vh - 92px)",
                  overflowY: "auto",
                  background: "#fff",
                  border: "1px solid #e3e8ef",
                  borderRadius: 16,
                  boxShadow: "0 18px 45px rgba(15,23,42,.16)",
                  padding: 8,
                  zIndex: 3000,
                }}
              >
                {JEEVADANAM_LANGUAGES.map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    role="menuitem"
                    onClick={() => changeSiteLanguage(code)}
                    style={{
                      width: "100%",
                      border: 0,
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: siteLanguage === code ? "#eef8f1" : "transparent",
                      color: siteLanguage === code ? "#1f7a4d" : "#243047",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: siteLanguage === code ? 750 : 500,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================
          DRAWER MENU
      ===================================================== */}
      {drawerOpen && (
        <div
          className="jeevadanam-drawer-layer"
          role="presentation"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "rgba(15, 23, 42, 0.32)",
          }}
        >
          <aside
            className="jeevadanam-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Jeevadanam menu"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: "min(360px, 88vw)",
              background: "#ffffff",
              boxShadow: "18px 0 50px rgba(15, 23, 42, 0.18)",
              padding: "22px 18px 24px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "4px 4px 20px",
                borderBottom: "1px solid #edf1f5",
              }}
            >
              <div>
                <div style={{
                  fontSize: 22,
                  fontWeight: 850,
                  color: "#064e3b",
                  letterSpacing: "-0.02em",
                }}>
                  Jeevadanam
                </div>
                <div style={{
                  marginTop: 3,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#7b8798",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
                  Open Community
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                title="Close"
                style={{
                  width: 42,
                  height: 42,
                  border: "1px solid #e5e9ef",
                  borderRadius: 12,
                  background: "#ffffff",
                  color: "#243047",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <nav
              aria-label="Jeevadanam navigation"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                paddingTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 13,
                  background: "#f7faf8",
                  color: "#17233a",
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  textAlign: "left",
                  fontSize: 15,
                  fontWeight: 750,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 20 }}>🏠</span>
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  document.querySelector(".services-section")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 13,
                  background: "transparent",
                  color: "#17233a",
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  textAlign: "left",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 20 }}>🔎</span>
                <span>Find Help</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  openForm();
                }}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 13,
                  background: "transparent",
                  color: "#17233a",
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  textAlign: "left",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 20 }}>➕</span>
                <span>Share a Service</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setAiOpen(true);
                }}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 13,
                  background: "transparent",
                  color: "#17233a",
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  textAlign: "left",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 20 }}>🤖</span>
                <span>Jeevadanam AI</span>
              </button>

              <div style={{
                height: 1,
                background: "#edf1f5",
                margin: "14px 4px 8px",
              }} />

              <div style={{
                padding: "0 14px 5px",
                color: "#9a6a12",
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}>
                Support
              </div>

              <a
                href="mailto:jeevadanamspots@gmail.com"
                onClick={() => setDrawerOpen(false)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: 13,
                  color: "#17233a",
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                <span style={{ fontSize: 20 }}>✉️</span>
                <span>Contact</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setAiOpen(true);
                  setAiInput("privacy");
                }}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 13,
                  background: "transparent",
                  color: "#17233a",
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  textAlign: "left",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 20 }}>🔒</span>
                <span>Privacy</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setLanguageMenuOpen(true);
                }}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 13,
                  background: "transparent",
                  color: "#17233a",
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  textAlign: "left",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 20 }}>⚙️</span>
                <span>Settings</span>
              </button>
            </nav>

            <div
              style={{
                height: 1,
                background: "#edf1f5",
                margin: "18px 4px 2px",
              }}
            />

                    {/* =====================================================
    HOW JEEVADANAM WORKS
===================================================== */}

<div
  className="drawer-how-content"
  style={{
    marginTop: "18px",
    paddingBottom: "12px",
  }}
>
  <style>{`
    .jeevadanam-drawer .drawer-how-content .how-heading {
      margin-bottom: 18px !important;
    }
    .jeevadanam-drawer .drawer-how-content .how-columns {
      grid-template-columns: 1fr !important;
      gap: 14px !important;
    }
    .jeevadanam-drawer .drawer-how-content .how-card {
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .jeevadanam-drawer .drawer-how-content .how-step p {
      margin-bottom: 0 !important;
    }
    .jeevadanam-drawer .drawer-how-content .jeevadanam-ai-helper {
      margin-top: 14px !important;
    }
  `}</style>

  <div className="how-heading">
    <span className="how-eyebrow">
      {siteT("simple")}
    </span>

    <h2>
      {siteT("how")}
    </h2>

    <p>
      {siteT("howDesc")}
    </p>
  </div>

  <div className="how-columns">

    {/* NEED HELP */}

    <div className="how-card">

      <div className="how-card-header">
        <div className="how-icon">
          🔎
        </div>

        <div>
          <h3>{siteT("need")}</h3>
          <p>{siteT("findNear")}</p>
        </div>
      </div>

      <div className="how-steps">

        <div className="how-step">
          <span>1</span>
          <div>
            <strong>{siteT("choose")}</strong>
            <p>
              {siteT("findDesc")}
            </p>
          </div>
        </div>

        <div className="how-step">
          <span>2</span>
          <div>
            <strong>{siteT("find")}</strong>
            <p>
              {siteT("searchDesc")}
            </p>
          </div>
        </div>

        <div className="how-step">
          <span>3</span>
          <div>
            <strong>{siteT("get")}</strong>
            <p>
              {siteT("getDesc")}
            </p>
          </div>
        </div>

      </div>

      <button
        type="button"
        className="how-action"
        onClick={() => {
          document
            .querySelector(".services-section")
            ?.scrollIntoView({
              behavior: "smooth",
            });
        }}
      >
        {siteT("findCommunity")}
      </button>

    </div>


    {/* OFFER HELP */}

    <div className="how-card offer-help-card">

      <div className="how-card-header">
        <div className="how-icon offer">
          🤝
        </div>

        <div>
          <h3>{siteT("want")}</h3>
          <p>{siteT("wantDesc")}</p>
        </div>
      </div>

      <div className="how-steps">

        <div className="how-step">
          <span>1</span>
          <div>
            <strong>{siteT("shareService")}</strong>
            <p>
              {siteT("shareServiceDesc")}
            </p>
          </div>
        </div>

        <div className="how-step">
          <span>2</span>
          <div>
            <strong>{siteT("addLocation")}</strong>
            <p>
              {siteT("addLocationDesc")}
            </p>
          </div>
        </div>

        <div className="how-step">
          <span>3</span>
          <div>
            <strong>{siteT("publishCommunity")}</strong>
            <p>
              {siteT("publishCommunityDesc")}
            </p>
          </div>
        </div>

      </div>

      <button
        type="button"
        className="how-action offer"
        onClick={openForm}
      >
        {siteT("shareAction")}
      </button>

    </div>

  </div>

  {/* JEEVADANAM AI HELPER */}
  <div
    className="jeevadanam-ai-helper"
    style={{
      marginTop: "24px",
      padding: "18px 22px",
      borderRadius: "18px",
      border: "1px solid rgba(31, 122, 77, 0.16)",
      background: "linear-gradient(135deg, #f7fbff 0%, #ffffff 55%, #f5fff9 100%)",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "18px",
      flexWrap: "wrap",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          flex: "0 0 46px",
          borderRadius: "14px",
          display: "grid",
          placeItems: "center",
          background: "#101c31",
          color: "#fff",
          fontSize: 23,
          boxShadow: "0 6px 18px rgba(16, 28, 49, 0.18)",
        }}
        aria-hidden="true"
      >
        🤖
      </div>

      <div>
        <strong
          style={{
            display: "block",
            color: "#15213a",
            fontSize: "16px",
            lineHeight: 1.35,
            marginBottom: "4px",
          }}
        >
          Need help? Jeevadanam AI can help too.
        </strong>

        <p
          style={{
            margin: 0,
            color: "#667892",
            fontSize: "14px",
            lineHeight: 1.55,
          }}
        >
          You can use Jeevadanam AI to find the help you need
          or publish a community service.
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={() => setAiOpen(true)}
      style={{
        border: "1px solid rgba(31, 122, 77, 0.22)",
        background: "#ffffff",
        color: "#17633f",
        borderRadius: "12px",
        padding: "11px 17px",
        fontWeight: 800,
        fontSize: "14px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
      }}
    >
      🤖 Try Jeevadanam AI →
    </button>
  </div>

</div>



          </aside>
        </div>
      )}

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main>

        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">

            <span className="eyebrow">
              {siteT("eyebrow")}
            </span>

            <h2>
              {siteT("title1")}
              <br />
              {siteT("title2")}
            </h2>

            <p>
              {siteT("desc")}
            </p>

            <button
              className="hero-button"
              onClick={openForm}
            >
              {siteT("share")}
            </button>
          </div>

          <div
            className="hero-art"
            aria-hidden="true"
          >
            <span>🤝</span>
            <span>💛</span>
            <span>🌱</span>
          </div>
        </section>
        {/* PRIVACY */}
        <section className="privacy-banner">
          <span className="privacy-icon">
            🔒
          </span>

          <div>
            <strong>
              Open community service. No login required.
            </strong>

            <p>
              No names, phone numbers or email
              addresses are requested. Your location
              is only accessed if you choose Near Me.
            </p>
          </div>
        </section>


        {/* SERVICES */}
        <section className="services-section">

          {/* FIND HELP */}
          <section className="find-help-section">
            <div
              className="section-heading"
              style={{
                display: "block",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 8,
                    flexWrap: "nowrap",
                    whiteSpace: "nowrap",
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    {FIND_HELP_TEXT[siteLanguage]?.title ||
                      FIND_HELP_TEXT.en.title}
                  </h2>

                  {/* NEAR ME — immediately beside Find Help */}
                  <button
                    type="button"
                    className={
                      filter === "near"
                        ? "filter near-me-button active"
                        : "filter near-me-button"
                    }
                    onClick={useMyLocation}
                    style={{
                      minWidth: 96,
                      minHeight: 38,
                      padding: "0 12px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 750,
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span className="near-me-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                    </span>
                    <span>{siteT("near").replace(/^📍\s*/, "")}</span>
                  </button>
                </div>

                <p>
                  {FIND_HELP_TEXT[siteLanguage]?.desc ||
                    FIND_HELP_TEXT.en.desc}
                </p>
              </div>
            </div>


            {/* FILTERS */}
            <div className="filters">

              <button
                className={
                  filter === "all"
                    ? "filter active"
                    : "filter"
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                {siteT("all")} ({allServices.length})
              </button>

              <button
                className={
                  filter === "today"
                    ? "filter active"
                    : "filter"
                }
                onClick={() =>
                  setFilter("today")
                }
              >
                {siteT("today")}
              </button>

              <button
                className={
                  filter === "active"
                    ? "filter active"
                    : "filter"
                }
                onClick={() =>
                  setFilter("active")
                }
              >
                {siteT("active")} (
                {
                  allServices.filter(
                    isServiceActive
                  ).length
                }
                )
              </button>

            </div>

            {/* SERVICE CATEGORY DROPDOWN */}
            <div
              className="service-category-dropdown"
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                position: "relative",
                width: "100%",
                marginTop: 18,
                zIndex: 20,
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 15,
                  fontWeight: 750,
                  color: "#17233a",
                }}
              >
                Service category <span style={{ color: "#ef4444" }}>*</span>
              </label>

              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={categoryDropdownOpen}
                onClick={() =>
                  setCategoryDropdownOpen((open) => !open)
                }
                style={{
                  width: "100%",
                  minHeight: 58,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 16px",
                  border: categoryDropdownOpen
                    ? "2px solid #f59e0b"
                    : "1px solid #dbe3ec",
                  borderRadius: 14,
                  background: "#ffffff",
                  color: "#17233a",
                  boxShadow: categoryDropdownOpen
                    ? "0 0 0 3px rgba(245, 158, 11, 0.10)"
                    : "0 4px 14px rgba(15, 23, 42, 0.04)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 16,
                  fontWeight: 650,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 23,
                      lineHeight: 1,
                      flex: "0 0 auto",
                    }}
                  >
                    {categories.find(
                      (item) => item.name === activeCategory
                    )?.icon || "🌍"}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {activeCategory === "All Services"
                      ? "Show All Communities"
                      : activeCategory}
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 20,
                    lineHeight: 1,
                    transform: categoryDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 160ms ease",
                  }}
                >
                 ⌄
                </span>
              </button>

              {categoryDropdownOpen && (
                <div
                  role="listbox"
                  aria-label="Service category"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    marginTop: 6,
                    padding: 8,
                    background: "#ffffff",
                    border: "1px solid #e1e8f0",
                    borderRadius: 14,
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                    maxHeight: 430,
                    overflowY: "auto",
                  }}
                >
                  {categories.map((category) => {
                    const selectedCategory =
                      activeCategory === category.name;

                    return (
                      <button
                        key={category.name}
                        type="button"
                        role="option"
                        aria-selected={selectedCategory}
                        onClick={() => {
                          setActiveCategory(category.name);
                          setCategoryDropdownOpen(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 13,
                          padding: "11px 12px",
                          border: 0,
                          borderRadius: 10,
                          background: selectedCategory
                            ? "#fff5df"
                            : "#ffffff",
                          color: selectedCategory
                            ? "#b65f00"
                            : "#17233a",
                          fontSize: 15,
                          fontWeight: selectedCategory ? 750 : 600,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 32,
                            flex: "0 0 32px",
                            fontSize: 21,
                            lineHeight: 1,
                            textAlign: "center",
                          }}
                        >
                          {category.icon}
                        </span>

                        <span>
                          {category.name === "All Services"
                            ? "Show All Communities"
                            : category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </section>


          {/* SERVICE CARDS */}
          {!loadingServices &&
            !servicesError &&
            filteredServices.length >
              0 && (
              <div className="service-grid">

                {filteredServices.map(
                  (service) => {

                    const interestedCount =
                      getReactionCount(
                        service.id,
                        "interested"
                      );

                    const reportCount =
                      getReactionCount(
                        service.id,
                        "report"
                      );

                    const isInterested =
                      hasReacted(
                        service.id,
                        "interested"
                      );

                    const isReported =
                      hasReacted(
                        service.id,
                        "report"
                      );

                    return (
                      <article
                        className="service-card"
                        key={service.id}
                      >

                        {/* CARD TOP */}
                        <div className="card-top">

                          <span className="service-category">
                            {
                              categories.find(
                                (category) =>
                                  category.name ===
                                  canonicalAssistantCategory(service.category)
                              )?.icon ||
                              "💛"
                            }{" "}
                            {siteCategory(service.category)}
                          </span>

                          {getServiceStatus(service) === "upcoming" && (
                            <span className="upcoming-badge card-top-status">
                              ◷ Upcoming
                            </span>
                          )}

                          {getServiceStatus(service) === "active" && (
                            <span className="active-badge card-top-status">
                              ● Active Now
                            </span>
                          )}

                        </div>


                        {/* DATE + TIME */}
                        <div className="service-title-row service-schedule-row">

                          <h3 className="service-schedule">
                            <span className="service-schedule-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24" role="presentation">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3 2" />
                              </svg>
                            </span>
                            <span>{formatServiceSchedule(service)}</span>
                            <button
                              type="button"
                              className={
                                isInterested
                                  ? "mobile-interest-inline interested"
                                  : "mobile-interest-inline"
                              }
                              onClick={() =>
                                handleReaction(
                                  service.id,
                                  "interested"
                                )
                              }
                              aria-label={
                                isInterested
                                  ? `Remove interested reaction (${interestedCount})`
                                  : `Mark interested (${interestedCount})`
                              }
                            >
                              {isInterested ? "♥" : "♡"} {interestedCount}
                            </button>
                          </h3>

                        </div>


                        {/* META */}
                        <div className="service-meta">

  <span className="service-full-address">
    <span className="service-location-pin" aria-hidden="true">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    </span>
    {service.address || service.area}
  </span>

  {filter === "near" && currentUserLocation && (
    <span>
      📍 {formatDistanceKm(
        getDistanceKm(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          service.latitude,
          service.longitude
        )
      )}
    </span>
  )}



</div>

                        {/* QUICK LANDMARK NOTES / DIRECTIONS */}
                        {service.notes && (
                          <p className="service-notes">
                            {service.notes}
                          </p>
                        )}


                        {/* =================================================
                            GLOBAL INTERESTED
                        ================================================= */}

                        <div className="interest-panel">

                          <button
                            type="button"
                            className={
                              isInterested
                                ? "interested-button interested"
                                : "interested-button"
                            }
                            onClick={() =>
                              handleReaction(
                                service.id,
                                "interested"
                              )
                            }
                          >
                            {isInterested
                              ? "♥ Interested"
                              : "♡ Interested"}

                            {" · "}

                            {interestedCount}
                          </button>

                          <div className="interest-info">

                            <span className="people-icon">
                              👥
                            </span>

                            <span>
                              {interestedCount}{" "}
                              {interestedCount ===
                              1
                                ? "person interested"
                                : "people interested"}
                            </span>

                          </div>

                        </div>


                        {/* =================================================
                            ACTIONS
                        ================================================= */}

                        <div className="card-actions">

                          <button
                            type="button"
                            className="outline-button"
                            onClick={() =>
                              setSelected(
                                service.id
                              )
                            }
                          >
                            {siteT("details")}
                          </button>

                          <button
                            type="button"
                            className="map-button"
                            onClick={() =>
                              openDirections(
                                service.address,
                                service.latitude,
                                service.longitude
                              )
                            }
                          >
                            <span className="directions-icon" aria-hidden="true">
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
                                <circle cx="12" cy="9" r="2.5" />
                              </svg>
                            </span>
                            <span>{siteT("directions").replace(/^📍\s*/, "")}</span>
                          </button>

                        </div>


                        {/* =================================================
                            GLOBAL REPORT
                        ================================================= */}

                        <div className="report-panel">

                          <button
                            type="button"
                            className="report-button"
                            onClick={() =>
                              handleReaction(
                                service.id,
                                "report"
                              )
                            }
                          >
                            {isReported
                              ? "⚑ Reported"
                              : "⚑ Report"}

                            {" · "}

                            {reportCount}
                          </button>

                          <div className="report-info">
                            <span>
                              Help keep our community safe
                            </span>
                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>
            )}


          {/* EMPTY */}
          {!loadingServices &&
            !servicesError &&
            filteredServices.length ===
              0 && (
              <div className="empty-state">

                <div className="empty-icon">
                  ⌕
                </div>

                <h3>
                  {siteT("no")}
                </h3>

                <p>
                  Try another area,
                  category or search term.
                </p>

                <button
                  className="outline-button"
                  onClick={resetSearch}
                >
                  {siteT("reset")}
                </button>

              </div>
            )}

        </section>


        {/* BOTTOM BANNER */}
        <section className="bottom-banner">

          <div>
            <h2>
              {siteT("shareBottom")}
            </h2>

            <p>
              Your community service could
              make someone's day easier.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={openForm}
          >
            ＋ Add a Service
          </button>

        </section>

      </main>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">

        <strong>
          Jeevadanam
        </strong>

        <span>
          India • Open Community Service
        </span>

        <p>
          Kindness has no boundaries.
        </p>

      </footer>


      {/* =====================================================
          SHARE SERVICE MODAL
      ===================================================== */}

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setModalOpen(false);
            }
          }}
        >

          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >

            <div className="modal-heading">

              <div>

                <h2 id="form-title">
                  Share a Community Service
                </h2>

                <p>
                  Help people discover a
                  service in India.
                </p>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setModalOpen(false)
                }
                aria-label="Close form"
              >
                ×
              </button>

            </div>


            <div className="notice">

              <span>ⓘ</span>

              <p>
                No registration or contact
                details required. Please check
                that the service information
                is accurate.
              </p>

            </div>


            <form onSubmit={publishService}>

              {/* SERVICE NAME (OPTIONAL) */}
              <label>
                Service name

                <input
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="Optional — e.g. Free Medical Camp"
                  maxLength={100}
                />
              </label>


              {/* CATEGORY */}
              <label>
                Service category *

                <select
                  name="category"
                  value={form.category}
                  onChange={updateForm}
                  required
                >
                  {categories
                    .slice(1)
                    .map(
                      (category) => (
                        <option
                          key={
                            category.name
                          }
                          value={
                            category.name
                          }
                        >
                          {category.name}
                        </option>
                      )
                    )}
                </select>
              </label>


              {/* LOCATION PICKER */}
              <label>

                <LocationPicker
                  onLocationSelect={(
                    location
                  ) => {
                    setForm(
                      (previous) => ({
                        ...previous,

                        area:
                          location.area ||
                          previous.area,

                        address:
                          location.address ||
                          previous.address,

                        latitude:
                          location.latitude,

                        longitude:
                          location.longitude,
                      })
                    );
                  }}
                />

                {locationLoading && (
                  <small className="location-status">
                    📍 Fetching your current
                    location...
                  </small>
                )}

                {locationError && (
                  <small className="location-error">
                    {locationError}
                  </small>
                )}

              </label>


              {/* ADDRESS */}
              <label>
                Exact public landmark / address *

                <input
                  name="address"
                  value={form.address}
                  onChange={updateForm}
                  placeholder="e.g. Near the main bus station"
                  maxLength={200}
                  required
                />
              </label>


              {/* DATE */}
              <div className="form-section-title">
                2. DISTRIBUTION DATE & TIME WINDOW{" "}
                <span>*</span>
              </div>


              <div className="date-options">

                {/* TODAY */}
                <button
                  type="button"
                  className={
                    form.date === today()
                      ? "date-option active"
                      : "date-option"
                  }
                  onClick={() =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        date: today(),
                      })
                    )
                  }
                >
                  Today
                </button>


                {/* TOMORROW */}
                <button
                  type="button"
                  className={
                    form.date ===
                    new Date(
                      Date.now() +
                        86400000
                    )
                      .toISOString()
                      .slice(0, 10)
                      ? "date-option active"
                      : "date-option"
                  }
                  onClick={() => {
                    const tomorrow =
                      new Date(
                        Date.now() +
                          86400000
                      )
                        .toISOString()
                        .slice(0, 10);

                    setForm(
                      (previous) => ({
                        ...previous,
                        date: tomorrow,
                      })
                    );
                  }}
                >
                  Tomorrow
                </button>


                {/* CUSTOM DATE */}
                <button
                  type="button"
                  className={
                    form.date !== today() &&
                    form.date !==
                      new Date(
                        Date.now() +
                          86400000
                      )
                        .toISOString()
                        .slice(0, 10)
                      ? "date-option active"
                      : "date-option"
                  }
                  onClick={() => {
                    document
                      .getElementById(
                        "custom-service-date"
                      )
                      ?.showPicker?.();

                    document
                      .getElementById(
                        "custom-service-date"
                      )
                      ?.focus();
                  }}
                >
                  Custom Date
                </button>

              </div>


              <input
                id="custom-service-date"
                type="date"
                name="date"
                value={form.date}
                onChange={updateForm}
                required
                className="custom-date-input"
              />


              {/* TIME */}
              <div className="time-grid">

                <label>
                  Start Time *

                  <input
                    type="time"
                    name="start"
                    value={form.start}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  End Time *

                  <input
                    type="time"
                    name="end"
                    value={form.end}
                    onChange={updateForm}
                    required
                  />
                </label>

              </div>


              {/* NOTES */}
              <label>
                Quick landmark notes / directions *

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={updateForm}
                  placeholder="Share useful details for visitors..."
                  rows="3"
                  maxLength={500}
                  required
                />
              </label>


              {error && (
                <p className="form-error">
                  {error}
                </p>
              )}


              <div className="privacy-note">
                🔒 Your form does not request
                your name, phone number or
                email address.
              </div>


              <button
                type="submit"
                className="primary-button publish-button"
              >
                ✓ Publish Service
              </button>


              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setModalOpen(false)
                }
              >
                Cancel
              </button>

            </form>

          </section>

        </div>
      )}


      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selectedService && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelected(null);
            }
          }}
        >

          <section
            className="modal details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-title"
          >

            <div className="modal-heading">

              <div>

                <span className="service-category">
                  {siteCategory(selectedService.category)}
                </span>

                <h2 id="details-title">
                  {selectedService.title}
                </h2>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setSelected(null)
                }
                aria-label="Close details"
              >
                ×
              </button>

            </div>


            <div className="details-list">

              <p>
                📍 <strong>Area:</strong>{" "}
                {selectedService.area}
              </p>

              <p>
                🗺️{" "}
                <strong>Landmark:</strong>{" "}
                {selectedService.address}
              </p>

              <p>
                📅 <strong>Date:</strong>{" "}
                {selectedService.date}
              </p>

              <p>
                🕒 <strong>Time:</strong>{" "}
                {formatTime(
                  selectedService.start
                )}{" "}
                –{" "}
                {formatTime(
                  selectedService.end
                )}
              </p>

              <p>
                ℹ️{" "}
                {selectedService.notes ||
                  "No additional notes."}
              </p>

            </div>


            <button
              type="button"
              className="map-button"
              onClick={() =>
                openDirections(
                  selectedService.address,
                  selectedService.latitude,
                  selectedService.longitude
                )
              }
            >
              📍 Directions on Maps
            </button>

          </section>

        </div>
      )}

      {/* =====================================================
          JEEVADANAM AI ASSISTANT
      ===================================================== */}
      {aiOpen && (
        <BorderBeam
          size="md"
          colorVariant="colorful"
          strength={0.72}
          theme="light"
          active={aiOpen}
          style={{
            position: "fixed",
            right: "24px",
            bottom: "92px",
            width: "min(390px, calc(100vw - 32px))",
            height: "min(590px, calc(100vh - 125px))",
            borderRadius: "22px",
            zIndex: 9998,
            pointerEvents: "none",
          }}
        >
        <section
          className="jeevadanam-ai-panel"
          aria-label="Jeevadanam AI Assistant"
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: "#ffffff",
            border: "1px solid rgba(20, 30, 40, 0.12)",
            borderRadius: "22px",
            boxShadow: "0 22px 70px rgba(0,0,0,0.20)",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #eee",
              background: "linear-gradient(135deg,#fff8dc,#ffffff)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BotAvatar
                type="droid"
                size={42}
                face="mouth"
                state={aiTyping ? "working" : "default"}
                interactive={false}
                speed={1}
                seed={0.37}
                shading="plastic"
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <MetalText font="600 17px/1.2 Inter, system-ui, sans-serif" color="#2F3A35">
                    Jeevadanam AI
                  </MetalText>
                  <MetalBadge>AI</MetalBadge>
                </div>
                <small style={{ color: "#667085" }}>
                  Community service assistant
                </small>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAiOpen(false)}
              aria-label="Close AI Assistant"
              style={{
                border: 0,
                background: "transparent",
                fontSize: 25,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              padding: "8px 14px",
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              background: "#fff",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#1f7a4d",
                fontWeight: 750,
                fontSize: 12,
              }}
              title="Jeevadanam AI language — independent from website language"
            >
              <span aria-hidden="true">🌐</span>
              <select
                value={aiLanguage}
                onChange={(event) => changeAILanguage(event.target.value)}
                aria-label="Jeevadanam AI language"
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#1f7a4d",
                  fontWeight: 750,
                  fontSize: 12,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {JEEVADANAM_LANGUAGES.map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div
            ref={aiChatMessagesRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: 14,
              background: "#fafafa",
              scrollBehavior: "smooth",
            }}
          >
            {aiMessages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                style={{
                  display: "flex",
                  justifyContent:
                    item.role === "user"
                      ? "flex-end"
                      : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: "86%",
                    padding: "10px 12px",
                    borderRadius:
                      item.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    background:
                      item.role === "user"
                        ? "#1f7a4d"
                        : "#fff",
                    color:
                      item.role === "user"
                        ? "#fff"
                        : "#222",
                    border:
                      item.role === "user"
                        ? "none"
                        : "1px solid #e7e7e7",
                    fontSize: 14,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}

            {aiTyping && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#667085",
                  fontSize: 13,
                  padding: "5px 4px",
                }}
                role="status"
                aria-live="polite"
              >
                <ThinkingOrb
                  state="working"
                  size={20}
                  theme="light"
                  speed={1.05}
                  aria-label="Jeevadanam AI is working"
                />
                <span>Jeevadanam AI is thinking...</span>
              </div>
            )}
          </div>

          {aiShareOpen && (
            <div
              style={{
                borderTop: "1px solid #e9e9e9",
                background: "#fff",
                padding: "12px",
                maxHeight: 330,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                🤝 Share service inside AI
              </div>

              <div style={{ display: "grid", gap: 7 }}>
                <input
                  value={aiShareDraft.title}
                  onChange={(e) =>
                    setAiShareDraft((p) => ({
                      ...p,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Service name *"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d7d7d7",
                    borderRadius: 9,
                    padding: "9px 10px",
                  }}
                />

                <select
                  value={aiShareDraft.category}
                  onChange={(e) =>
                    setAiShareDraft((p) => ({
                      ...p,
                      category: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d7d7d7",
                    borderRadius: 9,
                    padding: "9px 10px",
                    background: "#fff",
                  }}
                >
                  {categories.slice(1).map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>

                <input
                  value={aiShareDraft.area}
                  onChange={(e) =>
                    setAiShareDraft((p) => ({
                      ...p,
                      area: e.target.value,
                    }))
                  }
                  placeholder="Area *"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d7d7d7",
                    borderRadius: 9,
                    padding: "9px 10px",
                  }}
                />

                <input
                  value={aiShareDraft.address}
                  onChange={(e) =>
                    setAiShareDraft((p) => ({
                      ...p,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Public address / landmark *"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d7d7d7",
                    borderRadius: 9,
                    padding: "9px 10px",
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}>
                  <input
                    value={aiShareDraft.area}
                    onChange={(e) =>
                      setAiShareDraft((p) => ({ ...p, area: e.target.value }))
                    }
                    placeholder="Search village / area / landmark / PIN code"
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d7d7d7", borderRadius: 9, padding: "9px 10px" }}
                  />
                  <button
                    type="button"
                    onClick={() => searchAIServiceLocation(aiShareDraft.area)}
                    style={{ border: 0, background: "#eef8f2", color: "#1f7a4d", borderRadius: 9, padding: "8px 10px", fontWeight: 800, cursor: "pointer" }}
                  >
                    🔎 Find
                  </button>
                </div>

                {aiLocationCandidates.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gap: 7,
                      padding: 8,
                      border: "1px solid #d9e9df",
                      borderRadius: 10,
                      background: "#f8fcfa",
                    }}
                  >
                    <strong style={{ fontSize: 12 }}>
                      📍 Select the exact service location
                    </strong>

                    {aiLocationCandidates.map((candidate, index) => (
                      <button
                        key={`${candidate.latitude}-${candidate.longitude}-${index}`}
                        type="button"
                        onClick={() => selectAIServiceLocation(candidate)}
                        style={{
                          textAlign: "left",
                          border: "1px solid #d8dedb",
                          background: "#fff",
                          borderRadius: 9,
                          padding: "9px 10px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 12 }}>
                          {candidate.area || candidate.display}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 11, color: "#555", lineHeight: 1.4 }}>
                          {[candidate.mandal, candidate.district, candidate.state].filter(Boolean).join(", ")}
                          {candidate.pincode ? ` • PIN ${candidate.pincode}` : " • PIN not found"}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 10, color: "#777" }}>
                          {candidate.display}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <input
                  value={aiShareDraft.pincode}
                  onChange={(e) =>
                    setAiShareDraft((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))
                  }
                  placeholder="PIN code * (6 digits)"
                  inputMode="numeric"
                  maxLength={6}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d7d7d7", borderRadius: 9, padding: "9px 10px" }}
                />

                <button
                  type="button"
                  onClick={useAILocation}
                  style={{
                    border: "1px solid #1f7a4d",
                    color: "#1f7a4d",
                    background: "#f2fbf6",
                    borderRadius: 9,
                    padding: "8px 10px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  📍 Use my location
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 7,
                  }}
                >
                  <input
                    type="date"
                    value={aiShareDraft.date}
                    onChange={(e) =>
                      setAiShareDraft((p) => ({
                        ...p,
                        date: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid #d7d7d7",
                      borderRadius: 9,
                      padding: "8px",
                    }}
                  />

                  <input
                    type="time"
                    value={aiShareDraft.start}
                    onChange={(e) =>
                      setAiShareDraft((p) => ({
                        ...p,
                        start: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid #d7d7d7",
                      borderRadius: 9,
                      padding: "8px",
                    }}
                  />

                  <input
                    type="time"
                    value={aiShareDraft.end}
                    onChange={(e) =>
                      setAiShareDraft((p) => ({
                        ...p,
                        end: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid #d7d7d7",
                      borderRadius: 9,
                      padding: "8px",
                    }}
                  />
                </div>

                <textarea
                  value={aiShareDraft.notes}
                  onChange={(e) =>
                    setAiShareDraft((p) => ({
                      ...p,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Useful notes (optional)"
                  rows={2}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d7d7d7",
                    borderRadius: 9,
                    padding: "9px 10px",
                    resize: "vertical",
                  }}
                />

                <div style={{ display: "flex", gap: 7 }}>
                  <button
                    type="button"
                    onClick={() => setAiShareOpen(false)}
                    style={{
                      flex: 1,
                      border: "1px solid #ddd",
                      background: "#fff",
                      borderRadius: 9,
                      padding: "9px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {siteT("cancel")}
                  </button>

                  <button
                    type="button"
                    onClick={publishAIService}
                    disabled={aiTyping}
                    style={{
                      flex: 1,
                      border: 0,
                      background: "#1f7a4d",
                      color: "#fff",
                      borderRadius: 9,
                      padding: "9px",
                      cursor: aiTyping ? "not-allowed" : "pointer",
                      fontWeight: 800,
                      opacity: aiTyping ? 0.6 : 1,
                    }}
                  >
                    {aiTyping ? "Publishing..." : "Review & Publish"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <form
            onSubmit={sendAIMessage}
            style={{
              padding: "12px 14px 14px",
              borderTop: "1px solid rgba(20,30,40,0.08)",
              background: "#f7f7f8",
            }}
          >
            <VoiceBeam
              stream={aiMic.stream}
              processing={aiTyping}
              type="default"
              colorVariant="colorful"
              theme="light"
              strength={0.9}
              active={aiListening || aiTyping}
              style={{ width: "100%" }}
            >
            <div
              style={{
                minHeight: 58,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 8px",
                borderRadius: 30,
                background: "#202020",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.14)",
              }}
            >
              <button
                type="button"
                aria-label="More options"
                title="More options"
                style={{
                  width: 42,
                  height: 42,
                  border: 0,
                  borderRadius: "50%",
                  background: "transparent",
                  color: "#f1f1f1",
                  fontSize: 29,
                  lineHeight: 1,
                  cursor: "pointer",
                  flex: "0 0 auto",
                }}
              >
                +
              </button>

              <input
                value={aiInput}
                onChange={(event) => setAiInput(event.target.value)}
                placeholder={
                  aiLanguage === "te"
                    ? "ఏదైనా అడగండి"
                    : aiLanguage === "hi"
                    ? "कुछ भी पूछें"
                    : "Ask anything"
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 0,
                  outline: "none",
                  background: "transparent",
                  color: "#fff",
                  fontSize: 16,
                  padding: "7px 0",
                }}
                aria-label="Ask Jeevadanam AI"
              />

              <button
                type="button"
                onClick={() => setAiThinkMode((value) => !value)}
                aria-pressed={aiThinkMode}
                title="Toggle deeper thinking"
                style={{
                  border: 0,
                  background: "transparent",
                  color: aiThinkMode ? "#fff" : "#bdbdbd",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 6px",
                  cursor: "pointer",
                  fontSize: 15,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 20 }}>◉</span>
                <span>Think</span>
              </button>

              <button
                type="button"
                onClick={toggleAIListening}
                aria-pressed={aiListening}
                aria-label={aiListening ? "Stop voice input" : "Start voice input"}
                title={aiListening ? "Stop voice input" : "Voice input"}
                style={{
                  width: 40,
                  height: 40,
                  border: 0,
                  borderRadius: "50%",
                  background: aiListening ? "#d94b4b" : "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {aiListening ? "■" : "♩"}
              </button>

              <MetalFx
                preset="chromatic"
                variant="circle"
                strength={aiInput.trim() && !aiTyping ? 0.9 : 0.45}
                theme="dark"
                innerShadow
                style={{ width: 42, height: 42, borderRadius: "50%" }}
              >
                <button
                  type="submit"
                  disabled={!aiInput.trim() || aiTyping}
                  aria-label="Send message"
                  title="Send message"
                  style={{
                    width: 42,
                    height: 42,
                    border: 0,
                    borderRadius: "50%",
                    background: "transparent",
                    color: "#fff",
                    cursor: !aiInput.trim() || aiTyping ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    opacity: !aiInput.trim() || aiTyping ? 0.75 : 1,
                  }}
                >
                  <span style={{ transform: "translateY(-1px)" }}>↑</span>
                </button>
              </MetalFx>
            </div>
            </VoiceBeam>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 7,
                marginTop: 8,
                color: "#8a8a8a",
                fontSize: 10,
              }}
            >
              <span>{JEEVADANAM_LANGUAGES.find(([code]) => code === aiLanguage)?.[1] || "English"}</span>
              <span>•</span>
              <span>{aiThinkMode ? "Deeper thinking on" : "Jeevadanam AI"}</span>
            </div>
          </form>
        </section>
        </BorderBeam>
      )}

      {!aiOpen && (
        <div className="jeevadanam-ai-orb-host" aria-label="Open Jeevadanam AI Assistant">
          <div className="jeevadanam-ai-orb-ring" aria-hidden="true" />

          <BorderBeam
            size="md"
            colorVariant="colorful"
            strength={1}
            theme="dark"
            borderRadius={50}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <div style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
          </BorderBeam>

          <div className="jeevadanam-ai-orb-core">
            <MetalFx
              preset="chromatic"
              variant="circle"
              strength={0.55}
              theme="dark"
              innerShadow
              style={{ width: 62, height: 62, borderRadius: "50%" }}
            >
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                aria-label="Open Jeevadanam AI Assistant"
                title="Jeevadanam AI Assistant"
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  border: 0,
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <BotAvatar
                  type="droid"
                  size={48}
                  face="mouth"
                  state="default"
                  interactive={false}
                  speed={1}
                  seed={0.37}
                  shading="plastic"
                  theme="dark"
                  brightness={0.92}
                  saturation={1.15}
                  ink="#08152b"
                  highlight={1.3}
                  shadow={0.45}
                />
              </button>
            </MetalFx>
          </div>
        </div>
      )}

      </div>
    </>
  );
}

export default App;