import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const About = () => (
  <div className="min-h-screen bg-secondary">
    <SEO title="About NannyElite – Our Mission & Story" description="Learn about NannyElite's mission to connect Swiss families with verified, trusted caregivers through AI-powered matching." path="/about" />
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">About NannyElite</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>NannyElite is Switzerland's trusted childcare marketplace, connecting discerning families with verified, professional nannies.</p>
        <p>Our platform combines cutting-edge AI matching with blockchain-ready verification to ensure the highest standards of trust and safety in childcare services.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-8">Our Mission</h2>
        <p>To become the trusted infrastructure for childcare services in Switzerland, built on three pillars: Trust, Intelligence, and Automation.</p>
        <h2 className="text-foreground font-display text-xl font-semibold mt-8">Contact</h2>
        <p>Email: <a href="mailto:info@nannyelite.ch" className="text-primary hover:underline">info@nannyelite.ch</a></p>
      </div>
    </main>
    <Footer />
  </div>
);

export default About;
