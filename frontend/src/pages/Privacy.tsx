import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Privacy = () => (
  <div className="min-h-screen bg-secondary">
    <SEO title="Privacy Policy – NannyElite" description="NannyElite privacy policy. How we collect, use, and protect your personal data. GDPR compliant." path="/privacy" />
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">1. Data Collection</h2>
        <p>We collect personal information you provide when creating an account, including your name, email, phone number, and profile information.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">2. Data Usage</h2>
        <p>Your data is used to provide our services, improve matching accuracy, and ensure platform safety.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">3. Data Storage</h2>
        <p>All data is stored securely in GDPR-compliant European data centers.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">4. Your Rights</h2>
        <p>Under GDPR, you have the right to access, rectify, and delete your personal data. You may also request data portability.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-6">5. Contact</h2>
        <p>For privacy inquiries, contact us at <a href="mailto:info@nannyelite.ch" className="text-primary hover:underline">info@nannyelite.ch</a>.</p>
      </div>
    </main>
    <Footer />
  </div>
);

export default Privacy;
