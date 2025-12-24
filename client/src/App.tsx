import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { Header } from "@/components/header";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/image-studio" component={ModelsLabStudioPage} />
      <Route path="/lora-studio" component={LoRAStudioPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/support" component={SupportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const pagesWithoutHeader = ["/", "/pricing", "/terms", "/privacy", "/support"];
  const showHeader = !pagesWithoutHeader.includes(location);

  return (
    <>
      {showHeader && <Header />}
      <Router />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
