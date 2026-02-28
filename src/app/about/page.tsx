import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Shrug',
  description: 'Learn about Shrug - a platform for sharing knowledge and expertise',
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">About Shrug</h1>

      <div className="space-y-6 text-gray-700">
        <p className="text-lg">
          Shrug is a Q&A platform where knowledge is shared, valued, and recognized through our unique Totem system.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">How It Works</h2>
          <p>Ask questions, share answers, and tag your knowledge with Totems. The community recognizes valuable contributions by liking totems on answers, building a reputation around what you actually know.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Totems</h2>
          <p>Totems are tags that represent areas of expertise. When your answer earns totem likes, it builds &ldquo;crispness&rdquo; &mdash; a measure of how valued your knowledge is in that area. It&apos;s not about follower counts; it&apos;s about what you know.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Our Mission</h2>
          <p>We believe the best knowledge comes from real experience. Shrug is built to surface genuine expertise and make it easy to find people who actually know what they&apos;re talking about.</p>
        </section>
      </div>
    </div>
  );
}
