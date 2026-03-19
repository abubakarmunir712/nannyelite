import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Check, AlertTriangle } from "lucide-react";
import { lookupPostalCode, lookupCity } from "@/utils/postalCodeLookup";
import { toast } from "@/hooks/use-toast";

export interface LocationData {
  postalCode: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  value: LocationData;
  onChange: (data: LocationData) => void;
}

const LocationInput = ({ value, onChange }: Props) => {
  const { i18n } = useTranslation();
  const [lookingUp, setLookingUp] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the current language code (en, fr, de, it)
  const currentLanguage = i18n.language?.split("-")[0] || "en";

  const handlePostalCodeLookup = useCallback(async () => {
    if (!value.postalCode || value.postalCode.trim().length < 3) {
      setError("Enter at least 3 characters for postal code.");
      return;
    }
    setLookingUp(true);
    setError(null);
    setValidated(false);

    const result = await lookupPostalCode(value.postalCode.trim(), value.country || "Switzerland", currentLanguage);
    setLookingUp(false);

    if (result) {
      onChange({
        postalCode: value.postalCode.trim(),
        city: result.city,
        state: result.state,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setValidated(true);
      toast({ title: "Location found", description: `${result.city}, ${result.state ? result.state + ", " : ""}${result.country}` });
    } else {
      setError("Could not find a location for this postal code. Please check and try again.");
      setValidated(false);
    }
  }, [value.postalCode, value.country, currentLanguage, onChange]);

  const handleCityLookup = useCallback(async () => {
    if (!value.city || value.city.trim().length < 2) {
      setError("Enter at least 2 characters for city.");
      return;
    }
    setLookingUp(true);
    setError(null);
    setValidated(false);

    const result = await lookupCity(value.city.trim(), value.country || undefined, currentLanguage);
    setLookingUp(false);

    if (result) {
      // Ask user to confirm by auto-filling but requiring postal code
      onChange({
        ...value,
        city: result.city,
        state: result.state,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      if (!value.postalCode) {
        toast({
          title: "City found",
          description: `${result.city}, ${result.country}. Please enter the postal code to complete the location.`,
        });
      } else {
        setValidated(true);
        toast({ title: "Location verified", description: `${result.city}, ${result.state ? result.state + ", " : ""}${result.country}` });
      }
    } else {
      setError("Could not find this city. Please check the spelling.");
      setValidated(false);
    }
  }, [value, currentLanguage, onChange]);

  const handlePostalCodeChange = (pc: string) => {
    setValidated(false);
    setError(null);
    onChange({ ...value, postalCode: pc, latitude: null, longitude: null });
  };

  const handleCityChange = (c: string) => {
    setValidated(false);
    setError(null);
    onChange({ ...value, city: c, latitude: null, longitude: null });
  };

  return (
    <div className="space-y-4">
      {/* Postal Code */}
      <div className="space-y-2">
        <Label>Postal Code</Label>
        <div className="flex gap-2">
          <Input
            value={value.postalCode}
            onChange={e => handlePostalCodeChange(e.target.value)}
            placeholder="e.g. 1000"
            maxLength={10}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={lookingUp || !value.postalCode || value.postalCode.trim().length < 3}
            onClick={handlePostalCodeLookup}
            className="shrink-0"
          >
            {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Enter your postal code and click the pin icon to auto-fill your location.</p>
      </div>

      {/* City (read-only when validated by postal code, editable with lookup for city-first flow) */}
      <div className="space-y-2">
        <Label>City</Label>
        <div className="flex gap-2">
          <Input
            value={value.city}
            onChange={e => handleCityChange(e.target.value)}
            placeholder="e.g. Lausanne"
            className="flex-1"
            readOnly={validated}
          />
          {!validated && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={lookingUp || !value.city || value.city.trim().length < 2}
              onClick={handleCityLookup}
              className="shrink-0"
            >
              {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Search</>}
            </Button>
          )}
        </div>
      </div>

      {/* Canton/State (read-only, auto-filled) */}
      <div className="space-y-2">
        <Label>Canton / State</Label>
        <Input value={value.state} readOnly className="bg-muted/50" placeholder="Auto-filled from postal code" />
      </div>

      {/* Country (read-only, auto-filled) */}
      <div className="space-y-2">
        <Label>Country</Label>
        <Input value={value.country} readOnly className="bg-muted/50" placeholder="Auto-filled from postal code" />
      </div>

      {/* Validation status */}
      {validated && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          <span>Location verified: {value.city}{value.state ? `, ${value.state}` : ""}, {value.country}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default LocationInput;
