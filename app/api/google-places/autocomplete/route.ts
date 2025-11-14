import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const input = searchParams.get('input');
  const sessionToken = searchParams.get('sessionToken');

  if (!input) {
    return NextResponse.json(
      { error: 'Input parameter is required' },
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
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.append('input', input);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('language', 'fr');
    url.searchParams.append('components', 'country:fr'); // Restrict to France, adjust as needed
    
    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Google Places API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.status === 'OK' && data.predictions) {
      return NextResponse.json({
        predictions: data.predictions.map((pred: any) => ({
          place_id: pred.place_id,
          description: pred.description,
          structured_formatting: pred.structured_formatting,
        })),
      });
    }

    // Handle other statuses from Google API
    if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ predictions: [] });
    }

    console.error('Google Places API status:', data.status, data.error_message);
    return NextResponse.json(
      { error: data.error_message || `Google API status: ${data.status}` },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error fetching place predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place predictions' },
      { status: 500 }
    );
  }
}

