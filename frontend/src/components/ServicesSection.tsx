import { useTranslation } from "react-i18next";

const serviceKeys = [
  { key: "dateNight", image: "/images/date_night_caregiver.png" },
  { key: "overnight", image: "/images/overnight.png" },
  { key: "afterSchool", image: "/images/after_school.png" },
  { key: "weekend", image: "/images/weekday.png" },
];

const ServicesSection = () => {
  const { t } = useTranslation();

  return (
    <section id="services" className="py-20 px-6 bg-secondary">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground text-center mb-4">
          {t("services.title")}
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          {t("services.subtitle")}
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {serviceKeys.map((s) => (
            <div key={s.key} className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={s.image} alt={t(`services.${s.key}.title`)} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-semibold text-card-foreground mb-1">{t(`services.${s.key}.title`)}</h3>
                <p className="text-sm font-medium text-success mb-2">{t(`services.${s.key}.subtitle`)}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`services.${s.key}.description`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
