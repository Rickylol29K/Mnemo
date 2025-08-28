import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="container max-w-md mx-auto py-20 text-center">
      <h1 className="text-3xl font-bold mb-6">Login</h1>
      <p className="mb-4">This is just a placeholder. Auth coming soon.</p>
      <Link href="/signup" className="underline text-blue-600">
        Need an account? Sign up
      </Link>
    </main>
  );
}