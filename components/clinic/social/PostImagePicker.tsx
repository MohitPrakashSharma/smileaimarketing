"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { IconSparkle, IconTrash } from "@/components/icons";
import { mediaUrl, type PostMedia } from "./types";

export type ImageBusy = "generating" | "uploading" | null;

type Props = {
  media: PostMedia | null;
  busy: ImageBusy;
  error: string;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

/** The image section of a draft: AI image from the prompt, or the clinic's own photo. */
export function PostImagePicker({ media, busy, error, prompt, onPromptChange, onGenerate, onUpload, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Image</p>
        {media && !busy && (
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-danger">
            <IconTrash className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-border bg-surface-muted sm:w-56">
          {media && (
            // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated route; next/image can't forward the session cookie
            <img src={mediaUrl(media.id)} alt={media.prompt ?? "Post image"} className={`h-full w-full object-cover ${busy ? "opacity-40" : ""}`} />
          )}
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
              <p className="text-xs font-semibold text-foreground">{busy === "generating" ? "Creating image…" : "Uploading…"}</p>
              {busy === "generating" && <p className="text-[11px] text-muted-foreground">Usually 15–30 seconds</p>}
            </div>
          )}
          {!media && !busy && (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <p className="text-xs font-semibold text-foreground">No image yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Create one or upload your own photo.</p>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {media?.source === "UPLOAD" ? (
            <p className="text-xs text-muted-foreground">Your uploaded photo. It will be used on every platform you choose.</p>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">What the picture shows</p>
                {!editing && (
                  <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-primary-ink hover:underline">
                    Edit
                  </button>
                )}
              </div>
              {editing ? (
                <Textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  aria-label="Image description"
                  maxLength={1000}
                  className="mt-1.5 text-sm"
                />
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{prompt || "—"}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                onGenerate();
              }}
              disabled={!!busy || prompt.trim().length < 3}
            >
              <span className="inline-flex items-center gap-1.5">
                <IconSparkle className="h-4 w-4" />
                {media?.source === "AI" ? "New image" : "Create image"}
              </span>
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={!!busy}>
              Upload photo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onUpload(file);
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">JPG, PNG or WebP, up to 10 MB. Only use photos you have the rights to, and never patient photos without written consent.</p>
          {error && (
            <p role="alert" className="text-xs font-semibold text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
