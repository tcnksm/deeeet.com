import { BlogPosts } from "app/components/posts";

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Taichi Nakashima
      </h1>
      <p className="mb-4">
        I'm Taichi Nakashima, known as{" "}
        <a href="https://x.com/deeeet" className="about_link">
          deeeet
        </a>{" "}
        on the social media, a Software Engineer living in Tokyo, Japan 🗼 I'm
        currently a VP of Engineering at Mercari, leading global expasion team.
        Prior to this, I was a Director of Engineering at Mercari, leading{" "}
        <a
          href="https://speakerdeck.com/tcnksm/platform-engineering-at-mercari-platform-engineering-kaigi-2024"
          className="about_link"
        >
          Platform Engineering team
        </a>{" "}
        and{" "}
        <a
          href="https://speakerdeck.com/tcnksm/sre-practices-in-mercari-microservices"
          className="about_link"
        >
          SRE team
        </a>{" "}
        .
      </p>
      <p className="mb-4">
        I'm a camper 🏕️ and enjoy camping around Japan nature. See some of my
        camping photos on{" "}
        <a href="https://instagram.com/tcnksm" className="about_link">
          Instagram
        </a>{" "}
        or check my articles about favorite camp gears from{" "}
        <a
          href="https://note.com/deeeet/n/n01be8131e317"
          className="about_link"
        >
          here
        </a>
        .
      </p>
    </section>
  );
}
