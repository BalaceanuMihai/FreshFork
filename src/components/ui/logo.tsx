export function Logo() {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-primary shrink-0">
        <path
          d="M11 2C11 2 7 5 7 10C7 12.5 8.5 14.5 11 15V20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M15 2V7L13.5 8.5L15 10V20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-display font-semibold text-lg text-foreground">FreshFork</span>
    </span>
  );
}
