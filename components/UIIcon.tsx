import type { SVGProps } from 'react';

type IconName = 'code' | 'github' | 'arrow' | 'plus' | 'check' | 'people' | 'save' | 'link';

export default function UIIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16" /></>,
    github: <><path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.5a3 3 0 0 0-.8-2.3c2.7-.3 5.6-1.3 5.6-6A4.7 4.7 0 0 0 18.5 6a4.4 4.4 0 0 0-.1-3.4S17.3 2.3 15 3.8a12 12 0 0 0-6 0C6.7 2.3 5.6 2.6 5.6 2.6A4.4 4.4 0 0 0 5.5 6a4.7 4.7 0 0 0-1.3 3.5c0 4.7 2.9 5.7 5.6 6A3 3 0 0 0 9 17.8v3.5" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m3 10v-2a6 6 0 0 0-3-5" /></>,
    save: <><path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8" /><path d="M14 5v2" /></>,
    link: <><path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0)" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
