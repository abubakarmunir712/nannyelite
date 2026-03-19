import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Search, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface LocationStepData {
  city: string;
  postalCode: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

interface GeoResult {
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: number;
  lon: number;
  displayName: string;
}

interface Props {
  value: LocationStepData;
  onChange: (data: LocationStepData) => void;
}

const DEFAULT_CENTER: [number, number] = [46.8, 8.2];
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 13;

const LocationStep = ({ value, onChange }: Props) => {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the current language code (en, fr, de, it)
  const currentLanguage = i18n.language?.split("-")[0] || "en";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Autocomplete search
  const searchLocation = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("geo-search", {
        body: { action: "search", query: q, language: currentLanguage },
      });
      if (error) throw error;
      setSuggestions(Array.isArray(data) ? data : []);
      setShowDropdown(true);
    } catch {
      setSuggestions([]);
    }
    setSearching(false);
  }, [currentLanguage]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(val), 350);
  };

  const applyResult = useCallback((result: GeoResult) => {
    const newData: LocationStepData = {
      city: result.city,
      postalCode: result.postalCode,
      state: result.state,
      country: result.country,
      latitude: result.lat,
      longitude: result.lon,
    };
    onChange(newData);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    toast({
      title: "Location selected",
      description: `${result.city}${result.postalCode ? `, ${result.postalCode}` : ""}, ${result.country}`,
    });
  }, [onChange]);

  const selectSuggestion = (s: GeoResult) => applyResult(s);

  // Reverse geocode helper
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      const { data, error } = await supabase.functions.invoke("geo-search", {
        body: { action: "reverse", lat, lon, language: currentLanguage },
      });
      if (error) throw error;
      if (data && !data.error) {
        applyResult(data as GeoResult);
      } else {
        toast({ title: "Location not found", description: "Could not resolve this location.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Geocoding failed", description: "Please try again.", variant: "destructive" });
    }
  }, [applyResult, currentLanguage]);

  // GPS
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS unavailable", description: "Your browser does not support geolocation.", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGpsLoading(false);
      },
      () => {
        toast({ title: "GPS denied", description: "Please allow location access and try again.", variant: "destructive" });
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  // Leaflet map
  useEffect(() => {
    const initMap = async () => {
      if (!mapContainerRef.current) return;
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (mapRef.current) {
        // Map already exists — just update view/marker
        if (value.latitude && value.longitude) {
          mapRef.current.setView([value.latitude, value.longitude], SELECTED_ZOOM);
          if (markerRef.current) {
            markerRef.current.setLatLng([value.latitude, value.longitude]);
          } else {
            markerRef.current = L.circle([value.latitude, value.longitude], {
              radius: 800,
              color: "hsl(var(--primary))",
              fillOpacity: 0.15,
              weight: 2,
            }).addTo(mapRef.current);
          }
        }
        return;
      }

      const center: [number, number] = value.latitude && value.longitude
        ? [value.latitude, value.longitude]
        : DEFAULT_CENTER;
      const zoom = value.latitude ? SELECTED_ZOOM : DEFAULT_ZOOM;

      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(center, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      if (value.latitude && value.longitude) {
        markerRef.current = L.circle([value.latitude, value.longitude], {
          radius: 800,
          color: "hsl(var(--primary))",
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
      }

      // Click to select location
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        await reverseGeocode(lat, lng);
      });

      mapRef.current = map;
    };

    initMap();

    return () => {
      // Don't destroy on every re-render — only when unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map when value changes
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (value.latitude && value.longitude) {
      mapRef.current.setView([value.latitude, value.longitude], SELECTED_ZOOM);
      if (markerRef.current) {
        markerRef.current.setLatLng([value.latitude, value.longitude]);
      } else {
        markerRef.current = L.circle([value.latitude, value.longitude], {
          radius: 800,
          color: "hsl(220,40%,18%)",
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(mapRef.current);
      }
    }
  }, [value.latitude, value.longitude]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const hasLocation = !!(value.latitude && value.longitude && value.city);

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative" ref={dropdownRef}>
        <Label className="mb-1.5 block">Search for your location</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Type a city, address, or postal code..."
            className="pl-10"
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          />
          {searching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm border-b border-border last:border-0"
              >
                <span className="font-medium text-foreground">
                  {s.city}{s.postalCode ? `, ${s.postalCode}` : ""}
                </span>
                <span className="text-muted-foreground ml-1">
                  {s.state ? `${s.state}, ` : ""}{s.country}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS button */}
      <Button
        type="button"
        variant="outline"
        onClick={useMyLocation}
        disabled={gpsLoading}
        className="gap-2 rounded-full"
      >
        {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
        Use My Location
      </Button>

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="h-56 sm:h-64 rounded-xl border border-border overflow-hidden"
      />
      <p className="text-xs text-muted-foreground">Click the map to select a location, or use search / GPS above.</p>

      {/* Read-only fields */}
      {hasLocation && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input value={value.city} readOnly className="bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Postal Code</Label>
              <Input value={value.postalCode} readOnly className="bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Canton / State</Label>
              <Input value={value.state} readOnly className="bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Input value={value.country} readOnly className="bg-background" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{value.latitude?.toFixed(4)}, {value.longitude?.toFixed(4)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationStep;
