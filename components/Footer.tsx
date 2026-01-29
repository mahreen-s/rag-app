export default function Footer() {
  return (
    <footer className="border-t border-border/50 mt-auto py-6 bg-surface/50">
      <div className="container mx-auto px-4 flex items-center justify-between text-sm text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-primary">Juridisk</span>
          <span className="bg-primary text-background px-1 py-0.5 rounded text-xs font-semibold">
            AI
          </span>
        </div>
        <p>Drevet av AI — ikke juridisk rådgivning</p>
      </div>
    </footer>
  );
}
