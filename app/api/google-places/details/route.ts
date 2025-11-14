import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = searchParams.get('placeId');
  const sessionToken = searchParams.get('sessionToken');

  if (!placeId) {
    return NextResponse.json(
      { error: 'placeId parameter is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 500 }
    );
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('language', 'fr');
    url.searchParams.append('fields', 'place_id,formatted_address,geometry,name,address_components');
    
    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return NextResponse.json({
        place_id: data.result.place_id,
        formatted_address: data.result.formatted_address,
        geometry: {
          location: {
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng,
          },
        },
        name: data.result.name,
        address_components: data.result.address_components,
      });
    }

    return NextResponse.json(
      { error: 'Place not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching place details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    );
  }
}

