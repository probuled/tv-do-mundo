import { catColor, catName, countryOf, type WorldData } from "../data";
import { Flag } from "./Flag";

export function ChannelRow({
  world,
  i,
  active,
  onPick,
}: {
  world: WorldData;
  i: number;
  active?: boolean;
  onPick: (i: number) => void;
}) {
  const ch = world.channels[i];
  const [country] = countryOf(world, ch.c);
  return (
    <button
      role="option"
      aria-selected={active}
      className={`row ${active ? "on" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(i)}
    >
      <span className="dot" style={{ background: catColor(ch.cat) }} />
      <span className="row-title">{ch.n}</span>
      <span className="row-sub">
        <Flag code={ch.c} /> {country}
        {ch.cat[0] ? ` · ${catName(ch.cat[0], world)}` : ""}
      </span>
    </button>
  );
}
