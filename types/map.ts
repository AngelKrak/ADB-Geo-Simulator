export interface GeocodeEvent {
	geocode: {
		name: string;
		center: {
			lat: number;
			lng: number;
		};
		bbox?: L.LatLngBounds;
		properties?: Record<string, any>;
	};
}
