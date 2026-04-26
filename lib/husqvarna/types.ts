export interface HusqvarnaMower {
  type: "mower";
  id: string;
  attributes: {
    system: {
      name: string;
      model: string;
      serialNumber: string;
    };
    battery: { batteryPercent: number };
    capabilities: { headlights: boolean; workAreas: boolean; stayOutZones: boolean };
    mower: {
      mode: string;
      activity: string;
      inactiveReason: string;
      state: string;
      errorCode: number;
      errorCodeTimestamp: number;
      isErrorConfirmable: boolean;
    };
    calendar: { tasks: unknown[] };
    positions: Array<{ latitude: number; longitude: number }>;
    planner: {
      nextStartTimestamp: number;
      override: { action: string };
      restrictedReason: string;
    };
    metadata: { connected: boolean; statusTimestamp: number };
    statistics: {
      cuttingBladeUsageTime: number;
      downTime: number;
      numberOfChargingCycles: number;
      numberOfCollisions: number;
      totalChargingTime: number;
      totalCuttingTime: number;
      totalDrivenDistance: number;
      totalRunningTime: number;
      totalSearchingTime: number;
    };
  };
}

export interface HusqvarnaApiResponse {
  data: HusqvarnaMower | HusqvarnaMower[];
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}
