export default function PricingPage() {
  return (
    <main className="container max-w-3xl mx-auto py-20 text-center">
      <h1 className="text-4xl font-bold mb-6">Pricing</h1>
      <p className="mb-12 text-muted-foreground">Start free, upgrade when you need more.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-6">
          <h2 className="text-2xl font-semibold mb-2">Free</h2>
          <p className="mb-4 text-sm text-muted-foreground">Basic features for students.</p>
          <ul className="text-left text-sm space-y-2">
            <li>✓ 3 uploads / month</li>
            <li>✓ AI Summaries</li>
            <li>✓ Flashcards</li>
          </ul>
        </div>
        <div className="rounded-2xl border p-6">
          <h2 className="text-2xl font-semibold mb-2">Pro – €8/month</h2>
          <p className="mb-4 text-sm text-muted-foreground">Unlimited study power.</p>
          <ul className="text-left text-sm space-y-2">
            <li>✓ Unlimited uploads</li>
            <li>✓ Save flashcards</li>
            <li>✓ Export decks</li>
          </ul>
        </div>
      </div>
    </main>
  );
}