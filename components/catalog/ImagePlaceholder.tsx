// Stand-in for a not-yet-uploaded product photo. Replaces design-reference/'s
// `<image-slot>` design-tool web component (not part of the real app, see
// CLAUDE.md) with a plain placeholder box matching the same visual slot.
export function ImagePlaceholder({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gray px-3 text-center text-xs text-[#93a0bd] ${className}`}
    >
      {label}
    </div>
  );
}
