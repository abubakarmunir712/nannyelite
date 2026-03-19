import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Careers = () => (
  <div className="min-h-screen bg-secondary">
    <SEO title="Careers at NannyElite – Join Our Team" description="Join the NannyElite team. We're building the future of childcare in Switzerland." path="/careers" />
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12 text-center">
      <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold text-foreground mb-4">Join Our Team</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        We're building the future of childcare in Switzerland. If you're passionate about trust, technology, and making a difference — we'd love to hear from you.
      </p>
      <a href="mailto:careers@nannyelite.ch">
        <Button className="rounded-full">Send Your CV</Button>
      </a>
    </main>
    <Footer />
  </div>
);

export default Careers;
