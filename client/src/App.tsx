import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { Header } from "@/components/header";
import LandingPage from "@/pages/landing";
import LibraryPage from "@/pages/library";
import HistoryPage from "@/pages/history";
import ModelsLabStudioPage from "@/pages/modelslab-studio";
import HotStudioPage from "@/pages/hot-studio";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/image-studio" component={ModelsLabStudioPage} />
      <Route path="/hot-studio" component={HotStudioPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <Header />
            <Router />
            <Toaster />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
