// Google Places API utilities for address autocomplete and geocoding

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface ParsedAddress {
  address: string;
  coordinates: { lat: number; lng: number };
  city?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
}

// Extract address components from Google Places API response
export function parseAddressComponents(details: PlaceDetails): ParsedAddress {
  const result: ParsedAddress = {
    address: details.formatted_address,
    coordinates: {
      lat: details.geometry.location.lat,
      lng: details.geometry.location.lng,
    },
  };

  if (!details.address_components) {
    return result;
  }

  for (const component of details.address_components) {
    // Extract city (locality)
    if (component.types.includes('locality') && !result.city) {
      result.city = component.long_name;
    }

    // Extract postal code
    if (component.types.includes('postal_code') && !result.postal_code) {
      result.postal_code = component.long_name;
    }

    // Extract country
    if (component.types.includes('country')) {
      result.country = component.long_name;
      result.country_code = component.short_name;
    }
  }

  return result;
}

// Autocomplete address predictions
// Uses Next.js API route to proxy requests (keeps API key secure)
export async function getPlacePredictions(
  input: string,
  sessionToken?: string
): Promise<PlacePrediction[]> {
  if (!input) return [];

  try {
    const url = new URL('/api/google-places/autocomplete', window.location.origin);
    url.searchParams.append('input', input);
    if (sessionToken) {
      url.searchParams.append('sessionToken', sessionToken);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('API error:', response.status, response.statusText);
      return [];
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('API returned non-JSON response');
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error('Error from API:', data.error);
      return [];
    }

    return data.predictions || [];
  } catch (error) {
    console.error('Error fetching place predictions:', error);
    return [];
  }
};

// Get place details including coordinates
// Uses Next.js API route to proxy requests (keeps API key secure)
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<PlaceDetails | null> {
  if (!placeId) return null;

  try {
    const url = new URL('/api/google-places/details', window.location.origin);
    url.searchParams.append('placeId', placeId);
    if (sessionToken) {
      url.searchParams.append('sessionToken', sessionToken);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('API error:', response.status, response.statusText);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('API returned non-JSON response');
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error('Error from API:', data.error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
};

// Geocode an address string to get coordinates
// Uses Next.js API route to proxy requests (keeps API key secure)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null;

  try {
    const url = new URL('/api/google-places/geocode', window.location.origin);
    url.searchParams.append('address', address);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('API error:', response.status, response.statusText);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('API returned non-JSON response');
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error('Error from API:', data.error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

