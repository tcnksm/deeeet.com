export function ReadWithClaude({ 
  articleUrl, 
  articleTitle 
}: { 
  articleUrl: string; 
  articleTitle: string;
}) {
  const prompt = `Hey! Got something cool for you—curious what you make of this: ${articleUrl}
It's an article titled "${articleTitle}" and I want to understand it better.
Start with a tight summary: one paragraph, bulleted. Assume I have zero context—actually make sure I get it, not just skim the surface. Then offer to go deeper on what's most interesting or relevant to me.`;

  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;

  return (
    <a
      href={claudeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-[#D97757] hover:bg-[#c4654a] text-white transition-colors"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Anthropic Claude "asterisk" style icon */}
        <path d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z" />
      </svg>
      Read with Claude
    </a>
  );
}
