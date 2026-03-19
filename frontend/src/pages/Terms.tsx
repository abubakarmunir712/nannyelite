import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Terms = () => (
  <div className="min-h-screen bg-secondary">
    <SEO title="Terms of Service – NannyElite" description="NannyElite terms of service. Read our terms and conditions for using the platform." path="/terms" />
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Terms of Service</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">1. Acceptance of Terms</h2>
        <p>By accessing and using NannyElite, you agree to be bound by these Terms of Service.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">2. Platform Use</h2>
        <p>NannyElite provides a marketplace connecting families with childcare providers. We are not an employment agency and do not employ nannies directly.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">3. User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">4. Verification</h2>
        <p>While we offer verification services, families are ultimately responsible for conducting their own due diligence when selecting a caregiver.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">5. Payments</h2>
        <p>Payment terms between families and nannies are arranged independently. NannyElite may facilitate escrow payments in the future.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">6. Contact</h2>
        <p>For questions about these terms, contact us at <a href="mailto:info@nannyelite.ch" className="text-primary hover:underline">info@nannyelite.ch</a>.</p>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;
