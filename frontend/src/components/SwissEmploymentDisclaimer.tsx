import { Info } from "lucide-react";

const SwissEmploymentDisclaimer = () => (
  <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
    <p className="flex items-start gap-2">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        In Switzerland, families employing a nanny may be responsible for social contributions and accident insurance.
        Services such as{" "}
        <a href="https://www.quitt.ch" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          quitt.ch
        </a>{" "}
        can help manage payroll and legal obligations.
      </span>
    </p>
  </div>
);

export default SwissEmploymentDisclaimer;
