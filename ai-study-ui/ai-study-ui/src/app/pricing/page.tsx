export const metadata = {
  title: "Pricing",
  description: "Everything is free during the open launch.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-2 text-sm text-zinc-600">
          
        </p>
      </div>

      <div className="mt-8 grid justify-center">
        <div className="rounded-3xl border bg-white p-8 sm:p-10 shadow-sm">
          <div className="text-center">
            <div className="text-3xl font-semibold">Free</div>
            <p className="mt-2 text-zinc-600">The full package</p>
          </div>

          <ul className="mt-6 space-y-3 text-[15px]">
            <li>✓ Unlimited uploads</li>
            <li>✓ AI Summaries</li>
            <li>✓ Flashcards & Quizzes</li>
            <li>✓ Save Sets & Quizzes to your dashboard</li>
            <li>✓ View saved sets & quizzes later</li>
          </ul>

          <div className="mt-8 flex justify-center">
            <a
              href="/app"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to tool
            </a>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-500">
            During launch, all features are free. Paid plans & more features may arrive later.
          </p>
        </div>
      </div>
    </div>
  );
}
