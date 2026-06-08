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
      setTick(prev => prev + 0.05);
    }, 100);
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
    getVehiclePosition(pinkLineStops, 6),
    getVehiclePosition(pinkLineStops, 12)
  ].filter(Boolean) as { lat: number; lng: number }[];

  // Simulate 2 Orange Line Metro trains (if Phase 2 is shown)
  const orangeTrains = showPhase2
    ? ([
        getVehiclePosition(orangeLineStops, 2),
        getVehiclePosition(orangeLineStops, 10),
        getVehiclePosition(orangeLineStops, 18)
      ].filter(Boolean) as { lat: number; lng: number }[])
    : [];

  // Simulate JCTSL Buses on Route 3
  const buses = [
    getVehiclePosition(busRoute3Stops, 1),
    getVehiclePosition(busRoute3Stops, 5),
    getVehiclePosition(busRoute3Stops, 9)
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
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={strokeColor}
            strokeWidth={5}
            strokeDasharray={isDashed ? '4,4' : undefined}
            strokeLinecap="round"
            className="animate-pulse"
          />
          {/* Direction arrows */}
          <circle cx={p1.x} cy={p1.y} r={4} fill="#FFFFFF" stroke={strokeColor} strokeWidth={2} />
          <circle cx={p2.x} cy={p2.y} r={5} fill={strokeColor} />
        </g>
      );
    });
  };

  // Animate Passenger dot along selected route
  const renderPassengerDot = () => {
    if (!selectedRoute || !selectedRoute.segments) return null;
    const totalSegs = selectedRoute.segments.length;
    const segmentIndex = Math.floor(tick * 0.5) % totalSegs;
    const fraction = (tick * 0.5) % 1;

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
        <circle cx={pt.x} cy={pt.y} r={10} fill="#3B82F6" opacity={0.3} className="animate-ping" />
        <circle cx={pt.x} cy={pt.y} r={6} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2} />
      </g>
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#F2EFE9] border border-slate-300 shadow-inner" style={{ height }}>
      {/* Map SVG */}
      <svg
        viewBox="0 0 500 600"
        className="w-full h-full select-none"
        style={{ backgroundImage: 'radial-gradient(#e6e2d8 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      >
        {/* Render Grid/Landmark features */}
        {/* Aravalli range / Hills representation */}
        <path d="M 420 50 C 440 100, 430 250, 480 320 L 500 350 L 500 0 Z" fill="#E3DDD3" opacity={0.6} />
        
        {/* Main road axis (Tonk Road representation - vertical axis roughly near 75.8) */}
        <line x1={getXY(26.75, 75.814).x} y1={0} x2={getXY(27.05, 75.814).x} y2={600} stroke="#EBE6DA" strokeWidth={12} strokeLinecap="round" />
        {/* Ajmer Road representation (diagonal) */}
        <line x1={0} y1={getXY(26.88, 75.68).y} x2={500} y2={getXY(26.93, 75.92).y} stroke="#EBE6DA" strokeWidth={8} strokeLinecap="round" />

        {/* METRO PINK LINE (Solid Heritage Pink) */}
        {pinkLineStops.length > 1 && (
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
        )}

        {/* METRO ORANGE LINE (Proposed Phase 2 - Blue line) */}
        {showPhase2 && orangeLineStops.length > 1 && (
          <path
            d={orangeLineStops.reduce((path, stop, idx) => {
              const pt = getXY(stop.lat, stop.lng);
              return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
            }, '')}
            fill="none"
            stroke="#185FA5"
            strokeWidth={4.5}
            strokeDasharray="6,4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}

        {/* BUS ROUTE 3 (Solid Green) */}
        {busRoute3Stops.length > 1 && (
          <path
            d={busRoute3Stops.reduce((path, stop, idx) => {
              const pt = getXY(stop.lat, stop.lng);
              return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
            }, '')}
            fill="none"
            stroke="#0FA971"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.4}
          />
        )}

        {/* Selected route segments under review */}
        {renderSelectedRouteSegments()}

        {/* Active Incidents / Traffic block warnings */}
        {JAIPUR_INCIDENTS.map((inc) => {
          // Find stop location
          const stop = allStops.find(s => s.id === inc.stopId);
          if (!stop) return null;
          const pt = getXY(stop.lat, stop.lng);
          return (
            <g key={inc.id} className="cursor-help">
              <circle cx={pt.x} cy={pt.y - 12} r={9} fill={inc.severity === 'HIGH' ? '#EF4444' : '#F59E0B'} />
              <text x={pt.x} y={pt.y - 9} fill="#FFFFFF" fontSize={9} fontWeight="bold" textAnchor="middle">!</text>
              <circle cx={pt.x} cy={pt.y - 12} r={14} fill="none" stroke={inc.severity === 'HIGH' ? '#EF4444' : '#F59E0B'} strokeWidth={1} opacity={0.6} className="animate-ping" />
            </g>
          );
        })}

        {/* Render Station Stops */}
        {allStops.map((stop) => {
          const pt = getXY(stop.lat, stop.lng);
          const isInterchange = stop.isInterchange;
          const isMetroPhase2 = stop.id.startsWith('M2_');

          // Skip rendering phase 2 if toggled off
          if (isMetroPhase2 && !showPhase2) return null;

          return (
            <g
              key={stop.id}
              className="cursor-pointer"
              onClick={() => onSelectStation && onSelectStation(stop)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isInterchange ? 6 : 4}
                fill={isInterchange ? '#FFFFFF' : (stop.type === 'METRO' ? (isMetroPhase2 ? '#185FA5' : '#D65A6F') : '#0FA971')}
                stroke={isInterchange ? '#334155' : '#FFFFFF'}
                strokeWidth={isInterchange ? 2.5 : 1}
              />
              {/* Station Label on zoom / hover representation (simplified text labels for main hubs) */}
              {(isInterchange || stop.id === 'M_MANSAROVAR' || stop.id === 'M2_MNIT' || stop.id === 'M_BADI_CHAUPAR' || stop.id === 'M_SINDHI_CAMP') && (
                <text
                  x={pt.x}
                  y={pt.y - 8}
                  fill="#1E293B"
                  fontSize={8}
                  fontWeight="bold"
                  textAnchor="middle"
                  className="bg-white/80 px-1 rounded"
                >
                  {stop.nameEn.replace(' Metro', '').replace(' Campus', '')}
                </text>
              )}
            </g>
          );
        })}

        {/* Render POIs (Landmarks) */}
        {pois.map((poi) => {
          const pt = getXY(poi.lat, poi.lng);
          return (
            <g key={poi.id}>
              <rect x={pt.x - 3} y={pt.y - 3} width={6} height={6} fill="#F59E0B" rx={1} />
              <text x={pt.x} y={pt.y - 6} fill="#B45309" fontSize={7} fontWeight="medium" textAnchor="middle">
                📍 {poi.nameEn.split(' ')[0]}
              </text>
            </g>
          );
        })}

        {/* Live Metro trains animations */}
        {metroTrains.map((train, idx) => {
          const pt = getXY(train.lat, train.lng);
          return (
            <g key={`pink-train-${idx}`}>
              <circle cx={pt.x} cy={pt.y} r={7} fill="#D65A6F" stroke="#FFFFFF" strokeWidth={1.5} />
              <text x={pt.x} y={pt.y + 2.5} fill="#FFFFFF" fontSize={8} fontWeight="black" textAnchor="middle">M</text>
            </g>
          );
        })}

        {/* Live Orange line trains animations */}
        {orangeTrains.map((train, idx) => {
          const pt = getXY(train.lat, train.lng);
          return (
            <g key={`orange-train-${idx}`}>
              <circle cx={pt.x} cy={pt.y} r={7} fill="#185FA5" stroke="#FFFFFF" strokeWidth={1.5} />
              <text x={pt.x} y={pt.y + 2.5} fill="#FFFFFF" fontSize={8} fontWeight="black" textAnchor="middle">M</text>
            </g>
          );
        })}

        {/* Live JCTSL bus animations */}
        {buses.map((bus, idx) => {
          const pt = getXY(bus.lat, bus.lng);
          return (
            <g key={`bus-${idx}`}>
              <circle cx={pt.x} cy={pt.y} r={6.5} fill="#0FA971" stroke="#FFFFFF" strokeWidth={1.5} />
              <text x={pt.x} y={pt.y + 2} fill="#FFFFFF" fontSize={7} fontWeight="black" textAnchor="middle">🚌</text>
            </g>
          );
        })}

        {/* Animated Passenger Dot */}
        {renderPassengerDot()}

        {/* User GPS Location Marker */}
        {userLocation && (() => {
          const pt = getXY(userLocation.lat, userLocation.lng);
          return (
            <g>
              <circle cx={pt.x} cy={pt.y} r={12} fill="#3B82F6" opacity={0.25} className="animate-ping" />
              <circle cx={pt.x} cy={pt.y} r={7} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2} />
              <text x={pt.x} y={pt.y - 12} fill="#2563EB" fontSize={8} fontWeight="extrabold" textAnchor="middle">You</text>
            </g>
          );
        })()}
      </svg>

      {/* Floating Map Controls overlay */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 bg-white/95 px-2.5 py-2 rounded-xl shadow border border-slate-200 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D65A6F]" />
          <span>Pink Line (Active)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#185FA5] border-dashed border border-slate-400" />
          <span>Orange Line (Phase 2)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0FA971]" />
          <span>JCTSL Bus Route 3</span>
        </div>
      </div>
    </div>
  );
};
