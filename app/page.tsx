import { BlogPosts } from "app/components/posts";

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Taichi Nakashima
      </h1>
      <p className="mb-4">
        {`This is Taichi Nakashima (@deeeet)'s personal blog. 
        I'm a software engineer currently working at Mercari and leading the internal platform group as tech lead. 
        You can find me on Twitter or GitHub.`}
      </p>
    </section>
  );
}
