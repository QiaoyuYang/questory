"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import type { StorySummary } from "@/lib/types";
import { HomeScreen } from "./HomeScreen";
import { StoryScreen } from "./StoryScreen";

const CURRENT_KEY = "questory:current-story";

function remember(storyId: string | null) {
  try {
    if (storyId) localStorage.setItem(CURRENT_KEY, storyId);
    else localStorage.removeItem(CURRENT_KEY);
  } catch {
    // Private mode or storage disabled: the app still works, it just won't reopen the story.
  }
}

function recall(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

type Screen =
  | { name: "home" }
  | { name: "story"; storyId: string; initial: TurnResult | null };

export function QuestoryApp() {
  const [screen, setScreen] = useState<Screen | null>(null);
  const [stories, setStories] = useState<StorySummary[] | null>(null);
  const [mode, setMode] = useState<"mock" | "live" | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await api.listStories();
      setStories(result.stories);
      setMode(result.mode);
      return result.stories;
    } catch {
      setStories([]);
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .listStories()
      .then(
        (result) => {
          if (cancelled) return;
          setStories(result.stories);
          setMode(result.mode);
          const current = recall();
          const open = current
            ? result.stories.find((story) => story.id === current && story.status === "active")
            : undefined;
          setScreen(open ? { name: "story", storyId: open.id, initial: null } : { name: "home" });
        },
        () => {
          if (cancelled) return;
          setStories([]);
          setScreen({ name: "home" });
        },
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!screen) {
    return (
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-16" aria-busy="true">
        <div className="lane-line lane-line-moving" />
      </main>
    );
  }

  if (screen.name === "story") {
    return (
      <StoryScreen
        key={screen.storyId}
        storyId={screen.storyId}
        initial={screen.initial ? { story: screen.initial.story, turns: [screen.initial.turn] } : null}
        onHome={() => {
          remember(null);
          setScreen({ name: "home" });
          void refresh();
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <HomeScreen
      stories={stories}
      mode={mode}
      onStarted={(result) => {
        remember(result.story.id);
        setScreen({ name: "story", storyId: result.story.id, initial: result });
        window.scrollTo({ top: 0 });
      }}
      onOpen={(storyId) => {
        remember(storyId);
        setScreen({ name: "story", storyId, initial: null });
        window.scrollTo({ top: 0 });
      }}
    />
  );
}
