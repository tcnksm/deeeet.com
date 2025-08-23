import {
  TwitterIcon,
  GitHubIcon,
  InstagramIcon,
  RSSIcon,
  LinkedInIcon,
  BlueSkyIcon,
} from "./icons";

export default function Footer() {
  return (
    <footer className="mb-16">
      <ul className="font-sm mt-8 flex flex-row space-x-4 text-neutral-600 dark:text-neutral-300">
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="/rss"
            aria-label="RSS Feed"
          >
            <RSSIcon />
          </a>
        </li>
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="https://github.com/tcnksm"
            aria-label="GitHub Profile"
          >
            <GitHubIcon />
          </a>
        </li>
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="https://x.com/deeeet"
            aria-label="Twitter Profile"
          >
            <TwitterIcon />
          </a>
        </li>
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="https://bsky.app/profile/deeeeet.bsky.social"
            aria-label="Bluesky Profile"
          >
            <BlueSkyIcon />
          </a>
        </li>
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="https://instagram.com/tcnksm"
            aria-label="Instagram Profile"
          >
            <InstagramIcon />
          </a>
        </li>
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="https://www.linkedin.com/in/taichi-nakashima-77746521"
            aria-label="LinkedIn Profile"
          >
            <LinkedInIcon />
          </a>
        </li>
      </ul>
      <p className="mt-8 text-neutral-600 dark:text-neutral-300">
        © {new Date().getFullYear()} Taichi Nakashima
      </p>
    </footer>
  );
}
