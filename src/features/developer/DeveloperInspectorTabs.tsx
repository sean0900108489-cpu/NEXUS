/**
 * NEXUS Window OS — Developer Inspector Tabs
 *
 * Tab navigation for the developer inspector.
 *
 * @module features/developer
 */

"use client";

type DevTab = "apps" | "capabilities" | "archetypes";

export function DeveloperInspectorTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: DevTab;
  onTabChange: (tab: DevTab) => void;
}) {
  const tabs: { id: DevTab; label: string }[] = [
    { id: "apps", label: "Apps" },
    { id: "capabilities", label: "Capabilities" },
    { id: "archetypes", label: "Archetypes" },
  ];

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-white/5 shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? "bg-white/10 text-white"
              : "text-white/30 hover:text-white/50"
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
