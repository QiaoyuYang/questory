import { formatMinutes, formatPlaces, type WalkStats } from "@/lib/walk";

/** "You walked 24 minutes and found 5 places." Under a minute, only the places count. */
export function WalkSummary({ stats, total = false }: { stats: WalkStats; total?: boolean }) {
  return (
    <p className="text-[0.9375rem]">
      {stats.minutes >= 1 ? (
        <>
          You walked <strong className="text-lane">{formatMinutes(stats.minutes)}</strong> and found{" "}
        </>
      ) : (
        "You found "
      )}
      <strong className="text-lane">{formatPlaces(stats.places)}</strong>
      {total ? " in all." : "."}
    </p>
  );
}
