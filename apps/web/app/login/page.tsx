"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !email.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8">
      <Link href="/" className="flex items-center gap-2 no-underline">
        <div className="w-[18px] h-[18px] border-[1.5px] border-forest rounded-full flex items-center justify-center">
          <div className="w-[6px] h-[6px] bg-forest rounded-full" />
        </div>
        <span className="text-[15px] font-bold tracking-[-0.02em] text-ink">Sim0</span>
      </Link>

      <div className="w-full max-w-[380px] border border-rule rounded-[10px] p-7 bg-[#FCFBF8] flex flex-col gap-5">
        {sent ? (
          <>
            <span className="text-[17px] font-semibold tracking-[-0.01em]">Check your email</span>
            <p className="m-0 text-[13.5px] leading-[1.6] text-[#6E6A60]">
              If <strong>{email.trim()}</strong> is on the guest list, a login link just went out. It expires in 15
              minutes and works once.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-[12.5px] text-forest font-semibold bg-transparent border-none p-0 text-left cursor-pointer hover:underline"
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            <span className="text-[17px] font-semibold tracking-[-0.01em]">Log in to Sim0</span>
            <p className="m-0 text-[13.5px] leading-[1.6] text-[#6E6A60]">
              Enter your email and we&apos;ll send a one-time login link.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="px-[13px] py-[11px] border border-rule rounded-[6px] bg-paper text-[14px] outline-none focus:border-forest"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-[14px] py-[11px] bg-forest text-paper border-none rounded-[6px] text-[13px] font-semibold hover:bg-forest-deep disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send login link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
