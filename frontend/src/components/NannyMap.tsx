import { useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";

interface NannyMapPin {
  user_id: string;
  full_name: string | null;
  latitude: number;
  longitude: number;
  hourly_rate_recurring: number | null;
  photo: string | null;
}

const NannyMap = ({
  nannies,
  highlightedId,
  onPinHover,
}: {
  nannies: NannyMapPin[];
  highlightedId?: string | null;
  onPinHover?: (id: string | null) => void;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const validNannies = useMemo(
    () => nannies.filter((n) => n.latitude && n.longitude && n.latitude !== 0 && n.longitude !== 0),
    [nannies]
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center: L.LatLngExpression = validNannies.length > 0
      ? [
          validNannies.reduce((s, n) => s + n.latitude, 0) / validNannies.length,
          validNannies.reduce((s, n) => s + n.longitude, 0) / validNannies.length,
        ]
      : [46.8, 8.2];

    mapInstance.current = L.map(mapRef.current, {
      center,
      zoom: validNannies.length > 0 ? 10 : 8,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    validNannies.forEach((n) => {
      const icon = L.divIcon({
        className: "nanny-pin",
        html: `<div style="width:14px;height:14px;background:hsl(220,47%,25%);border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([n.latitude, n.longitude], { icon })
        .addTo(mapInstance.current!);

      const popupContent = `
        <a href="/nanny/${n.user_id}" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:8px;">
          ${n.photo ? `<img src="${n.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />` : ""}
          <div>
            <div style="font-weight:600;font-size:13px;">${n.full_name || "Nanny"}</div>
            ${n.hourly_rate_recurring ? `<div style="font-size:11px;color:#666;">CHF ${Number(n.hourly_rate_recurring).toFixed(0)}/hr</div>` : ""}
          </div>
        </a>
      `;
      marker.bindPopup(popupContent, { closeButton: false });

      marker.on("mouseover", () => onPinHover?.(n.user_id));
      marker.on("mouseout", () => onPinHover?.(null));

      markersRef.current.set(n.user_id, marker);
    });
  }, [validNannies, onPinHover]);

  // Highlight effect
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const isHighlighted = id === highlightedId;
      const size = isHighlighted ? 20 : 14;
      marker.setIcon(
        L.divIcon({
          className: "nanny-pin",
          html: `<div style="width:${size}px;height:${size}px;background:hsl(220,47%,25%);border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,${isHighlighted ? 0.5 : 0.3});transition:all 0.2s;"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      );
    });
  }, [highlightedId]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: "100%" }} />
    </div>
  );
};

export default NannyMap;
