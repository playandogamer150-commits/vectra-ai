import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useI18n, LanguageToggle } from "@/lib/i18n";
import { Moon, Sun, Zap, Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: t.nav.home },
    { href: "/studio", label: t.nav.studio },
    { href: "/library", label: t.nav.library },
    { href: "/history", label: t.nav.history },
    { href: "/lora-studio", label: t.nav.loraStudio },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home-logo">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold" data-testid="text-logo">PromptForge</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={location === item.href ? "secondary" : "ghost"}
                size="sm"
                data-testid={`link-nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b border-border p-4">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`link-mobile-nav-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
