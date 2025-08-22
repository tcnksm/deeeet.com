import { redirect } from "next/navigation";
import { getBlogPosts } from "app/writing/utils";

export const metadata = {
  title: "Post Not Found",
  description: "The post you're looking for doesn't exist or has been moved.",
};

export default function CatchAllWriting({
  params,
}: {
  params: { catchall: string[] };
}) {
  const segments = params.catchall;

  // If this is a date-based URL like [2024, 05, 21, post-name]
  if (segments.length === 4) {
    const [year, month, day, slug] = segments;

    // Check if the first three segments look like a date
    if (
      year.match(/^\d{4}$/) &&
      month.match(/^\d{2}$/) &&
      day.match(/^\d{2}$/)
    ) {
      // Get all posts to verify the slug exists
      const posts = getBlogPosts();
      const postExists = posts.some((post) => post.slug === slug);

      if (postExists) {
        // Redirect to the new URL structure
        redirect(`/writing/${slug}`);
      }
    }
  }

  // If this is any other old blog structure, try to find the post by the last segment
  if (segments.length > 1) {
    const potentialSlug = segments[segments.length - 1];
    const posts = getBlogPosts();
    const postExists = posts.some((post) => post.slug === potentialSlug);

    if (postExists) {
      redirect(`/writing/${potentialSlug}`);
    }
  }

  // If no redirect was found, return 404
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h1 className="text-4xl font-bold mb-4">404 - Post Not Found</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-4">
        The post you're looking for doesn't exist or has been moved.
      </p>
      <a
        href="/writing"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        ← Back to Writing
      </a>
    </div>
  );
}
