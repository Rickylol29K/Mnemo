import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="container max-w-md mx-auto py-20 text-center">
      <h1 className="text-3xl font-bold mb-6">Sign Up</h1>
      <p className="mb-4">This is just a placeholder. Accounts coming soon.</p>
      <Link href="/login" className="underline text-blue-600">
        Already have an account? Log in
      </Link>
    </main>
  );
}
