import type { Fact } from "@/lib/impact";

/** Big numbers, each read as a sentence with what it counts, and where the number comes from. */
export function StatTiles({ facts, className = "" }: { facts: Fact[]; className?: string }) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 md:max-w-3xl md:gap-5 ${className}`}>
      {facts.map((fact) => (
        <li key={fact.value} className="rounded-[14px] bg-kerb px-5 py-4">
          <p className="font-sign text-5xl leading-none font-bold">{fact.value}</p>
          <p className="mt-1 text-concrete text-pretty">{fact.label}</p>
          <a href={fact.source.url} className="mt-2 inline-block text-sm text-concrete underline underline-offset-4 hover:text-paint">
            {fact.source.name}
          </a>
        </li>
      ))}
    </ul>
  );
}
