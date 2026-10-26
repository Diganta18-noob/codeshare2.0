import type { SVGProps } from 'react';

type IconName = 'code' | 'github' | 'arrow' | 'plus' | 'check' | 'people' | 'save' | 'link' | 'folder' | 'file' | 'chevron' | 'more' | 'sparkles' | 'download' | 'copy' | 'eye' | 'close' | 'terminal';

export default function UIIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    sparkles: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" /></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    terminal: <><path d="m5 6 6 6-6 6m8 0h6" /></>,
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
