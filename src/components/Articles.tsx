import { getBroadcasts, Broadcast } from "@/lib/kit";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 250));
}

export default async function Articles() {
  const broadcasts = await getBroadcasts();

  if (!broadcasts.length) {
    return (
      <section id="articles" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Articles
          </h2>
          <p className="text-muted">Coming soon.</p>
        </div>
      </section>
    );
  }

  const featured = broadcasts[0];
  const rest = broadcasts.slice(1);

  return (
    <section id="articles" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-3xl font-bold tracking-tight md:text-4xl">
          Latest Articles
        </h2>

        {/* Featured article */}
        <FeaturedCard article={featured} />

        {/* Article grid */}
        {rest.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {rest.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedCard({ article }: { article: Broadcast }) {
  const readTime = article.content ? estimateReadTime(article.content) : null;

  return (
    <a
      href={article.public_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-border bg-card p-8 transition-all hover:border-accent/30 hover:bg-card-hover md:p-10"
    >
      {article.thumbnail_url && (
        <img
          src={article.thumbnail_url}
          alt={article.thumbnail_alt || article.subject}
          className="mb-6 h-48 w-full rounded-xl object-cover md:h-64"
        />
      )}
      <div className="mb-3 flex items-center gap-3 text-xs text-muted">
        {article.published_at && <span>{formatDate(article.published_at)}</span>}
        {readTime && <span>&middot; {readTime} min read</span>}
        <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">
          Featured
        </span>
      </div>
      <h3 className="mb-3 text-2xl font-bold transition-colors group-hover:text-accent md:text-3xl">
        {article.subject}
      </h3>
      {article.description && (
        <p className="text-muted leading-relaxed">{article.description}</p>
      )}
    </a>
  );
}

function ArticleCard({ article }: { article: Broadcast }) {
  const readTime = article.content ? estimateReadTime(article.content) : null;

  return (
    <a
      href={article.public_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/30 hover:bg-card-hover"
    >
      <div className="mb-3 flex items-center gap-3 text-xs text-muted">
        {article.published_at && <span>{formatDate(article.published_at)}</span>}
        {readTime && <span>&middot; {readTime} min read</span>}
      </div>
      <h3 className="text-lg font-semibold transition-colors group-hover:text-accent">
        {article.subject}
      </h3>
      {article.description && (
        <p className="mt-2 text-sm text-muted line-clamp-2">
          {article.description}
        </p>
      )}
    </a>
  );
}
