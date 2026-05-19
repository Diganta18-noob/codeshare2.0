export interface Language {
  id: string;
  label: string;
  extension: string;
}

export const LANGUAGES: Language[] = [
  { id: 'javascript', label: 'JavaScript', extension: '.js' },
  { id: 'typescript', label: 'TypeScript', extension: '.ts' },
  { id: 'python', label: 'Python', extension: '.py' },
  { id: 'java', label: 'Java', extension: '.java' },
  { id: 'csharp', label: 'C#', extension: '.cs' },
  { id: 'cpp', label: 'C++', extension: '.cpp' },
  { id: 'go', label: 'Go', extension: '.go' },
  { id: 'rust', label: 'Rust', extension: '.rs' },
  { id: 'html', label: 'HTML', extension: '.html' },
  { id: 'css', label: 'CSS', extension: '.css' },
  { id: 'json', label: 'JSON', extension: '.json' },
  { id: 'yaml', label: 'YAML', extension: '.yaml' },
  { id: 'markdown', label: 'Markdown', extension: '.md' },
  { id: 'sql', label: 'SQL', extension: '.sql' },
  { id: 'shell', label: 'Bash/Shell', extension: '.sh' },
  { id: 'php', label: 'PHP', extension: '.php' },
  { id: 'ruby', label: 'Ruby', extension: '.rb' },
  { id: 'swift', label: 'Swift', extension: '.swift' },
  { id: 'kotlin', label: 'Kotlin', extension: '.kt' },
  { id: 'xml', label: 'XML', extension: '.xml' },
];

export function getExtensionForLanguage(languageId: string): string {
  const lang = LANGUAGES.find((l) => l.id === languageId);
  return lang?.extension || '.txt';
}

export function getLabelForLanguage(languageId: string): string {
  const lang = LANGUAGES.find((l) => l.id === languageId);
  return lang?.label || languageId;
}
