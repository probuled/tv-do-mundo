import { Globe, Tv } from "lucide-react";
import { setState, useStore, type View } from "../store";

const ICON = { size: 16, strokeWidth: 1.75 } as const;

const VIEWS: { value: View; label: string; title: string; Icon: typeof Globe }[] = [
  { value: "globe", label: "Globo", title: "Ver os canais no globo", Icon: Globe },
  { value: "tv", label: "TV", title: "Ver os canais em lista, como numa TV", Icon: Tv },
];

// Troca entre o globo 3D e o modo TV (grade de canais).
export function ViewSwitch({ compact }: { compact?: boolean }) {
  const view = useStore((s) => s.view);
  return (
    <div className={`segmented view-switch ${compact ? "is-compact" : ""}`} role="radiogroup" aria-label="Modo de ver">
      {VIEWS.map(({ value, label, title, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={view === value}
          aria-label={compact ? label : undefined}
          className={view === value ? "is-on" : ""}
          title={title}
          onClick={() => setState({ view: value })}
        >
          <Icon {...ICON} aria-hidden />
          {!compact && label}
        </button>
      ))}
    </div>
  );
}
