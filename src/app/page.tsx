import { Suspense } from "react";
import ReceiptHero from "@/components/ReceiptHero";
import SubscribeForm from "@/components/SubscribeForm";
import Articles from "@/components/Articles";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      {/* Full-screen receipt animation */}
      <ReceiptHero />

      {/* Intro section directly below the animation */}
      <section className="relative z-10 -mt-1 bg-[#000610] px-6 pb-20 pt-16 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            whoiswriting
          </p>
          <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-6xl">
            Cole Ryan
          </h1>
          <p className="mx-auto max-w-md text-lg leading-relaxed text-muted">
            Writing insights on business, life, philosophy, and entrepreneurship.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="#subscribe"
              className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-black transition-all hover:bg-accent-hover hover:scale-105"
            >
              Subscribe
            </a>
            <a
              href="#articles"
              className="rounded-full border border-white/15 px-8 py-3 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/5"
            >
              Read Articles
            </a>
          </div>
        </div>

        {/* Gradient transition to dark background */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
      </section>

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
