import React, { useState, useEffect } from 'react';
import { useMaaSStore } from './store';
import { transitDataService, type StationData } from './services/transitDataService';
import { JAIPUR_HISTORICAL_RIDERSHIP, JAIPUR_INCIDENTS, getDistanceKm } from './data';
import { 
  Wallet, Navigation, Search, 
  Award, Layers, Wifi, RefreshCw, Sliders, Sparkles, Phone, User, ShieldAlert, Check, MapPin, Zap, ChevronRight, FileText
} from 'lucide-react';
import { 
  XAxis, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { InteractiveMaaSMap } from './components/InteractiveMaaSMap';
import { JumtaLogo } from './components/JumtaLogo';
import { JharokhaDivider } from './components/JharokhaDivider';

export default function App() {
  const store = useMaaSStore();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeExportTab, setActiveExportTab] = useState<'tokens' | 'components' | 'algorithms'>('tokens');
  
  // Auth flow states
  const [otpVal, setOtpVal] = useState(['', '', '', '']);
  const [profileName, setProfileName] = useState('Shashwat');
  const [profileGender, setProfileGender] = useState('Male');
  const [profileAge, setProfileAge] = useState('22');
  const [profileCategory, setProfileCategory] = useState<'RESIDENT' | 'STUDENT' | 'TOURIST'>('RESIDENT');
  const [profileLang, setProfileLang] = useState<'en' | 'hi'>('en');

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

  const handleQuickSuggestion = (destId: string) => {
    const dest = searchableLocations.find(s => s.id === destId);
    if (!dest) return;
    let start = selectedStartStop;
    if (!start) {
      const fallback = searchableLocations.find(s => s.id === 'M_MANSAROVAR');
      if (fallback) {
        start = fallback as any;
        setSelectedStartStop(fallback as any);
      }
    }
    setSelectedEndStop(dest as any);
    store.setStartStopId(start ? start.id : 'M_MANSAROVAR');
    store.setEndStopId(dest.id);
    setTimeout(() => {
      store.triggerSearch();
      store.setCitizenScreen('trips');
    }, 50);
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOTPVerify = () => {
    store.setAuthStep('profile');
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
            <div className="flex-1 overflow-y-auto px-4.5 py-4 flex flex-col bg-[#F8F7F5]">
              
              {/* SPLASH SCREEN */}
              {store.authStep === 'splash' && (
                <div className="flex-grow flex flex-col items-center justify-center gap-6 py-20 bg-white rounded-3xl border border-[#EAE6DC] relative overflow-hidden">
                  <div className="block-print-bg absolute inset-0 pointer-events-none" />
                  <div className="flex flex-col items-center gap-4 animate-pulse z-10">
                    <JumtaLogo size="xl" variant="color" />
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mt-2">JUMTA</h2>
                    <span className="text-[10px] text-jaipur-pink font-extrabold tracking-widest uppercase bg-jaipur-pink/10 px-3 py-1 rounded-full border border-jaipur-pink/20">
                      One City. One Ticket.
                    </span>
                  </div>
                  <div className="w-2/3 h-1 bg-slate-100 rounded-full overflow-hidden mt-8 z-10">
                    <div className="h-full bg-gradient-to-r from-jaipur-pink to-metro-blue animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              )}

              {/* WELCOME SCREEN */}
              {store.authStep === 'welcome' && (
                <div className="flex-grow flex flex-col justify-between py-6 bg-white px-4 rounded-3xl border border-[#EAE6DC] relative overflow-hidden">
                  <div className="block-print-subtle absolute inset-0 pointer-events-none" />
                  <div className="flex flex-col items-center text-center gap-5 mt-10 z-10">
                    <JumtaLogo size="lg" variant="color" />
                    <h2 className="text-2xl font-black text-slate-900 leading-snug tracking-tight mt-2">
                      Jaipur's Unified Mobility Platform
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-[280px]">
                      Access JMRC metro, JCTSL buses, e-rickshaws, and smart ticketing all from a single unified wallet.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 mt-12 z-10">
                    <button 
                      onClick={() => store.setAuthStep('otp')}
                      className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 hover:bg-slate-850 transition-all cursor-pointer shadow-sm"
                    >
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>Continue with Mobile Number</span>
                    </button>
                    <button 
                      onClick={() => store.setAuthStep('profile')}
                      className="w-full bg-slate-50 border border-[#EAE6DC] text-slate-800 font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Explore as Guest
                    </button>
                  </div>
                </div>
              )}

              {/* OTP SCREEN */}
              {store.authStep === 'otp' && (
                <div className="flex-grow flex flex-col justify-between py-6 bg-white px-4 rounded-3xl border border-[#EAE6DC]">
                  <div className="flex flex-col gap-4 mt-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Citizen Verification</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      We sent an SMS OTP code to verify your mobile identity for NCMC card setup.
                    </p>

                    <div className="flex gap-3 mt-6 justify-center">
                      {otpVal.map((v, idx) => (
                        <input 
                          key={idx}
                          type="text" 
                          maxLength={1} 
                          value={v}
                          onChange={(e) => {
                            const val = e.target.value;
                            const copy = [...otpVal];
                            copy[idx] = val;
                            setOtpVal(copy);
                          }}
                          className="w-12 h-14 border border-[#EAE6DC] bg-[#F8F7F5] rounded-2xl text-center text-lg font-bold text-slate-900 focus:outline-none focus:border-jaipur-pink shadow-inner"
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setOtpVal(['8', '2', '9', '5'])}
                      className="text-xs text-jaipur-pink font-bold self-center mt-4 cursor-pointer hover:underline bg-jaipur-pink/5 px-3.5 py-1.5 rounded-full border border-jaipur-pink/15"
                    >
                      Autofill OTP (8295)
                    </button>
                  </div>

                  <button 
                    onClick={handleOTPVerify}
                    className="w-full bg-jaipur-pink text-white font-bold py-4 rounded-2xl text-xs hover:opacity-95 transition-all cursor-pointer shadow-md mt-12"
                  >
                    Verify &amp; Set Up Wallet
                  </button>
                </div>
              )}

              {/* PROFILE SETUP */}
              {store.authStep === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="flex-grow flex flex-col justify-between py-6 bg-white px-4 rounded-3xl border border-[#EAE6DC]">
                  <div className="flex flex-col gap-4 mt-4">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Set Commuter Profile</h3>
                    <p className="text-xs text-slate-500">Configure your parameters for dynamic intermodal fare concessions.</p>

                    <div className="flex flex-col gap-4 mt-2">
                      <div>
                        <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">Full Name</label>
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
                          <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">Gender</label>
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
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">Age</label>
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
                        <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">Concession Category</label>
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'RESIDENT', title: 'Resident Standard', desc: 'Default NCMC transit fares' },
                            { id: 'STUDENT', title: 'Student Concession', desc: '50% Off JMRC Metro segments' },
                            { id: 'TOURIST', title: 'Tourist Transit Pass', desc: 'Flat 1-day/3-day unlimited benefits' }
                          ].map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setProfileCategory(cat.id as any)}
                              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                                profileCategory === cat.id 
                                  ? 'border-jaipur-pink bg-jaipur-pink/5 text-slate-900' 
                                  : 'border-[#EAE6DC] bg-[#F8F7F5] text-slate-500 hover:bg-[#F1EFEA]'
                              }`}
                            >
                              <span className="text-xs font-bold">{cat.title}</span>
                              <span className="text-[9px] opacity-80">{cat.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-400 font-extrabold uppercase mb-1.5 tracking-wider">Interface Language</label>
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
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-md mt-6"
                  >
                    Create Identity &amp; Launch
                  </button>
                </form>
              )}

              {/* AUTHENTICATED SCREEN VIEWER */}
              {store.authStep === 'authenticated' && (
                <div className="flex-grow flex flex-col relative">
                  
                  {/* TAB 1: HOME DASHBOARD */}
                  {store.citizenScreen === 'home' && (
                    <div className="flex-grow flex flex-col gap-4 animate-fade-in">
                      
                      {/* Greeting Header */}
                      <div className="flex justify-between items-center mt-1">
                        <div>
                          <span className="text-[8.5px] text-jaipur-pink font-extrabold uppercase tracking-widest block">Unified Commuter Pass</span>
                          <h3 className="text-lg font-black text-slate-900 leading-tight">
                            {profileLang === 'hi' ? `नमस्ते, ${store.userProfile?.name}` : `Namaste, ${store.userProfile?.name}`}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {weatherData && (
                            <div className="bg-white border border-[#EAE6DC] px-2.5 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
                              <span className="text-xs">{weatherData.icon}</span>
                              <span className="text-[10px] font-black text-slate-800">{weatherData.temp}°C</span>
                            </div>
                          )}
                          <span className="w-8.5 h-8.5 rounded-full bg-jaipur-pink/15 flex items-center justify-center text-jaipur-pink text-xs font-black shadow-sm border border-jaipur-pink/20">
                            {store.userProfile?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Location sync badge */}
                      <div className="bg-[#F1EFEA] border border-[#EAE6DC] px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs shadow-sm">
                        <div className="flex items-center gap-2 text-slate-700 min-w-0">
                          <MapPin className="w-4 h-4 text-jaipur-pink shrink-0" />
                          <div className="truncate">
                            <span className="font-extrabold text-[8px] uppercase text-slate-400 block leading-none mb-0.5">Live Location</span>
                            <span className="font-bold text-slate-800 text-[11px]">{currentLocName}</span>
                          </div>
                        </div>
                        <button 
                          onClick={handleUseGPS} 
                          className="text-[9px] text-jaipur-pink font-black uppercase tracking-wider shrink-0 hover:underline bg-white px-2.5 py-1 rounded-lg border border-[#EAE6DC]"
                        >
                          Sync GPS
                        </button>
                      </div>

                      <JharokhaDivider color="#D65A6F" intensity="low" className="my-1" />

                      {/* JUMTA RuPay NCMC Card Graphic */}
                      <div className="relative bg-gradient-to-br from-[#D65A6F] via-[#E27488] to-[#C9475C] text-white p-5 rounded-3xl shadow-lg aspect-[1.72/1] flex flex-col justify-between overflow-hidden border border-white/10">
                        {/* Hawa mahal arch layout vector background */}
                        <div className="absolute inset-0 block-print-bg pointer-events-none" />
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="flex justify-between items-start z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-8.5 h-6 bg-gradient-to-r from-amber-300 to-yellow-500 rounded border border-yellow-400/40 p-0.5 flex flex-wrap justify-around">
                              <div className="w-[6px] h-full border-r border-yellow-600/35" />
                              <div className="w-[6px] h-full border-r border-yellow-600/35" />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest block leading-none">JUMTA Smart</span>
                              <span className="text-[6.5px] text-white/70 font-semibold block leading-none mt-0.5">National Common Mobility Card</span>
                            </div>
                          </div>
                          <span className="text-[12px] opacity-90">📶</span>
                        </div>

                        <div className="z-10 mt-3">
                          <span className="text-[7.5px] text-white/80 uppercase tracking-widest block">Wallet Balance</span>
                          <span className="text-2xl font-black tracking-tight font-mono">₹{store.walletBalance}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8.5px] font-mono tracking-widest text-white/60">•••• •••• •••• 8295</span>
                            <span className="text-[7.5px] bg-white/20 px-1.5 py-0.5 rounded text-white font-bold uppercase">RuPay Platinum</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-white/10 pt-2.5 text-[7.5px] text-white/80 z-10">
                          <span className="font-bold tracking-wide">RAJASTHAN MAAS NETWORK</span>
                          <span className="font-black italic text-white text-[9.5px] flex items-center gap-0.5">
                            ONE TICKET <Zap className="w-2.5 h-2.5 fill-yellow-400 stroke-none" />
                          </span>
                        </div>
                      </div>

                      {/* Main search trigger widget */}
                      <div 
                        onClick={() => {
                          store.setCitizenScreen('trips');
                          setSearchMode('to');
                        }}
                        className="bg-white border border-[#EAE6DC] p-4 rounded-2xl flex items-center justify-between cursor-pointer shadow-sm hover:border-[#D65A6F] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Search className="w-4.5 h-4.5 text-jaipur-pink" />
                          <span className="text-xs text-slate-400 font-bold">Where do you want to travel today?</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>

                      {/* Mode Toggles */}
                      <div className="bg-white border border-[#EAE6DC] p-3.5 rounded-2xl shadow-sm flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base bg-amber-100 p-1.5 rounded-lg">🎓</span>
                            <div>
                              <span className="text-[11px] font-black text-slate-800 block">Student Concession (50% Metro)</span>
                              <span className="text-[9px] text-slate-400">Applies automatic half fare to Metro links</span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={store.collegeMode} 
                              onChange={(e) => store.setCollegeMode(e.target.checked)} 
                              className="sr-only peer" 
                            />
                            <div className="w-8.5 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-jaipur-pink" />
                          </label>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#F8F7F5] pt-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base bg-jaipur-pink/10 p-1.5 rounded-lg">🏛️</span>
                            <div>
                              <span className="text-[11px] font-black text-slate-800 block">Jaipur Sightseeing Express</span>
                              <span className="text-[9px] text-slate-400">Prioritize heritage pathways and historical spots</span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={store.touristMode} 
                              onChange={(e) => store.setTouristMode(e.target.checked)} 
                              className="sr-only peer" 
                            />
                            <div className="w-8.5 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-jaipur-pink" />
                          </label>
                        </div>
                      </div>

                      {/* Quick Suggestions grid */}
                      <div className="bg-white border border-[#EAE6DC] p-4 rounded-2xl shadow-sm flex flex-col gap-3">
                        <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider block">Frequent commutes</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'POI_RAILWAY', icon: '💼', title: 'To Work', stopName: 'Jaipur Jn.' },
                            { id: 'POI_MNIT', icon: '🎓', title: 'To MNIT', stopName: 'Campus' },
                            { id: 'POI_AIRPORT', icon: '✈️', title: 'To Airport', stopName: 'Terminal' }
                          ].map(s => (
                            <button 
                              key={s.id}
                              onClick={() => handleQuickSuggestion(s.id)}
                              className="bg-[#F8F7F5] border border-[#EAE6DC] p-2.5 rounded-xl hover:bg-slate-100 flex flex-col justify-between items-start aspect-square shadow-sm transition-all cursor-pointer"
                            >
                              <span className="text-base">{s.icon}</span>
                              <div>
                                <span className="text-[10px] font-black text-slate-800 block text-left leading-none mb-0.5">{s.title}</span>
                                <span className="text-[7.5px] text-slate-400 text-left block leading-tight truncate w-full">{s.stopName}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live Nearby Arrivals feed */}
                      <div className="bg-white border border-[#EAE6DC] p-4 rounded-2xl shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider">Live nearby feed</span>
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-extrabold uppercase animate-pulse border border-emerald-200">Live</span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {/* JMRC Metro */}
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-7.5 h-7.5 rounded-lg bg-jaipur-pink/15 text-jaipur-pink flex items-center justify-center font-black">🚇</span>
                              <div>
                                <span className="font-black text-slate-800 block">Mansarovar Metro</span>
                                <span className="text-[9px] text-slate-450">Pink Line Terminus · 120m</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-slate-800 block font-mono">In 2 mins</span>
                              <span className="text-[7.5px] text-slate-400">Next: 7m</span>
                            </div>
                          </div>
                          
                          {/* JCTSL Bus */}
                          <div className="flex justify-between items-center text-xs border-t border-[#F8F7F5] pt-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7.5 h-7.5 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-black">🚌</span>
                              <div>
                                <span className="font-black text-slate-800 block">JCTSL Route 3 Stand</span>
                                <span className="text-[9px] text-slate-450">To Transport Nagar · 280m</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-slate-800 block font-mono">In 5 mins</span>
                              <span className="text-[7.5px] text-slate-400">Next: 12m</span>
                            </div>
                          </div>

                          {/* E-Rickshaw Feeder */}
                          <div className="flex justify-between items-center text-xs border-t border-[#F8F7F5] pt-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7.5 h-7.5 rounded-lg bg-amber-50 text-amber-850 flex items-center justify-center font-black">🛺</span>
                              <div>
                                <span className="font-black text-slate-800 block">E-Rickshaw Hub Gate 2</span>
                                <span className="text-[9px] text-slate-450">8 autos active · 15m away</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-emerald-600 block font-mono">Available</span>
                              <span className="text-[8px] text-slate-400">₹10 flat fare</span>
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
                              ⭐ RECOMMENDED
                            </span>
                          )}
                          {route.type === 'GREENEST' && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              🌱 ZERO-CARBON
                            </span>
                          )}
                          {route.type === 'FASTEST' && (
                            <span className="bg-amber-100 text-amber-850 border border-amber-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              ⚡ CAB RAPID
                            </span>
                          )}
                          {route.type === 'CHEAPEST' && (
                            <span className="bg-slate-100 text-slate-650 border border-slate-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              🪙 SAVER
                            </span>
                          )}
                          {route.type === 'LEAST_WALKING' && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wide">
                              🚶 MINIMAL WALK
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-extrabold text-slate-900 leading-none">{route.totalTime} min</span>
                          <span className="text-[8px] text-slate-400 font-extrabold uppercase">MaaS Score</span>
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
                                <span className="text-[8px] text-slate-500 font-black uppercase">{seg.mode}</span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Cost, carbon, transfers footer */}
                        <div className="flex justify-between items-center text-xs border-t border-[#F8F7F5] pt-2 text-slate-600">
                          <span className="font-extrabold text-slate-900 text-sm">₹{route.totalFare}</span>
                          <span className="text-[8.5px] text-slate-400 font-bold">
                            {route.totalWalkingKm} km walk · {route.totalTransfers} transfer{route.totalTransfers !== 1 && 's'} · {route.totalCarbon} kg CO₂
                          </span>
                        </div>
                      </div>
                    );

                    return (
                      <div className="flex-grow flex flex-col gap-3 animate-fade-in">
                        <div className="mt-1">
                          <span className="text-[9px] text-slate-450 uppercase font-black">Plan Intermodal Route</span>
                          <h2 className="text-lg font-black text-slate-900 leading-tight">Multimodal Planner</h2>
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
                                {selectedStartStop ? selectedStartStop.nameEn : 'Select Starting Point'}
                              </span>
                            </div>
                            <span className="text-[9px] text-jaipur-pink font-black uppercase shrink-0">Change</span>
                          </div>

                          {/* End point */}
                          <div 
                            onClick={() => setSearchMode('to')}
                            className="bg-[#F8F7F5] border border-[#EAE6DC] p-3 rounded-xl flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-jaipur-pink shrink-0" />
                              <span className="text-xs font-bold text-slate-700 truncate">
                                {selectedEndStop ? selectedEndStop.nameEn : 'Select Destination'}
                              </span>
                            </div>
                            <span className="text-[9px] text-jaipur-pink font-black uppercase shrink-0">Change</span>
                          </div>

                          {/* Execute routing search */}
                          <button 
                            onClick={handleSearchTrigger}
                            className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider shadow cursor-pointer transition-all"
                          >
                            Compute Optimized Fares
                          </button>
                        </div>

                        {/* Route options results */}
                        {store.lastSearchExecuted && (
                          <div className="flex flex-col gap-4 mt-2">
                            {/* Public routes */}
                            {routesByCategory.public.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">🚌 Public Transit Corridor</span>
                                {routesByCategory.public.map(renderRouteCard)}
                              </div>
                            )}

                            {/* Hybrid routes */}
                            {routesByCategory.hybrid.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">🔄 Integrated Feeder Pathways</span>
                                {routesByCategory.hybrid.map(renderRouteCard)}
                              </div>
                            )}

                            {/* Private routes */}
                            {routesByCategory.private.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">🚗 Private Cabs</span>
                                {routesByCategory.private.map(renderRouteCard)}
                              </div>
                            )}

                            {/* Green routes */}
                            {routesByCategory.green.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">🌱 Eco-Friendly Options</span>
                                {routesByCategory.green.map(renderRouteCard)}
                              </div>
                            )}

                            {/* Route map overlay preview */}
                            <div className="mt-2 flex flex-col gap-2">
                              <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider">Route Path Preview</span>
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
                                  {searchMode === 'from' ? 'Boarding Point' : 'Destination Point'}
                                </h4>
                                <button 
                                  onClick={() => { setSearchMode(null); setSearchQuery(''); setIsSelectingOnMap(false); }}
                                  className="text-xs text-jaipur-pink font-bold hover:underline cursor-pointer"
                                >
                                  Close
                                </button>
                              </div>

                              {/* Search actions */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                                <button 
                                  onClick={handleUseGPS}
                                  className="py-2.5 px-3 bg-[#F8F7F5] hover:bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border border-[#EAE6DC]"
                                >
                                  📍 Use GPS
                                </button>
                                <button 
                                  onClick={() => setIsSelectingOnMap(!isSelectingOnMap)}
                                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border ${
                                    isSelectingOnMap 
                                      ? 'bg-jaipur-pink text-white border-jaipur-pink' 
                                      : 'bg-[#F8F7F5] hover:bg-slate-100 text-slate-700 border-[#EAE6DC]'
                                  }`}
                                >
                                  🗺️ {isSelectingOnMap ? 'Write Search' : 'Pick on Map'}
                                </button>
                              </div>

                              {isSelectingOnMap ? (
                                <div className="flex flex-col gap-3">
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 leading-normal">
                                    Simulating pin drop location. Adjust map markers directly to sync coordinates.
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
                                    Confirm Civil Lines Pin Location
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <input 
                                    type="text"
                                    autoFocus
                                    placeholder="Search metro hub, bus stop or landmark..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full border border-[#EAE6DC] bg-[#F8F7F5] px-4 py-3 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-jaipur-pink shadow-inner font-bold"
                                  />

                                  <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-1">
                                    {/* Landmarks */}
                                    {groupPOIs.length > 0 && (
                                      <div className="flex flex-col gap-1.5">
                                        <span className="text-[8.5px] text-jaipur-pink font-extrabold uppercase tracking-widest block">Landmarks (POIs)</span>
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
                                              <span className="font-black block text-slate-800">{loc.nameEn}</span>
                                              <span className="font-devanagari text-[9.5px] text-slate-400 block mt-0.5">{loc.nameHi}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[7.5px] font-black bg-amber-100 text-amber-850 uppercase">
                                              📍 Hub
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Metro Stops */}
                                    {groupMetro.length > 0 && (
                                      <div className="flex flex-col gap-1.5">
                                        <span className="text-[8.5px] text-metro-blue font-extrabold uppercase tracking-widest block">Metro Stations (JMRC)</span>
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
                                              <span className="font-black block text-slate-800">{loc.nameEn}</span>
                                              <span className="font-devanagari text-[9.5px] text-slate-400 block mt-0.5">{loc.nameHi}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[7.5px] font-black bg-metro-blue/10 text-metro-blue uppercase">
                                              🚇 Metro
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Bus Stops */}
                                    {groupBus.length > 0 && (
                                      <div className="flex flex-col gap-1.5">
                                        <span className="text-[8.5px] text-transit-green font-extrabold uppercase tracking-widest block">Bus Stops (JCTSL)</span>
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
                                              <span className="font-black block text-slate-800">{loc.nameEn}</span>
                                              <span className="font-devanagari text-[9.5px] text-slate-400 block mt-0.5">{loc.nameHi}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[7.5px] font-black bg-transit-green/10 text-transit-green uppercase">
                                              🚌 Bus
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
                            ← Back
                          </button>
                          <h3 className="text-base font-black text-slate-900 tracking-tight">Checkout Portal</h3>
                        </div>

                        {paymentState === 'idle' && (
                          <div className="flex flex-col gap-4">
                            <div className="bg-[#F8F7F5] p-4 rounded-2xl border border-[#EAE6DC] text-xs text-slate-600 flex flex-col gap-2.5">
                              <div className="flex justify-between items-baseline border-b border-[#EAE6DC] pb-2">
                                <span className="text-[9px] font-black uppercase text-slate-400">Intermodal Fare</span>
                                <span className="text-xl font-black text-slate-900 font-mono">₹{selectedRoute.totalFare}</span>
                              </div>
                              <div className="flex justify-between text-[11px] font-bold">
                                <span>Ticket Type</span>
                                <span className="text-slate-800">Jaipur Unified MaaS Pass</span>
                              </div>
                              {selectedRoute.savingPercent > 0 && (
                                <div className="flex justify-between text-[11px] text-transit-green font-extrabold">
                                  <span>Combined Ticket Discount</span>
                                  <span>Save {selectedRoute.savingPercent}%</span>
                                </div>
                              )}
                              {store.collegeMode && (
                                <div className="flex justify-between text-[11px] text-jaipur-pink font-extrabold">
                                  <span>Student Concession Benefit</span>
                                  <span>Active (50% Off Metro segments)</span>
                                </div>
                              )}
                            </div>

                            {/* Wallet Option */}
                            <div className="border border-[#EAE6DC] p-4 rounded-2xl flex justify-between items-center shadow-sm">
                              <div>
                                <span className="text-[9px] text-slate-400 font-black uppercase">NCMC Wallet Balance</span>
                                <h4 className="text-xs font-black text-slate-850">Available: ₹{store.walletBalance}</h4>
                              </div>
                              <button 
                                onClick={() => handleWalletPay(selectedRoute.totalFare)}
                                className="bg-slate-900 hover:bg-slate-850 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                              >
                                Pay Now
                              </button>
                            </div>

                            {/* UPI Options */}
                            <button 
                              onClick={handleUPIPay}
                              className="w-full bg-[#F8F7F5] border border-[#EAE6DC] text-slate-800 py-3 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer shadow-sm"
                            >
                              Pay via UPI (GPay, PhonePe, Bhim)
                            </button>
                          </div>
                        )}

                        {paymentState === 'processing' && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-3.5 py-12">
                            <RefreshCw className="w-8 h-8 text-jaipur-pink animate-spin" />
                            <h4 className="text-xs font-bold text-slate-500">Verifying cryptographical NCMC gateway token...</h4>
                          </div>
                        )}

                        {paymentState === 'success' && (
                          <div className="flex-grow flex flex-col items-center justify-center gap-4 py-10">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center animate-bounce">
                              <Check className="w-6 h-6 text-transit-green" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900">Payment Processed Successfully!</h4>
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
                            <span className="text-[8.5px] text-jaipur-pink font-extrabold uppercase tracking-widest block animate-pulse">Active Commute Pass</span>
                            <h2 className="text-lg font-black text-slate-900 leading-none">Unified Transit Ticket</h2>
                          </div>
                          
                          {/* Floating SOS Trigger Button */}
                          <button
                            onClick={() => setShowSOSOverlay(true)}
                            className="bg-red-500 hover:bg-red-650 text-white px-3 py-1.5 rounded-full shadow-md border border-red-400 animate-pulse flex items-center justify-center cursor-pointer text-[10px] font-black uppercase tracking-wider"
                          >
                            🚨 SOS
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
                                      <span className="text-[8px] font-black text-slate-500 uppercase">{seg.mode}</span>
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>

                              <div className="flex justify-between font-extrabold text-slate-800 text-center gap-1 text-[11px] mt-1">
                                <span className="truncate flex-1 text-left">{selectedRoute.segments[0]?.fromStopName.replace(' Metro', '').replace(' Campus', '') || 'Start'}</span>
                                <span className="text-slate-400">➔</span>
                                <span className="truncate flex-1 text-right">{selectedRoute.segments[selectedRoute.segments.length - 1]?.toStopName.replace(' Metro', '').replace(' Campus', '') || 'End'}</span>
                              </div>
                              
                              <div className="flex justify-between text-[10px] text-slate-400 font-bold border-t border-[#F8F7F5] pt-2.5">
                                <span>VALID FOR NEIGHBORHOOD TRANSFERS</span>
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
                        <span className="text-[9px] text-slate-450 uppercase font-black">NCMC Smart Transit Ledger</span>
                        <h2 className="text-lg font-black text-slate-900 leading-none">Wallet &amp; smart credits</h2>
                      </div>

                      {/* RuPay Gold NCMC Card layout */}
                      <div className="relative bg-gradient-to-br from-[#1E2022] via-[#2F3235] to-[#121314] text-white p-5 rounded-3xl shadow-lg aspect-[1.72/1] flex flex-col justify-between overflow-hidden border border-amber-500/20">
                        {/* Golden arch visual vectors */}
                        <div className="absolute inset-0 block-print-bg opacity-10 pointer-events-none" />
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-400/5 rounded-full blur-xl pointer-events-none" />

                        <div className="flex justify-between items-start z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-8.5 h-6 bg-gradient-to-r from-amber-400 to-yellow-600 rounded border border-amber-500/40 p-0.5 flex flex-wrap justify-around">
                              <div className="w-[6px] h-full border-r border-amber-700/35" />
                              <div className="w-[6px] h-full border-r border-amber-700/35" />
                            </div>
                            <div>
                              <span className="text-[9px] text-amber-450 font-black uppercase tracking-widest block leading-none">NCMC Gold Smart</span>
                              <span className="text-[6.5px] text-slate-400 font-semibold block leading-none mt-0.5">Rajasthan Transit Authority</span>
                            </div>
                          </div>
                          <span className="text-[12px] opacity-80">📶</span>
                        </div>

                        <div className="z-10 mt-3">
                          <span className="text-[7.5px] text-slate-400 uppercase tracking-widest block">Available Balance</span>
                          <span className="text-2xl font-black tracking-tight font-mono text-amber-400">₹{store.walletBalance}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8.5px] font-mono tracking-widest text-slate-500">8295 4401 9904 8871</span>
                            <span className="text-[7.5px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400 font-bold uppercase border border-amber-500/35">RuPay</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-800/80 pt-2.5 text-[7.5px] text-slate-450 z-10">
                          <span className="font-bold tracking-wide">JAIPUR UNIFIED MOBILITY AUTH</span>
                          <span className="font-black text-amber-500">GOLD PREMIUM</span>
                        </div>
                      </div>

                      {/* Recharge options */}
                      <div className="bg-white border border-[#EAE6DC] p-4.5 rounded-3xl shadow-sm flex flex-col gap-3">
                        <span className="text-[9px] text-slate-450 uppercase font-black">Dynamic NCMC top-up</span>
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
                            alert(`NCMC Smart Card topped-up with ₹${rechargeAmt} successfully!`);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                        >
                          Top-Up Card via UPI Link
                        </button>
                      </div>

                      {/* Savings Ledger graphs */}
                      <div className="bg-white border border-[#EAE6DC] p-4.5 rounded-3xl shadow-sm flex flex-col gap-3">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-black block leading-none">MaaS Savings Ledger</span>
                          <h3 className="text-xs font-bold text-slate-800 mt-1">Intermodal Cost Savings (vs Cab/Car)</h3>
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
                            <h4 className="text-xs font-black text-slate-800">Jaipur Green Points</h4>
                            <p className="text-[9px] text-slate-400">1,480 carbon-saver credits</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-jaipur-pink hover:underline cursor-pointer">Redeem</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: PROFILE */}
                  {store.citizenScreen === 'profile' && (
                    <div className="flex-grow flex flex-col gap-4 animate-fade-in">
                      <div className="mt-1">
                        <span className="text-[9px] text-slate-450 uppercase font-black">Configure citizen profile</span>
                        <h2 className="text-lg font-black text-slate-900 leading-none">Your Identity</h2>
                      </div>

                      <div className="bg-white border border-[#EAE6DC] p-4.5 rounded-3xl shadow-sm flex flex-col gap-3 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-bold">Full Name</span>
                          <span className="font-extrabold text-slate-800">{store.userProfile?.name}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#F8F7F5] pt-2.5 py-1">
                          <span className="text-slate-500 font-bold">Concession category</span>
                          <span className="font-extrabold text-slate-800 bg-jaipur-pink/10 text-jaipur-pink px-2.5 py-0.5 rounded-full border border-jaipur-pink/15">
                            {store.userProfile?.category}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#F8F7F5] pt-2.5 py-1">
                          <span className="text-slate-500 font-bold">Language Setting</span>
                          <span className="font-extrabold text-slate-800">{store.userProfile?.language === 'hi' ? 'Hindi (हिन्दी)' : 'English'}</span>
                        </div>
                        {store.userLocation && (
                          <div className="flex justify-between items-center border-t border-[#F8F7F5] pt-2.5 py-1">
                            <span className="text-slate-500 font-bold">Current Hub Coordinates</span>
                            <span className="font-mono text-[10px] text-slate-700">{store.userLocation.lat.toFixed(4)}°, {store.userLocation.lng.toFixed(4)}°</span>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => store.logOut()}
                        className="w-full bg-red-50 border border-red-150 text-red-650 py-3.5 rounded-2xl text-xs font-black hover:bg-red-100 cursor-pointer mt-4"
                      >
                        Reset Citizen Account
                      </button>
                    </div>
                  )}

                  {/* AUXILIARY SCREENS */}
                  {store.citizenScreen === 'ai_assistant' && (
                    <div className="flex-grow flex flex-col justify-between gap-3 animate-fade-in">
                      <div className="mt-1">
                        <span className="text-[9px] text-slate-450 uppercase font-black">AI Guide Bot</span>
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5 leading-none">
                          <span>JUMTA AI Assistant</span>
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
                            <p>{msg.text}</p>
                            {msg.textHi && <p className="font-devanagari text-[9.5px] mt-1.5 opacity-80 border-t border-[#F8F7F5] pt-1.5">{msg.textHi}</p>}
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Type transit queries in English/Hindi..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          className="flex-grow bg-white border border-[#EAE6DC] rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-jaipur-pink"
                        />
                        <button type="submit" className="bg-slate-900 hover:bg-slate-850 text-white px-4.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                          Send
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
                        <h2 className="text-xl font-black tracking-tight text-red-500">EMERGENCY SOS ACTIVE</h2>
                        <p className="text-xs text-slate-350 max-w-[280px]">
                          Your real-time coordinates, passenger ID, and active telemetry have been dispatched to Jaipur Police, JMRC Security, and JCTSL controllers.
                        </p>
                      </div>

                      <div className="bg-red-900/35 border border-red-500/35 p-4.5 rounded-2xl flex flex-col gap-2.5 text-xs text-left">
                        <div className="flex justify-between">
                          <span className="text-slate-400">GPS Coordinates</span>
                          <span className="font-mono font-bold text-white">
                            {store.userLocation ? `${store.userLocation.lat.toFixed(5)}° N, ${store.userLocation.lng.toFixed(5)}° E` : '26.8770° N, 75.7540° E'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Nearest Station</span>
                          <span className="font-bold text-white">{selectedStartStop?.nameEn || 'Mansarovar Metro'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Citizen Identity Code</span>
                          <span className="font-mono font-bold text-white">JUMP-8295</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3.5">
                        <a 
                          href="tel:112"
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md text-center"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Call Emergency Helpline (112)</span>
                        </a>
                        <button 
                          onClick={() => setShowSOSOverlay(false)}
                          className="w-full bg-transparent border border-slate-650 text-slate-300 font-bold py-3.5 rounded-xl text-xs hover:bg-slate-850 cursor-pointer"
                        >
                          Cancel Security Dispatcher
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Simulated Navigation Bar */}
            {store.authStep === 'authenticated' && (
              <div className="h-[75px] bg-white border-t border-[#F1EFEA] grid grid-cols-5 items-center justify-center px-2 select-none z-40">
                {[
                  { screen: 'home', icon: <Navigation className="w-5 h-5" />, label: 'Home' },
                  { screen: 'trips', icon: <Search className="w-5 h-5" />, label: 'Planner' },
                  { screen: 'tracking', icon: <Layers className="w-5 h-5" />, label: 'Ticket' },
                  { screen: 'wallet', icon: <Wallet className="w-5 h-5" />, label: 'Wallet' },
                  { screen: 'profile', icon: <User className="w-5 h-5" />, label: 'Profile' }
                ].map(tab => (
                  <button 
                    key={tab.screen}
                    onClick={() => store.setCitizenScreen(tab.screen as any)}
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      store.citizenScreen === tab.screen ? 'text-jaipur-pink font-black scale-105' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab.icon}
                    <span className="text-[8.5px] font-extrabold">{tab.label}</span>
                  </button>
                ))}
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

      {/* CODE EXPORT PANEL */}
      <section className="bg-white border border-[#EAE6DC] p-5.5 rounded-3xl shadow-sm mt-4">
        <h3 className="text-sm font-black text-slate-805 flex items-center gap-2">
          <FileText className="w-5 h-5 text-jaipur-pink" />
          <span>React Native Expo Commuter Tokens Exporter</span>
        </h3>
        
        <div className="flex gap-2.5 mt-3 border-b border-[#F8F7F5] pb-2.5 mb-3">
          {(['tokens', 'components', 'algorithms'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveExportTab(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeExportTab === tab ? 'bg-[#F8F7F5] text-slate-900 border border-[#EAE6DC]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'tokens' && '🎨 Design Tokens'}
              {tab === 'components' && '📦 React Native Card'}
              {tab === 'algorithms' && '⚙️ MaaS Score Rules'}
            </button>
          ))}
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl relative">
          <button
            onClick={() => {
              const code = activeExportTab === 'tokens' ? designTokensCode :
                           activeExportTab === 'components' ? expoComponentsCode : algorithmsCode;
              copyToClipboard(code, activeExportTab);
            }}
            className="absolute top-3.5 right-3.5 bg-slate-850 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black border border-slate-750 cursor-pointer"
          >
            {copiedText === activeExportTab ? 'Copied!' : 'Copy Code'}
          </button>
          <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed select-all">
            <code>
              {activeExportTab === 'tokens' && designTokensCode}
              {activeExportTab === 'components' && expoComponentsCode}
              {activeExportTab === 'algorithms' && algorithmsCode}
            </code>
          </pre>
        </div>
      </section>

    </div>
  );
}

// ----------------------------------------------------
// EXPORT DESIGN SYSTEMS DETAILS
// ----------------------------------------------------
const designTokensCode = `// src/theme/tokens.ts
export const JUMP_THEME = {
  colors: {
    primary: {
      jaipurPink: '#D65A6F',      // Primary Brand Color
      metroBlue: '#185FA5',       // JMRC metro co-branding
      transitGreen: '#0FA971',    // JCTSL bus co-branding
      mobilityAmber: '#F2A900',   // Rickshaws / IPT
      coralAccent: '#FF5A5F',     // private ride-hailing / Ola
    },
    backgrounds: {
      lightBase: '#FFFFFF',
      softSand: '#F8F7F5',
      borderSlate: '#E5E7EB',
    },
    typography: {
      sansSora: 'Sora-Regular',
      sansSoraBold: 'Sora-Bold',
      devanagari: 'NotoSansDevanagari-Regular',
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  }
};
`;

const expoComponentsCode = `// src/components/MaaSScoreCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { JUMP_THEME } from '../theme/tokens';

export interface ScoreCardProps {
  score: number;
  timeMins: number;
  fare: number;
  carbonKg: number;
}

export const MaaSScoreCard: React.FC<ScoreCardProps> = ({ score, timeMins, fare, carbonKg }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.timeText}>{timeMins} mins</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>Score {score}/100</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <Text style={styles.metricItem}>₹{fare}</Text>
        <Text style={styles.metricDivider}>|</Text>
        <Text style={styles.metricItem}>{carbonKg} kg CO₂</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: JUMP_THEME.colors.backgrounds.lightBase,
    borderColor: JUMP_THEME.colors.backgrounds.borderSlate,
    borderWidth: 1,
    borderRadius: 16,
    padding: JUMP_THEME.spacing.md,
    marginBottom: JUMP_THEME.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: JUMP_THEME.colors.typography.sansSoraBold,
    fontSize: 16,
    color: '#111827',
  },
  scoreBadge: {
    backgroundColor: JUMP_THEME.colors.primary.jaipurPink + '15',
    borderColor: JUMP_THEME.colors.primary.jaipurPink + '30',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: {
    fontFamily: JUMP_THEME.colors.typography.sansSora,
    fontSize: 11,
    color: JUMP_THEME.colors.primary.jaipurPink,
  },
  metrics: {
    flexDirection: 'row',
    marginTop: JUMP_THEME.spacing.sm,
    gap: JUMP_THEME.spacing.md,
  },
  metricItem: {
    fontFamily: JUMP_THEME.colors.typography.sansSora,
    fontSize: 13,
    color: '#6b7280',
  },
  metricDivider: {
    color: '#e5e7eb',
  }
});
`;

const algorithmsCode = `// src/algorithms/maasScoring.ts
export interface RouteCriteria {
  fare: number;        // Weight: 25%
  time: number;        // Weight: 30%
  transfers: number;   // Weight: 15%
  walkingKm: number;   // Weight: 10%
  carbonKg: number;    // Weight: 10%
  congestion: number;  // Weight: 10%
}

export function calculateMaaSScore(route: RouteCriteria): number {
  const fareScore = Math.max(0, 100 - (route.fare * 1.3));
  const timeScore = Math.max(0, 100 - (route.time * 1.1));
  const transfersScore = Math.max(0, 100 - (route.transfers * 20));
  const walkingScore = Math.max(0, 100 - (route.walkingKm * 25));
  const carbonScore = Math.max(0, 100 - (route.carbonKg * 12));
  const congestionScore = Math.max(0, 100 - route.congestion);

  const totalScore = 
    fareScore * 0.25 +
    timeScore * 0.30 +
    transfersScore * 0.15 +
    walkingScore * 0.10 +
    carbonScore * 0.10 +
    congestionScore * 0.10;

  return Math.round(totalScore);
}
`;
