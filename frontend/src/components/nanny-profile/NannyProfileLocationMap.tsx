import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import L from "leaflet";
import { lookupPostalCode } from "@/utils/postalCodeLookup";

interface Props {
  latitude: number | null;
  longitude: number | null;
  locationLabel?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}

const NannyProfileLocationMap = ({
  latitude,
  longitude,
  locationLabel,
  postalCode,
  city,
  country,
}: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const circleInstance = useRef<L.Circle | null>(null);
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: Number(latitude), lng: Number(longitude) } : null,
  );
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let active = true;

    const resolveCoords = async () => {
      if (latitude && longitude) {
        setResolvedCoords({ lat: Number(latitude), lng: Number(longitude) });
        return;
      }

      const trimmedPostal = postalCode?.trim();
      const trimmedCity = city?.trim();

      if (!trimmedPostal && !trimmedCity && !locationLabel) {
        setResolvedCoords(null);
        return;
      }

      setResolving(true);

      try {
        if (trimmedPostal) {
          const byPostal = await lookupPostalCode(trimmedPostal, country || undefined);
          if (active && byPostal) {
            setResolvedCoords({ lat: byPostal.latitude, lng: byPostal.longitude });
            return;
          }
        }

        const query = [trimmedCity || locationLabel, country].filter(Boolean).join(", ");
        if (query) {
          const params = new URLSearchParams({ format: "json", q: query, limit: "1" });
          const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
          const data = await res.json();
          if (active && Array.isArray(data) && data.length > 0) {
            setResolvedCoords({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            });
            return;
          }
        }

        if (active) setResolvedCoords(null);
      } catch {
        if (active) setResolvedCoords(null);
      } finally {
        if (active) setResolving(false);
      }
    };

    resolveCoords();

    return () => {
      active = false;
    };
  }, [latitude, longitude, postalCode, city, country, locationLabel]);

  useEffect(() => {
    if (!mapRef.current || !resolvedCoords) return;

    const primaryToken = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
    const primaryColor = primaryToken ? `hsl(${primaryToken})` : "hsl(220 40% 18%)";

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [resolvedCoords.lat, resolvedCoords.lng],
        zoom: 13,
        scrollWheelZoom: false,
        zoomControl: true,
        dragging: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView([resolvedCoords.lat, resolvedCoords.lng], 13);
    }

    if (circleInstance.current) {
      circleInstance.current.remove();
      circleInstance.current = null;
    }

    circleInstance.current = L.circle([resolvedCoords.lat, resolvedCoords.lng], {
      radius: 800,
      color: primaryColor,
      fillColor: primaryColor,
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(mapInstance.current);
  }, [resolvedCoords]);

  useEffect(() => {
    return () => {
      circleInstance.current?.remove();
      circleInstance.current = null;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <h2 className="font-display text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" /> Approximate Location
      </h2>
      {locationLabel && <p className="text-sm text-muted-foreground mb-4">{locationLabel}</p>}

      {resolvedCoords ? (
        <>
          <div className="rounded-lg overflow-hidden border border-border" style={{ height: 260 }}>
            <div ref={mapRef} className="w-full h-full" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Exact address shared after booking confirmation
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            {resolving ? "Loading map…" : "Map unavailable until location coordinates are set."}
          </p>
        </div>
      )}
    </section>
  );
};

export default NannyProfileLocationMap;
