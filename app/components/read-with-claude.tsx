function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function ReadWithClaude({ 
  articleUrl, 
  articleTitle 
}: { 
  articleUrl: string; 
  articleTitle: string;
}) {
  const prompt = `${articleTitle}: ${articleUrl}`;
  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
  const chatgptUrl = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`;

  return (
    <div className="flex gap-2">
      <a
        href={claudeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-[#D97757] text-neutral-800 dark:text-neutral-200 hover:bg-[#D97757] hover:text-white transition-colors"
      >
        Claude
        <ExternalLinkIcon />
      </a>
      <a
        href={chatgptUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-[#10a37f] text-neutral-800 dark:text-neutral-200 hover:bg-[#10a37f] hover:text-white transition-colors"
      >
        ChatGPT
        <ExternalLinkIcon />
      </a>
    </div>
  );
}
