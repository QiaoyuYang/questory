"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type TurnResult } from "@/lib/client/api";
import { watchForDeploys } from "@/lib/client/deploys";
import { forgetShared, rememberShared, sharedStories } from "@/lib/client/share";
import type { StorySummary } from "@/lib/types";
import { HomeScreen } from "./HomeScreen";
import { JoinScreen } from "./JoinScreen";
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
  | { name: "story"; storyId: string; initial: TurnResult | null }
  | { name: "join"; storyId: string; code: string };

/** An invite link opens the app at /?join=<story id>.<code>. */
function readInvite(): { storyId: string; code: string } | null {
  const join = new URLSearchParams(window.location.search).get("join");
  const [storyId, code] = join?.split(".") ?? [];
  return storyId && code ? { storyId, code } : null;
}

/** Leave the invite link behind, so going home doesn't land on it again. */
function forgetInvite() {
  if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
}

export function QuestoryApp() {
  const [screen, setScreen] = useState<Screen | null>(null);
  const [stories, setStories] = useState<StorySummary[] | null>(null);
  const [mode, setMode] = useState<"mock" | "live" | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await api.listStories(sharedStories());
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
    const invite = readInvite();
    api
      .listStories(sharedStories())
      .then(
        (result) => {
          if (cancelled) return;
          setStories(result.stories);
          setMode(result.mode);
          if (invite) {
            setScreen({ name: "join", ...invite });
            return;
          }
          const current = recall();
          const open = current
            ? result.stories.find((story) => story.id === current && story.status === "active")
            : undefined;
          setScreen(open ? { name: "story", storyId: open.id, initial: null } : { name: "home" });
        },
        () => {
          if (cancelled) return;
          setStories([]);
          setScreen(invite ? { name: "join", ...invite } : { name: "home" });
        },
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const removeStory = useCallback(
    async (story: StorySummary) => {
      if (story.role === "owner") await api.deleteStory(story.id);
      else forgetShared(story.id);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => watchForDeploys(api.health), []);

  const goHome = useCallback(() => {
    remember(null);
    forgetInvite();
    setScreen({ name: "home" });
    void refresh();
    window.scrollTo({ top: 0 });
  }, [refresh]);

  // Out of an invite link and into the story, loaded whole: a friend who just joined
  // needs the chapters before theirs too. A partner's browser remembers the story,
  // since it belongs to their friend.
  const openFromInvite = useCallback((storyId: string, partner: boolean) => {
    if (partner) rememberShared(storyId);
    remember(storyId);
    forgetInvite();
    setScreen({ name: "story", storyId, initial: null });
    window.scrollTo({ top: 0 });
  }, []);
  const joinStoryId = screen?.name === "join" ? screen.storyId : null;
  const openInvited = useCallback(
    (role: "owner" | "partner") => {
      if (joinStoryId) openFromInvite(joinStoryId, role === "partner");
    },
    [joinStoryId, openFromInvite],
  );

  if (!screen) {
    return (
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-16" aria-busy="true">
        <div className="lane-line lane-line-moving" />
      </main>
    );
  }

  if (screen.name === "join") {
    return (
      <JoinScreen
        storyId={screen.storyId}
        code={screen.code}
        onJoined={(result) => openFromInvite(result.story.id, true)}
        onOpen={openInvited}
        onHome={goHome}
      />
    );
  }

  if (screen.name === "story") {
    return (
      <StoryScreen
        key={screen.storyId}
        storyId={screen.storyId}
        initial={screen.initial ? { story: screen.initial.story, turns: [screen.initial.turn] } : null}
        onHome={goHome}
      />
    );
  }

  return (
    <HomeScreen
      stories={stories}
      mode={mode}
      onRemove={removeStory}
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
