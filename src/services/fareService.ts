
export interface FareCalculationResult {
  baseFare: number;
  discount: number;
  finalFare: number;
  savings: number;
  savingPercent: number;
}

export const fareService = {
  // JCTSL Bus Fare: Slab-based: ~₹5-25 depending on stops
  calculateBusFare(numStops: number): number {
    if (numStops <= 3) return 5;
    if (numStops <= 7) return 10;
    if (numStops <= 12) return 15;
    if (numStops <= 18) return 20;
    return 25;
  },

  // JMRC Metro Fare: ₹15-50 based on stations traversed
  calculateMetroFare(numStations: number): number {
    if (numStations === 0) return 0;
    if (numStations <= 2) return 15;
    if (numStations <= 5) return 25;
    if (numStations <= 8) return 35;
    if (numStations <= 11) return 40;
    return 50;
  },

  // Auto/Rickshaw Fare: RTO approved ₹25 base + ₹10/km
  calculateAutoFare(distanceKm: number): number {
    return Math.round(25 + distanceKm * 10);
  },

  // Calculate intermodal fare discount (20% off combined tickets)
  calculateIntermodalFare(
    hasMetro: boolean,
    hasBus: boolean,
    rawMetroFare: number,
    rawBusFare: number,
    rawAutoFare: number
  ): FareCalculationResult {
    const baseFare = rawMetroFare + rawBusFare + rawAutoFare;
    
    // Apply 20% intermodal discount if passenger switches between Metro and Bus
    const hasTransferDiscount = hasMetro && hasBus;
    const discountPercent = hasTransferDiscount ? 20 : 0;
    const discount = Math.round((rawMetroFare + rawBusFare) * (discountPercent / 100));
    
    return {
      baseFare,
      discount,
      finalFare: baseFare - discount,
      savings: discount,
      savingPercent: discountPercent
    };
  }
};
