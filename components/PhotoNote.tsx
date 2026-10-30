import Link from "next/link";
import { GAME_MASTER } from "@/lib/types";

/** Where photos go, said before the first one is taken. */
export function PhotoNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm text-concrete text-pretty ${className}`}>
      {GAME_MASTER} runs on Meta&apos;s AI models, so your photos are sent to Meta.{" "}
      <Link href="/privacy" className="font-semibold underline underline-offset-4 hover:text-paint">
        Privacy
      </Link>
    </p>
  );
}
