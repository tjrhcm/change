import type { View } from "../types";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onScanFolder: () => void;
}

const navItems: { id: View; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "albums", label: "专辑" },
  { id: "artists", label: "歌手" },
];

export function Sidebar({ currentView, onViewChange, onScanFolder }: SidebarProps) {
  return (
    <div className="w-48 bg-zinc-900 flex flex-col h-full border-r border-zinc-800">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-zinc-100">Change</h1>
      </div>

      <nav className="flex-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
              currentView === item.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-2 pb-4">
        <button
          onClick={onScanFolder}
          className="w-full px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        >
          选择文件夹
        </button>
      </div>
    </div>
  );
}
