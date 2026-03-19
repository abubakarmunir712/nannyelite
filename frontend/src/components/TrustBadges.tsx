import { Shield, Mail, Phone, Award, Car, Heart, CheckCircle } from "lucide-react";

export type BadgeType =
  | "email_verified"
  | "phone_verified"
  | "identity_verified"
  | "first_aid"
  | "childcare_diploma"
  | "early_childhood"
  | "driving_license"
  | "other_certificate";

interface BadgeInfo {
  label: string;
  icon: typeof Shield;
  className: string;
}

const BADGE_MAP: Record<BadgeType, BadgeInfo> = {
  email_verified: { label: "Email Verified", icon: Mail, className: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
  phone_verified: { label: "Phone Verified", icon: Phone, className: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300" },
  identity_verified: { label: "Identity Verified", icon: Shield, className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
  first_aid: { label: "First Aid Certified", icon: Heart, className: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" },
  childcare_diploma: { label: "Childcare Diploma", icon: Award, className: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300" },
  early_childhood: { label: "Early Childhood Edu", icon: Award, className: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
  driving_license: { label: "Driving License", icon: Car, className: "bg-slate-50 text-slate-700 dark:bg-slate-950/30 dark:text-slate-300" },
  other_certificate: { label: "Certified", icon: CheckCircle, className: "bg-gray-50 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300" },
};

interface TrustBadgesProps {
  badges: BadgeType[];
  size?: "sm" | "md";
}

const TrustBadges = ({ badges, size = "sm" }: TrustBadgesProps) => {
  if (badges.length === 0) return null;

  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <div className="flex flex-wrap gap-1" data-testid="trust-badges-container">
      {badges.map((badge) => {
        const info = BADGE_MAP[badge];
        if (!info) return null;
        const Icon = info.icon;
        return (
          <span
            key={badge}
            data-testid={`trust-badge-${badge}`}
            className={`inline-flex items-center gap-0.5 ${textSize} font-medium rounded-full ${padding} ${info.className}`}
          >
            <Icon className={iconSize} />
            {info.label}
          </span>
        );
      })}
    </div>
  );
};

export default TrustBadges;

/** Build badges array from profile data */
export function buildBadges(opts: {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  identityVerified?: boolean;
  manualIdentityVerified?: boolean;
  approvedCertificates?: { certificate_type: string }[];
}): BadgeType[] {
  const badges: BadgeType[] = [];
  if (opts.emailVerified) badges.push("email_verified");
  if (opts.phoneVerified) badges.push("phone_verified");
  if (opts.identityVerified || opts.manualIdentityVerified) badges.push("identity_verified");
  if (opts.approvedCertificates) {
    for (const cert of opts.approvedCertificates) {
      const type = cert.certificate_type;
      if (type === "first_aid") badges.push("first_aid");
      else if (type === "childcare_diploma") badges.push("childcare_diploma");
      else if (type === "early_childhood") badges.push("early_childhood");
      else if (type === "driving_license") badges.push("driving_license");
      else badges.push("other_certificate");
    }
  }
  return badges;
}
