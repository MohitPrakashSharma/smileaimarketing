"use client";

import { useEffect, useRef, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { IconSend, IconSparkle, IconInfo } from "@/components/icons";
import { PLATFORMS, PLATFORM_LABEL, PLATFORM_MEDIA_NOTE, type Platform } from "@/lib/social/platforms";
import type { PostMedia, SocialPost } from "./types";
import { PostImagePicker, type ImageBusy } from "./PostImagePicker";

type ChatMessage = { role: "user" | "assistant"; content: string; error?: boolean };

type Draft = {
  topic: string;
  caption: string;
  hashtags: string[];
  platformCaptions: Record<Platform, string>;
  imagePrompt: string;
};

const SUGGESTIONS = ["Benefits of flossing", "Holiday hours", "Meet our hygienist", "Teeth whitening tips"];

/** "2026-09-30T14:00" in the browser's local time, for <input type="datetime-local">. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AgentPanel({ onPublished, livePlatforms }: { onPublished: (post: SocialPost) => void; livePlatforms: Platform[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [request, setRequest] = useState("");
  const [selected, setSelected] = useState<Platform[]>([]);
  const [tab, setTab] = useState<Platform>("INSTAGRAM");
  const [scheduleAt, setScheduleAt] = useState("");
  const [submitting, setSubmitting] = useState<"now" | "schedule" | null>(null);
  const [publishError, setPublishError] = useState("");
  const [notice, setNotice] = useState("");
  const [media, setMedia] = useState<PostMedia | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageBusy, setImageBusy] = useState<ImageBusy>(null);
  const [imageError, setImageError] = useState("");
  // Bumped on discard/publish so a slow image request can't attach to the next draft.
  const draftGen = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const generateImage = async (prompt: string) => {
    const gen = draftGen.current;
    setImageBusy("generating");
    setImageError("");
    try {
      const res = await fetch("/api/clinic/social/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create the image.");
      if (gen === draftGen.current) setMedia(data.media);
    } catch (err) {
      if (gen === draftGen.current) setImageError(err instanceof Error ? err.message : "Couldn't create the image.");
    } finally {
      if (gen === draftGen.current) setImageBusy(null);
    }
  };

  const uploadImage = async (file: File) => {
    const gen = draftGen.current;
    if (file.size > 10 * 1024 * 1024) return setImageError("Images must be 10 MB or smaller.");
    setImageBusy("uploading");
    setImageError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/clinic/social/media", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't upload the image.");
      if (gen === draftGen.current) setMedia(data.media);
    } catch (err) {
      if (gen === draftGen.current) setImageError(err instanceof Error ? err.message : "Couldn't upload the image.");
    } finally {
      if (gen === draftGen.current) setImageBusy(null);
    }
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    const history = [...messages.filter((m) => !m.error), { role: "user" as const, content }];
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setThinking(true);
    setNotice("");
    try {
      const res = await fetch("/api/clinic/social/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The assistant couldn't answer.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.draft) {
        const first = !draft;
        setDraft(data.draft);
        setImagePrompt(data.draft.imagePrompt);
        // Create the picture as soon as the first draft lands; revisions keep the current image.
        if (first && !media && !imageBusy) generateImage(data.draft.imagePrompt);
        setRequest((r) => r || content);
        setPublishError("");
      }
      if (data.platforms?.length) {
        setSelected(data.platforms);
        setTab(data.platforms[0]);
      }
      if (data.scheduledFor) setScheduleAt(toLocalInput(data.scheduledFor));
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: err instanceof Error ? err.message : "Something went wrong.", error: true }]);
    } finally {
      setThinking(false);
    }
  };

  const togglePlatform = (p: Platform) => {
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
    setTab(p);
  };

  const resetDraft = () => {
    draftGen.current += 1;
    setMedia(null);
    setImagePrompt("");
    setImageBusy(null);
    setImageError("");
    setDraft(null);
    setRequest("");
    setSelected([]);
    setScheduleAt("");
    setPublishError("");
  };

  const publish = async (mode: "now" | "schedule") => {
    if (!draft || !selected.length) return;
    setPublishError("");
    if (selected.includes("INSTAGRAM") && !media) return setPublishError("Instagram posts need an image. Add one, or untick Instagram.");
    let scheduledFor: string | undefined;
    if (mode === "schedule") {
      const when = new Date(scheduleAt);
      if (!scheduleAt || Number.isNaN(when.getTime())) return setPublishError("Pick a date and time to schedule.");
      scheduledFor = when.toISOString();
    }
    setSubmitting(mode);
    try {
      const res = await fetch("/api/clinic/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: draft.topic,
          request: request || undefined,
          caption: draft.caption,
          hashtags: draft.hashtags,
          targets: PLATFORMS.filter((p) => selected.includes(p)).map((p) => ({ platform: p, caption: draft.platformCaptions[p] })),
          scheduledFor,
          mediaId: media?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't publish the post.");
      onPublished(data.post);
      const names = selected.map((p) => PLATFORM_LABEL[p]).join(", ");
      setNotice(
        mode === "schedule"
          ? `Scheduled “${draft.topic}” for ${new Date(scheduledFor!).toLocaleString("en-CA")} on ${names}.`
          : `Published “${draft.topic}” to ${names}${selected.some((p) => livePlatforms.includes(p)) ? "" : " (test mode)"}. It's in the tracking table below.`
      );
      setMessages((m) => [...m, { role: "assistant", content: mode === "schedule" ? `Done — scheduled for ${names}.` : `Done — published to ${names}.` }]);
      resetDraft();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Couldn't publish the post.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <AdminCard title="Social media assistant" subtitle="Tell it what to post — it writes the copy for each platform" icon={IconSparkle}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-foreground">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          {livePlatforms.length ? (
            <p>
              <strong>Live on {livePlatforms.map((p) => PLATFORM_LABEL[p]).join(" and ")}</strong> — posts there go out for real.{" "}
              {PLATFORMS.filter((p) => !livePlatforms.includes(p)).map((p) => PLATFORM_LABEL[p]).join(" and ")} stay in test mode.
            </p>
          ) : (
            <p>
              <strong>Test mode</strong> — posts are recorded here but not sent to the real platforms. Connect Facebook &amp; Instagram under Accounts to publish for real.
            </p>
          )}
        </div>

        <div ref={listRef} className="max-h-[420px] min-h-[160px] space-y-3 overflow-y-auto rounded-xl bg-surface-muted/50 p-3 sm:p-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-foreground">What should we post?</p>
              <p className="mt-1 text-xs text-muted-foreground">Try “Publish a post about the benefits of flossing”.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-background-dark text-white"
                    : m.error
                      ? "border border-danger/30 bg-danger/10 text-danger"
                      : "border border-border bg-surface text-foreground"
                }`}
              >
                {m.content}
              </p>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <p className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-muted-foreground">Writing…</p>
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(`Publish a post about: ${s.toLowerCase()}`)}
                disabled={thinking}
                className="min-h-9 rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-ink disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={draft ? "Ask for changes, e.g. “make it shorter”" : "e.g. Publish a post about the benefits of flossing"}
            aria-label="Message the social media assistant"
            maxLength={4000}
          />
          <Button type="submit" size="sm" disabled={thinking || !input.trim()} aria-label="Send" className="shrink-0 !px-4">
            <IconSend className="h-4 w-4" />
          </Button>
        </form>

        {notice && (
          <p role="status" className="rounded-xl border border-growth/30 bg-growth/10 px-4 py-3 text-xs font-semibold text-growth-ink">
            {notice}
          </p>
        )}

        {draft && (
          <div className="space-y-4 rounded-2xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Draft</p>
                <input
                  value={draft.topic}
                  onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
                  aria-label="Post topic"
                  className="mt-1 w-full bg-transparent font-display text-lg font-semibold text-foreground focus:outline-none"
                />
              </div>
              <button type="button" onClick={resetDraft} className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-danger">
                Discard
              </button>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-foreground">Where should it be published?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PLATFORMS.map((p) => {
                  const on = selected.includes(p);
                  return (
                    <label
                      key={p}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                        on ? "border-primary bg-primary/10 text-primary-ink" : "border-border text-foreground hover:bg-surface-muted"
                      }`}
                    >
                      <input type="checkbox" checked={on} onChange={() => togglePlatform(p)} className="h-4 w-4 accent-primary" />
                      {PLATFORM_LABEL[p]}
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{livePlatforms.includes(p) ? "Live" : "Test"}</span>
                    </label>
                  );
                })}
              </div>
              {!selected.length && <p className="mt-2 text-xs text-muted-foreground">Choose at least one platform to publish.</p>}
            </fieldset>

            <PostImagePicker
              media={media}
              busy={imageBusy}
              error={imageError}
              prompt={imagePrompt}
              onPromptChange={setImagePrompt}
              onGenerate={() => generateImage(imagePrompt)}
              onUpload={uploadImage}
              onRemove={() => setMedia(null)}
            />

            <div>
              <div role="tablist" aria-label="Caption per platform" className="flex gap-1 overflow-x-auto border-b border-border">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    role="tab"
                    type="button"
                    aria-selected={tab === p}
                    onClick={() => setTab(p)}
                    className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold ${
                      tab === p ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {PLATFORM_LABEL[p]}
                    {selected.includes(p) && <span aria-hidden className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
                  </button>
                ))}
              </div>
              <Textarea
                rows={7}
                value={draft.platformCaptions[tab]}
                onChange={(e) => setDraft({ ...draft, platformCaptions: { ...draft.platformCaptions, [tab]: e.target.value } })}
                aria-label={`${PLATFORM_LABEL[tab]} caption`}
                className="mt-3 text-sm"
              />
              <div className="mt-1 flex justify-between gap-3 text-[11px] text-muted-foreground">
                <span>{PLATFORM_MEDIA_NOTE[tab] ?? ""}</span>
                <span>{draft.platformCaptions[tab].length} characters</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
              <label className="flex-1 text-xs font-semibold text-foreground">
                Schedule for later <span className="font-normal text-muted-foreground">(optional)</span>
                <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="mt-1.5" />
              </label>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => publish("schedule")}
                  disabled={!selected.length || !scheduleAt || !!submitting || !!imageBusy}
                  loading={submitting === "schedule"}
                >
                  Schedule
                </Button>
                <Button size="sm" onClick={() => publish("now")} disabled={!selected.length || !!submitting || !!imageBusy} loading={submitting === "now"}>
                  Publish now
                </Button>
              </div>
            </div>
            {publishError && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {publishError}
              </p>
            )}
          </div>
        )}
      </div>
    </AdminCard>
  );
}
