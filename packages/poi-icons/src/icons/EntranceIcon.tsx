import type { SVGProps } from 'react';

export function EntranceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4v-2H5V5h14v14h-4v2h4c1.1 0 2-.9 2-2zm-7 1v-3l-4 4 4 4v-3h6v-2h-6z" />
    </svg>
  );
}
