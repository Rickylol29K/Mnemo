// src/app/app/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // No Navbar here — root layout already renders it
  return <>{children}</>;
}
