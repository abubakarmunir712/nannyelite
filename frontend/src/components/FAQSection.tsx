import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const faqKeys = Array.from({ length: 13 }, (_, i) => i + 1);

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useTranslation();

  return (
    <section id="faq" className="py-20 px-6 bg-secondary">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground text-center mb-12">
          {t("faq.title")}
        </h2>

        <div className="space-y-4">
          {faqKeys.map((num) => (
            <div key={num} className="bg-card rounded-lg border border-border overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left"
                onClick={() => setOpenIndex(openIndex === num ? null : num)}
              >
                <span className="font-display text-lg font-medium text-card-foreground">{t(`faq.q${num}`)}</span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ml-4 ${openIndex === num ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === num && (
                <div className="px-5 pb-5">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{t(`faq.a${num}`)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
