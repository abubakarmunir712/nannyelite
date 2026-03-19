import { Link } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";
import Footer from "@/components/Footer";
import FAQSection from "@/components/FAQSection";
import SEO from "@/components/SEO";
import Navbar from "@/components/Navbar";

const Help = () => (
  <div className="min-h-screen bg-secondary">
    <SEO title="Help Center – NannyElite Support" description="Get help with NannyElite. FAQs, contact support, and guides for families and nannies." path="/help" />
    <Navbar />
    <main className="max-w-3xl mx-auto px-6 py-12 pt-24">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Help Center</h1>
      <p className="text-muted-foreground mb-8">Find answers to common questions or contact our support team.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <Link to="/contact" className="bg-card rounded-xl border border-border p-6 flex gap-4 hover:border-primary/30 transition-colors">
          <Mail className="h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground text-sm">Contact Us</h3>
            <p className="text-xs text-muted-foreground mt-1">Send us a message</p>
          </div>
        </Link>
        <Link to="/messages" className="bg-card rounded-xl border border-border p-6 flex gap-4 hover:border-primary/30 transition-colors">
          <MessageCircle className="h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground text-sm">In-App Messages</h3>
            <p className="text-xs text-muted-foreground mt-1">Chat with our team</p>
          </div>
        </Link>
      </div>

      <FAQSection />
    </main>
    <Footer />
  </div>
);

export default Help;
