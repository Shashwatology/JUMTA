import React, { useState, useEffect } from 'react';
import { JAIPUR_STOPS, JAIPUR_INCIDENTS, type TransitStop } from '../data';
import { transitDataService } from '../services/transitDataService';

interface MapProps {
  selectedRoute?: any;
  showPhase2?: boolean;
  userLocation?: { lat: number; lng: number; nameEn: string } | null;
  onSelectStation?: (stop: any) => void;
  height?: number;
}

// Map boundary coordinates for Jaipur region
const MAP_BOUNDS = {
  minLat: 26.75,
  maxLat: 27.05,
  minLng: 75.68,
  maxLng: 75.92
};

export const InteractiveMaaSMap: React.FC<MapProps> = ({
  selectedRoute,
  showPhase2 = true,
  userLocation,
  onSelectStation,
  height = 300
}) => {
  const [tick, setTick] = useState(0);

  // Animation loop for vehicles
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 0.04);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Helper to project GPS coordinates to SVG viewBox (0,0 to 500,600)
  const getXY = (lat: number, lng: number) => {
    if (isNaN(lat) || isNaN(lng)) {
      return { x: 0, y: 0 };
    }
    const width = 500;
    const heightVal = 600;
    const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
    // Flip Y since SVG 0,0 is top-left
    const y = heightVal - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * heightVal;
    return { x: Math.round(x), y: Math.round(y) };
  };

  // Get active stops
  const allStops = showPhase2 ? JAIPUR_STOPS : JAIPUR_STOPS.filter(s => !s.id.startsWith('M2_'));
  const pois = transitDataService.getPOIs();

  // Metro Pink Line Stops
  const pinkLineStops = allStops.filter(s => s.routes.includes('METRO_PINK'));
  // Metro Orange Line (Phase 2)
  const orangeLineStops = allStops.filter(s => s.routes.includes('METRO_ORANGE'));
  // Bus Route 3 Stops
  const busRoute3Stops = allStops.filter(s => s.routes.includes('R_3'));

  // Get position of vehicle moving along a line of stops
  const getVehiclePosition = (stops: TransitStop[], offsetProgress: number) => {
    if (stops.length < 2) return null;
    const totalStops = stops.length;
    const cycleLength = 2 * (totalStops - 1);
    const progress = (tick + offsetProgress) % cycleLength;

    if (progress < totalStops - 1) {
      // Forward
      const index = Math.min(totalStops - 2, Math.floor(progress));
      const fraction = progress - index;
      const start = stops[index];
      const end = stops[index + 1];
      return {
        lat: start.lat + (end.lat - start.lat) * fraction,
        lng: start.lng + (end.lng - start.lng) * fraction
      };
    } else {
      // Backward
      const index = Math.min(totalStops - 2, Math.floor(cycleLength - progress));
      const fraction = (cycleLength - progress) - index;
      const start = stops[index + 1];
      const end = stops[index];
      return {
        lat: start.lat + (end.lat - start.lat) * (1 - fraction),
        lng: start.lng + (end.lng - start.lng) * (1 - fraction)
      };
    }
  };

  // Simulate 3 Pink Line Metro trains
  const metroTrains = [
    getVehiclePosition(pinkLineStops, 0),
    getVehiclePosition(pinkLineStops, 5.5),
    getVehiclePosition(pinkLineStops, 11)
  ].filter(Boolean) as { lat: number; lng: number }[];

  // Simulate 2 Orange Line Metro trains (if Phase 2 is shown)
  const orangeTrains = showPhase2
    ? ([
        getVehiclePosition(orangeLineStops, 3),
        getVehiclePosition(orangeLineStops, 9.5),
        getVehiclePosition(orangeLineStops, 16)
      ].filter(Boolean) as { lat: number; lng: number }[])
    : [];

  // Simulate JCTSL Buses on Route 3
  const buses = [
    getVehiclePosition(busRoute3Stops, 1.5),
    getVehiclePosition(busRoute3Stops, 6),
    getVehiclePosition(busRoute3Stops, 10.5)
  ].filter(Boolean) as { lat: number; lng: number }[];

  // Draw Selected Route Path Segments
  const renderSelectedRouteSegments = () => {
    if (!selectedRoute || !selectedRoute.segments) return null;

    return selectedRoute.segments.map((seg: any, idx: number) => {
      // Find stops matching names
      const startStop = allStops.find(s => s.nameEn === seg.fromStopName || s.id === seg.fromStopName) || 
                        pois.find(p => p.nameEn === seg.fromStopName);
      const endStop = allStops.find(s => s.nameEn === seg.toStopName || s.id === seg.toStopName) || 
                      pois.find(p => p.nameEn === seg.toStopName);

      if (!startStop || !endStop) return null;

      const p1 = getXY(startStop.lat, startStop.lng);
      const p2 = getXY(endStop.lat, endStop.lng);

      let strokeColor = '#94A3B8'; // default grey for walk
      let isDashed = false;

      if (seg.mode === 'METRO') strokeColor = '#D65A6F'; // Pink
      else if (seg.mode === 'BUS') strokeColor = '#0FA971'; // Green
      else if (seg.mode === 'AUTO') strokeColor = '#F2A900'; // Amber
      else if (seg.mode === 'CYCLE') strokeColor = '#10B981'; // Teal
      else if (seg.mode === 'WALK') {
        strokeColor = '#64748B';
        isDashed = true;
      }

      return (
        <g key={`seg-${idx}`}>
          {/* Animated glow under path */}
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={strokeColor}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.25}
          />
          {/* Core path */}
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={strokeColor}
            strokeWidth={4}
            strokeDasharray={isDashed ? '5,5' : undefined}
            strokeLinecap="round"
          />
          {/* Dash overlay flowing animation */}
          {!isDashed && (
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeDasharray="8,16"
              strokeDashoffset={-tick * 20}
              strokeLinecap="round"
              opacity={0.8}
            />
          )}
          {/* Direction Node Endpoints */}
          <circle cx={p1.x} cy={p1.y} r={4.5} fill="#FFFFFF" stroke={strokeColor} strokeWidth={2} />
          <circle cx={p2.x} cy={p2.y} r={5} fill={strokeColor} stroke="#FFFFFF" strokeWidth={1} />
        </g>
      );
    });
  };

  // Animate Passenger dot along selected route
  const renderPassengerDot = () => {
    if (!selectedRoute || !selectedRoute.segments) return null;
    const totalSegs = selectedRoute.segments.length;
    const segmentIndex = Math.floor(tick * 0.4) % totalSegs;
    const fraction = (tick * 0.4) % 1;

    const seg = selectedRoute.segments[segmentIndex];
    const startStop = allStops.find(s => s.nameEn === seg.fromStopName || s.id === seg.fromStopName) || 
                      pois.find(p => p.nameEn === seg.fromStopName);
    const endStop = allStops.find(s => s.nameEn === seg.toStopName || s.id === seg.toStopName) || 
                    pois.find(p => p.nameEn === seg.toStopName);

    if (!startStop || !endStop) return null;

    const lat = startStop.lat + (endStop.lat - startStop.lat) * fraction;
    const lng = startStop.lng + (endStop.lng - startStop.lng) * fraction;
    const pt = getXY(lat, lng);

    return (
      <g>
        <circle cx={pt.x} cy={pt.y} r={12} fill="#3B82F6" opacity={0.3} className="animate-ping" />
        <circle cx={pt.x} cy={pt.y} r={6.5} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2.5} />
      </g>
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#F5F3EC] border border-[#E4E0D2] shadow-inner" style={{ height }}>
      {/* Map SVG */}
      <svg
        viewBox="0 0 500 600"
        className="w-full h-full select-none"
        style={{ backgroundImage: 'radial-gradient(#E8E5DA 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      >
        {/* Landuse Areas (Parks, Hills) */}
        {/* Aravali hills outline */}
        <path d="M 400 0 C 420 80, 440 160, 470 240 C 490 280, 500 320, 500 350 L 500 0 Z" fill="#EAE7DB" />
        
        {/* Central Park Jaipur area */}
        <path d="M 280 280 Q 310 270, 320 300 T 290 320 Z" fill="#E2ECE0" opacity={0.7} stroke="#D3E0CE" strokeWidth={1} />
        {/* Ram Niwas Garden area */}
        <path d="M 320 180 H 350 V 210 H 320 Z" fill="#E2ECE0" opacity={0.7} stroke="#D3E0CE" strokeWidth={1} />

        {/* Major Road Networks (Tonk Road, Ajmer Road, etc) */}
        {/* Tonk Road */}
        <line x1={getXY(26.75, 75.814).x} y1={600} x2={getXY(27.05, 75.814).x} y2={0} stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" />
        <line x1={getXY(26.75, 75.814).x} y1={600} x2={getXY(27.05, 75.814).x} y2={0} stroke="#E2DEC9" strokeWidth={11} strokeLinecap="round" opacity={0.6} />

        {/* Ajmer Road */}
        <line x1={0} y1={getXY(26.88, 75.68).y} x2={500} y2={getXY(26.93, 75.92).y} stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" />
        <line x1={0} y1={getXY(26.88, 75.68).y} x2={500} y2={getXY(26.93, 75.92).y} stroke="#E2DEC9" strokeWidth={9} strokeLinecap="round" opacity={0.6} />

        {/* JLN Marg */}
        <line x1={getXY(26.75, 75.83).x} y1={600} x2={getXY(27.05, 75.805).x} y2={0} stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
        <line x1={getXY(26.75, 75.83).x} y1={600} x2={getXY(27.05, 75.805).x} y2={0} stroke="#E2DEC9" strokeWidth={8} strokeLinecap="round" opacity={0.6} />

        {/* METRO PINK LINE (High Quality Rail Track styling) */}
        {pinkLineStops.length > 1 && (
          <g>
            <path
              d={pinkLineStops.reduce((path, stop, idx) => {
                const pt = getXY(stop.lat, stop.lng);
                return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
              }, '')}
              fill="none"
              stroke="#D65A6F"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
            {/* Railroad sleepers overlay */}
            <path
              d={pinkLineStops.reduce((path, stop, idx) => {
                const pt = getXY(stop.lat, stop.lng);
                return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
              }, '')}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeDasharray="2,6"
              strokeLinecap="square"
              opacity={0.7}
            />
          </g>
        )}

        {/* METRO ORANGE LINE (Proposed Phase 2 - Blue dashed track) */}
        {showPhase2 && orangeLineStops.length > 1 && (
          <g>
            <path
              d={orangeLineStops.reduce((path, stop, idx) => {
                const pt = getXY(stop.lat, stop.lng);
                return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
              }, '')}
              fill="none"
              stroke="#185FA5"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
            <path
              d={orangeLineStops.reduce((path, stop, idx) => {
                const pt = getXY(stop.lat, stop.lng);
                return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
              }, '')}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeDasharray="3,5"
              strokeLinecap="round"
              opacity={0.6}
            />
          </g>
        )}

        {/* BUS ROUTE 3 (Subtle green trace) */}
        {busRoute3Stops.length > 1 && (
          <path
            d={busRoute3Stops.reduce((path, stop, idx) => {
              const pt = getXY(stop.lat, stop.lng);
              return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
            }, '')}
            fill="none"
            stroke="#0FA971"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.35}
          />
        )}

        {/* Render Selected Route path */}
        {renderSelectedRouteSegments()}

        {/* Live Traffic Alerts / Construction Incidents */}
        {JAIPUR_INCIDENTS.map((inc) => {
          const stop = allStops.find(s => s.id === inc.stopId);
          if (!stop) return null;
          const pt = getXY(stop.lat, stop.lng);
          return (
            <g key={inc.id} className="cursor-help">
              <circle cx={pt.x} cy={pt.y - 12} r={8.5} fill={inc.severity === 'HIGH' ? '#EF4444' : '#F59E0B'} stroke="#FFFFFF" strokeWidth={1} />
              <text x={pt.x} y={pt.y - 9} fill="#FFFFFF" fontSize={8.5} fontWeight="extrabold" textAnchor="middle">!</text>
              <circle cx={pt.x} cy={pt.y - 12} r={14} fill="none" stroke={inc.severity === 'HIGH' ? '#EF4444' : '#F59E0B'} strokeWidth={1} opacity={0.4} className="animate-ping" />
            </g>
          );
        })}

        {/* Render Station nodes */}
        {allStops.map((stop) => {
          const pt = getXY(stop.lat, stop.lng);
          const isInterchange = stop.isInterchange;
          const isMetroPhase2 = stop.id.startsWith('M2_');

          if (isMetroPhase2 && !showPhase2) return null;

          return (
            <g
              key={stop.id}
              className="cursor-pointer"
              onClick={() => onSelectStation && onSelectStation(stop)}
            >
              {isInterchange ? (
                // Multi-modal interchange node design
                <g>
                  <circle cx={pt.x} cy={pt.y} r={7.5} fill="#FFFFFF" stroke="#111827" strokeWidth={2.5} />
                  <circle cx={pt.x} cy={pt.y} r={3} fill="#D65A6F" />
                </g>
              ) : (
                // Regular station point design
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={4.5}
                  fill={stop.type === 'METRO' ? (isMetroPhase2 ? '#185FA5' : '#D65A6F') : '#0FA971'}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )}
              {/* Text label for major stations */}
              {(isInterchange || stop.id === 'M_MANSAROVAR' || stop.id === 'M2_MNIT' || stop.id === 'M_BADI_CHAUPAR' || stop.id === 'M_SINDHI_CAMP') && (
                <g>
                  {/* Subtle white text background for readability */}
                  <rect
                    x={pt.x - 30}
                    y={pt.y - 18}
                    width={60}
                    height={10}
                    rx={2}
                    fill="#FFFFFF"
                    opacity={0.8}
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    fill="#111827"
                    fontSize={7.5}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {stop.nameEn.replace(' Metro', '').replace(' Campus', '')}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Render POIs (Heritage monuments/Hubs) */}
        {pois.map((poi) => {
          const pt = getXY(poi.lat, poi.lng);
          return (
            <g key={poi.id}>
              <circle cx={pt.x} cy={pt.y} r={3} fill="#F2A900" stroke="#FFFFFF" strokeWidth={1} />
              <text x={pt.x} y={pt.y - 6} fill="#B45309" fontSize={7} fontWeight="bold" textAnchor="middle">
                🏛️ {poi.nameEn.split(' ')[0]}
              </text>
            </g>
          );
        })}

        {/* Live Metro Train Pins */}
        {metroTrains.map((train, idx) => {
          const pt = getXY(train.lat, train.lng);
          return (
            <g key={`pink-train-${idx}`} className="transition-all duration-300">
              <circle cx={pt.x} cy={pt.y} r={8.5} fill="#D65A6F" stroke="#FFFFFF" strokeWidth={1.5} className="shadow-sm" />
              <text x={pt.x} y={pt.y + 2.5} fill="#FFFFFF" fontSize={7.5} fontWeight="black" textAnchor="middle">🚇</text>
            </g>
          );
        })}

        {/* Live Proposed Orange Metro Train Pins */}
        {orangeTrains.map((train, idx) => {
          const pt = getXY(train.lat, train.lng);
          return (
            <g key={`orange-train-${idx}`} className="transition-all duration-300">
              <circle cx={pt.x} cy={pt.y} r={8.5} fill="#185FA5" stroke="#FFFFFF" strokeWidth={1.5} className="shadow-sm" />
              <text x={pt.x} y={pt.y + 2.5} fill="#FFFFFF" fontSize={7.5} fontWeight="black" textAnchor="middle">🚇</text>
            </g>
          );
        })}

        {/* Live JCTSL Buses */}
        {buses.map((bus, idx) => {
          const pt = getXY(bus.lat, bus.lng);
          return (
            <g key={`bus-${idx}`} className="transition-all duration-300">
              <circle cx={pt.x} cy={pt.y} r={8.5} fill="#0FA971" stroke="#FFFFFF" strokeWidth={1.5} className="shadow-sm" />
              <text x={pt.x} y={pt.y + 2.5} fill="#FFFFFF" fontSize={7.5} fontWeight="black" textAnchor="middle">🚌</text>
            </g>
          );
        })}

        {/* Render Passenger Dot */}
        {renderPassengerDot()}

        {/* User GPS Location Point */}
        {userLocation && (() => {
          const pt = getXY(userLocation.lat, userLocation.lng);
          return (
            <g>
              <circle cx={pt.x} cy={pt.y} r={12} fill="#3B82F6" opacity={0.25} className="animate-ping" />
              <circle cx={pt.x} cy={pt.y} r={6.5} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2} />
              <text x={pt.x} y={pt.y - 12} fill="#2563EB" fontSize={8} fontWeight="black" textAnchor="middle">You</text>
            </g>
          );
        })()}
      </svg>

      {/* Floating Map Controls overlays */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 bg-white/95 px-2.5 py-2 rounded-xl shadow-sm border border-[#EAE6DC] backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D65A6F]" />
          <span>Pink Line Metro</span>
        </div>
        <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#185FA5]" />
          <span>Orange Line Metro</span>
        </div>
        <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0FA971]" />
          <span>JCTSL Bus Route 3</span>
        </div>
      </div>
    </div>
  );
};
