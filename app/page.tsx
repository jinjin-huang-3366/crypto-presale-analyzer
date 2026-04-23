import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Track crypto presale projects with transparent risk scoring, red flags, and project summaries.",
};

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 py-14">
      <section className="surface-card rounded-2xl p-8">
        <div className="mb-5 flex items-center gap-4">
          <Image
            src="/presale-llama-logo.svg"
            alt="Crypto Presale Analyzer logo"
            width={286}
            height={76}
            priority
          />
        </div>
        <p className="tag-accent inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
          Presale Intelligence
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-blue-50 sm:text-5xl">
          DeFi-style risk board for presale research
        </h1>
        <p className="text-muted mt-4 max-w-3xl text-sm sm:text-base">
          Evaluate presale projects using structured score categories, red flag detection,
          and concise summary context.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link className="btn-primary rounded-md px-4 py-2" href="/projects">
            Browse Projects
          </Link>
          <Link className="btn-ghost rounded-md px-4 py-2" href="/compare">
            Compare Projects
          </Link>
          <Link className="btn-ghost rounded-md px-4 py-2" href="/admin">
            View Admin Metrics
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="surface-card-soft rounded-xl p-5">
          <p className="text-faint text-xs uppercase tracking-wide">Scoring</p>
          <p className="mt-2 text-sm text-blue-100">
            Multi-category score from tokenomics, credibility, liquidity, narrative, transparency, and hype.
          </p>
        </article>
        <article className="surface-card-soft rounded-xl p-5">
          <p className="text-faint text-xs uppercase tracking-wide">Red Flags</p>
          <p className="mt-2 text-sm text-blue-100">
            Rule-based alerts for vesting quality, insider concentration, and unclear utility claims.
          </p>
        </article>
        <article className="surface-card-soft rounded-xl p-5">
          <p className="text-faint text-xs uppercase tracking-wide">Comparison</p>
          <p className="mt-2 text-sm text-blue-100">
            Side-by-side comparison for 2 to 4 projects to identify stronger and weaker profiles quickly.
          </p>
        </article>
      </section>

      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-100">
        Research tool only. Not financial advice.
      </div>
    </main>
  );
}
