import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { INDIAN_STATES, districtsForState } from "@/lib/india";

interface Props {
  state: string;
  city: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  required?: boolean;
  /** Renders both selects inside a 2-column grid (default) or stacked. */
  className?: string;
  stateLabel?: string;
  cityLabel?: string;
}

/**
 * Mandatory State → City (district) picker.
 * Cities are always chosen from a fixed list so every listing carries a clean,
 * consistent location string that city-wise SEO pages can group on.
 */
export function StateCitySelect({
  state,
  city,
  onStateChange,
  onCityChange,
  required = true,
  className = "grid gap-4 md:grid-cols-2",
  stateLabel = "State",
  cityLabel = "City / District",
}: Props) {
  const districts = districtsForState(state);

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label>
          {stateLabel} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={state || undefined}
          onValueChange={(v) => {
            onStateChange(v);
            // Only clear the city when it doesn't belong to the newly picked state
            if (city && !districtsForState(v).includes(city)) onCityChange("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {INDIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>
          {cityLabel} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={city || undefined} onValueChange={onCityChange} disabled={!state}>
          <SelectTrigger>
            <SelectValue placeholder={state ? "Select city" : "Select state first"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {districts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default StateCitySelect;
