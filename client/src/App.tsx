import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { Header } from "@/components/header";
import { CookieConsent } from "@/components/cookie-consent";
import ErrorBoundary from "@/components/ErrorBoundary";
import LandingPage from "@/pages/landing";
import PricingPage from "@/pages/pricing";
import LibraryPage from "@/pages/library";
import HistoryPage from "@/pages/history";
import ModelsLabStudioPage from "@/pages/modelslab-studio";
import LoRAStudioPage from "@/pages/lora-studio";
import ProfilePage from "@/pages/profile";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import SupportPage from "@/pages/support";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import WaitlistPage from "@/pages/waitlist";
import GalleryImagesPage from "@/pages/gallery-images";
import GalleryVideosPage from "@/pages/gallery-videos";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/waitlist" component={WaitlistPage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/gallery/images" component={GalleryImagesPage} />
      <Route path="/gallery/videos" component={GalleryVideosPage} />
      <Route path="/image-studio" component={ModelsLabStudioPage} />
      <Route path="/lora-studio" component={LoRAStudioPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const pagesWithoutHeader = ["/", "/pricing", "/waitlist", "/terms", "/privacy", "/support", "/login", "/register"];
  const showHeader = !pagesWithoutHeader.includes(location);

  return (
    <>
      {showHeader && <Header />}
      <Router />
      <Toaster />
      <CookieConsent />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <TooltipProvider>
              <AppContent />
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

