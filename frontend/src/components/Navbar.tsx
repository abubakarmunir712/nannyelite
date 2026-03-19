import { useState, useEffect } from "react";
import { Menu, X, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/logo-option-5.png";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const { hasAdminAccess } = useAdminRole();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isHome) return; // default browser behavior handles it
    e.preventDefault();
    navigate("/" + href);
  };

  const navLinks = [
    { label: t("nav.home"), href: "#home" },
    { label: t("nav.story"), href: "#story" },
    { label: t("nav.services"), href: "#services" },
    { label: t("nav.faq"), href: "#faq" },
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.search"), href: "/search", isRoute: true },
    { label: "Jobs", href: "/jobs", isRoute: true },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-primary shadow-md"
          : "bg-primary/80 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 h-16">
        {/* Logo */}
        <a href={isHome ? "#home" : "/"} className="flex items-center gap-3 shrink-0">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground shadow-sm ring-1 ring-primary-foreground/20">
            <img
              src={logoImg}
              alt="NannyElite butterfly logo"
              className="h-10 w-10 object-contain"
            />
          </span>
          <span className="font-display text-lg font-semibold tracking-wide text-primary-foreground">
            NannyElite
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) =>
            l.isRoute ? (
              <Link
                key={l.href}
                to={l.href}
                className="text-[13px] font-medium tracking-wide text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.href}
                href={isHome ? l.href : `/${l.href}`}
                onClick={(e) => handleAnchorClick(e, l.href)}
                className="text-[13px] font-medium tracking-wide text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                {l.label}
              </a>
            )
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <a
            href="https://buymeacoffee.com/nannyelite"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            ☕ {t("nav.donate")}
          </a>
          <span className="w-px h-4 bg-primary-foreground/20" />
          <LanguageSwitcher />
          {user ? (
            <>
              {hasAdminAccess && (
                <Link
                  to="/admin"
                  data-testid="nav-admin-link"
                  className="ml-1 px-3 py-1.5 rounded-full border border-primary-foreground/30 text-primary-foreground text-[12px] font-medium transition-colors hover:bg-primary-foreground/10 flex items-center gap-1"
                >
                  <ShieldCheck size={14} /> Admin
                </Link>
              )}
              <Link
                to="/dashboard"
                className="ml-1 px-4 py-1.5 rounded-full bg-primary-foreground text-primary text-[13px] font-semibold transition-colors hover:bg-primary-foreground/90"
              >
                {t("nav.dashboard")}
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="ml-1 px-4 py-1.5 rounded-full bg-primary-foreground text-primary text-[13px] font-semibold transition-colors hover:bg-primary-foreground/90"
            >
              {t("nav.login")}
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-primary-foreground"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-primary border-t border-primary-foreground/10 px-6 py-5 flex flex-col gap-3">
          {navLinks.map((l) =>
            l.isRoute ? (
              <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground py-1">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={isHome ? l.href : `/${l.href}`} onClick={(e) => { handleAnchorClick(e, l.href); setOpen(false); }} className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground py-1">
                {l.label}
              </a>
            )
          )}
          <a href="https://buymeacoffee.com/nannyelite" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground py-1">
            ☕ {t("nav.donate")}
          </a>
          <div className="py-2">
            <LanguageSwitcher />
          </div>
          <div className="pt-2">
            {user ? (
              <>
                {hasAdminAccess && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 px-5 py-2 rounded-full border border-primary-foreground/30 text-primary-foreground text-sm font-medium mb-2">
                    <ShieldCheck size={14} /> Admin
                  </Link>
                )}
                <Link to="/dashboard" onClick={() => setOpen(false)} className="inline-block px-5 py-2 rounded-full bg-primary-foreground text-primary text-sm font-semibold">
                  {t("nav.dashboard")}
                </Link>
              </>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="inline-block px-5 py-2 rounded-full bg-primary-foreground text-primary text-sm font-semibold">
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
