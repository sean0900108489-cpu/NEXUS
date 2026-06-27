/**
 * NEXUS Window OS — Note Editor
 *
 * Title and content editing for a note.
 *
 * @module features/notes
 */

"use client";

import { useState, useCallback, useEffect } from "react";

export function NoteEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
}: {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
}) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localContent, setLocalContent] = useState(content);

  // Sync external changes
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleTitleBlur = useCallback(() => {
    if (localTitle !== title) {
      onTitleChange(localTitle);
    }
  }, [localTitle, title, onTitleChange]);

  const handleContentBlur = useCallback(() => {
    if (localContent !== content) {
      onContentChange(localContent);
    }
  }, [localContent, content, onContentChange]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Title */}
      <input
        className="w-full bg-transparent px-4 py-3 text-sm font-medium text-white/80 placeholder:text-white/15 outline-none border-b border-white/5"
        placeholder="Note title..."
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      {/* Content */}
      <textarea
        className="flex-1 w-full bg-transparent px-4 py-3 text-xs text-white/60 placeholder:text-white/10 outline-none resize-none"
        placeholder="Start writing..."
        value={localContent}
        onChange={(e) => setLocalContent(e.target.value)}
        onBlur={handleContentBlur}
      />
    </div>
  );
}
