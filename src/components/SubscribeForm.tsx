"use client";

import { useState, FormEvent } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("You're in. Welcome aboard.");
        setEmail("");
        setFirstName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <section id="subscribe" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
          Get new articles delivered to you
        </h2>
        <p className="mb-10 text-muted">
          No spam, no fluff. Just writing worth reading.
        </p>

        {status === "success" ? (
          <div className="mx-auto max-w-md rounded-2xl border border-accent/30 bg-accent/5 p-8">
            <div className="mb-3 text-4xl">&#9875;</div>
            <p className="text-lg font-semibold text-accent">{message}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-12 rounded-xl border border-border bg-card px-4 text-foreground placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none sm:w-36"
            />
            <input
              type="email"
              placeholder="Your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 flex-1 rounded-xl border border-border bg-card px-4 text-foreground placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="h-12 rounded-xl bg-accent px-8 text-sm font-semibold text-black transition-all hover:bg-accent-hover disabled:opacity-50 hover:scale-105"
            >
              {status === "loading" ? "..." : "Subscribe"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-4 text-sm text-red-400">{message}</p>
        )}
      </div>
    </section>
  );
}
