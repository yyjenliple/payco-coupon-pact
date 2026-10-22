import { avatarColorOf, initialsOf } from "@/lib/format";

export type AvatarPerson = { id: number; name: string; avatarPath: string | null };

export function avatarSrc(path: string): string {
  return `/avatars/${encodeURIComponent(path)}`;
}

export function Avatar({ person, size = 40, className = "" }: { person: AvatarPerson; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) };
  if (person.avatarPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user uploads served by our own route
      <img
        src={avatarSrc(person.avatarPath)}
        alt=""
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: avatarColorOf(person.id) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink ${className}`}
    >
      {initialsOf(person.name)}
    </span>
  );
}
