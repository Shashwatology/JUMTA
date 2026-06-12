import React, { useState, useEffect, useRef } from 'react';
import { useMaaSStore } from './store';
import { transitDataService, type StationData } from './services/transitDataService';
import { JAIPUR_HISTORICAL_RIDERSHIP, JAIPUR_INCIDENTS, getDistanceKm } from './data';
import {
  Wallet, Search,
  Award, Layers, Wifi, RefreshCw, Sliders, Sparkles, Phone, User, ShieldAlert, Check, MapPin, Zap,
  Bell, ArrowRight, Route, Radar, Gift, Bot, Signal
} from 'lucide-react';
import { 
  XAxis, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { InteractiveMaaSMap } from './components/InteractiveMaaSMap';
import { JumtaLogo } from './components/JumtaLogo';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

const SEGMENT_TRANSLATIONS: Record<string, string> = {
  'Walk to Bus Stop': 'बस स्टॉप तक पैदल चलें',
  'Nearest JCTSL Stop': 'निकटतम जेसीटीएसएल बस स्टॉप',
  'JCTSL Route 3 Bus': 'जेसीटीएसएल रूट 3 बस',
  'Destination Bus Stop': 'गंतव्य बस स्टॉप',
  'Walk to Destination': 'गंतव्य तक पैदल चलें',
  'E-Rickshaw Feeder': 'ई-रिक्शा फीडर',
  'JMRC Metro Gateway': 'जेएमआरसी मेट्रो गेटवे',
  'JMRC Metro Line': 'जेएमआरसी मेट्रो लाइन',
  'JUMTA Shared Cycle': 'जुम्टा साझा साइकिल',
  'Public Cycle Dock': 'सार्वजनिक साइकिल डॉक',
  'MaaS Transit Node': 'मास ट्रांजिट नोड',
  'Alighting Station': 'गंतव्य स्टेशन',
  'JMRC Metro System': 'जेएमआरसी मेट्रो सिस्टम',
  'Jaipur Heritage Express': 'जयपुर हेरिटेज एक्सप्रेस',
  'Direct Cab / Auto': 'सीधी कैब / ऑटो',
  'Nearest Stop': 'निकटतम स्टॉप',
  'Destination Stop': 'गंतव्य स्टॉप',
  'Jaipur Central': 'जयपुर सेंट्रल',
  'Jaipur Junction': 'जयपुर जंक्शन',
  'Jaipur': 'जयपुर',
  'Mansarovar Metro': 'मानसरोवर मेट्रो',
};

const T = {
  en: {
    welcome_title: "Jaipur's Unified Mobility Platform",
    welcome_desc: "Access JMRC metro, JCTSL buses, e-rickshaws, and smart ticketing all from a single unified wallet.",
    continue_mobile: "Continue with Mobile Number",
    continue_google: "Continue with Google",
    citizen_verification: "Citizen Verification",
    otp_desc: "We sent an SMS OTP code to verify your mobile identity for NCMC card setup.",
    autofill_otp: "Autofill OTP (8295)",
    verify_setup: "Verify & Set Up Wallet",
    set_profile: "Set Commuter Profile",
    profile_subtitle: "Configure your parameters for dynamic intermodal fare concessions.",
    full_name: "Full Name",
    gender: "Gender",
    age: "Age",
    concession_category: "Concession Category",
    interface_lang: "Interface Language",
    complete_start: "Complete Setup & Start",
    cat_resident_title: "Resident Standard",
    cat_resident_desc: "Default NCMC transit fares",
    cat_student_title: "Student Concession",
    cat_student_desc: "50% Off JMRC Metro segments",
    cat_women_title: "Women Concession",
    cat_women_desc: "25% Off all JMRC & JCTSL transit segments",
    cat_elder_title: "Elder Concession",
    cat_elder_desc: "25% Off all JMRC & JCTSL transit segments",
    cat_tourist_title: "Tourist Transit Pass",
    cat_tourist_desc: "Flat 1-day/3-day unlimited benefits",
    unified_commuter_pass: "Unified Commuter Pass",
    live_location: "Live Location",
    sync_gps: "Sync GPS",
    wallet_balance: "Wallet Balance",
    rupay_platinum: "RuPay Platinum",
    rajasthan_maas: "RAJASTHAN MAAS NETWORK",
    one_ticket: "ONE TICKET",
    where_to: "Where do you want to travel today?",
    active_concession: "Active Concession",
    applied_pass: "Applied Pass",
    frequent_commutes: "Frequent commutes",
    to_work: "To Work",
    to_mnit: "To MNIT",
    to_airport: "To Airport",
    live_nearby: "Live nearby feed",
    live: "Live",
    in_mins: "In {mins} mins",
    available: "Available",
    rickshaw_hub: "E-Rickshaw Hub Gate 2",
    rickshaw_desc: "8 autos active · 15m away",
    rickshaw_fare: "₹10 flat fare",
    bus_stand: "JCTSL Route 3 Stand",
    bus_desc: "To Transport Nagar · 280m",
    metro_station: "Mansarovar Metro",
    metro_desc: "Pink Line Terminus · 120m",
    tab_home: "Home",
    tab_planner: "Planner",
    tab_tickets: "Tickets",
    tab_wallet: "Wallet",
    tab_profile: "Profile",
    quick_trip: "Plan Trip",
    quick_trip_desc: "Multimodal routes",
    quick_tracking: "Live Tracking",
    quick_tracking_desc: "Track your journey",
    quick_wallet: "Wallet & Rewards",
    quick_wallet_desc: "Balance & bonuses",
    quick_ai: "AI Assistant",
    quick_ai_desc: "Ask in Hindi/English",
    plan_route: "Plan Intermodal Route",
    multimodal_planner: "Multimodal Planner",
    select_start: "Select Starting Point",
    select_dest: "Select Destination",
    change: "Change",
    compute_fares: "Compute Optimized Fares",
    public_transit: "🚌 Public Transit Corridor",
    integrated_feeder: "🔄 Integrated Feeder Pathways",
    private_cabs: "🚗 Private Cabs",
    greenest_routes: "🌱 Eco-Friendly Corridors",
    min_walk: "min walk",
    transfer: "transfer",
    transfers: "transfers",
    co2: "kg CO₂",
    maas_score: "MaaS Score",
    min: "min",
    checkout_portal: "Checkout Portal",
    intermodal_fare: "Intermodal Fare",
    applied_concession: "Applied Concession",
    ticket_type: "Ticket Type",
    unified_pass: "Jaipur Unified MaaS Pass",
    combined_discount: "Combined Ticket Discount",
    save_pct: "Save {pct}%",
    student_con_benefit: "Student Concession Benefit",
    student_con_active: "Active (50% Off Metro segments)",
    women_con_benefit: "Women Concession Benefit",
    women_con_active: "Active (25% Off segments)",
    elder_con_benefit: "Elder Concession Benefit",
    elder_con_active: "Active (25% Off segments)",
    ncmc_wallet_balance: "NCMC Wallet Balance",
    available_bal: "Available: ₹{bal}",
    pay_now: "Pay Now",
    pay_upi: "Pay via UPI (GPay, PhonePe, Bhim)",
    verifying_gateway: "Verifying cryptographical NCMC gateway token...",
    payment_processed: "Payment Processed Successfully!",
    back: "← Back",
    active_pass: "Active Commute Pass",
    unified_ticket: "Unified Transit Ticket",
    valid_transfers: "VALID FOR NEIGHBORHOOD TRANSFERS",
    smart_ledger: "NCMC Smart Transit Ledger",
    wallet_smart_credits: "Wallet & smart credits",
    available_balance: "Available Balance",
    ncmc_gold: "JUMTA SMART",
    rajasthan_transit: "National Common Mobility Card",
    ncmc_topup: "Dynamic NCMC top-up",
    topup_upi: "Top-Up Card via UPI Link",
    savings_ledger: "MaaS Savings Ledger",
    savings_vs: "Intermodal Cost Savings (vs Cab/Car)",
    green_points_title: "Jaipur Green Points",
    green_points_desc: "1,480 carbon-saver credits",
    redeem: "Redeem",
    your_identity: "Your Identity",
    configure_profile: "Configure citizen profile",
    name_label: "Name",
    gender_label: "Gender",
    age_label: "Age",
    category_label: "Category",
    lang_label: "Language",
    logout: "Sign Out",
    male: "Male",
    female: "Female",
    en_label: "English",
    hi_label: "हिन्दी",
    one_city_one_ticket: "One City. One Ticket.",
    welcome_subtitle: "Metro · Buses · E-Rickshaws · One Wallet.",
    badge_recommended: "⭐ RECOMMENDED",
    badge_greenest: "🌱 ZERO-CARBON",
    badge_fastest: "⚡ CAB RAPID",
    badge_cheapest: "🪙 SAVER",
    badge_least_walking: "🚶 MINIMAL WALK",
    mode_metro: "METRO",
    mode_bus: "BUS",
    mode_auto: "AUTO",
    mode_walk: "WALK",
    mode_cycle: "CYCLE",
    km_walk: "{km} km walk",
    transfer_label: "transfer",
    transfers_label: "transfers",
    boarding_point: "Boarding Point",
    destination_point: "Destination Point",
    close: "Close",
    use_gps_btn: "Use GPS",
    pick_on_map: "Pick on Map",
    write_search: "Write Search",
    pin_warning: "Simulating pin drop location. Adjust map markers directly to sync coordinates.",
    confirm_pin: "Confirm Civil Lines Pin Location",
    search_placeholder: "Search metro hub, bus stop or landmark...",
    pois_header: "Landmarks (POIs)",
    metro_header: "Metro Stations (JMRC)",
    bus_header: "Bus Stops (JCTSL)",
    badge_hub: "Hub",
    badge_metro: "Metro",
    badge_bus: "Bus",
    start_label: "Start",
    end_label: "End",
    hub_coords: "Current Hub Coordinates",
    reset_account: "Reset Citizen Account",
    ai_guide_bot: "AI Guide Bot",
    send_btn: "Send",
    ai_placeholder: "Type transit queries in English/Hindi...",
    sos_active: "EMERGENCY SOS ACTIVE",
    sos_desc: "Your real-time coordinates, passenger ID, and active telemetry have been dispatched to Jaipur Police, JMRC Security, and JCTSL controllers.",
    gps_coords: "GPS Coordinates",
    nearest_station: "Nearest Station",
    citizen_id: "Citizen Identity Code",
    call_emergency: "Call Emergency Helpline (112)",
    cancel_sos: "Cancel Security Dispatcher",
    sos_btn: "SOS",
    ai_assistant_title: "JUMTA AI Assistant",
  },
  hi: {
    welcome_title: "जयपुर एकीकृत गतिशीलता मंच",
    welcome_desc: "एक ही एकीकृत वॉलेट से जेएमआरसी (JMRC) मेट्रो, जेसीटीएसएल (JCTSL) बसों, ई-रिक्शा और स्मार्ट टिकटिंग का उपयोग करें।",
    continue_mobile: "मोबाइल नंबर के साथ आगे बढ़ें",
    continue_google: "गूगल (Google) के साथ आगे बढ़ें",
    citizen_verification: "नागरिक सत्यापन",
    otp_desc: "हमने एनसीएमसी (NCMC) कार्ड सेटअप के लिए आपके मोबाइल की पहचान सत्यापित करने हेतु एक एसएमएस (SMS) ओटीपी भेजा है।",
    autofill_otp: "स्वतः ओटीपी भरें (8295)",
    verify_setup: "सत्यापित करें और वॉलेट सेटअप करें",
    set_profile: "यात्री प्रोफ़ाइल सेट करें",
    profile_subtitle: "गतिशील इंटरमॉडल किराए में रियायत के लिए अपने मानदंड कॉन्फ़िगर करें।",
    full_name: "पूरा नाम",
    gender: "लिंग",
    age: "उम्र",
    concession_category: "रियायत श्रेणी",
    interface_lang: "इंटरफ़ेस भाषा",
    complete_start: "सेटअप पूरा करें और प्रारंभ करें",
    cat_resident_title: "सामान्य निवासी",
    cat_resident_desc: "डिफ़ॉल्ट एनसीएमसी पारगमन किराए",
    cat_student_title: "छात्र रियायत",
    cat_student_desc: "जेएमआरसी मेट्रो खंडों पर 50% छूट",
    cat_women_title: "महिला रियायत",
    cat_women_desc: "सभी जेएमआरसी और जेसीटीएसएल पारगमन खंडों पर 25% छूट",
    cat_elder_title: "वरिष्ठ नागरिक रियायत",
    cat_elder_desc: "सभी जेएमआरसी और जेसीटीएसएल पारगमन खंडों पर 25% छूट",
    cat_tourist_title: "पर्यटक ट्रांजिट पास",
    cat_tourist_desc: "फ्लैट 1-दिवसीय/3-दिवसीय असीमित लाभ",
    unified_commuter_pass: "एकीकृत यात्री पास",
    live_location: "लाइव स्थान",
    sync_gps: "जीपीएस सिंक करें",
    wallet_balance: "वॉलेट बैलेंस",
    rupay_platinum: "रूपे प्लैटिनम",
    rajasthan_maas: "राजस्थान मास नेटवर्क",
    one_ticket: "एक टिकट",
    where_to: "आज आप कहाँ यात्रा करना चाहते हैं?",
    active_concession: "सक्रिय रियायत",
    applied_pass: "लागू पास",
    frequent_commutes: "बार-बार की यात्राएँ",
    to_work: "काम पर",
    to_mnit: "एमएनआईटी (MNIT)",
    to_airport: "हवाई अड्डा",
    live_nearby: "लाइव आस-पास की फीड",
    live: "लाइव",
    in_mins: "{mins} मिनट में",
    available: "उपलब्ध",
    rickshaw_hub: "ई-रिक्शा हब गेट 2",
    rickshaw_desc: "8 ऑटो सक्रिय · 15 मीटर दूर",
    rickshaw_fare: "₹10 फ्लैट किराया",
    bus_stand: "जेसीटीएसएल रूट 3 स्टैंड",
    bus_desc: "ट्रांसपोर्ट नगर के लिए · 280 मीटर",
    metro_station: "मानसरोवर मेट्रो",
    metro_desc: "पिंक लाइन टर्मिनल · 120 मीटर",
    tab_home: "मुख्य पृष्ठ",
    tab_planner: "योजना",
    tab_tickets: "टिकट",
    tab_wallet: "वॉलेट",
    tab_profile: "प्रोफ़ाइल",
    quick_trip: "यात्रा योजना",
    quick_trip_desc: "मल्टीमॉडल मार्ग",
    quick_tracking: "लाइव ट्रैकिंग",
    quick_tracking_desc: "अपनी यात्रा ट्रैक करें",
    quick_wallet: "वॉलेट और पुरस्कार",
    quick_wallet_desc: "बैलेंस और बोनस",
    quick_ai: "एआई सहायक",
    quick_ai_desc: "हिन्दी/अंग्रेजी में पूछें",
    plan_route: "मार्ग योजना",
    multimodal_planner: "मल्टीमॉडल प्लानर",
    select_start: "प्रारंभिक बिंदु चुनें",
    select_dest: "गंतव्य चुनें",
    change: "बदलें",
    compute_fares: "अनुकूलित किराए की गणना करें",
    public_transit: "🚌 सार्वजनिक पारगमन गलियारा",
    integrated_feeder: "🔄 एकीकृत फीडर मार्ग",
    private_cabs: "🚗 निजी कैब",
    greenest_routes: "🌱 पर्यावरण-अनुकूल गलियारे",
    min_walk: "मिनट पैदल",
    transfer: "स्थानांतरण",
    transfers: "स्थानांतरण",
    co2: "किग्रा CO₂",
    maas_score: "मास स्कोर",
    min: "मिनट",
    checkout_portal: "चेकआउट पोर्टल",
    intermodal_fare: "इंटरमॉडल किराया",
    applied_concession: "लागू रियायत",
    ticket_type: "टिकट का प्रकार",
    unified_pass: "जयपुर एकीकृत मास पास",
    combined_discount: "एकीकृत टिकट छूट",
    save_pct: "बचत {pct}%",
    student_con_benefit: "छात्र रियायत लाभ",
    student_con_active: "सक्रिय (मेट्रो खंडों पर 50% छूट)",
    women_con_benefit: "महिला रियायत लाभ",
    women_con_active: "सक्रिय (खंडों पर 25% छूट)",
    elder_con_benefit: "वरिष्ठ नागरिक रियायत लाभ",
    elder_con_active: "सक्रिय (खंडों पर 25% छूट)",
    ncmc_wallet_balance: "एनसीएमसी वॉलेट बैलेंस",
    available_bal: "उपलब्ध: ₹{bal}",
    pay_now: "अभी भुगतान करें",
    pay_upi: "यूपीआई (UPI) द्वारा भुगतान (GPay, PhonePe, Bhim)",
    verifying_gateway: "क्रिप्टोग्राफिक एनसीएमसी गेटवे टोकन सत्यापित किया जा रहा है...",
    payment_processed: "भुगतान सफलतापूर्वक संसाधित किया गया!",
    back: "← वापस",
    active_pass: "सक्रिय पास",
    unified_ticket: "एकीकृत पारगमन टिकट",
    valid_transfers: "आस-पड़ोस के स्थानांतरण के लिए वैध",
    smart_ledger: "एनसीएमसी स्मार्ट ट्रांजिट लेज़र",
    wallet_smart_credits: "वॉलेट और स्मार्ट क्रेडिट",
    available_balance: "उपलब्ध बैलेंस",
    ncmc_gold: "जुम्टा स्मार्ट",
    rajasthan_transit: "राष्ट्रीय सामान्य गतिशीलता कार्ड",
    ncmc_topup: "डायनेमिक एनसीएमसी टॉप-अप",
    topup_upi: "यूपीआई लिंक द्वारा टॉप-अप करें",
    savings_ledger: "मास बचत लेज़र",
    savings_vs: "इंटरमॉडल लागत बचत (बनाम कैब/कार)",
    green_points_title: "जयपुर ग्रीन पॉइंट्स",
    green_points_desc: "1,480 कार्बन-बचत क्रेडिट",
    redeem: "भुनाएं",
    your_identity: "आपकी पहचान",
    configure_profile: "नागरिक प्रोफ़ाइल कॉन्फ़िगर करें",
    name_label: "नाम",
    gender_label: "लिंग",
    age_label: "उम्र",
    category_label: "श्रेणी",
    lang_label: "भाषा",
    logout: "लॉग आउट",
    male: "पुरुष",
    female: "महिला",
    en_label: "English",
    hi_label: "हिन्दी",
    one_city_one_ticket: "एक शहर। एक टिकट।",
    welcome_subtitle: "मेट्रो · बसें · ई-रिक्शा · एक वॉलेट।",
    badge_recommended: "⭐ अनुशंसित",
    badge_greenest: "🌱 शून्य-कार्बन",
    badge_fastest: "⚡ कैब रैपिड",
    badge_cheapest: "🪙 बचतकर्ता",
    badge_least_walking: "🚶 न्यूनतम पैदल यात्रा",
    mode_metro: "मेट्रो",
    mode_bus: "बस",
    mode_auto: "ऑटो",
    mode_walk: "पैदल",
    mode_cycle: "साइकिल",
    km_walk: "{km} किमी पैदल",
    transfer_label: "स्थानांतरण",
    transfers_label: "स्थानांतरण",
    boarding_point: "प्रारंभिक बिंदु",
    destination_point: "गंतव्य बिंदु",
    close: "बंद करें",
    use_gps_btn: "जीपीएस का उपयोग करें",
    pick_on_map: "नक्शे पर चुनें",
    write_search: "सर्च लिखें",
    pin_warning: "पिन ड्रॉप स्थान का अनुकरण। निर्देशांक सिंक करने के लिए सीधे मानचित्र मार्करों को समायोजित करें।",
    confirm_pin: "सिविल लाइन्स पिन स्थान की पुष्टि करें",
    search_placeholder: "मेट्रो हब, बस स्टॉप या लैंडमार्क खोजें...",
    pois_header: "लैंडमार्क (POIs)",
    metro_header: "मेट्रो स्टेशन (JMRC)",
    bus_header: "बस स्टॉप (JCTSL)",
    badge_hub: "हब",
    badge_metro: "मेट्रो",
    badge_bus: "बस",
    start_label: "प्रारंभ",
    end_label: "अंत",
    hub_coords: "वर्तमान हब निर्देशांक",
    reset_account: "सिटीजन अकाउंट रीसेट करें",
    ai_guide_bot: "एॉई गाइड बॉट",
    send_btn: "भेजें",
    ai_placeholder: "अंग्रेजी/हिंदी में पारगमन प्रश्न लिखें...",
    sos_active: "आपातकालीन SOS सक्रिय",
    sos_desc: "आपके वास्तविक समय के निर्देशांक, यात्री आईडी और सक्रिय टेलीमेट्री जयपुर पुलिस, जेएमआरसी सुरक्षा और जेसीटीएसएल नियंत्रकों को भेज दी गई है।",
    gps_coords: "जीपीएस निर्देशांक",
    nearest_station: "निकटतम स्टेशन",
    citizen_id: "नागरिक पहचान कोड",
    call_emergency: "आपातकालीन हेल्पलाइन पर कॉल करें (112)",
    cancel_sos: "सुरक्षा प्रेषण रद्द करें",
    sos_btn: "आपातकालीन SOS",
    ai_assistant_title: "जुम्टा एआई सहायक",
  }
};

// Micro Hawa Mahal silhouette — the only heritage detail in the bottom nav
const HawaMahalIcon: React.FC<{ className?: string; color?: string }> = ({ className = '', color = 'currentColor' }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path
      d="M10 1.5l1.4 1.6h-2.8L10 1.5zM4 18.5v-7c0-1 .6-1.8 1.4-2.2.3-1.6 1.6-2.8 3.2-3V5.4h2.8v.9c1.6.2 2.9 1.4 3.2 3 .8.4 1.4 1.2 1.4 2.2v7H4z"
      fill={color}
      fillOpacity="0.9"
    />
    <rect x="9" y="12" width="2" height="6.5" fill="#fff" fillOpacity="0.55" />
    <rect x="5.7" y="13" width="1.4" height="5.5" fill="#fff" fillOpacity="0.4" />
    <rect x="12.9" y="13" width="1.4" height="5.5" fill="#fff" fillOpacity="0.4" />
  </svg>
);

export default function App() {
  const store = useMaaSStore();
  
  // Interface Language State
  const [profileLang, setProfileLang] = useState<'en' | 'hi'>('en');
  const lang = store.userProfile?.language || profileLang || 'en';

  const t = (key: keyof typeof T['en'], replacements?: Record<string, string | number>): string => {
    const translationSet = T[lang] || T['en'];
    let str = (translationSet as any)[key] || (T['en'] as any)[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };
  
  // Auth flow states
  const [otpVal, setOtpVal] = useState(['', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [profileName, setProfileName] = useState('Shashwat');
  const [profileGender, setProfileGender] = useState('Male');
  const [profileAge, setProfileAge] = useState('22');
  const [profileCategory, setProfileCategory] = useState<'RESIDENT' | 'STUDENT' | 'TOURIST' | 'WOMEN' | 'ELDER'>('RESIDENT');

  // Search autocomplete bottom-sheet states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'from' | 'to' | null>(null);
  const [selectedStartStop, setSelectedStartStop] = useState<StationData | null>(null);
  const [selectedEndStop, setSelectedEndStop] = useState<StationData | null>(null);

  // General Interactive States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; textHi?: string }>>([
    { 
      sender: 'ai', 
      text: 'Namaste! I am your JUMTA AI Assistant. Where do you want to travel in Jaipur today?', 
      textHi: 'नमस्ते! मैं आपका जुम्टा एआई सहायक हूँ। आज आप जयपुर में कहाँ यात्रा करना चाहते हैं?' 
    }
  ]);
  const [showControlSidebar, setShowControlSidebar] = useState(true);
  const [rechargeAmt, setRechargeAmt] = useState('100');
  const [showSOSOverlay, setShowSOSOverlay] = useState(false);
  const [validitySeconds, setValiditySeconds] = useState(7200); // 2 hours validity

  let activeConcession: 'RESIDENT' | 'STUDENT' | 'WOMEN' | 'ELDER' | 'TOURIST' = 'RESIDENT';
  if (store.collegeMode) activeConcession = 'STUDENT';
  else if (store.touristMode) activeConcession = 'TOURIST';
  else if (store.womenMode) activeConcession = 'WOMEN';
  else if (store.elderMode) activeConcession = 'ELDER';

  const handleConcessionChange = (category: 'RESIDENT' | 'STUDENT' | 'WOMEN' | 'ELDER' | 'TOURIST') => {
    store.setCollegeMode(category === 'STUDENT');
    store.setTouristMode(category === 'TOURIST');
    store.setWomenMode(category === 'WOMEN');
    store.setElderMode(category === 'ELDER');
    if (store.userProfile) {
      store.setUserProfile({
        ...store.userProfile,
        category: category as any
      });
    }
  };

  useEffect(() => {
    if (store.citizenScreen !== 'tracking') return;
    const interval = setInterval(() => {
      setValiditySeconds(prev => (prev > 0 ? prev - 1 : 7200));
    }, 1000);
    return () => clearInterval(interval);
  }, [store.citizenScreen]);

  const formatValidityTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (lang === 'hi') {
      return `${h}घं ${m}मि ${s}से`;
    }
    return `${h}h ${m}m ${s}s`;
  };

  // Weather state
  const [weatherData, setWeatherData] = useState<{ temp: number; icon: string; desc: string } | null>(null);
  const [currentLocName, setCurrentLocName] = useState<string>('Jaipur Central');

  // Map selection states
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);

  // Load stops and POIs from services
  const allStops = transitDataService.getAllStops(true);
  const pois = transitDataService.getPOIs();

  const searchableLocations = [
    ...allStops,
    ...pois.map(p => ({
      id: p.id,
      nameEn: p.nameEn,
      nameHi: p.nameHi,
      lat: p.lat,
      lng: p.lng,
      type: 'AUTO' as const
    }))
  ];

  const getStopName = (name: string): string => {
    if (lang === 'hi') {
      const trimmed = name.trim();
      if (SEGMENT_TRANSLATIONS[trimmed]) {
        return SEGMENT_TRANSLATIONS[trimmed];
      }
      const stop = searchableLocations.find(
        s => s.nameEn.toLowerCase() === trimmed.toLowerCase() ||
             s.nameEn.replace(' Metro', '').replace(' Campus', '').toLowerCase() === trimmed.replace(' Metro', '').replace(' Campus', '').toLowerCase()
      );
      if (stop && stop.nameHi) {
        return stop.nameHi;
      }
    }
    return name;
  };

  // On mount: trigger search, run splash simulation, and fetch weather + location
  useEffect(() => {
    store.triggerSearch();
    
    // Simulate Splash transition after 1.8 seconds
    const timer = setTimeout(() => {
      if (store.authStep === 'splash') {
        store.setAuthStep('welcome');
      }
    }, 1800);

    const fetchWeatherAndLocation = async (lat: number, lng: number, isDefault = false) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
        const json = await res.json();
        if (json.current_weather) {
          const temp = Math.round(json.current_weather.temperature);
          const code = json.current_weather.weathercode;
          let icon = '☀️';
          let desc = 'Clear';
          if (code >= 1 && code <= 3) { icon = '⛅'; desc = 'Partly Cloudy'; }
          else if (code >= 51 && code <= 67) { icon = '🌧️'; desc = 'Rainy'; }
          else if (code >= 71 && code <= 86) { icon = '❄️'; desc = 'Snow'; }
          else if (code >= 95) { icon = '⛈️'; desc = 'Stormy'; }
          setWeatherData({ temp, icon, desc });
        }
      } catch (err) {
        console.error('Weather API error:', err);
        setWeatherData({ temp: 36, icon: '☀️', desc: 'Clear (Simulated)' });
      }

      let locName = 'Jaipur Central';
      if (isDefault) {
        locName = 'Mansarovar Metro';
        setCurrentLocName(locName);
        store.setUserLocation({ lat: 26.8770, lng: 75.7540, nameEn: locName });
        const mStop = searchableLocations.find(s => s.id === 'M_MANSAROVAR');
        if (mStop) setSelectedStartStop(mStop as any);
        const bStop = searchableLocations.find(s => s.id === 'B_MNIT');
        if (bStop) setSelectedEndStop(bStop as any);
      } else {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`, {
            headers: { 'Accept-Language': 'en' }
          });
          const json = await res.json();
          if (json.address) {
            locName = json.address.suburb || json.address.neighbourhood || json.address.city || 'Jaipur';
            setCurrentLocName(locName);
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          locName = 'Jaipur Junction';
          setCurrentLocName(locName);
        }
        store.setUserLocation({ lat, lng, nameEn: locName });

        // Find nearest station
        let nearest: any = null;
        let minDist = Infinity;
        searchableLocations.forEach(loc => {
          const d = getDistanceKm(lat, lng, loc.lat, loc.lng);
          if (d < minDist) {
            minDist = d;
            nearest = loc;
          }
        });

        if (nearest) {
          setSelectedStartStop(nearest);
          const destId = nearest.id === 'B_MNIT' || nearest.id === 'M2_MNIT' ? 'M_MANSAROVAR' : 'B_MNIT';
          const destStop = searchableLocations.find(s => s.id === destId);
          if (destStop) setSelectedEndStop(destStop as any);
        }
      }
    };

    const initLocationAndWeather = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchWeatherAndLocation(pos.coords.latitude, pos.coords.longitude, false);
          },
          (err) => {
            console.warn("Geolocation denied. Using default Jaipur location.", err);
            fetchWeatherAndLocation(26.8770, 75.7540, true);
          },
          { timeout: 5000 }
        );
      } else {
        fetchWeatherAndLocation(26.8770, 75.7540, true);
      }
    };

    initLocationAndWeather();
    return () => clearTimeout(timer);
  }, []);

  // Update starting and ending stops in store when changed locally
  useEffect(() => {
    if (selectedStartStop) store.setStartStopId(selectedStartStop.id);
    if (selectedEndStop) store.setEndStopId(selectedEndStop.id);
  }, [selectedStartStop, selectedEndStop]);

  const handleSearchTrigger = () => {
    if (!selectedStartStop || !selectedEndStop) return;
    store.triggerSearch();
    store.setCitizenScreen('trips');
  };

  // Geolocation Handler
  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest: any = null;
        let minDist = Infinity;
        
        searchableLocations.forEach(loc => {
          const d = getDistanceKm(latitude, longitude, loc.lat, loc.lng);
          if (d < minDist) {
            minDist = d;
            nearest = loc;
          }
        });
        
        if (nearest) {
          if (searchMode === 'from') {
            setSelectedStartStop(nearest);
          } else {
            setSelectedEndStop(nearest);
          }
          setSearchQuery('');
          setSearchMode(null);
          setIsSelectingOnMap(false);
        }
      }, () => {
        alert("GPS geolocation unavailable.");
      });
    }
  };

  const handleOTPVerify = () => {
    store.setAuthStep('profile');
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const displayName = result.user.displayName || 'Google Commuter';
        setProfileName(displayName);
        store.setAuthStep('profile');
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      alert(`Google Sign-In failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.setUserProfile({
      name: profileName,
      gender: profileGender,
      age: profileAge,
      category: profileCategory,
      language: profileLang
    });
    store.setCollegeMode(profileCategory === 'STUDENT');
    store.setTouristMode(profileCategory === 'TOURIST');
    store.setWomenMode(profileCategory === 'WOMEN');
    store.setElderMode(profileCategory === 'ELDER');
    store.setAuthStep('authenticated');
    store.setCitizenScreen('home');

    const mStop = transitDataService.getStopById('M_MANSAROVAR');
    const bStop = transitDataService.getStopById('B_MNIT');
    if (mStop) setSelectedStartStop(mStop);
    if (bStop) setSelectedEndStop(bStop);
  };

  // Payment State Handler
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  const handleWalletPay = (fare: number) => {
    setPaymentState('processing');
    setTimeout(() => {
      const ok = store.deductWallet(fare);
      if (ok) {
        setPaymentState('success');
        setTimeout(() => {
          setPaymentState('idle');
          store.setCitizenScreen('tracking');
        }, 1200);
      } else {
        setPaymentState('failed');
        setTimeout(() => setPaymentState('idle'), 2000);
      }
    }, 1200);
  };

  const handleUPIPay = () => {
    setPaymentState('processing');
    setTimeout(() => {
      setPaymentState('success');
      setTimeout(() => {
        setPaymentState('idle');
        store.setCitizenScreen('tracking');
      }, 1200);
    }, 1200);
  };

  // Chatbot submission handler
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      let aiText = '';
      let aiTextHi = '';

      if (userMsg.toLowerCase().includes('fast') || userMsg.toLowerCase().includes('quick') || userMsg.toLowerCase().includes('teez')) {
        aiText = 'The fastest validated route is the Pink Line Metro from Mansarovar to Railway Station, switching to JCTSL Route 3 Bus to MNIT. Total journey: 38 mins.';
        aiTextHi = 'सबसे तेज़ मान्य मार्ग मानसरोवर से रेलवे स्टेशन तक पिंक लाइन मेट्रो है, फिर एमएनआईटी के लिए जेसीटीएसएल रूट 3 बस। कुल समय: 38 मिनट।';
      } else if (userMsg.toLowerCase().includes('cheap') || userMsg.toLowerCase().includes('sasta') || userMsg.toLowerCase().includes('cost')) {
        aiText = 'For the lowest fare, take the direct JCTSL Route 3 Bus. It costs ₹15, saving 60% compared to private transport.';
        aiTextHi = 'न्यूनतम किराए के लिए, सीधे जेसीटीएसएल रूट 3 बस लें। इसकी लागत ₹15 है, जो निजी वाहनों की तुलना में 60% की बचत है।';
      } else {
        aiText = 'I have analyzed the current network load. Recommended multi-modal route has 1 transfer node with a 20% integrated fare discount applied automatically.';
        aiTextHi = 'मैंने नेटवर्क लोड का विश्लेषण किया है। अनुशंसित मार्ग में 1 ट्रांसफर नोड है जिसमें 20% एकीकृत किराया छूट स्वतः लागू है।';
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiText, textHi: aiTextHi }]);
    }, 800);
  };

  // Filter locations for bottom sheets
  const filteredLocs = searchQuery.trim() === ''
    ? searchableLocations.slice(0, 15)
    : searchableLocations.filter(loc => 
        loc.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
        loc.nameHi.includes(searchQuery)
      );

  const groupPOIs = filteredLocs.filter(loc => loc.id.startsWith('POI_'));
  const groupMetro = filteredLocs.filter(loc => loc.type === 'METRO');
  const groupBus = filteredLocs.filter(loc => loc.type === 'BUS');

  return (
    <div className="min-h-screen bg-[#F4F2EE] py-6 px-4 md:px-8 flex flex-col gap-6 font-sora">
      
      {/* BRAND & HEADER PORTAL */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E3DEC9] pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl border border-[#EAE6DC] shadow-sm">
            <JumtaLogo size="md" variant="color" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-2">
              <span>JUMTA Portal</span>
              <span className="text-[10px] text-jaipur-pink font-extrabold uppercase px-2 py-0.5 bg-jaipur-pink/10 rounded-full border border-jaipur-pink/20">
                Jaipur Unified Mobility &amp; Transport Authority
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Official Digital Mobility Gateway for Jaipur City</p>
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowControlSidebar(!showControlSidebar)}
            className="bg-white border border-[#EAE6DC] text-slate-700 px-4.5 py-2.5 rounded-2xl text-xs font-bold hover:bg-slate-50 shadow-sm flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>{showControlSidebar ? 'Hide Authority Command Center' : 'Show JMRC / JCTSL Operations Control'}</span>
          </button>
        </div>
      </header>

      {/* DASHBOARD SPLIT VIEWPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center">
        
        {/* MOBILE SIMULATOR AREA (LEFT COLUMN) */}
        <section className={`flex justify-center transition-all duration-300 ${showControlSidebar ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          <div className="phone-viewport bg-[#F8F7F5] border-[12px] border-slate-900 shadow-2xl flex flex-col justify-between">
            <div className="phone-notch bg-slate-900"></div>

            {/* Status Bar */}
            <div className="h-9 px-6 pt-3 flex justify-between items-center text-xs text-slate-500 z-40 select-none bg-white/70 backdrop-blur-md font-medium border-b border-[#F1EFEA]">
              <span className="font-semibold text-slate-800">10:18</span>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-slate-700" />
                <span className="font-bold text-[9px] text-slate-700">5G</span>
                <span className="font-extrabold text-jaipur-pink tracking-tight text-[9px]">JUMTA</span>
              </div>
            </div>

            {/* SCREEN VIEWPORT CONTENT CONTAINER */}
            {(() => {
              const isFullBleed =
                store.authStep === 'welcome' ||
                (store.authStep === 'authenticated' && store.citizenScreen === 'home');
              return (
            <div className={`flex-1 overflow-y-auto flex flex-col ${isFullBleed ? 'bg-[#FFF5F5]' : 'px-4.5 py-4 bg-[#F8F7F5]'}`}>
              
              {/* SPLASH SCREEN */}
              {store.authStep === 'splash' && (
                <div className="flex-grow flex flex-col items-center justify-center gap-6 py-20 bg-white rounded-3xl border border-[#EAE6DC] relative overflow-hidden">
                  <div className="block-print-bg absolute inset-0 pointer-events-none" />
                  <div className="flex flex-col items-center gap-4 animate-pulse z-10">
                    <JumtaLogo size="xl" variant="color" />
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mt-2">JUMTA</h2>
                    <span className="text-[10px] text-jaipur-pink font-extrabold tracking-widest uppercase bg-jaipur-pink/10 px-3 py-1 rounded-full border border-jaipur-pink/20">
                      {t('one_city_one_ticket')}
                    </span>
                  </div>
                  <div className="w-2/3 h-1 bg-slate-100 rounded-full overflow-hidden mt-8 z-10">
                    <div className="h-full bg-gradient-to-r from-jaipur-pink to-metro-blue animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              )}

              {/* SIGN UP SCREEN — full-bleed Jaipur hero illustration */}
              {store.authStep === 'welcome' && (
                <div className="relative flex-1 w-full overflow-hidden">
                  {/* Full-bleed cityscape: metro, bus, route lines, Hawa Mahal, mandalas */}
                  <img
                    src="/signup.png"
                    alt="Jaipur's unified mobility — metro, bus, cycle and e-rickshaw routes"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />

                  {/* Floating content card sitting on the image's natural blush fade */}
                  <div className="absolute bottom-0 left-0 right-0 h-[46%] bg-white rounded-t-[28px] px-6 pt-6 flex flex-col items-center">
                    {/* Logo */}
                    <img src="/jumta_logo.png" alt="JUMTA" className="w-12 h-12 object-contain" />

                    {/* Rose divider */}
                    <div className="w-16 h-px mt-3 mb-2.5" style={{ backgroundColor: 'rgba(192,68,78,0.2)' }} />

                    {/* Headline */}
                    <h2 className="font-cormorant font-bold text-[24px] leading-tight text-[#7A1F2E] text-center px-2">
                      {t('welcome_title')}
                    </h2>

                    {/* Subtitle */}
                    <p className="font-inter text-[13px] text-[#8A6060] text-center mt-1.5 leading-snug max-w-[280px]">
                      {t('welcome_subtitle')}
                    </p>

                    {/* Primary + secondary actions (24px gap above) */}
                    <div className="w-full flex flex-col gap-3 mt-6">
                      <button
                        onClick={() => store.setAuthStep('otp')}
                        className="w-full h-[52px] rounded-[14px] bg-[#C0444E] text-white font-inter font-semibold text-[15px] flex items-center justify-center gap-2.5 active:opacity-90 transition-all cursor-pointer"
                      >
                        <Phone className="w-[18px] h-[18px]" />
                        <span>{t('continue_mobile')}</span>
                      </button>
                      <button
                        onClick={handleGoogleSignIn}
                        className="w-full h-[52px] rounded-[14px] bg-white border border-[#E8C8C8] text-[#1A1A1A] font-inter font-normal text-[15px] flex items-center justify-center gap-2.5 active:bg-[#FFF5F5] transition-all cursor-pointer"
                      >
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{t('continue_google')}</span>
                      </button>
                    </div>

                    {/* Footer */}
                    <p className="font-inter text-[11px] text-[#B09090] text-center mt-auto mb-5 leading-relaxed">
                      {lang === 'hi' ? (
                        <>आगे बढ़कर आप <span className="text-[#C0444E]">नियमों</span> और <span className="text-[#C0444E]">गोपनीयता नीति</span> से सहमत होते हैं</>
                      ) : (
                        <>By continuing you agree to <span className="text-[#C0444E]">Terms</span> &amp; <span className="text-[#C0444E]">Privacy Policy</span></>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* OTP SCREEN */}
              {store.authStep === 'otp' && (
                <div className="flex-grow flex flex-col justify-between py-6 bg-white px-4 rounded-3xl border border-[#EAE6DC]">
                  <div className="flex flex-col gap-4 mt-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('citizen_verification')}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {t('otp_desc')}
                    </p>

                    <div className="flex gap-3 mt-6 justify-center">
                      {otpVal.map((v, idx) => (
                        <input 
                          key={idx}
                          ref={(el) => { otpRefs.current[idx] = el; }}
                          type="text" 
                          maxLength={1} 
                          value={v}
                          onChange={(e) => {
                            const val = e.target.value.slice(-1);
                            const copy = [...otpVal];
                            copy[idx] = val;
                            setOtpVal(copy);
                            if (val && idx < 3) {
                              otpRefs.current[idx + 1]?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !otpVal[idx] && idx > 0) {
                              otpRefs.current[idx - 1]?.focus();
                            }
                          }}
                          className="w-12 h-14 border border-[#EAE6DC] bg-[#F8F7F5] rounded-2xl text-center text-lg font-bold text-slate-900 focus:outline-none focus:border-jaipur-pink shadow-inner"
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setOtpVal(['8', '2', '9', '5'])}
                      className="text-xs text-jaipur-pink font-bold self-center mt-4 cursor-pointer hover:underline bg-jaipur-pink/5 px-3.5 py-1.5 rounded-full border border-jaipur-pink/15"
                    >
                      {t('autofill_otp')}
                    </button>
                  </div>

                  <button 
                    onClick={handleOTPVerify}
                    className="w-full bg-jaipur-pink text-white font-bold py-4 rounded-2xl text-xs hover:opacity-95 transition-all cursor-pointer shadow-md mt-12"
                  >
                    {t('verify_setup')}
                  </button>
                </div>
              )}

              {/* PROFILE SETUP */}
              {store.authStep === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="flex-grow flex flex-col justify-between py-6 bg-white px-4 rounded-3xl border border-[#EAE6DC]">
                  <div className="flex flex-col gap-4 mt-4">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('set_profile')}</h3>
                    <p className="text-xs text-slate-500">{t('profile_subtitle')}</p>

                    <div className="flex flex-col gap-4 mt-2">
                      <div>
                        <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">{t('full_name')}</label>
                        <input 
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full border border-[#EAE6DC] bg-[#F8F7F5] px-3.5 py-3 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-jaipur-pink"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">{t('gender')}</label>
                          <div className="flex border border-[#EAE6DC] rounded-xl overflow-hidden text-xs bg-[#F8F7F5]">
                            {['Male', 'Female'].map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setProfileGender(g)}
                                className={`flex-1 py-2.5 font-bold transition-all ${
                                  profileGender === g ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                {g === 'Male' ? t('male') : t('female')}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">{t('age')}</label>
                          <input 
                            type="number"
                            required
                            value={profileAge}
                            onChange={(e) => setProfileAge(e.target.value)}
                            className="w-full border border-[#EAE6DC] bg-[#F8F7F5] px-3.5 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">{t('concession_category')}</label>
                        <div className="relative">
                          <select
                            value={profileCategory}
                            onChange={(e) => setProfileCategory(e.target.value as any)}
                            className="w-full border border-[#EAE6DC] bg-[#F8F7F5] px-3.5 py-3 pr-9 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-jaipur-pink cursor-pointer appearance-none"
                          >
                            <option value="RESIDENT">{t('cat_resident_title')} — {t('cat_resident_desc')}</option>
                            <option value="STUDENT">🎓 {t('cat_student_title')} — {t('cat_student_desc')}</option>
                            <option value="WOMEN">👩 {t('cat_women_title')} — {t('cat_women_desc')}</option>
                            <option value="ELDER">👵 {t('cat_elder_title')} — {t('cat_elder_desc')}</option>
                            <option value="TOURIST">🏛️ {t('cat_tourist_title')} — {t('cat_tourist_desc')}</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-jaipur-pink">
                            <span className="text-[10px]">▼</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">{t('interface_lang')}</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setProfileLang('en')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                              profileLang === 'en' ? 'bg-jaipur-pink/10 border-jaipur-pink text-jaipur-pink' : 'bg-[#F8F7F5] border-[#EAE6DC] text-slate-500'
                            }`}
                          >
                            English
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileLang('hi')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                              profileLang === 'hi' ? 'bg-jaipur-pink/10 border-jaipur-pink text-jaipur-pink' : 'bg-[#F8F7F5] border-[#EAE6DC] text-slate-500'
                            }`}
                          >
                            हिन्दी
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-880 transition-all cursor-pointer shadow-md mt-6"
                  >
                    {t('complete_start')}
                  </button>
                </form>
              )}

              {/* AUTHENTICATED SCREEN VIEWER */}
              {store.authStep === 'authenticated' && (
                <div className="flex-grow flex flex-col relative">
                  
                  {/* TAB 1: HOME DASHBOARD */}
                  {store.citizenScreen === 'home' && (
                    <div className="flex-grow flex flex-col animate-fade-in">

                      {/* HERO — soft pink Jaipur skyline (Hawa Mahal, City Palace, Jantar Mantar) */}
                      <div className="relative w-full h-[336px] shrink-0">
                        <img
                          src="/jaipur-hero.png"
                          alt="Jaipur skyline — Hawa Mahal, City Palace and Jantar Mantar"
                          className="absolute inset-0 w-full h-full object-cover object-top"
                        />
                        {/* Top bar over the illustration */}
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-3.5">
                          <span
                            className="font-cormorant font-bold text-[22px] text-white leading-none"
                            style={{ textShadow: '0 1px 6px rgba(122,31,46,0.35)' }}
                          >
                            JUMTA
                          </span>
                          <div className="flex items-center gap-2.5">
                            {weatherData && (
                              <div
                                className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full"
                                style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
                              >
                                <span className="text-[13px] leading-none">{weatherData.icon}</span>
                                <span className="font-inter font-semibold text-[12px] text-[#1A1A1A] leading-none">{weatherData.temp}°C</span>
                              </div>
                            )}
                            <button
                              type="button"
                              className="cursor-pointer"
                              style={{ filter: 'drop-shadow(0 1px 4px rgba(122,31,46,0.4))' }}
                            >
                              <Bell className="w-5 h-5 text-white" strokeWidth={2} />
                            </button>
                          </div>
                        </div>

                        {/* Greeting over the illustration */}
                        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <span
                              className="font-inter font-semibold text-[10px] uppercase tracking-wider text-white/90 block"
                              style={{ textShadow: '0 1px 4px rgba(122,31,46,0.45)' }}
                            >
                              {t('unified_commuter_pass')}
                            </span>
                            <h3
                              className="font-playfair font-bold text-[22px] text-white leading-tight mt-0.5 truncate"
                              style={{ textShadow: '0 2px 8px rgba(122,31,46,0.5)' }}
                            >
                              {lang === 'hi' ? `नमस्ते, ${store.userProfile?.name}` : `Namaste, ${store.userProfile?.name}`}
                            </h3>
                          </div>
                          <span
                            className="w-9 h-9 rounded-full bg-white/85 border border-white/60 flex items-center justify-center text-[#C0444E] font-inter font-semibold text-[14px] shrink-0"
                            style={{ boxShadow: '0 2px 8px rgba(122,31,46,0.3)' }}
                          >
                            {store.userProfile?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* CONTENT — dissolves out of the hero's own blush fade */}
                      <div className="flex-1 flex flex-col gap-4 px-5 pt-4 pb-6 bg-[#FFF5F5]">

                        {/* Location row */}
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#C0444E] shrink-0" />
                          <span className="font-inter text-[13px] text-[#1A1A1A] truncate flex-1">{getStopName(currentLocName)}</span>
                          <button
                            onClick={handleUseGPS}
                            className="shrink-0 px-2.5 py-1 rounded-[10px] border border-[#C0444E] text-[#C0444E] font-inter font-semibold text-[10px] tracking-wide active:bg-[#C0444E]/5 transition-colors cursor-pointer"
                          >
                            {t('sync_gps')}
                          </button>
                        </div>

                        {/* Smart Card widget */}
                        <div
                          onClick={() => store.setCitizenScreen('wallet')}
                          className="w-full h-[100px] rounded-[16px] px-4 py-2.5 flex flex-col justify-between text-white cursor-pointer"
                          style={{ background: 'linear-gradient(to right, #C0444E, #E8736A)', boxShadow: '0 2px 8px rgba(192,68,78,0.08)' }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-inter font-semibold text-[11px] tracking-wide">{t('ncmc_gold')}</span>
                            <Signal className="w-4 h-4" strokeWidth={2} />
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <span className="font-inter text-[10px] text-white/70 block leading-none uppercase tracking-wide">{t('wallet_balance')}</span>
                              <span className="font-inter font-bold text-[28px] leading-none block mt-1">₹{store.walletBalance}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-inter text-[11px] tracking-widest text-white/85 leading-none">•••• 8295</span>
                              <span className="font-inter font-semibold text-[8px] bg-white/20 px-1.5 py-0.5 rounded uppercase tracking-wide leading-none">{t('rupay_platinum')}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between font-inter text-[9px] text-white/85 tracking-wide">
                            <span className="font-semibold">{t('rajasthan_maas')}</span>
                            <span className="font-semibold flex items-center gap-0.5 text-white/70">{t('one_ticket')} <Zap className="w-2.5 h-2.5 fill-white/70 stroke-none" /></span>
                          </div>
                        </div>

                        {/* Search bar */}
                        <div
                          onClick={() => { store.setCitizenScreen('trips'); setSearchMode('to'); }}
                          className="w-full h-[52px] rounded-[14px] bg-white border border-[#E8C8C8] flex items-center gap-3 px-4 cursor-pointer"
                        >
                          <Search className="w-[18px] h-[18px] text-[#C0444E] shrink-0" />
                          <span className="flex-1 font-inter text-[14px] text-[#B09090] truncate">{t('where_to')}</span>
                          <ArrowRight className="w-[18px] h-[18px] text-[#C0444E] shrink-0" />
                        </div>

                        {/* Quick Feature Grid (2×2) */}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { Icon: Route, name: t('quick_trip'), desc: t('quick_trip_desc'), screen: 'trips' },
                            { Icon: Radar, name: t('quick_tracking'), desc: t('quick_tracking_desc'), screen: 'tracking' },
                            { Icon: Gift, name: t('quick_wallet'), desc: t('quick_wallet_desc'), screen: 'wallet' },
                            { Icon: Bot, name: t('quick_ai'), desc: t('quick_ai_desc'), screen: 'ai_assistant' }
                          ].map(f => (
                            <button
                              key={f.name}
                              onClick={() => store.setCitizenScreen(f.screen as any)}
                              className="bg-white border border-[#F0D8D8] rounded-[14px] p-3.5 flex flex-col items-start gap-2 text-left cursor-pointer transition-all active:scale-[0.98]"
                              style={{ boxShadow: '0 2px 8px rgba(192,68,78,0.08)' }}
                            >
                              <f.Icon className="w-6 h-6 text-[#C0444E]" strokeWidth={1.5} />
                              <div>
                                <span className="font-inter font-semibold text-[14px] text-[#1A1A1A] block leading-tight">{f.name}</span>
                                <span className="font-inter text-[12px] text-[#8A6060] block leading-tight mt-0.5">{f.desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Active Passes (Concessions dropdown) */}
                        <div className="flex items-center justify-between mt-1">
                          <h4 className="font-playfair font-bold text-[15px] text-[#1A1A1A]">{t('active_concession')}</h4>
                        </div>
                        <div
                          className="bg-white border border-[#F0D8D8] rounded-[14px] p-3.5 flex flex-col gap-2"
                          style={{ boxShadow: '0 2px 8px rgba(192,68,78,0.08)' }}
                        >
                          <label className="block text-[10px] text-[#8A6060] font-bold uppercase tracking-wider">{t('applied_pass')}</label>
                          <div className="relative">
                            <select
                              value={activeConcession}
                              onChange={(e) => handleConcessionChange(e.target.value as any)}
                              className="w-full bg-[#FFF0F0] border border-[#F0D8D8] text-[#1A1A1A] px-3.5 py-2.5 rounded-[10px] text-[13px] font-bold focus:outline-none focus:border-[#C0444E] cursor-pointer appearance-none"
                            >
                              <option value="RESIDENT">{t('cat_resident_title')}</option>
                              <option value="STUDENT">🎓 {t('cat_student_title')} ({t('cat_student_desc')})</option>
                              <option value="WOMEN">👩 {t('cat_women_title')} ({t('cat_women_desc')})</option>
                              <option value="ELDER">👵 {t('cat_elder_title')} ({t('cat_elder_desc')})</option>
                              <option value="TOURIST">🏛️ {t('cat_tourist_title')}</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#C0444E]">
                              <span className="text-[10px]">▼</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: JOURNEY PLANNER & ROUTE DETAILS */}
                  {store.citizenScreen === 'trips' && (() => {
                    const routesByCategory = {
                      public: store.calculatedRoutes.filter(r => r.type === 'CHEAPEST'),
                      hybrid: store.calculatedRoutes.filter(r => r.type === 'RECOMMENDED' || r.type === 'LEAST_WALKING'),
                      private: store.calculatedRoutes.filter(r => r.type === 'FASTEST'),
                      green: store.calculatedRoutes.filter(r => r.type === 'GREENEST')
                    };

                    const renderRouteCard = (route: any) => (
                      <div 
                        key={route.id}
                        onClick={() => {
                          store.setSelectedRouteId(route.id);
                          store.setCitizenScreen('checkout');
                        }}
                        className="bg-white border border-[#EAE6DC] p-4 rounded-2xl shadow-sm cursor-pointer hover:border-jaipur-pink transition-all flex flex-col gap-3 relative overflow-hidden"
                      >
                        {/* Option Concession Badge */}
                        <div className="absolute top-3 right-3">
                          {route.type === 'RECOMMENDED' && (
                            <span className="bg-jaipur-pink/10 text-jaipur-pink border border-jaipur-pink/20 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              {t('badge_recommended')}
                            </span>
                          )}
                          {route.type === 'GREENEST' && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              {t('badge_greenest')}
                            </span>
                          )}
                          {route.type === 'FASTEST' && (
                            <span className="bg-amber-100 text-amber-850 border border-amber-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              {t('badge_fastest')}
                            </span>
                          )}
                          {route.type === 'CHEAPEST' && (
                            <span className="bg-slate-100 text-slate-650 border border-slate-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              {t('badge_cheapest')}
                            </span>
                          )}
                          {route.type === 'LEAST_WALKING' && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              {t('badge_least_walking')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-extrabold text-slate-900 leading-none">{route.totalTime} {t('min')}</span>
                          <span className="text-[8px] text-slate-400 font-extrabold uppercase">{t('maas_score')}</span>
                          <span className="text-xs font-mono font-bold text-jaipur-pink bg-jaipur-pink/5 px-2 py-0.5 rounded">{route.score}/100</span>
                        </div>

                        {/* Interactive transit timeline steps */}
                        <div className="flex flex-wrap gap-1.5 items-center my-1">
                          {route.segments.map((seg: any, idx: number) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-slate-350 text-[10px]">➔</span>}
                              <div className="flex items-center gap-1 bg-[#F8F7F5] px-2 py-0.7 rounded-lg border border-[#EAE6DC]">
                                <span className="text-[10px]">
                                  {seg.mode === 'METRO' && '🚇'}
                                  {seg.mode === 'BUS' && '🚌'}
                                  {seg.mode === 'AUTO' && '🛺'}
                                  {seg.mode === 'CYCLE' && '🚲'}
                                  {seg.mode === 'WALK' && '🚶'}
                                </span>
                                <span className="text-[8px] text-slate-500 font-black uppercase">
                                  {t(`mode_${seg.mode.toLowerCase()}` as any)}
                                </span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Cost, carbon, transfers footer */}
                        <div className="flex justify-between items-center text-xs border-t border-[#F8F7F5] pt-2 text-slate-600">
                          <span className="font-extrabold text-slate-900 text-sm">₹{route.totalFare}</span>
                          <span className="text-[8.5px] text-slate-400 font-bold">
                            {t('km_walk', {km: route.totalWalkingKm})} · {route.totalTransfers} {route.totalTransfers === 1 ? t('transfer_label') : t('transfers_label')} · {route.totalCarbon} {t('co2')}
                          </span>
                        </div>
                      </div>
                    );

                    return (
                      <div className="flex-grow flex flex-col gap-3 animate-fade-in">
                        <div className="mt-1">
                          <span className="text-[9px] text-slate-450 uppercase font-black">{t('plan_route')}</span>
                          <h2 className="text-lg font-black text-slate-900 leading-tight">{t('multimodal_planner')}</h2>
                        </div>

                        {/* Station Selectors panel */}
                        <div className="bg-white border border-[#EAE6DC] p-4 rounded-3xl shadow-sm flex flex-col gap-3.5">
                          {/* Start point */}
                          <div 
                            onClick={() => setSearchMode('from')}
                            className="bg-[#F8F7F5] border border-[#EAE6DC] p-3 rounded-xl flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-transit-green shrink-0" />
                              <span className="text-xs font-bold text-slate-700 truncate">
                                {selectedStartStop ? getStopName(selectedStartStop.nameEn) : t('select_start')}
                              </span>
                            </div>
                            <span className="text-[9px] text-jaipur-pink font-black uppercase shrink-0">{t('change')}</span>
                          </div>

                          {/* End point */}
                          <div 
                            onClick={() => setSearchMode('to')}
                            className="bg-[#F8F7F5] border border-[#EAE6DC] p-3 rounded-xl flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-jaipur-pink shrink-0" />
                              <span className="text-xs font-bold text-slate-700 truncate">
                                {selectedEndStop ? getStopName(selectedEndStop.nameEn) : t('select_dest')}
                              </span>
                            </div>
                            <span className="text-[9px] text-jaipur-pink font-black uppercase shrink-0">{t('change')}</span>
                          </div>

                          {/* Execute routing search */}
                          <button 
                            onClick={handleSearchTrigger}
                            className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider shadow cursor-pointer transition-all"
                          >
                            {t('compute_fares')}
                          </button>
                        </div>

                        {/* Route options results */}
                        {store.lastSearchExecuted && (
                          <div className="flex flex-col gap-4 mt-2">
                            {/* Public routes */}
                            {routesByCategory.public.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">{t('public_transit')}</span>
                                {routesByCategory.public.map(renderRouteCard)}
                              </div>
                            )}

                            {/* Hybrid routes */}
                            {routesByCategory.hybrid.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">{t('integrated_feeder')}</span>
                                {routesByCategory.hybrid.map(renderRouteCard)}
                              </div>
                            )}

                            {/* Private routes */}
                            {routesByCategory.private.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">{t('private_cabs')}</span>
                                {routesByCategory.private.map(renderRouteCard)}
                              </div>
                            )}

                            {/* Green routes */}
                            {routesByCategory.green.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">{t('greenest_routes')}</span>
                                {routesByCategory.green.map(renderRouteCard)}
                              </div>
                            )}

                            {/* Route map overlay preview */}
                            <div className="mt-2 flex flex-col gap-2">
                              <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider">
                                {lang === 'hi' ? 'मार्ग पथ पूर्वावलोकन' : 'Route Path Preview'}
                              </span>
                              <InteractiveMaaSMap 
                                selectedRoute={store.calculatedRoutes.find(r => r.id === store.selectedRouteId)} 
                                showPhase2={store.twinLayers.phase2}
                                userLocation={store.userLocation}
                                height={200}
                              />
                            </div>
                          </div>
                        )}

                        {/* BOTTOM SHEET SELECTOR PORTALS */}
                        {searchMode && (
                          <div className="absolute inset-0 bg-slate-900/60 z-50 flex flex-col justify-end">
                            <div className="bg-white rounded-t-3xl max-h-[85%] overflow-y-auto p-4.5 flex flex-col gap-4 shadow-2xl animate-fade-in">
                              <div className="flex justify-between items-center border-b border-[#F8F7F5] pb-3">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                  {searchMode === 'from' ? t('boarding_point') : t('destination_point')}
                                </h4>
                                <button 
                                  onClick={() => { setSearchMode(null); setSearchQuery(''); setIsSelectingOnMap(false); }}
                                  className="text-xs text-jaipur-pink font-bold hover:underline cursor-pointer"
                                >
                                  {t('close')}
                                </button>
                              </div>

                              {/* Search actions */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                                <button 
                                  onClick={handleUseGPS}
                                  className="py-2.5 px-3 bg-[#F8F7F5] hover:bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border border-[#EAE6DC]"
                                >
                                  📍 {t('use_gps_btn')}
                                </button>
                                <button 
                                  onClick={() => setIsSelectingOnMap(!isSelectingOnMap)}
                                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border ${
                                    isSelectingOnMap 
                                      ? 'bg-jaipur-pink text-white border-jaipur-pink' 
                                      : 'bg-[#F8F7F5] hover:bg-slate-100 text-slate-700 border-[#EAE6DC]'
                                  }`}
                                >
                                  🗺️ {isSelectingOnMap ? t('write_search') : t('pick_on_map')}
                                </button>
                              </div>

                              {isSelectingOnMap ? (
                                <div className="flex flex-col gap-3">
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 leading-normal">
                                    {t('pin_warning')}
                                  </div>
                                  <button
                                    onClick={() => {
                                      const fallback = searchableLocations.find(s => s.id === 'M_CIVIL_LINES');
                                      if (fallback) {
                                        if (searchMode === 'from') setSelectedStartStop(fallback);
                                        else setSelectedEndStop(fallback);
                                      }
                                      setIsSelectingOnMap(false);
                                      setSearchMode(null);
                                    }}
                                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-xs hover:bg-slate-805 cursor-pointer shadow-md"
                                  >
                                    {t('confirm_pin')}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <input 
                                    type="text"
                                    autoFocus
                                    placeholder={t('search_placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full border border-[#EAE6DC] bg-[#F8F7F5] px-4 py-3 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-jaipur-pink shadow-inner font-bold"
                                  />

                                  <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-1">
                                    {/* Landmarks */}
                                    {groupPOIs.length > 0 && (
                                      <div className="flex flex-col gap-1.5">
                                        <span className="text-[8.5px] text-jaipur-pink font-extrabold uppercase tracking-widest block">{t('pois_header')}</span>
                                        {groupPOIs.map(loc => (
                                          <div 
                                            key={loc.id}
                                            onClick={() => {
                                              if (searchMode === 'from') setSelectedStartStop(loc as any);
                                              else setSelectedEndStop(loc as any);
                                              setSearchMode(null);
                                              setSearchQuery('');
                                            }}
                                            className="p-3 rounded-xl border border-[#F8F7F5] bg-white hover:bg-[#F8F7F5] cursor-pointer flex items-center justify-between text-xs text-slate-700"
                                          >
                                            <div>
                                              <span className="font-black block text-slate-800">{lang === 'hi' && loc.nameHi ? loc.nameHi : loc.nameEn}</span>
                                              <span className="font-devanagari text-[9.5px] text-slate-400 block mt-0.5">{lang === 'hi' && loc.nameHi ? loc.nameEn : loc.nameHi}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[7.5px] font-black bg-amber-100 text-amber-850 uppercase">
                                              📍 {t('badge_hub')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Metro Stops */}
                                    {groupMetro.length > 0 && (
                                      <div className="flex flex-col gap-1.5">
                                        <span className="text-[8.5px] text-metro-blue font-extrabold uppercase tracking-widest block">{t('metro_header')}</span>
                                        {groupMetro.map(loc => (
                                          <div 
                                            key={loc.id}
                                            onClick={() => {
                                              if (searchMode === 'from') setSelectedStartStop(loc);
                                              else setSelectedEndStop(loc);
                                              setSearchMode(null);
                                              setSearchQuery('');
                                            }}
                                            className="p-3 rounded-xl border border-[#F8F7F5] bg-white hover:bg-[#F8F7F5] cursor-pointer flex items-center justify-between text-xs text-slate-700"
                                          >
                                            <div>
                                              <span className="font-black block text-slate-800">{lang === 'hi' && loc.nameHi ? loc.nameHi : loc.nameEn}</span>
                                              <span className="font-devanagari text-[9.5px] text-slate-400 block mt-0.5">{lang === 'hi' && loc.nameHi ? loc.nameEn : loc.nameHi}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[7.5px] font-black bg-metro-blue/10 text-metro-blue uppercase">
                                              🚇 {t('badge_metro')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Bus Stops */}
                                    {groupBus.length > 0 && (
                                      <div className="flex flex-col gap-1.5">
                                        <span className="text-[8.5px] text-transit-green font-extrabold uppercase tracking-widest block">{t('bus_header')}</span>
                                        {groupBus.map(loc => (
                                          <div 
                                            key={loc.id}
                                            onClick={() => {
                                              if (searchMode === 'from') setSelectedStartStop(loc);
                                              else setSelectedEndStop(loc);
                                              setSearchMode(null);
                                              setSearchQuery('');
                                            }}
                                            className="p-3 rounded-xl border border-[#F8F7F5] bg-white hover:bg-[#F8F7F5] cursor-pointer flex items-center justify-between text-xs text-slate-700"
                                          >
                                            <div>
                                              <span className="font-black block text-slate-800">{lang === 'hi' && loc.nameHi ? loc.nameHi : loc.nameEn}</span>
                                              <span className="font-devanagari text-[9.5px] text-slate-400 block mt-0.5">{lang === 'hi' && loc.nameHi ? loc.nameEn : loc.nameHi}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[7.5px] font-black bg-transit-green/10 text-transit-green uppercase">
                                              🚌 {t('badge_bus')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TAB 3: CHECKOUT SCREEN */}
                  {store.citizenScreen === 'checkout' && (() => {
                    const selectedRoute = store.calculatedRoutes.find(r => r.id === store.selectedRouteId);
                    if (!selectedRoute) return null;

                    return (
                      <div className="flex-grow flex flex-col gap-4 bg-white p-4 rounded-3xl border border-[#EAE6DC] shadow-sm animate-fade-in">
                        <div className="flex items-center gap-2 mt-1">
                          <button 
                            onClick={() => store.setCitizenScreen('trips')}
                            className="text-slate-400 text-xs hover:text-slate-800 cursor-pointer font-bold px-2 py-1 rounded bg-[#F8F7F5] border border-[#EAE6DC]"
                          >
                            {t('back')}
                          </button>
                          <h3 className="text-base font-black text-slate-900 tracking-tight">{t('checkout_portal')}</h3>
                        </div>

                        {paymentState === 'idle' && (
                          <div className="flex flex-col gap-4">
                            <div className="bg-[#F8F7F5] p-4 rounded-2xl border border-[#EAE6DC] text-xs text-slate-600 flex flex-col gap-2.5">
                              <div className="flex justify-between items-baseline border-b border-[#EAE6DC] pb-2">
                                <span className="text-[9px] font-black uppercase text-slate-400">{t('intermodal_fare')}</span>
                                <span className="text-xl font-black text-slate-900 font-mono">₹{selectedRoute.totalFare}</span>
                              </div>
                              
                              {/* Concession Selection Dropdown in Checkout */}
                              <div className="flex flex-col gap-1.5 border-b border-[#EAE6DC] pb-2">
                                <label className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">{t('applied_concession')}</label>
                                <div className="relative">
                                  <select
                                    value={activeConcession}
                                    onChange={(e) => handleConcessionChange(e.target.value as any)}
                                    className="w-full bg-white border border-[#EAE6DC] text-slate-850 px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:border-jaipur-pink cursor-pointer appearance-none"
                                  >
                                    <option value="RESIDENT">{t('cat_resident_title')}</option>
                                    <option value="STUDENT">🎓 {t('cat_student_title')} ({t('cat_student_desc')})</option>
                                    <option value="WOMEN">👩 {t('cat_women_title')} ({t('cat_women_desc')})</option>
                                    <option value="ELDER">👵 {t('cat_elder_title')} ({t('cat_elder_desc')})</option>
                                    <option value="TOURIST">🏛️ {t('cat_tourist_title')}</option>
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                                    <span className="text-[8px]">▼</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-between text-[11px] font-bold">
                                <span>{t('ticket_type')}</span>
                                <span className="text-slate-800">{t('unified_pass')}</span>
                              </div>
                              {selectedRoute.savingPercent > 0 && (
                                <div className="flex justify-between text-[11px] text-transit-green font-extrabold">
                                  <span>{t('combined_discount')}</span>
                                  <span>{t('save_pct', {pct: selectedRoute.savingPercent})}</span>
                                </div>
                              )}
                              {store.collegeMode && (
                                <div className="flex justify-between text-[11px] text-jaipur-pink font-extrabold">
                                  <span>{t('student_con_benefit')}</span>
                                  <span>{t('student_con_active')}</span>
                                </div>
                              )}
                              {store.womenMode && (
                                <div className="flex justify-between text-[11px] text-transit-green font-extrabold">
                                  <span>{t('women_con_benefit')}</span>
                                  <span>{t('women_con_active')}</span>
                                </div>
                              )}
                              {store.elderMode && (
                                <div className="flex justify-between text-[11px] text-jaipur-pink font-extrabold">
                                  <span>{t('elder_con_benefit')}</span>
                                  <span>{t('elder_con_active')}</span>
                                </div>
                              )}
                            </div>

                            {/* Wallet Option */}
                            <div className="border border-[#EAE6DC] p-4 rounded-2xl flex justify-between items-center shadow-sm">
                              <div>
                                <span className="text-[9px] text-slate-400 font-black uppercase">{t('ncmc_wallet_balance')}</span>
                                <h4 className="text-xs font-black text-slate-850">{t('available_bal', {bal: store.walletBalance})}</h4>
                              </div>
                              <button 
                                onClick={() => handleWalletPay(selectedRoute.totalFare)}
                                className="bg-slate-900 hover:bg-slate-850 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                              >
                                {t('pay_now')}
                              </button>
                            </div>

                            {/* UPI Options */}
                            <button 
                              onClick={handleUPIPay}
                              className="w-full bg-[#F8F7F5] border border-[#EAE6DC] text-slate-800 py-3 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer shadow-sm"
                            >
                              {t('pay_upi')}
                            </button>
                          </div>
                        )}

                        {paymentState === 'processing' && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-3.5 py-12">
                            <RefreshCw className="w-8 h-8 text-jaipur-pink animate-spin" />
                            <h4 className="text-xs font-bold text-slate-500">{t('verifying_gateway')}</h4>
                          </div>
                        )}

                        {paymentState === 'success' && (
                          <div className="flex-grow flex flex-col items-center justify-center gap-4 py-10">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center animate-bounce">
                              <Check className="w-6 h-6 text-transit-green" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900">{t('payment_processed')}</h4>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TAB 3: TICKETS DASHBOARD */}
                  {store.citizenScreen === 'tracking' && (() => {
                    const selectedRoute = store.calculatedRoutes.find(r => r.id === store.selectedRouteId) || store.calculatedRoutes[0];

                    return (
                      <div className="flex-grow flex flex-col gap-3.5 animate-fade-in">
                        <div className="mt-1 flex justify-between items-center">
                          <div>
                            <span className="text-[8.5px] text-jaipur-pink font-extrabold uppercase tracking-widest block animate-pulse">{t('active_pass')}</span>
                            <h2 className="text-lg font-black text-slate-900 leading-none">{t('unified_ticket')}</h2>
                          </div>
                          
                          {/* Floating SOS Trigger Button */}
                          <button
                            onClick={() => setShowSOSOverlay(true)}
                            className="bg-red-500 hover:bg-red-650 text-white px-3 py-1.5 rounded-full shadow-md border border-red-400 animate-pulse flex items-center justify-center cursor-pointer text-[10px] font-black uppercase tracking-wider"
                          >
                            🚨 {t('sos_btn')}
                          </button>
                        </div>

                        {/* BOARDING PASS TICKET CARD */}
                        <div className="bg-white border border-[#EAE6DC] rounded-3xl p-5 shadow-sm flex flex-col items-center gap-4 relative overflow-hidden">
                          {/* Hologram Card Scanner Effect */}
                          <div className="absolute inset-0 hologram-shimmer pointer-events-none opacity-20" />
                          
                          {/* Custom Ticket Serration Cuts left/right */}
                          <div className="absolute left-0 top-[60%] -translate-y-1/2 w-3.5 h-7 bg-[#F8F7F5] rounded-r-full border-y border-r border-[#EAE6DC]" />
                          <div className="absolute right-0 top-[60%] -translate-y-1/2 w-3.5 h-7 bg-[#F8F7F5] rounded-l-full border-y border-l border-[#EAE6DC]" />

                          <div className="bg-white p-3 border border-[#EAE6DC] rounded-2xl shadow-inner relative z-10">
                            {/* Scanning indicator */}
                            <div className="relative w-28 h-28 border-4 border-slate-900 p-1 flex flex-wrap bg-white">
                              {Array.from({ length: 64 }).map((_, idx) => (
                                <div 
                                  key={idx} 
                                  className={`w-[11px] h-[11px] ${
                                    (idx + Math.floor(validitySeconds / 8)) % 4 === 0 || (idx * 3) % 7 === 1 ? 'bg-slate-900' : 'bg-transparent'
                                  }`}
                                />
                              ))}
                              {/* Neon scanning bar */}
                              <div className="absolute left-0 right-0 h-0.5 bg-jaipur-pink top-0 animate-bounce shadow-md shadow-jaipur-pink" />
                            </div>
                          </div>

                          <span className="text-[10px] bg-[#F8F7F5] border border-[#EAE6DC] px-4.5 py-1 rounded text-slate-650 font-mono tracking-widest font-extrabold z-10">
                            JUMTA-NCMC-8295
                          </span>

                          {selectedRoute && (
                            <div className="w-full border-t border-dashed border-[#EAE6DC] pt-3.5 text-xs text-slate-600 flex flex-col gap-2 z-10">
                              {/* Intermodal badges */}
                              <div className="flex items-center justify-center gap-1.5 bg-[#F8F7F5] py-2.5 rounded-xl border border-[#EAE6DC]">
                                {selectedRoute.segments.map((seg: any, idx: number) => (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && <span className="text-slate-350 text-[10px]">➔</span>}
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px]">
                                        {seg.mode === 'METRO' && '🚇'}
                                        {seg.mode === 'BUS' && '🚌'}
                                        {seg.mode === 'AUTO' && '🛺'}
                                        {seg.mode === 'CYCLE' && '🚲'}
                                        {seg.mode === 'WALK' && '🚶'}
                                      </span>
                                      <span className="text-[8px] font-black text-slate-500 uppercase">
                                        {t(`mode_${seg.mode.toLowerCase()}` as any)}
                                      </span>
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>

                              <div className="flex justify-between font-extrabold text-slate-800 text-center gap-1 text-[11px] mt-1">
                                <span className="truncate flex-1 text-left">
                                  {getStopName(selectedRoute.segments[0]?.fromStopName).replace(' Metro', '').replace(' Campus', '').replace(' मेट्रो', '').replace(' परिसर', '') || t('start_label')}
                                </span>
                                <span className="text-slate-400">➔</span>
                                <span className="truncate flex-1 text-right">
                                  {getStopName(selectedRoute.segments[selectedRoute.segments.length - 1]?.toStopName).replace(' Metro', '').replace(' Campus', '').replace(' मेट्रो', '').replace(' परिसर', '') || t('end_label')}
                                </span>
                              </div>
                              
                              <div className="flex justify-between text-[10px] text-slate-400 font-bold border-t border-[#F8F7F5] pt-2.5">
                                <span>{t('valid_transfers')}</span>
                                <span className="font-mono text-jaipur-pink font-extrabold">{formatValidityTime(validitySeconds)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interactive SVG live progress map */}
                        <div className="mt-1 shadow-sm rounded-2xl overflow-hidden border border-[#EAE6DC]">
                          <InteractiveMaaSMap 
                            selectedRoute={selectedRoute} 
                            showPhase2={store.twinLayers.phase2}
                            userLocation={store.userLocation}
                            height={210}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* TAB 4: WALLET */}
                  {store.citizenScreen === 'wallet' && (
                    <div className="flex-grow flex flex-col gap-4 animate-fade-in">
                      <div className="mt-1">
                        <span className="text-[9px] text-slate-450 uppercase font-black">{t('smart_ledger')}</span>
                        <h2 className="text-lg font-black text-slate-900 leading-none">{t('wallet_smart_credits')}</h2>
                      </div>

                      {/* JUMTA RuPay NCMC Card Graphic - updated to match Home Card */}
                      <div 
                        className="relative text-white p-5 rounded-3xl shadow-lg aspect-[1.72/1] flex flex-col justify-between overflow-hidden border border-white/10"
                        style={{ background: 'linear-gradient(to bottom right, #C0444E, #E8736A)', boxShadow: '0 4px 14px rgba(192,68,78,0.15)' }}
                      >
                        {/* Hawa mahal arch layout vector background */}
                        <div className="absolute inset-0 block-print-bg pointer-events-none opacity-20" />
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="flex justify-between items-start z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-8.5 h-6 bg-gradient-to-r from-amber-300 to-yellow-500 rounded border border-yellow-400/40 p-0.5 flex flex-wrap justify-around">
                              <div className="w-[6px] h-full border-r border-yellow-600/35" />
                              <div className="w-[6px] h-full border-r border-yellow-600/35" />
                            </div>
                            <div>
                              <span className="text-[11px] font-inter font-bold uppercase tracking-wider block leading-none">{t('ncmc_gold')}</span>
                              <span className="text-[7px] text-white/75 font-medium block leading-none mt-0.5">{t('rajasthan_transit')}</span>
                            </div>
                          </div>
                          <Signal className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </div>

                        <div className="z-10 mt-3">
                          <span className="text-[8px] text-white/75 uppercase tracking-widest block font-inter">{t('wallet_balance')}</span>
                          <span className="text-3xl font-bold tracking-tight font-inter">₹{store.walletBalance}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono tracking-widest text-white/80">•••• •••• •••• 8295</span>
                            <span className="text-[7.5px] bg-white/20 px-2 py-0.5 rounded text-white font-bold uppercase tracking-wider font-inter">{t('rupay_platinum')}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-white/10 pt-2.5 text-[8px] text-white/85 z-10 font-inter">
                          <span className="font-semibold tracking-wide">{t('rajasthan_maas')}</span>
                          <span className="font-bold uppercase flex items-center gap-0.5">
                            {t('one_ticket')} <Zap className="w-2.5 h-2.5 fill-yellow-300 stroke-none" />
                          </span>
                        </div>
                      </div>

                      {/* Recharge options */}
                      <div className="bg-white border border-[#EAE6DC] p-4.5 rounded-3xl shadow-sm flex flex-col gap-3">
                        <span className="text-[9px] text-slate-450 uppercase font-black">{t('ncmc_topup')}</span>
                        <div className="flex gap-2">
                          {['100', '200', '500'].map(amt => (
                            <button 
                              key={amt}
                              onClick={() => setRechargeAmt(amt)}
                              className={`flex-1 py-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                rechargeAmt === amt 
                                  ? 'bg-jaipur-pink/10 border-jaipur-pink text-jaipur-pink' 
                                  : 'bg-[#F8F7F5] border-[#EAE6DC] text-slate-500 hover:bg-[#F1EFEA]'
                              }`}
                            >
                              +₹{amt}
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={() => {
                            store.rechargeWallet(parseInt(rechargeAmt));
                            alert(lang === 'hi' 
                              ? `एनसीएमसी स्मार्ट कार्ड में ₹${rechargeAmt} का टॉप-अप सफलतापूर्वक हो गया है!` 
                              : `NCMC Smart Card topped-up with ₹${rechargeAmt} successfully!`);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                        >
                          {t('topup_upi')}
                        </button>
                      </div>

                      {/* Savings Ledger graphs */}
                      <div className="bg-white border border-[#EAE6DC] p-4.5 rounded-3xl shadow-sm flex flex-col gap-3">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-black block leading-none">{t('savings_ledger')}</span>
                          <h3 className="text-xs font-bold text-slate-800 mt-1">{t('savings_vs')}</h3>
                        </div>
                        <div className="h-32 w-full pr-4 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: 'Jan', Savings: 320 },
                              { name: 'Feb', Savings: 460 },
                              { name: 'Mar', Savings: 620 },
                              { name: 'Apr', Savings: 780 },
                              { name: 'May', Savings: 950 }
                            ]}>
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                              <Bar dataKey="Savings" fill="#D65A6F" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Carbon rewards points */}
                      <div className="bg-white border border-[#EAE6DC] p-4 rounded-3xl shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-jaipur-pink" />
                          <div>
                            <h4 className="text-xs font-black text-slate-800">{t('green_points_title')}</h4>
                            <p className="text-[9px] text-slate-400">{t('green_points_desc')}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-jaipur-pink hover:underline cursor-pointer">{t('redeem')}</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: PROFILE */}
                  {store.citizenScreen === 'profile' && (
                    <div className="flex-grow flex flex-col gap-4 animate-fade-in">
                      <div className="mt-1">
                        <span className="text-[9px] text-slate-450 uppercase font-black">{t('configure_profile')}</span>
                        <h2 className="text-lg font-black text-slate-900 leading-none">{t('your_identity')}</h2>
                      </div>

                      <div className="bg-white border border-[#EAE6DC] p-4.5 rounded-3xl shadow-sm flex flex-col gap-3 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold">{t('full_name')}</span>
                          <span className="font-extrabold text-slate-800">{store.userProfile?.name}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#F8F7F5] pt-2.5 py-1">
                          <span className="text-slate-500 font-bold">{t('concession_category')}</span>
                          <span className="font-extrabold text-slate-800 bg-jaipur-pink/10 text-jaipur-pink px-2.5 py-0.5 rounded-full border border-jaipur-pink/15">
                            {t(`cat_${store.userProfile?.category?.toLowerCase()}_title` as any)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#F8F7F5] pt-2.5 py-1">
                          <span className="text-slate-500 font-bold">{t('interface_lang')}</span>
                          <span className="font-extrabold text-slate-800">{store.userProfile?.language === 'hi' ? t('hi_label') : t('en_label')}</span>
                        </div>
                        {store.userLocation && (
                          <div className="flex justify-between items-center border-t border-[#F8F7F5] pt-2.5 py-1">
                            <span className="text-slate-500 font-bold">{t('hub_coords')}</span>
                            <span className="font-mono text-[10px] text-slate-700">{store.userLocation.lat.toFixed(4)}°, {store.userLocation.lng.toFixed(4)}°</span>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => store.logOut()}
                        className="w-full bg-red-50 border border-red-150 text-red-650 py-3.5 rounded-2xl text-xs font-black hover:bg-red-100 cursor-pointer mt-4"
                      >
                        {t('reset_account')}
                      </button>
                    </div>
                  )}

                  {/* AUXILIARY SCREENS */}
                  {store.citizenScreen === 'ai_assistant' && (
                    <div className="flex-grow flex flex-col justify-between gap-3 animate-fade-in">
                      <div className="mt-1">
                        <span className="text-[9px] text-slate-450 uppercase font-black">{t('ai_guide_bot')}</span>
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5 leading-none">
                          <span>{t('ai_assistant_title')}</span>
                          <Sparkles className="w-4 h-4 text-jaipur-pink animate-spin-slow" />
                        </h2>
                      </div>

                      <div className="flex-grow bg-[#F8F7F5] rounded-3xl p-4 border border-[#EAE6DC] overflow-y-auto flex flex-col gap-2.5 max-h-[350px] min-h-[320px]">
                        {chatMessages.map((msg, idx) => (
                          <div 
                            key={idx}
                            className={`max-w-[85%] p-3 rounded-2xl text-[10px] leading-relaxed ${
                              msg.sender === 'user' 
                                ? 'bg-slate-900 text-white ml-auto rounded-tr-none shadow-sm font-bold' 
                                : 'bg-white border border-[#EAE6DC] text-slate-700 mr-auto rounded-tl-none shadow-sm'
                            }`}
                          >
                            <p>{lang === 'hi' && msg.textHi ? msg.textHi : msg.text}</p>
                            {msg.textHi && lang !== 'hi' && <p className="font-devanagari text-[9.5px] mt-1.5 opacity-80 border-t border-[#F8F7F5] pt-1.5">{msg.textHi}</p>}
                            {msg.textHi && lang === 'hi' && <p className="text-[9.5px] mt-1.5 opacity-85 border-t border-[#F8F7F5] pt-1.5">{msg.text}</p>}
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder={t('ai_placeholder')}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          className="flex-grow bg-white border border-[#EAE6DC] rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-jaipur-pink"
                        />
                        <button type="submit" className="bg-slate-900 hover:bg-slate-850 text-white px-4.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                          {t('send_btn')}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* EMERGENCY SOS FULL SCREEN OVERLAY */}
                  {showSOSOverlay && (
                    <div className="absolute inset-0 bg-red-950/98 z-50 flex flex-col justify-between p-6 text-white animate-fade-in rounded-3xl">
                      <div className="flex flex-col items-center text-center gap-4 mt-8">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center animate-pulse border-4 border-red-400">
                          <ShieldAlert className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-red-500">{t('sos_active')}</h2>
                        <p className="text-xs text-slate-350 max-w-[280px]">
                          {t('sos_desc')}
                        </p>
                      </div>

                      <div className="bg-red-900/35 border border-red-500/35 p-4.5 rounded-2xl flex flex-col gap-2.5 text-xs text-left">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('gps_coords')}</span>
                          <span className="font-mono font-bold text-white">
                            {store.userLocation ? `${store.userLocation.lat.toFixed(5)}° N, ${store.userLocation.lng.toFixed(5)}° E` : '26.8770° N, 75.7540° E'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('nearest_station')}</span>
                          <span className="font-bold text-white">{selectedStartStop ? getStopName(selectedStartStop.nameEn) : getStopName('Mansarovar Metro')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{t('citizen_id')}</span>
                          <span className="font-mono font-bold text-white">JUMP-8295</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3.5">
                        <a 
                          href="tel:112"
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md text-center"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{t('call_emergency')}</span>
                        </a>
                        <button 
                          onClick={() => setShowSOSOverlay(false)}
                          className="w-full bg-transparent border border-slate-650 text-slate-300 font-bold py-3.5 rounded-xl text-xs hover:bg-slate-850 cursor-pointer"
                        >
                          {t('cancel_sos')}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
              );
            })()}

            {/* Simulated Navigation Bar */}
            {store.authStep === 'authenticated' && (
              <div className="h-[75px] bg-white border-t border-[#F0D8D8] grid grid-cols-5 items-center justify-center px-2 select-none z-40">
                {[
                  { screen: 'home', label: 'Home', isHome: true },
                  { screen: 'trips', icon: Search, label: 'Planner' },
                  { screen: 'tracking', icon: Layers, label: 'Ticket' },
                  { screen: 'wallet', icon: Wallet, label: 'Wallet' },
                  { screen: 'profile', icon: User, label: 'Profile' }
                ].map(tab => {
                  const active = store.citizenScreen === tab.screen;
                  const color = active ? '#C0444E' : '#9A9A9A';
                  return (
                    <button
                      key={tab.screen}
                      onClick={() => store.setCitizenScreen(tab.screen as any)}
                      className="flex flex-col items-center gap-1 cursor-pointer transition-all min-h-[44px] justify-center"
                    >
                      {/* Active rose pill indicator above the icon */}
                      <span
                        className="h-1 w-5 rounded-full transition-all"
                        style={{ backgroundColor: active ? '#C0444E' : 'transparent' }}
                      />
                      {tab.isHome
                        ? <HawaMahalIcon color={color} />
                        : tab.icon && <tab.icon className="w-5 h-5" style={{ color }} strokeWidth={active ? 2.4 : 2} />}
                      <span
                        className="font-inter text-[9px]"
                        style={{ color, fontWeight: active ? 700 : 500 }}
                      >
                        {tab.screen === 'tracking' ? t('tab_tickets') : t(`tab_${tab.screen}` as any)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* OPERATIONS SIDEBAR & CONTROLS (RIGHT COLUMN) */}
        {showControlSidebar && (
          <section className="lg:col-span-7 flex flex-col gap-6 animate-fade-in">
            <div className="bg-white border border-[#EAE6DC] p-5.5 rounded-3xl shadow-sm flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-[#F8F7F5] pb-3.5">
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Jaipur Transit Command Center</h3>
                  <p className="text-[10px] text-slate-400">Network load forecasting, peak-factor delay simulators &amp; GNN hotspots</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse">
                  TELEMETRY ONLINE
                </span>
              </div>

              {/* Operator select switches */}
              <div className="flex flex-wrap gap-2">
                {(['JCTSL', 'JMRC', 'TRAFFIC', 'JDA', 'RTO'] as const).map(op => (
                  <button
                    key={op}
                    onClick={() => store.setControlCenterOperator(op)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                      store.controlCenterOperator === op 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                        : 'bg-[#F8F7F5] border-[#EAE6DC] text-slate-500 hover:bg-[#F1EFEA]'
                    }`}
                  >
                    {op === 'JCTSL' && '🚌 JCTSL Bus'}
                    {op === 'JMRC' && '🚇 JMRC Metro'}
                    {op === 'TRAFFIC' && '🚦 Signals & Incidents'}
                    {op === 'JDA' && '🏙️ JDA Development'}
                    {op === 'RTO' && '📋 RTO Permits'}
                  </button>
                ))}
              </div>

              {/* Environment Simulators slider controls */}
              <div className="bg-[#F8F7F5] border border-[#EAE6DC] p-4.5 rounded-2xl flex flex-col gap-4">
                <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider block">Network Environment variables</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Weather Selection */}
                  <div>
                    <label className="block text-[9.5px] text-slate-550 font-black uppercase mb-1.5">Weather condition</label>
                    <div className="flex border border-[#EAE6DC] rounded-xl overflow-hidden text-xs bg-white">
                      {(['CLEAR', 'RAIN', 'HOT_WAVE'] as const).map(w => (
                        <button
                          key={w}
                          onClick={() => store.setWeather(w)}
                          className={`flex-1 py-2 font-bold transition-all ${
                            store.weather === w ? 'bg-jaipur-pink text-white font-extrabold' : 'text-slate-500 hover:bg-[#F8F7F5]'
                          }`}
                        >
                          {w === 'CLEAR' ? 'Clear' : w === 'RAIN' ? 'Rain' : 'Heat'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Special Events */}
                  <div>
                    <label className="block text-[9.5px] text-slate-550 font-black uppercase mb-1.5">Special Event modifier</label>
                    <div className="flex border border-[#EAE6DC] rounded-xl overflow-hidden text-xs bg-white">
                      {(['NONE', 'FESTIVAL', 'EXAM'] as const).map(e => (
                        <button
                          key={e}
                          onClick={() => store.setEvent(e)}
                          className={`flex-1 py-2 font-bold transition-all ${
                            store.event === e ? 'bg-jaipur-pink text-white font-extrabold' : 'text-slate-500 hover:bg-[#F8F7F5]'
                          }`}
                        >
                          {e === 'NONE' ? 'None' : e === 'FESTIVAL' ? 'Fest' : 'Exam'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Peak Hour factor */}
                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <label className="block text-[9.5px] text-slate-550 font-black uppercase">Peak load factor</label>
                      <span className="text-[10px] font-mono font-bold text-jaipur-pink">{store.peakHourFactor.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={store.peakHourFactor}
                      onChange={(e) => store.setPeakHourFactor(parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#EAE6DC] rounded-lg appearance-none cursor-pointer accent-jaipur-pink"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Telemetry views */}
              <div className="bg-[#F8F7F5] p-4.5 rounded-2xl border border-[#EAE6DC] min-h-[320px]">
                
                {store.controlCenterOperator === 'JCTSL' && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <h4 className="text-xs font-black text-slate-750 uppercase tracking-wide">JCTSL Bus Operations Ledger</h4>
                    <div className="grid grid-cols-2 gap-3.5 text-xs text-slate-600">
                      <div className="bg-white p-3.5 rounded-2xl border border-[#EAE6DC] shadow-sm">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">Total Active Routes</span>
                        <div className="text-lg font-black text-slate-900 mt-0.5">25 GTFS corridors</div>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-[#EAE6DC] shadow-sm">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">Physical stops</span>
                        <div className="text-lg font-black text-slate-900 mt-0.5">331 bus stands</div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#EAE6DC] flex flex-col gap-2.5 shadow-sm">
                      <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Active Fleet hourly demand prediction (XGBoost)</span>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={JAIPUR_HISTORICAL_RIDERSHIP}>
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={8} tickLine={false} />
                            <Bar dataKey="jctslRiders" fill="#0FA971" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {store.controlCenterOperator === 'JMRC' && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <h4 className="text-xs font-black text-slate-750 uppercase tracking-wide">JMRC Metro Corridor Analytics</h4>
                    <div className="bg-white p-4 rounded-2xl border border-[#EAE6DC] text-xs text-slate-600 flex flex-col gap-2 shadow-sm">
                      <div className="flex justify-between py-1">
                        <span className="font-bold">Phase 1 (Pink Line)</span>
                        <span className="font-extrabold text-slate-800">11 active stations (Badi Chaupar terminus)</span>
                      </div>
                      <div className="flex justify-between border-t border-[#F8F7F5] pt-2 py-1">
                        <span className="font-bold">Phase 2 (Orange Line)</span>
                        <span className="font-extrabold text-slate-800">20 projected corridors (Prahladpura ↔ Todi Mod)</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#EAE6DC] flex flex-col gap-2.5 shadow-sm">
                      <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Metro ridership prediction curve</span>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={JAIPUR_HISTORICAL_RIDERSHIP}>
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={8} tickLine={false} />
                            <Bar dataKey="jmrcRiders" fill="#185FA5" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {store.controlCenterOperator === 'TRAFFIC' && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <h4 className="text-xs font-black text-slate-750 uppercase tracking-wide">Jaipur Traffic Incident Logs</h4>
                    <div className="flex flex-col gap-2">
                      {JAIPUR_INCIDENTS.map((inc: any) => (
                        <div 
                          key={inc.id}
                          className={`p-3.5 rounded-2xl border text-xs flex flex-col gap-1 ${
                            inc.severity === 'HIGH' 
                              ? 'bg-red-50 border-red-200 text-red-700' 
                              : 'bg-amber-50 border-amber-250 text-amber-700'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black">{inc.title}</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase bg-white/70">
                              {inc.severity}
                            </span>
                          </div>
                          <span className="text-[10px] opacity-90 leading-relaxed">{inc.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {store.controlCenterOperator === 'JDA' && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <h4 className="text-xs font-black text-slate-750 uppercase tracking-wide">JDA Transit Oriented Development Nodes</h4>
                    <div className="bg-white p-4.5 rounded-2xl border border-[#EAE6DC] text-xs text-slate-600 flex flex-col gap-2 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">MNIT Campus Cycle Dock</span>
                        <span className="text-transit-green font-extrabold">Active permits</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-[#F8F7F5] pt-2">
                        <span className="font-bold">Sindhi Camp Multi-Modal Hub</span>
                        <span className="text-transit-green font-extrabold">Wheelchair accessibility verified</span>
                      </div>
                    </div>
                  </div>
                )}

                {store.controlCenterOperator === 'RTO' && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <h4 className="text-xs font-black text-slate-750 uppercase tracking-wide">RTO Permitted Feeder Stands</h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-[#EAE6DC] shadow-sm">
                      RTO Rajasthan regulates active permits for rickshaws and electric feeders. Fares are calculated dynamically based on a flat ₹25 flag rate followed by ₹10/km as sanctioned under Rajasthan Mobility Act gazette guidelines.
                    </p>
                  </div>
                )}

              </div>
            </div>
          </section>
        )}

      </div>



    </div>
  );
}


