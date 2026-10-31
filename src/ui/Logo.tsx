// Logo do TV do Mundo (public/logo.svg).
export function Logo({ size = 36 }: { size?: number }) {
  return <img className="logo-mark" src={`${import.meta.env.BASE_URL}logo.svg`} width={size} height={size} alt="" />;
}
