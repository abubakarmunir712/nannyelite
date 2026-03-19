import { Link } from "react-router-dom";
import { ArrowLeft, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Blog = () => (
  <div className="min-h-screen bg-secondary">
    <SEO title="NannyElite Blog – Childcare Tips & Advice" description="Expert childcare tips, parenting advice, and nanny industry insights from NannyElite Switzerland." path="/blog" />
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold text-primary">NannyElite</Link>
        <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12 text-center">
      <Newspaper className="h-12 w-12 text-primary mx-auto mb-4" />
      <h1 className="font-display text-3xl font-bold text-foreground mb-4">Blog</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Our blog is coming soon! We'll share childcare tips, platform updates, and stories from the NannyElite community.
      </p>
      <a href="mailto:info@nannyelite.ch">
        <Button variant="outline" className="rounded-full">Get Notified</Button>
      </a>
    </main>
    <Footer />
  </div>
);

export default Blog;
