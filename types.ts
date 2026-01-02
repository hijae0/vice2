
export enum OperatorType {
  JR_EAST = 'JR East',
  TOKYO_METRO = 'Tokyo Metro',
  SOTETSU = 'Sotetsu',
  CUSTOM = 'Custom'
}

export interface AnnouncementConfig {
  stationNameJp: string;
  stationNameEn: string;
  stationNumber: string; // e.g., JY01
  doorDirection: 'left' | 'right';
  transfers: string[];
  operator: OperatorType;
  customScriptJp?: string;
  customScriptEn?: string;
}

export interface GeneratedAudio {
  blob: Blob;
  url: string;
  script: string;
}
