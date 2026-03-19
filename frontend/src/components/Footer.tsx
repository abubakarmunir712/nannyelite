import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-primary text-primary-foreground py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 mb-10">
          {/* Brand */}
          <div>
            <span className="font-display text-xl font-bold">NannyElite</span>
            <p className="text-sm text-primary-foreground/70 mt-2">
              {t("footer.tagline")}
            </p>
            <Link
              to="/contact"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors mt-1 block"
            >
              {t("footer.contactUs")}
            </Link>
            <a
              href="https://buymeacoffee.com/nannyelite"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-4 py-1.5 rounded-full border border-primary-foreground/30 text-sm hover:bg-primary-foreground/10 transition-colors"
            >
              ☕ {t("footer.supportUs")}
            </a>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">{t("footer.platform")}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><a href="#home" className="hover:text-primary-foreground transition-colors">{t("nav.home")}</a></li>
              <li><a href="#story" className="hover:text-primary-foreground transition-colors">{t("footer.ourStory")}</a></li>
              <li><a href="#services" className="hover:text-primary-foreground transition-colors">{t("nav.services")}</a></li>
              <li><Link to="/search" className="hover:text-primary-foreground transition-colors">{t("nav.search")}</Link></li>
              <li><Link to="/jobs" className="hover:text-primary-foreground transition-colors">{t("footer.jobMarketplace")}</Link></li>
            </ul>
          </div>

          {/* Find Nannies by City */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">{t("footer.findNannies")}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/search/lausanne" className="hover:text-primary-foreground transition-colors">{t("footer.nanniesIn", { city: "Lausanne" })}</Link></li>
              <li><Link to="/search/geneva" className="hover:text-primary-foreground transition-colors">{t("footer.nanniesIn", { city: "Geneva" })}</Link></li>
              <li><Link to="/search/zurich" className="hover:text-primary-foreground transition-colors">{t("footer.nanniesIn", { city: "Zürich" })}</Link></li>
              <li><Link to="/search/bern" className="hover:text-primary-foreground transition-colors">{t("footer.nanniesIn", { city: "Bern" })}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">{t("footer.company")}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/about" className="hover:text-primary-foreground transition-colors">{t("footer.about")}</Link></li>
              <li><Link to="/careers" className="hover:text-primary-foreground transition-colors">{t("footer.careers")}</Link></li>
              <li><Link to="/blog" className="hover:text-primary-foreground transition-colors">{t("footer.blog")}</Link></li>
              <li><a href="#faq" className="hover:text-primary-foreground transition-colors">{t("nav.faq")}</a></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">{t("footer.legalSupport")}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/help" className="hover:text-primary-foreground transition-colors">{t("footer.helpCenter")}</Link></li>
              <li><Link to="/security" className="hover:text-primary-foreground transition-colors">{t("footer.security")}</Link></li>
              <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">{t("footer.terms")}</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">{t("footer.privacy")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} NannyElite. {t("footer.allRights")}
          </p>
          <div className="flex gap-4 text-xs text-primary-foreground/50">
            <span>{t("footer.madeIn")}</span>
            <span>{t("footer.gdpr")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
