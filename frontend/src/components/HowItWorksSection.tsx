import { useTranslation } from "react-i18next";

const stepKeys = ["step1", "step2", "step3"] as const;

const HowItWorksSection = () => {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="py-20 px-6 bg-background">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground text-center mb-14">
          {t("howItWorks.title")}
        </h2>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px hidden md:block" />

          <div className="space-y-12">
            {stepKeys.map((key, i) => (
              <div key={key} className="flex items-start gap-6 md:gap-12">
                {/* Number circle */}
                <div className="shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display text-lg font-bold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">{t(`howItWorks.${key}.title`)}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t(`howItWorks.${key}.description`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
