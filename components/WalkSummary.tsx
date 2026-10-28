import { formatMinutes, formatPlaces, type WalkStats } from "@/lib/walk";

type Props = {
  stats: WalkStats;
  /** Whose walk it was, in a shared case. */
  who?: "you" | "partner";
  total?: boolean;
};

/** "You walked 24 minutes and found 5 places." Under a minute, only the places count. */
export function WalkSummary({ stats, who = "you", total = false }: Props) {
  const subject = who === "you" ? "You" : "Your partner";
  return (
    <p className="text-[0.9375rem]">
      {stats.minutes >= 1 ? (
        <>
          {subject} walked <strong className="text-lane">{formatMinutes(stats.minutes)}</strong> and found{" "}
        </>
      ) : (
        `${subject} found `
      )}
      <strong className="text-lane">{formatPlaces(stats.places)}</strong>
      {total ? " in all." : "."}
    </p>
  );
}
