import { Suspense } from "react";
import CheckoutStatus from "./CheckoutStatus";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0908] px-5 py-12 text-[#F5F0EB]">
      <Suspense
        fallback={
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#D4A853]/70">
            Loading verified status…
          </div>
        }
      >
        <CheckoutStatus />
      </Suspense>
    </main>
  );
}
