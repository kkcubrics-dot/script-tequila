import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function IconLayout({ ...props }: IconProps) {
  return <BaseIcon {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d="M15 4v16" /></BaseIcon>;
}
export function IconWrite({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></BaseIcon>;
}
export function IconChat({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></BaseIcon>;
}
export function IconHistory({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v4h4" /><path d="M12 7v5l3 3" /></BaseIcon>;
}
export function IconFolder({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></BaseIcon>;
}
export function IconSettings({ ...props }: IconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1.1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z" /></BaseIcon>;
}
export function IconLogout({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></BaseIcon>;
}
export function IconPanel({ ...props }: IconProps) {
  return <BaseIcon {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></BaseIcon>;
}
export function IconPlus({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M12 5v14" /><path d="M5 12h14" /></BaseIcon>;
}
export function IconSave({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M20 7v13H4V4h12z" /><path d="M8 4v6h8" /><path d="M8 20v-6h8v6" /></BaseIcon>;
}
export function IconSend({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="m3 12 18-9-5 18-3-7-10-2Z" /></BaseIcon>;
}
export function IconInsert({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M12 4v16" /><path d="m7 15 5 5 5-5" /></BaseIcon>;
}
export function IconReplace({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M3 7h14" /><path d="m13 3 4 4-4 4" /><path d="M21 17H7" /><path d="m11 13-4 4 4 4" /></BaseIcon>;
}
export function IconEdit({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></BaseIcon>;
}
export function IconMove({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /><path d="M5 7v10" /></BaseIcon>;
}
export function IconStar({ ...props }: IconProps) {
  return <BaseIcon {...props}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" /></BaseIcon>;
}
