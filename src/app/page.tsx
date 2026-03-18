import { Suspense } from "react";
import PirateShipHero from "@/components/PirateShipHero";
import SubscribeForm from "@/components/SubscribeForm";
import Articles from "@/components/Articles";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <PirateShipHero />
      <SubscribeForm />
      <Suspense
        fallback={
          <section className="px-6 py-24">
            <div className="mx-auto max-w-4xl">
              <div className="h-8 w-48 animate-pulse rounded bg-card" />
              <div className="mt-8 h-64 animate-pulse rounded-2xl bg-card" />
            </div>
          </section>
        }
      >
        <Articles />
      </Suspense>
      <Footer />
    </main>
  );
}
