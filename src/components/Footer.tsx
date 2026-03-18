export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="text-sm text-muted">
          &copy; {new Date().getFullYear()} Cole Ryan
        </div>
        <div className="flex gap-6">
          <a
            href="https://instagram.com/whoiscole"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            Instagram
          </a>
          <a
            href="https://x.com/whoiscoleryan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            X
          </a>
        </div>
      </div>
    </footer>
  );
}
