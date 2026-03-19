import { Eye, Users, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";

interface ProfileVisibilitySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS = [
  {
    value: "public",
    label: "Visible to everyone",
    description: "Your profile is visible publicly, including search results, job boards, and all users.",
    icon: Eye,
  },
  {
    value: "members",
    label: "Visible only to members",
    description: "Only registered platform members can see your profile. This may reduce the number of messages received.",
    icon: Users,
  },
  {
    value: "private",
    label: "Private profile",
    description: "Only members you have exchanged messages with or added as favorites can see your profile.",
    icon: Lock,
  },
];

const ProfileVisibilitySelector = ({ value, onChange }: ProfileVisibilitySelectorProps) => {
  return (
    <div className="space-y-3" data-testid="profile-visibility-selector">
      <Label className="text-sm font-medium text-foreground">Who can see your profile?</Label>
      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              data-testid={`visibility-option-${opt.value}`}
              onClick={() => onChange(opt.value)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileVisibilitySelector;
