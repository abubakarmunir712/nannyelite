import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Security = () => (
  <div className="min-h-screen bg-secondary">
    <SEO title="Security – NannyElite" description="How NannyElite keeps families and caregivers safe. Verification, background checks, and data protection." path="/security" />
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Security</h1>
      <div className="grid gap-6">
        {[
          { icon: Shield, title: "Identity Verification", desc: "Government ID, selfie, and Swiss police certificate verification for all nannies." },
          { icon: Lock, title: "Encrypted Data", desc: "All sensitive data is encrypted at rest and in transit using industry-standard TLS encryption." },
          { icon: Eye, title: "Background Checks", desc: "Optional Swiss background checks (Strafregisterauszug) for enhanced trust." },
          { icon: CheckCircle, title: "GDPR Compliant", desc: "Full compliance with European data protection regulations. Your data is stored in European data centers." },
        ].map((item) => (
          <div key={item.title} className="bg-card rounded-xl border border-border p-6 flex gap-4">
            <item.icon className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
    <Footer />
  </div>
);

export default Security;
