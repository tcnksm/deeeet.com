import { BlogPosts } from "app/components/posts";

export const metadata = {
  title: "Writing",
  description: "Writings by Taichi Nakashima",
};

export default function Page() {
  return (
    <section>
      <BlogPosts />
    </section>
  );
}
