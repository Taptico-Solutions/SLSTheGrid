import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SLSLayout from "./components/SLSLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Documents from "./pages/Documents";
import Messages from "./pages/Messages";
import Submittals from "./pages/Submittals";
import BudgetOverview from "./pages/BudgetOverview";
import TimelineOverview from "./pages/TimelineOverview";
import Team from "./pages/Team";
import Manufacturers from "./pages/Manufacturers";
import Notifications from "./pages/Notifications";
import Copilot from "./pages/Copilot";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import ProspectRadar from "./pages/ProspectRadar";
import Pursuits from "./pages/Pursuits";
import InviteAccept from "./pages/InviteAccept";

function Router() {
  return (
    <SLSLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/documents" component={Documents} />
        <Route path="/messages" component={Messages} />
        <Route path="/submittals" component={Submittals} />
        <Route path="/budget" component={BudgetOverview} />
        <Route path="/timeline" component={TimelineOverview} />
        <Route path="/team" component={Team} />
        <Route path="/manufacturers" component={Manufacturers} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/copilot" component={Copilot} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin" component={Admin} />
        <Route path="/prospect-radar" component={ProspectRadar} />
        <Route path="/pursuits" component={Pursuits} />
        <Route path="/invite/:token" component={InviteAccept} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </SLSLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
