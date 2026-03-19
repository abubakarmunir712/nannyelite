import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

// Eagerly loaded (critical path)
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import NotFound from "./pages/NotFound.tsx";

// Lazy loaded pages
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const NannyOnboarding = lazy(() => import("./pages/NannyOnboarding.tsx"));
const FamilyOnboarding = lazy(() => import("./pages/FamilyOnboarding.tsx"));
const NannyProfile = lazy(() => import("./pages/NannyProfile.tsx"));
const CitySearch = lazy(() => import("./pages/CitySearch.tsx"));
const SearchNannies = lazy(() => import("./pages/SearchNannies.tsx"));
const JobMarketplace = lazy(() => import("./pages/JobMarketplace.tsx"));
const JobDetail = lazy(() => import("./pages/JobDetail.tsx"));
const Messages = lazy(() => import("./pages/Messages.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Careers = lazy(() => import("./pages/Careers.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const Help = lazy(() => import("./pages/Help.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Security = lazy(() => import("./pages/Security.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Earnings = lazy(() => import("./pages/Earnings.tsx"));
const EditNannyProfile = lazy(() => import("./pages/EditNannyProfile.tsx"));

// Admin pages
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout.tsx"));
const AdminGuard = lazy(() => import("./components/admin/AdminGuard.tsx"));
const AdminOverview = lazy(() => import("./components/admin/AdminOverview.tsx"));
const AdminProfiles = lazy(() => import("./components/admin/AdminProfiles.tsx"));
const AdminCertificateReview = lazy(() => import("./components/admin/AdminCertificateReview.tsx"));
const AdminDocuments = lazy(() => import("./components/admin/AdminDocuments.tsx"));
const AdminUsers = lazy(() => import("./components/admin/AdminUsers.tsx"));
const AdminJobs = lazy(() => import("./components/admin/AdminJobs.tsx"));
const AdminApplications = lazy(() => import("./components/admin/AdminApplications.tsx"));
const AdminBookings = lazy(() => import("./components/admin/AdminBookings.tsx"));
const AdminReviews = lazy(() => import("./components/admin/AdminReviews.tsx"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-secondary flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
  </div>
);

// Wrapper component to apply AdminGuard to admin routes
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => (
  <AdminGuard>{children}</AdminGuard>
);

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/onboarding/nanny" element={<NannyOnboarding />} />
                <Route path="/onboarding/family" element={<FamilyOnboarding />} />
                <Route path="/nanny/:id" element={<NannyProfile />} />
                <Route path="/search/:city" element={<CitySearch />} />
                <Route path="/search" element={<SearchNannies />} />
                <Route path="/jobs" element={<JobMarketplace />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/about" element={<About />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/help" element={<Help />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/security" element={<Security />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/earnings" element={<Earnings />} />
                <Route path="/edit-profile" element={<EditNannyProfile />} />

                {/* Admin Login (public) */}
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Admin Routes (protected with sidebar layout) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedAdminRoute>
                      <AdminLayout />
                    </ProtectedAdminRoute>
                  }
                >
                  <Route index element={<AdminOverview />} />
                  <Route path="dashboard" element={<AdminOverview />} />
                  <Route path="profiles" element={<AdminProfiles />} />
                  <Route path="certificates" element={<AdminCertificateReview />} />
                  <Route path="documents" element={<AdminDocuments />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="jobs" element={<AdminJobs />} />
                  <Route path="applications" element={<AdminApplications />} />
                  <Route path="bookings" element={<AdminBookings />} />
                  <Route path="reviews" element={<AdminReviews />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
