import React, { useState, useEffect, useRef } from 'react';
import { useMaaSStore } from './store';
import { transitDataService, type StationData } from './services/transitDataService';
import { JAIPUR_HISTORICAL_RIDERSHIP, JAIPUR_INCIDENTS, getDistanceKm, TRANSIT_ROUTES } from './data';
import { 
  Wallet, Navigation, Search, 
  Award, Layers, Wifi, RefreshCw, Sliders, Sparkles, CheckCircle, FileText,
  Phone, User
} from 'lucide-react';
import { 
  XAxis, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

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
    { sender: 'ai', text: 'Namaste! I am your UMTAJ AI Assistant. Where do you want to travel in Jaipur today?', textHi: 'नमस्ते! मैं आपका उमताज एआई सहायक हूँ। आज आप जयपुर में कहाँ यात्रा करना चाहते हैं?' }
  ]);
  const [showControlSidebar, setShowControlSidebar] = useState(false);
  const [rechargeAmt, setRechargeAmt] = useState('100');

  // Weather API state
  const [weatherData, setWeatherData] = useState<{ temp: number; icon: string; desc: string } | null>(null);
  const [currentLocName, setCurrentLocName] = useState<string>('Jaipur Central');

  // Map selection states
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const selectorMapRef = useRef<any>(null);

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
    
    // Simulate Splash transition after 2.5 seconds
    const timer = setTimeout(() => {
      if (store.authStep === 'splash') {
        store.setAuthStep('welcome');
      }
    }, 2500);

    const fetchWeatherAndLocation = async (lat: number, lng: number, isDefault = false) => {
      // 1. Fetch Weather from Open-Meteo
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
        // User notice that weather API call is offline/simulated
        setWeatherData({ temp: 37, icon: '☀️', desc: 'Sunny (Simulated - Offline)' });
      }

      // 2. Fetch Location Name from Nominatim
      if (isDefault) {
        setCurrentLocName('Jaipur Central (GPS Off)');
      } else {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`, {
            headers: { 'Accept-Language': 'en' }
          });
          const json = await res.json();
          if (json.address) {
            const name = json.address.suburb || json.address.neighbourhood || json.address.city || json.address.town || 'Jaipur';
            setCurrentLocName(name);
          } else {
            setCurrentLocName('Jaipur');
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          setCurrentLocName('Jaipur (Geocode Offline)');
        }
      }
    };

    const initLocationAndWeather = async () => {
      // 1. Try HTML5 Geolocation API
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchWeatherAndLocation(pos.coords.latitude, pos.coords.longitude, false);
          },
          (err) => {
            console.warn("HTML5 Geolocation permission denied or failed. Trying IP Geolocation fallback...", err);
            tryIPGeolocation();
          },
          { timeout: 6000 }
        );
      } else {
        tryIPGeolocation();
      }
    };

    const tryIPGeolocation = async () => {
      // 2. Try IP-based location API as a seamless fallback (no permissions prompt required)
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipJson = await ipRes.json();
        if (ipJson && typeof ipJson.latitude === 'number' && typeof ipJson.longitude === 'number') {
          fetchWeatherAndLocation(ipJson.latitude, ipJson.longitude, false);
        } else {
          throw new Error("Invalid IP geocode response format");
        }
      } catch (ipErr) {
        console.error("IP Geolocation failed. Using Jaipur Central coordinates:", ipErr);
        fetchWeatherAndLocation(26.9124, 75.8144, true);
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

  // Geolocation (GPS) Handler
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
        alert("GPS geolocation permission denied or unavailable.");
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Google Map Pin Location Confirmation
  const handleConfirmMapLocation = () => {
    if (!selectorMapRef.current) return;
    const { marker } = selectorMapRef.current;
    const pos = marker.getPosition();
    const lat = pos.lat();
    const lng = pos.lng();

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
      if (searchMode === 'from') {
        setSelectedStartStop(nearest);
      } else {
        setSelectedEndStop(nearest);
      }
      setIsSelectingOnMap(false);
      setSearchMode(null);
      setSearchQuery('');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // OTP Validation Handler
  const handleOTPVerify = () => {
    store.setAuthStep('profile');
  };

  // Profile Form Handler
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

    // Pre-populate search selectors with real stops
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
        }, 1500);
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
      }, 1500);
    }, 1200);
  };

  // Google Map Selector in Search Sheet
  useEffect(() => {
    if (!isSelectingOnMap || !(window as any).google) return;
    
    const timer = setTimeout(() => {
      const mapElement = document.getElementById('google-map-selector');
      if (!mapElement) return;

      const jaipurCenter = { lat: 26.9124, lng: 75.8144 };
      const map = new (window as any).google.maps.Map(mapElement, {
        center: jaipurCenter,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true
      });

      const marker = new (window as any).google.maps.Marker({
        position: jaipurCenter,
        map: map,
        draggable: true,
        title: 'Drag to select location'
      });

      // Update position on click
      map.addListener('click', (e: any) => {
        marker.setPosition(e.latLng);
      });

      selectorMapRef.current = { map, marker };
    }, 150);

    return () => clearTimeout(timer);
  }, [isSelectingOnMap]);

  // Google Map Live Tracking Integration (same as Ola/Uber)
  useEffect(() => {
    if (store.citizenScreen !== 'tracking' || !(window as any).google) return;

    const mapElement = document.getElementById('google-map-tracking');
    if (!mapElement) return;

    const jaipurCenter = { lat: 26.9124, lng: 75.8144 };
    const map = new (window as any).google.maps.Map(mapElement, {
      center: jaipurCenter,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    const selectedRoute = store.calculatedRoutes.find(r => r.id === store.selectedRouteId);
    if (!selectedRoute) return;

    const bounds = new (window as any).google.maps.LatLngBounds();
    const allLocs = [
      ...transitDataService.getAllStops(true),
      ...transitDataService.getPOIs().map(p => ({
        id: p.id,
        nameEn: p.nameEn,
        nameHi: p.nameHi,
        lat: p.lat,
        lng: p.lng,
        type: 'AUTO' as const
      }))
    ];

    let isMounted = true;
    let animationInterval: any = null;
    let passengerMarker: any = null;

    const drawRouteAndAnimate = async () => {
      const combinedPath: any[] = [];
      const polylines: any[] = [];

      for (let idx = 0; idx < selectedRoute.segments.length; idx++) {
        const seg = selectedRoute.segments[idx];
        const sStop = allLocs.find(s => s.nameEn === seg.fromStopName || s.id === seg.fromStopName);
        const eStop = allLocs.find(s => s.nameEn === seg.toStopName || s.id === seg.toStopName);

        const startLat = sStop ? sStop.lat : 26.9124;
        const startLng = sStop ? sStop.lng : 75.8144;
        const endLat = eStop ? eStop.lat : 26.9124;
        const endLng = eStop ? eStop.lng : 75.8144;

        const startLatLng = { lat: startLat, lng: startLng };
        const endLatLng = { lat: endLat, lng: endLng };

        bounds.extend(startLatLng);
        bounds.extend(endLatLng);

        // Determine color matching transit type
        let color = '#D65A6F'; // Pink for metro
        if (seg.mode === 'BUS') color = '#0FA971'; // Green for JCTSL bus
        if (seg.mode === 'AUTO') color = '#F2A900'; // Amber for Auto
        if (seg.mode === 'WALK') color = '#94A3B8'; // Grey for walking
        if (seg.mode === 'CYCLE') color = '#10B981'; // Teal/Green for cycle share

        let pathCoords: { lat: number; lng: number }[] = [];

        // 1. Trace exact subway track for METRO mode
        if (seg.mode === 'METRO') {
          const metroStations = [
            ...transitDataService.getMetroPhase1(),
            ...transitDataService.getMetroPhase2()
          ];
          const metroRoute = TRANSIT_ROUTES.find(r => 
            r.type === 'METRO' && 
            r.stops.includes(sStop?.id || '') && 
            r.stops.includes(eStop?.id || '')
          );

          if (metroRoute) {
            const startIndex = metroRoute.stops.indexOf(sStop?.id || '');
            const endIndex = metroRoute.stops.indexOf(eStop?.id || '');
            if (startIndex !== -1 && endIndex !== -1) {
              const step = startIndex < endIndex ? 1 : -1;
              for (let i = startIndex; i !== endIndex + step; i += step) {
                const st = metroStations.find(station => station.id === metroRoute.stops[i]);
                if (st) {
                  pathCoords.push({ lat: st.lat, lng: st.lng });
                }
              }
            }
          }
          
          if (pathCoords.length === 0) {
            pathCoords = [startLatLng, endLatLng];
          }
        } else {
          // 2. Fetch OSRM high-fidelity street mapping (matching OSMnx model)
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
            const res = await fetch(osrmUrl);
            const data = await res.json();
            if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
              const geom = data.routes[0].geometry.coordinates; // array of [lng, lat]
              pathCoords = geom.map((coord: number[]) => ({
                lat: coord[1],
                lng: coord[0]
              }));
            } else {
              pathCoords = [startLatLng, endLatLng];
            }
          } catch (err) {
            console.warn('OSRM routing fetch failed, falling back to straight line:', err);
            pathCoords = [startLatLng, endLatLng];
          }
        }

        if (!isMounted) return;

        // Draw Polyline for this segment
        const polyline = new (window as any).google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.95,
          strokeWeight: 4.5,
          map: map
        });
        polylines.push(polyline);

        // Extend map bounds for high-fidelity street points
        pathCoords.forEach(pt => bounds.extend(pt));

        // Add coordinates to combined path for passenger animation
        combinedPath.push(...pathCoords);

        // Add Stop Marker
        new (window as any).google.maps.Marker({
          position: startLatLng,
          map: map,
          title: seg.fromStopName,
          label: {
            text: idx === 0 ? 'Start' : '📍',
            color: '#111827',
            fontWeight: 'bold',
            fontSize: '10px'
          }
        });

        if (idx === selectedRoute.segments.length - 1) {
          new (window as any).google.maps.Marker({
            position: endLatLng,
            map: map,
            title: seg.toStopName,
            label: {
              text: 'End',
              color: '#D65A6F',
              fontWeight: 'bold',
              fontSize: '10px'
            }
          });
        }
      }

      if (!isMounted) return;
      map.fitBounds(bounds);

      // Animate passenger dot marker smoothly along winding streets
      if (combinedPath.length > 0) {
        passengerMarker = new (window as any).google.maps.Marker({
          position: combinedPath[0],
          map: map,
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3B82F6', // Blue GPS dot
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          },
          title: 'Passenger Position'
        });

        let passIdx = 0;
        animationInterval = setInterval(() => {
          if (!isMounted) return;
          if (passIdx < combinedPath.length) {
            passengerMarker.setPosition(combinedPath[passIdx]);
            passIdx++;
          } else {
            passIdx = 0;
          }
        }, 150); // Animated transition speed for winding street paths
      }
    };

    drawRouteAndAnimate();

    return () => {
      isMounted = false;
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [store.citizenScreen, store.selectedRouteId, store.calculatedRoutes]);

  // AI chat bot response handlers
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      let aiText = '';
      let aiTextHi = '';

      if (userMsg.toLowerCase().includes('fast') || userMsg.toLowerCase().includes('quick')) {
        aiText = 'The fastest validated route is taking the Pink Line Metro from Mansarovar to Railway Station, then switching to the JCTSL Route 3 Bus to MNIT. Total time is 38 mins.';
        aiTextHi = 'सबसे तेज़ मान्य मार्ग मानसरोवर से रेलवे स्टेशन तक पिंक लाइन मेट्रो लेना है, फिर एमएनआईटी के लिए जेसीटीएसएल रूट 3 बस में बदलना है। कुल समय 38 मिनट है।';
      } else if (userMsg.toLowerCase().includes('cheap') || userMsg.toLowerCase().includes('cost')) {
        aiText = 'For the lowest fare, take the direct JCTSL Route 3 Bus. It costs ₹15, saving 60% compared to auto-rickshaws.';
        aiTextHi = 'न्यूनतम किराए के लिए, सीधे जेसीटीएसएल रूट 3 बस लें। इसकी लागत ₹15 है, जो ऑटो-रिक्शा की तुलना में 60% की बचत करती है।';
      } else {
        aiText = 'I have queried the transit database. Your optimized journey has 1 transfer node with a combined ticket discount of 20% applied.';
        aiTextHi = 'मैंने पारगमन डेटाबेस से पूछताछ की है। आपकी अनुकूलित यात्रा में 1 ट्रांसफर नोड है जिसमें 20% का संयुक्त टिकट डिस्काउंट लागू है।';
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiText, textHi: aiTextHi }]);
    }, 1000);
  };

  // Filter and group searchable locations (POIs, Metro, Bus stops)
  const filteredLocs = searchQuery.trim() === ''
    ? searchableLocations.slice(0, 18) // Show first 18 as a good mix
    : searchableLocations.filter(loc => 
        loc.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
        loc.nameHi.includes(searchQuery)
      );

  const groupPOIs = filteredLocs.filter(loc => loc.id.startsWith('POI_'));
  const groupMetro = filteredLocs.filter(loc => loc.type === 'METRO');
  const groupBus = filteredLocs.filter(loc => loc.type === 'BUS');

  return (
    <div className="min-h-screen bg-[#F8F7F5] py-5 px-4 md:px-8 flex flex-col gap-6 font-sora">
      
      {/* BRAND & HEADER PORTAL */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            {/* Minimal Vector Logo: Location pin U shape */}
            <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 90C70 65 85 45 85 28C85 12 70 2 50 2C30 2 15 12 15 28C15 45 30 65 50 90Z" fill="#D65A6F" />
              <path d="M50 48C58 48 64 42 64 34C64 26 58 20 50 20C42 20 36 26 36 34C36 42 42 48 50 48Z" fill="#FFFFFF" />
              <path d="M40 28V36C40 42 44 46 50 46C56 46 60 42 60 36V28" stroke="#185FA5" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1">
                <span>UMTAJ</span>
                <span className="text-[10px] text-slate-400 font-normal">One City. One Ticket.</span>
              </h1>
              <p className="text-xs text-slate-500 font-light">Jaipur Mobility-as-a-Service Platform</p>
            </div>
          </div>
        </div>

        {/* SIDEBAR TOGGLE & ENVIRONMENT CONTROLS */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowControlSidebar(!showControlSidebar)}
            className="bg-white border border-slate-200 text-slate-700 px-4.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>{showControlSidebar ? 'Hide System Dashboards' : 'Show JMRC/JCTSL Control Center'}</span>
          </button>
        </div>
      </header>

      {/* DASHBOARD SPLIT VIEWPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center">
        
        {/* MOBILE SIMULATOR AREA (LEFT COLUMN) */}
        <section className={`flex justify-center transition-all duration-300 ${showControlSidebar ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          <div className="phone-viewport bg-white border-[10px] border-slate-900 shadow-2xl flex flex-col justify-between">
            <div className="phone-notch bg-slate-900"></div>

            {/* Status Bar */}
            <div className="h-9 px-6 pt-3 flex justify-between items-center text-xs text-slate-500 z-40 select-none bg-white font-medium">
              <span className="font-semibold text-slate-800">16:17</span>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-slate-700" />
                <span className="font-bold text-[9px] text-slate-700">5G</span>
                <span className="font-semibold text-slate-700">UMTAJ</span>
              </div>
            </div>

            {/* SCREEN VIEWPORT CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col bg-[#F8F7F5]">
              
              {/* SPLASH SCREEN */}
              {store.authStep === 'splash' && (
                <div className="flex-grow flex flex-col items-center justify-center gap-6 py-10 bg-white">
                  <div className="flex flex-col items-center gap-3 animate-pulse">
                    <svg viewBox="0 0 100 100" className="w-20 h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 90C70 65 85 45 85 28C85 12 70 2 50 2C30 2 15 12 15 28C15 45 30 65 50 90Z" fill="#D65A6F" />
                      <path d="M50 48C58 48 64 42 64 34C64 26 58 20 50 20C42 20 36 26 36 34C36 42 42 48 50 48Z" fill="#FFFFFF" />
                      <path d="M40 28V36C40 42 44 46 50 46C56 46 60 42 60 36V28" stroke="#185FA5" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">UMTAJ</h2>
                    <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">One City. One Ticket.</span>
                  </div>
                  {/* Skyline moving simulation */}
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-6">
                    <div className="h-full bg-gradient-to-r from-jaipur-pink to-metro-blue animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              )}

              {/* WELCOME SCREEN */}
              {store.authStep === 'welcome' && (
                <div className="flex-grow flex flex-col justify-between py-6 bg-white px-2">
                  <div className="flex flex-col items-center text-center gap-4 mt-8">
                    <svg viewBox="0 0 100 100" className="w-16 h-16" fill="none">
                      <path d="M50 90C70 65 85 45 85 28C85 12 70 2 50 2C30 2 15 12 15 28C15 45 30 65 50 90Z" fill="#D65A6F" />
                      <path d="M50 48C58 48 64 42 64 34C64 26 58 20 50 20C42 20 36 26 36 34C36 42 42 48 50 48Z" fill="#FFFFFF" />
                    </svg>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Travel Across Jaipur Seamlessly</h2>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                      Metro, buses, auto-rickshaws, and cabs. All integrated under one account.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 mt-10">
                    <button 
                      onClick={() => store.setAuthStep('otp')}
                      className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                    >
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>Continue with Mobile Number</span>
                    </button>
                    <button 
                      onClick={() => store.setAuthStep('profile')}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-800 font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Continue with Google
                    </button>
                  </div>
                </div>
              )}

              {/* OTP SCREEN */}
              {store.authStep === 'otp' && (
                <div className="flex-grow flex flex-col justify-between py-6 bg-white px-2">
                  <div className="flex flex-col gap-3 mt-6">
                    <h3 className="text-xl font-black text-slate-900">Enter Verification Code</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      We sent an SMS OTP code to your number.
                    </p>

                    <div className="flex gap-2.5 mt-4 justify-center">
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
                          className="w-12 h-14 border border-slate-200 bg-slate-50 rounded-2xl text-center text-lg font-bold text-slate-900 focus:outline-none focus:border-jaipur-pink"
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setOtpVal(['8', '2', '9', '5'])}
                      className="text-xs text-jaipur-pink font-semibold self-center mt-2 cursor-pointer hover:underline"
                    >
                      Simulate SMS OTP Autofill (8295)
                    </button>
                  </div>

                  <button 
                    onClick={handleOTPVerify}
                    className="w-full bg-jaipur-pink text-white font-bold py-3.5 rounded-2xl text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
                  >
                    Verify &amp; Continue
                  </button>
                </div>
              )}

              {/* PROFILE SETUP */}
              {store.authStep === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="flex-grow flex flex-col justify-between py-6 bg-white px-2">
                  <div className="flex flex-col gap-4 mt-6">
                    <h3 className="text-xl font-black text-slate-900">Create Profile</h3>
                    <p className="text-xs text-slate-500">Configure your ticket concession and language parameters.</p>

                    <div className="flex flex-col gap-3.5 mt-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 font-extrabold uppercase mb-1">Full Name</label>
                        <input 
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-jaipur-pink"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] text-slate-500 font-extrabold uppercase mb-1">Gender</label>
                          <select 
                            value={profileGender}
                            onChange={(e) => setProfileGender(e.target.value)}
                            className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none"
                          >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 font-extrabold uppercase mb-1">Age</label>
                          <input 
                            type="number"
                            required
                            value={profileAge}
                            onChange={(e) => setProfileAge(e.target.value)}
                            className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 font-extrabold uppercase mb-1">Category</label>
                        <select 
                          value={profileCategory}
                          onChange={(e) => setProfileCategory(e.target.value as any)}
                          className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none"
                        >
                          <option value="RESIDENT">Jaipur Resident</option>
                          <option value="STUDENT">Student Concession (50% off Metro)</option>
                          <option value="TOURIST">Tourist Pass Access</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 font-extrabold uppercase mb-1">Language</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setProfileLang('en')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                              profileLang === 'en' ? 'bg-jaipur-pink/15 border-jaipur-pink text-jaipur-pink' : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            English
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileLang('hi')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                              profileLang === 'hi' ? 'bg-jaipur-pink/15 border-jaipur-pink text-jaipur-pink' : 'bg-slate-50 border-slate-200 text-slate-500'
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
                    Finish Setup &amp; Explore
                  </button>
                </form>
              )}

              {/* AUTHENTICATED SCREEN VIEWER */}
              {store.authStep === 'authenticated' && (
                <div className="flex-1 flex flex-col">
                  
                  {/* TAB 1: HOME DASHBOARD */}
                  {store.citizenScreen === 'home' && (
                    <div className="flex-grow flex flex-col gap-4.5">
                      
                      {/* Greeting Header */}
                      <div className="flex justify-between items-center mt-2.5">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-black">Welcome back</span>
                          <h3 className="text-lg font-black text-slate-900">{store.userProfile?.name || 'Shashwat'}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {weatherData && (
                            <div className="flex flex-col items-end gap-0.5">
                              <div 
                                className="bg-slate-100/90 px-2.5 py-1 rounded-2xl flex items-center gap-1 border border-slate-200 shadow-sm animate-fade-in cursor-help"
                                title={weatherData.desc}
                              >
                                <span className="text-xs">{weatherData.icon}</span>
                                <span className="text-[10px] font-extrabold text-slate-700">{weatherData.temp}°C</span>
                              </div>
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight text-right flex flex-col items-end">
                                <span>{currentLocName}</span>
                                {weatherData.desc.includes('Simulated') && (
                                  <span className="text-[7px] text-amber-600 font-semibold lowercase tracking-tight leading-none mt-0.5">(simulated weather)</span>
                                )}
                              </span>
                            </div>
                          )}
                          <span className="w-8 h-8 rounded-full bg-jaipur-pink/20 flex items-center justify-center text-jaipur-pink text-xs font-extrabold self-start mt-0.5 shadow-sm">
                            {store.userProfile?.name ? store.userProfile.name.charAt(0).toUpperCase() : 'S'}
                          </span>
                        </div>
                      </div>

                      {/* NCMC Card Banner */}
                      <div className="bg-gradient-to-r from-jaipur-pink to-coral-private p-4 rounded-2xl text-white shadow-md relative overflow-hidden flex flex-col justify-between aspect-[1.8/1]">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] text-white/70 uppercase font-bold tracking-wider">Unified NCMC Card</span>
                            <h4 className="text-xs font-extrabold tracking-tight mt-0.5">Rajasthan Transit Wallet</h4>
                          </div>
                          <span className="text-[10px] font-mono tracking-widest text-white/50">8295</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-white/60 uppercase block">Available Balance</span>
                          <span className="text-2xl font-black tracking-tight">₹{store.walletBalance}</span>
                        </div>
                        <div className="flex justify-between items-end border-t border-white/10 pt-2 text-[9px] text-white/70">
                          <span>Federal Bank Co-Brand</span>
                          <span className="font-bold">RuPay</span>
                        </div>
                      </div>

                      {/* Search-First bottom trigger */}
                      <div 
                        onClick={() => {
                          store.setCitizenScreen('trips');
                          setSearchMode('to');
                        }}
                        className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center gap-3 cursor-pointer shadow-sm hover:border-slate-300 transition-all"
                      >
                        <Search className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium">Where do you want to go?</span>
                      </div>

                      {/* Quick shortcuts grid */}
                      <div className="grid grid-cols-4 gap-2.5">
                        <button onClick={() => { store.setCitizenScreen('trips'); }} className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-sm flex flex-col items-center gap-1">
                          <span className="w-8 h-8 rounded-full bg-metro-blue/15 flex items-center justify-center text-metro-blue text-xs font-bold">🚇</span>
                          <span className="text-[9px] font-bold text-slate-700">Metro</span>
                        </button>
                        <button onClick={() => { store.setCitizenScreen('trips'); }} className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-sm flex flex-col items-center gap-1">
                          <span className="w-8 h-8 rounded-full bg-transit-green/15 flex items-center justify-center text-transit-green text-xs font-bold">🚌</span>
                          <span className="text-[9px] font-bold text-slate-700">Bus</span>
                        </button>
                        <button onClick={() => { store.setCitizenScreen('wallet'); }} className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-sm flex flex-col items-center gap-1">
                          <span className="w-8 h-8 rounded-full bg-mobility-amber/15 flex items-center justify-center text-mobility-amber text-xs font-bold">🛺</span>
                          <span className="text-[9px] font-bold text-slate-700">Auto</span>
                        </button>
                        <button onClick={() => { store.setCitizenScreen('ai_assistant'); }} className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-sm flex flex-col items-center gap-1">
                          <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">🤖</span>
                          <span className="text-[9px] font-bold text-slate-700">AI Assistant</span>
                        </button>
                      </div>

                      {/* Live Nearby departures (JCTSL / JMRC) */}
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col gap-3">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Live Nearby Arrivals</span>
                        <div className="flex flex-col gap-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-metro-blue/15 text-metro-blue rounded text-[8px] font-extrabold">METRO</span>
                              <span className="font-bold text-slate-800">Mansarovar Metro</span>
                            </div>
                            <span className="font-bold text-slate-500 font-mono">In 3 min</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-transit-green/15 text-transit-green rounded text-[8px] font-extrabold">BUS 3</span>
                              <span className="font-bold text-slate-800">MNIT Bus Stop</span>
                            </div>
                            <span className="font-bold text-slate-500 font-mono">In 8 min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: JOURNEY PLANNER & ROUTE DETAILS */}
                  {store.citizenScreen === 'trips' && (
                    <div className="flex-grow flex flex-col gap-3">
                      <div className="mt-2.5">
                        <span className="text-[9px] text-slate-400 uppercase font-black">Search Optimal Routes</span>
                        <h2 className="text-lg font-black text-slate-900">Multimodal Planner</h2>
                      </div>

                      {/* Route Selection Panel */}
                      <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm flex flex-col gap-3">
                        
                        {/* Start stop picker bottom sheet trigger */}
                        <div 
                          onClick={() => setSearchMode('from')}
                          className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-transit-green" />
                            <span className="text-xs font-bold text-slate-700">
                              {selectedStartStop ? selectedStartStop.nameEn : 'Select starting station'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">Change</span>
                        </div>

                        {/* End stop picker bottom sheet trigger */}
                        <div 
                          onClick={() => setSearchMode('to')}
                          className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-jaipur-pink" />
                            <span className="text-xs font-bold text-slate-700">
                              {selectedEndStop ? selectedEndStop.nameEn : 'Select destination'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">Change</span>
                        </div>

                        {/* Search Button */}
                        <button 
                          onClick={handleSearchTrigger}
                          className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          Find Valid Connectivity
                        </button>
                      </div>

                      {/* ROUTE COMPARISON FRONTIER CARDS */}
                      {store.lastSearchExecuted && (
                        <div className="flex flex-col gap-2 mt-2">
                          <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">Validated Routes (OSM Graph)</span>
                          {store.calculatedRoutes.map((route) => (
                            <div 
                              key={route.id}
                              onClick={() => {
                                store.setSelectedRouteId(route.id);
                                store.setCitizenScreen('checkout');
                              }}
                              className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm cursor-pointer hover:border-slate-300 transition-all flex flex-col gap-2 relative overflow-hidden"
                            >
                              {/* Option Badge */}
                              <div className="absolute top-2.5 right-2.5">
                                {route.type === 'RECOMMENDED' && (
                                  <span className="bg-jaipur-pink/15 text-jaipur-pink border border-jaipur-pink/20 px-1.5 py-0.5 rounded text-[8px] font-black">
                                    ⭐ RECOMMENDED
                                  </span>
                                )}
                                {route.type === 'PT_ONLY' && (
                                  <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-black">
                                    🌱 GREENEST
                                  </span>
                                )}
                                {route.type === 'FAST_PRIVATE' && (
                                  <span className="bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-black">
                                    ⚡ RAPID
                                  </span>
                                )}
                              </div>

                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-black text-slate-900">{route.totalTime} min</span>
                                <span className="text-[9px] text-slate-400">MaaS Score</span>
                                <span className="text-xs font-mono font-bold text-jaipur-pink">{route.score}/100</span>
                              </div>

                              {/* Fare / Carbon info */}
                              <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-2 text-slate-600">
                                <span className="font-bold text-slate-800">₹{route.totalFare}</span>
                                <span className="text-[9px] text-slate-400 font-medium">({route.totalWalkingKm} km walk · {route.totalTransfers} transfer)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* BOTTOM SHEET SELECTOR OVERLAY */}
                      {searchMode && (
                        <div className="absolute inset-0 bg-slate-900/60 z-50 flex flex-col justify-end">
                          <div className="bg-white rounded-t-3xl max-h-[85%] overflow-y-auto p-4 flex flex-col gap-3.5 shadow-2xl font-sora">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-slate-900 uppercase">
                                {searchMode === 'from' ? 'Select Start Location' : 'Select Destination'}
                              </h4>
                              <button 
                                onClick={() => { setSearchMode(null); setSearchQuery(''); setIsSelectingOnMap(false); }}
                                className="text-xs text-slate-400 font-bold hover:text-slate-600 cursor-pointer"
                              >
                                Close
                              </button>
                            </div>

                            {/* Geolocation & Map Actions */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                              <button 
                                onClick={handleUseGPS}
                                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-200"
                              >
                                📍 Use GPS Location
                              </button>
                              <button 
                                onClick={() => setIsSelectingOnMap(!isSelectingOnMap)}
                                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border ${
                                  isSelectingOnMap 
                                    ? 'bg-jaipur-pink text-white border-jaipur-pink' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                              >
                                🗺️ {isSelectingOnMap ? 'Search Locations' : 'Select on Map'}
                              </button>
                            </div>

                            {isSelectingOnMap ? (
                              <div className="flex flex-col gap-3">
                                <div 
                                  id="google-map-selector" 
                                  className="w-full h-44 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden relative shadow-sm"
                                />
                                <button
                                  onClick={handleConfirmMapLocation}
                                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-md"
                                >
                                  Confirm Selected Pin Location
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Search input */}
                                <input 
                                  type="text"
                                  autoFocus
                                  placeholder="Search stop, station, or landmark..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full border border-slate-200 bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-jaipur-pink shadow-inner"
                                />

                                {/* Categorized Suggestion list */}
                                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
                                  {/* Landmarks */}
                                  {groupPOIs.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[9px] text-jaipur-pink font-extrabold uppercase tracking-wider block">Popular Landmarks (POIs)</span>
                                      {groupPOIs.map(loc => (
                                        <div 
                                          key={loc.id}
                                          onClick={() => {
                                            if (searchMode === 'from') setSelectedStartStop(loc as any);
                                            else setSelectedEndStop(loc as any);
                                            setSearchMode(null);
                                            setSearchQuery('');
                                          }}
                                          className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs text-slate-700"
                                        >
                                          <div>
                                            <span className="font-bold block text-slate-800">{loc.nameEn}</span>
                                            <span className="font-devanagari text-[9px] text-slate-400">{loc.nameHi}</span>
                                          </div>
                                          <span className="px-2 py-0.5 rounded text-[8px] font-black bg-jaipur-pink/15 text-jaipur-pink uppercase">
                                            ⚡ Landmark
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Metro */}
                                  {groupMetro.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[9px] text-metro-blue font-extrabold uppercase tracking-wider block">Metro Stations (JMRC)</span>
                                      {groupMetro.map(loc => (
                                        <div 
                                          key={loc.id}
                                          onClick={() => {
                                            if (searchMode === 'from') setSelectedStartStop(loc);
                                            else setSelectedEndStop(loc);
                                            setSearchMode(null);
                                            setSearchQuery('');
                                          }}
                                          className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs text-slate-700"
                                        >
                                          <div>
                                            <span className="font-bold block text-slate-800">{loc.nameEn}</span>
                                            <span className="font-devanagari text-[9px] text-slate-400">{loc.nameHi}</span>
                                          </div>
                                          <span className="px-2 py-0.5 rounded text-[8px] font-black bg-metro-blue/15 text-metro-blue uppercase">
                                            🚇 Metro
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Bus Stops */}
                                  {groupBus.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-[9px] text-transit-green font-extrabold uppercase tracking-wider block">JCTSL Bus Stops</span>
                                      {groupBus.map(loc => (
                                        <div 
                                          key={loc.id}
                                          onClick={() => {
                                            if (searchMode === 'from') setSelectedStartStop(loc);
                                            else setSelectedEndStop(loc);
                                            setSearchMode(null);
                                            setSearchQuery('');
                                          }}
                                          className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs text-slate-700"
                                        >
                                          <div>
                                            <span className="font-bold block text-slate-800">{loc.nameEn}</span>
                                            <span className="font-devanagari text-[9px] text-slate-400">{loc.nameHi}</span>
                                          </div>
                                          <span className="px-2 py-0.5 rounded text-[8px] font-black bg-transit-green/15 text-transit-green uppercase">
                                            🚌 Bus Stop
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
                  )}

                  {/* TAB 3: TICKETS */}
                  {store.citizenScreen === 'checkout' && (() => {
                    const selectedRoute = store.calculatedRoutes.find(r => r.id === store.selectedRouteId);
                    if (!selectedRoute) return null;

                    return (
                      <div className="flex-grow flex flex-col gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => store.setCitizenScreen('trips')}
                            className="text-slate-400 text-xs hover:text-slate-800 cursor-pointer"
                          >
                            ← Back
                          </button>
                          <h3 className="text-base font-black text-slate-900">Checkout Portal</h3>
                        </div>

                        {paymentState === 'idle' && (
                          <div className="flex flex-col gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 flex flex-col gap-2">
                              <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-2">
                                <span className="text-[10px] font-black uppercase text-slate-400">Total Fare</span>
                                <span className="text-xl font-black text-slate-900">₹{selectedRoute.totalFare}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span>Transit Path</span>
                                <span className="font-bold text-slate-800">Multi-Modal Intermodal</span>
                              </div>
                              {selectedRoute.savingPercent > 0 && (
                                <div className="flex justify-between text-[11px] text-transit-green">
                                  <span>Dynamic Saving</span>
                                  <span className="font-extrabold">Save {selectedRoute.savingPercent}%</span>
                                </div>
                              )}
                            </div>

                            {/* Wallet Option */}
                            <div className="border border-slate-200 p-3 rounded-xl flex justify-between items-center shadow-sm">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-bold">NCMC WALLET</span>
                                <h4 className="text-xs font-bold text-slate-800">Available: ₹{store.walletBalance}</h4>
                              </div>
                              <button 
                                onClick={() => handleWalletPay(selectedRoute.totalFare)}
                                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
                              >
                                Pay &amp; Ticket
                              </button>
                            </div>

                            {/* Simulated UPI */}
                            <button 
                              onClick={handleUPIPay}
                              className="w-full bg-slate-100 border border-slate-200 text-slate-800 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                            >
                              Pay with GPay / PhonePe
                            </button>
                          </div>
                        )}

                        {paymentState === 'processing' && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                            <RefreshCw className="w-8 h-8 text-jaipur-pink animate-spin" />
                            <h4 className="text-xs font-bold text-slate-600">Verifying secure wallet transaction...</h4>
                          </div>
                        )}

                        {paymentState === 'success' && (
                          <div className="flex-grow flex flex-col items-center justify-center gap-4 py-8">
                            <CheckCircle className="w-12 h-12 text-transit-green animate-bounce" />
                            <h4 className="text-sm font-black text-slate-800">Payment Successful!</h4>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TAB 3: TICKETS DASHBOARD */}
                  {store.citizenScreen === 'tracking' && (
                    <div className="flex-grow flex flex-col gap-3">
                      <div className="mt-2.5">
                        <span className="text-[9px] text-slate-400 uppercase font-black animate-pulse">Ticket CONFIRMED</span>
                        <h2 className="text-lg font-black text-slate-900">Your Unified Ticket</h2>
                      </div>

                      {/* TICKET MOCK CARD */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col items-center gap-3 relative overflow-hidden">
                        {/* Shimmer hologram effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-pulse pointer-events-none" />
                        
                        <div className="bg-white p-2.5 border border-slate-100 rounded-2xl shadow-sm">
                          {/* Simulated QR Code */}
                          <div className="w-28 h-28 border-4 border-slate-900 p-1 flex flex-wrap">
                            {Array.from({ length: 64 }).map((_, idx) => (
                              <div 
                                key={idx} 
                                className={`w-[11px] h-[11px] ${
                                  (idx + Math.floor(Date.now() / 15000)) % 3 === 0 ? 'bg-slate-900' : 'bg-transparent'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <span className="text-[10px] bg-slate-100 px-3 py-0.5 rounded text-slate-500 font-mono tracking-widest uppercase font-bold">
                          JUMP-JCT-8295
                        </span>

                        <div className="w-full border-t border-dashed border-slate-200 pt-3 text-xs text-slate-600 flex flex-col gap-1.5">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>{selectedStartStop?.nameEn || 'Mansarovar Metro'}</span>
                            <span>→</span>
                            <span>{selectedEndStop?.nameEn || 'Aravali Hostel, MNIT'}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Validity</span>
                            <span>Expires in 1h 45m</span>
                          </div>
                        </div>
                      </div>

                      {/* Map Live Progress */}
                      <div className="rounded-2xl border border-slate-200 overflow-hidden relative h-[220px] bg-white mt-1 shadow-sm">
                        <div id="google-map-tracking" className="w-full h-full" style={{ minHeight: '220px' }} />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: WALLET */}
                  {store.citizenScreen === 'wallet' && (
                    <div className="flex-grow flex flex-col gap-4">
                      <div className="mt-2.5">
                        <span className="text-[9px] text-slate-400 uppercase font-black">Open-Loop NCMC</span>
                        <h2 className="text-lg font-black text-slate-900">Google Wallet Standard</h2>
                      </div>

                      {/* Recharge quick card */}
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col gap-3">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Wallet Top-up</span>
                        <div className="flex gap-2">
                          {['100', '200', '500'].map(amt => (
                            <button 
                              key={amt}
                              onClick={() => setRechargeAmt(amt)}
                              className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                                rechargeAmt === amt ? 'bg-jaipur-pink/15 border-jaipur-pink text-jaipur-pink' : 'bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                            >
                              +₹{amt}
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={() => store.rechargeWallet(parseInt(rechargeAmt))}
                          className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                        >
                          Recharge via Unified UPI
                        </button>
                      </div>

                      {/* Reward Points */}
                      <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-jaipur-pink" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Travel Reward Points</h4>
                            <p className="text-[9px] text-slate-400">1,240 points available</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-jaipur-pink">Redeem</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: PROFILE */}
                  {store.citizenScreen === 'profile' && (
                    <div className="flex-grow flex flex-col gap-3">
                      <div className="mt-2.5">
                        <span className="text-[9px] text-slate-400 uppercase font-black">Configure App</span>
                        <h2 className="text-lg font-black text-slate-900">Your Settings</h2>
                      </div>

                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col gap-2 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500 font-medium">Full Name</span>
                          <span className="font-bold text-slate-800">{store.userProfile?.name}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 py-1">
                          <span className="text-slate-500 font-medium">Category Concession</span>
                          <span className="font-bold text-slate-800">{store.userProfile?.category}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 py-1">
                          <span className="text-slate-500 font-medium">Language Preference</span>
                          <span className="font-bold text-slate-800">{store.userProfile?.language === 'hi' ? 'Hindi' : 'English'}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => store.logOut()}
                        className="w-full bg-red-100 text-red-600 py-3 rounded-xl text-xs font-bold hover:bg-red-200 cursor-pointer mt-4"
                      >
                        Log Out / Change Account
                      </button>
                    </div>
                  )}

                  {/* AUXILIARY SCREENS LINKED BY NAVIGATION */}
                  {store.citizenScreen === 'ai_assistant' && (
                    <div className="flex-grow flex flex-col justify-between gap-3">
                      <div className="mt-2">
                        <span className="text-[9px] text-slate-400 uppercase font-black">AI Guide Bot</span>
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                          <span>JUMP Assistant</span>
                          <Sparkles className="w-3.5 h-3.5 text-jaipur-pink animate-spin-slow" />
                        </h2>
                      </div>

                      <div className="flex-grow bg-slate-50 rounded-2xl p-3 border border-slate-200 overflow-y-auto flex flex-col gap-2 max-h-[350px] min-h-[300px]">
                        {chatMessages.map((msg, idx) => (
                          <div 
                            key={idx}
                            className={`max-w-[85%] p-2.5 rounded-2xl text-[10px] leading-relaxed ${
                              msg.sender === 'user' 
                                ? 'bg-slate-900 text-white ml-auto rounded-tr-none shadow-sm' 
                                : 'bg-white border border-slate-200 text-slate-700 mr-auto rounded-tl-none shadow-sm'
                            }`}
                          >
                            <p>{msg.text}</p>
                            {msg.textHi && <p className="font-devanagari text-[9px] mt-1 opacity-70 border-t border-slate-100 pt-1">{msg.textHi}</p>}
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Ask routes in English or Hindi..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          className="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                        />
                        <button type="submit" className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">
                          Send
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Simulated Phone Navigation Bar */}
            {store.authStep === 'authenticated' && (
              <div className="h-[75px] bg-white border-t border-slate-200 grid grid-cols-5 items-center justify-center px-2 select-none z-40">
                <button 
                  onClick={() => store.setCitizenScreen('home')}
                  className={`flex flex-col items-center gap-1 ${store.citizenScreen === 'home' ? 'text-jaipur-pink' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Navigation className="w-5 h-5" />
                  <span className="text-[8px] font-bold">Home</span>
                </button>

                <button 
                  onClick={() => store.setCitizenScreen('trips')}
                  className={`flex flex-col items-center gap-1 ${store.citizenScreen === 'trips' ? 'text-jaipur-pink' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Search className="w-5 h-5" />
                  <span className="text-[8px] font-bold">Trips</span>
                </button>

                <button 
                  onClick={() => store.setCitizenScreen('tracking')}
                  className={`flex flex-col items-center gap-1 ${store.citizenScreen === 'tracking' ? 'text-jaipur-pink' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Layers className="w-5 h-5" />
                  <span className="text-[8px] font-bold">Tickets</span>
                </button>

                <button 
                  onClick={() => store.setCitizenScreen('wallet')}
                  className={`flex flex-col items-center gap-1 ${store.citizenScreen === 'wallet' ? 'text-jaipur-pink' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Wallet className="w-5 h-5" />
                  <span className="text-[8px] font-bold">Wallet</span>
                </button>

                <button 
                  onClick={() => store.setCitizenScreen('profile')}
                  className={`flex flex-col items-center gap-1 ${store.citizenScreen === 'profile' ? 'text-jaipur-pink' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <User className="w-5 h-5" />
                  <span className="text-[8px] font-bold">Profile</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* OPERATIONS SIDEBAR & AI CORRIDOR DASHBOARDS (RIGHT COLUMN) */}
        {showControlSidebar && (
          <section className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-md flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-800">UMTAJ Command Center</h3>
                  <p className="text-[10px] text-slate-400 font-light">Network telemetry and GNN hotspot predictors</p>
                </div>
                <span className="bg-transit-green/15 text-transit-green border border-transit-green/20 px-2 py-0.5 rounded text-[8px] font-bold">
                  TELEMETRY ONLINE
                </span>
              </div>

              {/* Operator Tabs */}
              <div className="flex flex-wrap gap-2">
                {(['JCTSL', 'JMRC', 'TRAFFIC', 'JDA', 'RTO'] as const).map(op => (
                  <button
                    key={op}
                    onClick={() => store.setControlCenterOperator(op)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      store.controlCenterOperator === op 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {op === 'JCTSL' && '🚌 JCTSL'}
                    {op === 'JMRC' && '🚇 JMRC'}
                    {op === 'TRAFFIC' && '🚦 Traffic'}
                    {op === 'JDA' && '🏙️ JDA'}
                    {op === 'RTO' && '📋 RTO'}
                  </button>
                ))}
              </div>

              {/* Control panels views */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[300px]">
                
                {store.controlCenterOperator === 'JCTSL' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-700">JCTSL Bus Operations Dashboard</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">Total Active Routes</span>
                        <div className="text-base font-bold text-slate-900">25 Routes</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">Registered stops</span>
                        <div className="text-base font-bold text-slate-900">331 Stops</div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                      <span className="text-[8px] text-slate-400 uppercase font-bold">Active Fleet Load Factor</span>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={JAIPUR_HISTORICAL_RIDERSHIP}>
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={8} />
                            <Bar dataKey="jctslRiders" fill="#0FA971" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {store.controlCenterOperator === 'JMRC' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-700">JMRC Metro Operations Dashboard</h4>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 flex flex-col gap-1.5">
                      <div className="flex justify-between">
                        <span>Phase 1 stations</span>
                        <span className="font-bold text-slate-800">11 Stations (Badi Chaupar terminus)</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-2">
                        <span>Phase 2 stations (DPR)</span>
                        <span className="font-bold text-slate-800">20 Stations (Prahladpura ↔ Todi Mod)</span>
                      </div>
                    </div>
                  </div>
                )}

                {store.controlCenterOperator === 'TRAFFIC' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-700">Jaipur Traffic Signals &amp; Alert Telemetry</h4>
                    <div className="flex flex-col gap-2 text-xs">
                      {JAIPUR_INCIDENTS.map((inc: any) => (
                        <div 
                          key={inc.id}
                          className={`p-2.5 rounded-xl border ${
                            inc.severity === 'HIGH' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          <span className="font-bold block">{inc.title}</span>
                          <span className="text-[10px] mt-0.5 block opacity-90">{inc.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {store.controlCenterOperator === 'JDA' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-700">JDA Transit-Oriented Development Nodes</h4>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 flex flex-col gap-1.5">
                      <div className="flex justify-between">
                        <span>MNIT Campus Hub</span>
                        <span className="text-transit-green font-bold">Cycle Docks Approved</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-2">
                        <span>Railway Station Interchange</span>
                        <span className="text-transit-green font-bold">100% Barrier-Free Access</span>
                      </div>
                    </div>
                  </div>
                )}

                {store.controlCenterOperator === 'RTO' && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-700">RTO Auto &amp; Rickshaw Permit Registries</h4>
                    <p className="text-xs text-slate-600">
                      RTO Rajasthan regulates IPT stands. Dynamic fare engine computes ₹25 base auto rates matching gazetted rates.
                    </p>
                  </div>
                )}

              </div>
            </div>
          </section>
        )}

      </div>

      {/* CODE EXPORT PANEL */}
      <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm mt-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-jaipur-pink" />
          <span>React Native Expo Component Exporter</span>
        </h3>
        
        <div className="flex gap-2.5 mt-3 border-b border-slate-100 pb-2.5 mb-3">
          {(['tokens', 'components', 'algorithms'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveExportTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeExportTab === tab ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'tokens' && '🎨 Theme Tokens'}
              {tab === 'components' && '📦 Expo Components'}
              {tab === 'algorithms' && '⚙️ Routing Score Algorithm'}
            </button>
          ))}
        </div>

        <div className="bg-slate-900 p-4 rounded-xl relative">
          <button
            onClick={() => {
              const code = activeExportTab === 'tokens' ? designTokensCode :
                           activeExportTab === 'components' ? expoComponentsCode : algorithmsCode;
              copyToClipboard(code, activeExportTab);
            }}
            className="absolute top-3 right-3 bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold border border-slate-700 cursor-pointer"
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
