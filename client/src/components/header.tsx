import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useI18n, LanguageToggle } from "@/lib/i18n";
import { APP_NAME } from "@/lib/constants";
import { Moon, Sun, Sparkles, Menu, X, Image, Library, History, Home } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/library", label: t.nav.library, icon: Library },
    { href: "/history", label: t.nav.history, icon: History },
    { href: "/image-studio", label: t.nav.imageStudio, icon: Image },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/60 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto h-full px-6 md:px-8 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group" data-testid="link-home-logo">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight" data-testid="text-logo">{APP_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const IconComponent = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`
                    relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150
                    flex items-center gap-1.5
                    ${isActive 
                      ? "text-foreground bg-secondary/80" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }
                  `}
                  data-testid={`link-nav-${item.label.toLowerCase()}`}
                >
                  <IconComponent className="w-4 h-4" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="md:hidden w-9 h-9 rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 animate-slide-in-from-top">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const IconComponent = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`
                      w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150
                      flex items-center gap-2.5 text-left
                      ${isActive 
                        ? "text-foreground bg-secondary/80" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }
                    `}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`link-mobile-nav-${item.label.toLowerCase()}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
