export type Platform = 'android' | 'ios'
export type SimType = 'gpx' | 'manual' | 'batch' | 'map'

export interface TrackPoint {
  $: {
    lat: string;
    lon: string;
  };
}

export type IOSDevice = {
  state: string;
  udid: string;
};

export type IOSDevicesList = {
  devices: {
    [runtime: string]: IOSDevice[];
  };
};