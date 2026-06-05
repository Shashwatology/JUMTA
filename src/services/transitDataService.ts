import metroPhase1 from '../data/metro_phase1.json';
import metroPhase2 from '../data/metro_phase2.json';
import jctslStops from '../data/jctsl_stops.json';
import jctslRoutes from '../data/jctsl_routes.json';
import interchangeNodes from '../data/interchange_nodes.json';
import poiLocations from '../data/poi_locations.json';

export interface StationData {
  id: string;
  nameEn: string;
  nameHi: string;
  lat: number;
  lng: number;
  sequence?: number;
  type?: 'METRO' | 'BUS' | 'BRTS' | 'AUTO';
}

export interface RouteData {
  route_id: string;
  route_name: string;
  route_type: 'METRO' | 'BUS';
  color: string;
  stops: string[];
}

export interface InterchangeData {
  id: string;
  name: string;
  fromStopId: string;
  toStopId: string;
  distanceMeters: number;
  walkTimeMins: number;
  accessible: boolean;
}

export interface POIData {
  id: string;
  nameEn: string;
  nameHi: string;
  lat: number;
  lng: number;
  nearestBusStopId: string;
  nearestMetroStationId: string;
}

export const transitDataService = {
  getMetroPhase1(): StationData[] {
    return metroPhase1.map(s => ({ ...s, type: 'METRO' as const }));
  },

  getMetroPhase2(): StationData[] {
    return metroPhase2.map(s => ({ ...s, type: 'METRO' as const }));
  },

  getJCTSLStops(): StationData[] {
    return jctslStops.map(s => ({ ...s, type: 'BUS' as const }));
  },

  getJCTSLRoutes(): RouteData[] {
    return jctslRoutes as RouteData[];
  },

  getInterchanges(): InterchangeData[] {
    return interchangeNodes as InterchangeData[];
  },

  getPOIs(): POIData[] {
    return poiLocations as POIData[];
  },

  getAllStops(includePhase2: boolean): StationData[] {
    const p1 = this.getMetroPhase1();
    const buses = this.getJCTSLStops();
    const p2 = includePhase2 ? this.getMetroPhase2() : [];
    return [...p1, ...buses, ...p2];
  },

  getStopById(id: string, includePhase2 = true): StationData | undefined {
    return this.getAllStops(includePhase2).find(s => s.id === id);
  }
};
