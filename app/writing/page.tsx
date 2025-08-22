import { BlogPosts } from "app/components/posts";

export const metadata = {
  title: "Writing",
  description: "",
};

export default function Page() {
  return (
    <section>
      <BlogPosts />
    </section>
  );
}
