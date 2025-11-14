'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { getPlacePredictions, getPlaceDetails, parseAddressComponents, type PlacePrediction } from '@/lib/google-places';
import { v4 as uuidv4 } from 'uuid';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }, parsedAddress?: { city?: string; postal_code?: string; country?: string; country_code?: string }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  forceApiSelection?: boolean; // Force selection from API only
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Rechercher une adresse...",
  required = false,
  className = "",
  forceApiSelection = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>(uuidv4());
  const [hasValidSelection, setHasValidSelection] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate new session token when user starts typing
  useEffect(() => {
    if (value) {
      setSessionToken(uuidv4());
    }
  }, [value]);

  // Fetch predictions when input changes
  useEffect(() => {
    const fetchPredictions = async () => {
      if (value.length < 3) {
        setPredictions([]);
        setShowPredictions(false);
        return;
      }

      setLoading(true);
      const results = await getPlacePredictions(value, sessionToken);
      setPredictions(results);
      setShowPredictions(results.length > 0);
      setLoading(false);
    };

    const debounceTimer = setTimeout(fetchPredictions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value, sessionToken]);

  // Close predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (prediction: PlacePrediction) => {
    setShowPredictions(false);
    setLoading(true);

    // Get full place details including coordinates
    const details = await getPlaceDetails(prediction.place_id, sessionToken);
    
    if (details) {
      // Parse address components to extract city, postal_code, country
      const parsed = parseAddressComponents(details);
      
      onChange(
        details.formatted_address,
        {
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
        },
        {
          city: parsed.city,
          postal_code: parsed.postal_code,
          country: parsed.country,
          country_code: parsed.country_code,
        }
      );
      setHasValidSelection(true);
    } else {
      // Fallback to description if details fetch fails
      onChange(prediction.description);
      setHasValidSelection(false);
    }

    setLoading(false);
    // Generate new session token after selection
    setSessionToken(uuidv4());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (forceApiSelection) {
      // If forcing API selection, clear selection when user types
      if (hasValidSelection && newValue !== value) {
        setHasValidSelection(false);
        onChange('', undefined);
      }
    }
    
    onChange(newValue);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        className={`w-full ${forceApiSelection && !hasValidSelection && value ? 'border-red-500' : ''}`}
        autoComplete="off"
      />
      {forceApiSelection && !hasValidSelection && value && (
        <p className="text-xs text-red-500 mt-1">
          Veuillez sélectionner une adresse depuis les suggestions
        </p>
      )}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
        </div>
      )}
      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
          <ul className="max-h-60 overflow-auto">
            {predictions.map((prediction) => (
              <li
                key={prediction.place_id}
                onClick={() => handleSelect(prediction)}
                className="cursor-pointer px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                <div className="font-medium text-sm">
                  {prediction.structured_formatting.main_text}
                </div>
                <div className="text-xs text-gray-500">
                  {prediction.structured_formatting.secondary_text}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

