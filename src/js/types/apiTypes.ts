export type NominatimResponse = {
  address: {
    road?: string;
    pedestrian?: string;
    suburb?: string;
    neighbourhood?: string;
    hamlet?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  osm_id: string;
  osm_type: string;
  place_id: string;
  licence: string;
  lat: string;
  lon: string;
  boundingbox: string[];
  display_name: string;
};
