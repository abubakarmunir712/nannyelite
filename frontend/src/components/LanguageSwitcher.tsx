import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  return (
    <Select value={i18n.language?.substring(0, 2) || "en"} onValueChange={(v) => i18n.changeLanguage(v)}>
      <SelectTrigger className="w-auto gap-1.5 border-none bg-transparent h-8 text-xs px-2 text-primary-foreground/80 hover:text-primary-foreground focus:ring-0 focus:ring-offset-0">
        <Globe className="h-3.5 w-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t("language.en")}</SelectItem>
        <SelectItem value="fr">{t("language.fr")}</SelectItem>
        <SelectItem value="de">{t("language.de")}</SelectItem>
        <SelectItem value="it">{t("language.it")}</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
