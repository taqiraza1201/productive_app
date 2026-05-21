"use client";

import Link from "next/link";

export default function CheckInLock({ title = "Daily check-in required." }: { title?: string }) {
  return (
    <div className="max-w-2xl mx-auto bg-gray-900 border border-amber-500/40 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-amber-300">{title}</h2>
      <p className="text-sm text-gray-300 mt-2">
        Your dashboard is locked until today&apos;s check-in is submitted.
      </p>
      <Link
        href="/check-in"
        className="inline-flex mt-4 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm"
      >
        Submit check-in now
      </Link>
    </div>
  );
}
