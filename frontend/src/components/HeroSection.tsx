import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();

  const familyBenefitKeys = [
    "verified", "aiMatching", "realReviews", "vetted", "scheduling", "multilingual",
  ] as const;

  const nannyBenefitKeys = [
    "aiOnboarding", "autoTranslation", "verifiedFamilies", "fastMatching", "noWasted", "flexible",
  ] as const;

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/images/hero.png"
          alt="Happy family with caregiver"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Heart icon */}
        <div className="flex justify-center mb-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="opacity-80">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-bold text-center text-primary-foreground mb-4">
          {t("hero.title")}
        </h1>
        <p className="text-lg md:text-xl text-center text-primary-foreground/85 max-w-2xl mx-auto mb-12">
          {t("hero.subtitle")}
        </p>

        {/* Two cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Families card */}
          <div className="bg-card/95 backdrop-blur-sm rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-display font-semibold text-card-foreground mb-6">{t("hero.forFamilies")}</h2>
            <ul className="space-y-3 mb-8">
              {familyBenefitKeys.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <span>{t(`hero.familyBenefits.${key}`)}</span>
                </li>
              ))}
            </ul>
            <Link to="/search" className="block w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity text-center">
              {t("hero.findCare")}
            </Link>
          </div>

          {/* Nannies card */}
          <div className="bg-card/95 backdrop-blur-sm rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-display font-semibold text-card-foreground mb-6">{t("hero.forNannies")}</h2>
            <ul className="space-y-3 mb-8">
              {nannyBenefitKeys.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <span>{t(`hero.nannyBenefits.${key}`)}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup?role=nanny" className="block w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity text-center">
              {t("hero.iAmNanny")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
