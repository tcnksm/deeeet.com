export function ReadWithClaude({ 
  articleUrl, 
  articleTitle 
}: { 
  articleUrl: string; 
  articleTitle: string;
}) {
  const prompt = `${articleTitle}: ${articleUrl}`;

  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;

  return (
    <a
      href={claudeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-[#D97757] hover:bg-[#c4654a] text-white transition-colors"
    >
Read with Claude
    </a>
  );
}
