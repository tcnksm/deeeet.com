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
        viewBox="0 0 64 64"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Claude starburst icon */}
        <path d="M32 0L35.5 24.5L56 8L43.5 28.5L64 32L43.5 35.5L56 56L35.5 43.5L32 64L28.5 43.5L8 56L20.5 35.5L0 32L20.5 28.5L8 8L28.5 24.5L32 0Z" />
      </svg>
      Read with Claude
    </a>
  );
}
