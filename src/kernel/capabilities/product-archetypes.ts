/**
 * NEXUS Window OS — Product Archetype Map
 *
 * Each archetype defines the capabilities needed to build
 * a specific kind of product.
 *
 * This is a design tool — it helps you reason about what
 * capabilities a new app needs BEFORE you build it.
 *
 * @module kernel/capabilities/product-archetypes
 */

import type { NexusProductArchetype } from "./capability-types";

/**
 * All known product archetypes.
 *
 * When building a new window app, find the closest archetype
 * and check which capabilities you already have vs. need to build.
 */
export const PRODUCT_ARCHETYPES: NexusProductArchetype[] = [
  {
    kind: "chat-app",
    title: "Chat App",
    description: "Text-based conversation with AI or other users. Like ChatGPT, WhatsApp, Slack.",
    requiredCapabilities: ["chat", "composer"],
    optionalCapabilities: ["media-upload", "notifications", "search", "profiles"],
    examples: ["Global Chat", "WhatsApp", "Slack", "ChatGPT"],
  },
  {
    kind: "knowledge-app",
    title: "Knowledge App",
    description: "Personal or shared knowledge management. Like Notion, Obsidian, Evernote.",
    requiredCapabilities: ["composer", "notes-capture", "resource-library", "resource-preview"],
    optionalCapabilities: ["search", "templates", "export", "collaboration"],
    examples: ["Notes", "Notion", "Obsidian", "Evernote"],
  },
  {
    kind: "resource-app",
    title: "Resource App",
    description: "Browse, search, and manage uploaded files and media. Like Google Drive, Dropbox.",
    requiredCapabilities: ["resource-library", "resource-preview", "media-upload", "search"],
    optionalCapabilities: ["templates", "export", "collaboration"],
    examples: ["Artifact Library", "Google Drive", "Dropbox"],
  },
  {
    kind: "community-app",
    title: "Community App",
    description: "Discussion forum with threads, replies, and moderation. Like Reddit, Discourse.",
    requiredCapabilities: ["feed", "thread", "comments", "composer"],
    optionalCapabilities: ["media-upload", "moderation", "notes-capture", "search", "profiles", "reactions"],
    examples: ["Forum", "Reddit", "Discourse", "Stack Overflow"],
  },
  {
    kind: "social-feed-app",
    title: "Social Feed App",
    description: "Media-centric social feed with profiles and reactions. Like Instagram, Twitter, TikTok.",
    requiredCapabilities: ["feed", "media-upload", "profiles", "comments", "reactions"],
    optionalCapabilities: ["follow-graph", "notifications", "moderation", "search"],
    examples: ["Instagram", "Twitter/X", "TikTok", "Behance"],
  },
  {
    kind: "creative-editor-app",
    title: "Creative Editor App",
    description: "Visual canvas with templates, resource library, and export. Like Canva, Figma.",
    requiredCapabilities: ["canvas", "media-upload", "resource-library", "export"],
    optionalCapabilities: ["templates", "collaboration", "comments", "profiles"],
    examples: ["Canva", "Figma", "Adobe Express", "Photopea"],
  },
  {
    kind: "marketplace-app",
    title: "Marketplace App",
    description: "Task-based marketplace with offers, contracts, and payments. Like Airtasker, Fiverr.",
    requiredCapabilities: ["marketplace", "profiles", "media-upload", "comments"],
    optionalCapabilities: ["payments", "reviews", "chat", "moderation", "search"],
    examples: ["Airtasker", "Fiverr", "Upwork", "TaskRabbit"],
  },
  {
    kind: "workspace-app",
    title: "Workspace App",
    description: "AI-powered collaborative workspace with agents and tools. Like NEXUS Workspace.",
    requiredCapabilities: ["workspace", "chat", "resource-library", "composer"],
    optionalCapabilities: ["collaboration", "notifications", "commands", "search"],
    examples: ["NEXUS Workspace", "Claude Projects", "ChatGPT Team"],
  },
  {
    kind: "admin-app",
    title: "Admin App",
    description: "Platform administration, moderation, and configuration.",
    requiredCapabilities: ["moderation", "profiles"],
    optionalCapabilities: ["search", "notifications", "commands", "export"],
    examples: ["Admin Dashboard", "Supabase Dashboard", "Vercel Admin"],
  },
];
