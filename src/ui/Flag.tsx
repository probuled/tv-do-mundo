import { flagCode } from "../data";

// Bandeira em SVG (flag-icons): emojis de bandeira não aparecem no Windows.
export function Flag({ code }: { code: string }) {
  return <span className={`fi fi-${flagCode(code)} flag`} aria-hidden />;
}
