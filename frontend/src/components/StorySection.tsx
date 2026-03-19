import { useTranslation } from "react-i18next";

const StorySection = () => {
  const { t } = useTranslation();

  return (
    <section id="story" className="py-20 px-6 bg-background">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground mb-8">
          {t("story.title")}
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          {t("story.p1")}
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          {t("story.p2")}
        </p>
        <p className="text-muted-foreground leading-relaxed">
          {t("story.p3")}
        </p>
        <p className="text-muted-foreground leading-relaxed mt-4 font-medium">
          {t("story.p4")}
        </p>
      </div>
    </section>
  );
};

export default StorySection;
