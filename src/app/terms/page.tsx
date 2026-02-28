import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Shrug',
  description: 'Terms of Service for Shrug platform',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: February 28, 2026</p>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using Shrug, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Use of the Platform</h2>
          <p>You must be at least 13 years old to use Shrug. You are responsible for maintaining the security of your account and for all activity under your account. You agree not to use the platform for any unlawful purpose or to violate any laws.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. User Content</h2>
          <p>You retain ownership of content you post on Shrug. By posting content, you grant Shrug a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on the platform. You are solely responsible for your content and must not post anything that is illegal, harmful, or infringes on others&apos; rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Prohibited Conduct</h2>
          <p>You may not: impersonate others, harass or abuse other users, post spam or misleading content, attempt to gain unauthorized access to the platform, or interfere with the platform&apos;s operation.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Termination</h2>
          <p>We may suspend or terminate your account at our discretion if you violate these terms. You may delete your account at any time.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Disclaimers</h2>
          <p>Shrug is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee the accuracy or reliability of any content posted by users.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Shrug shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of Shrug after changes constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Contact</h2>
          <p>Questions about these terms? Visit our <a href="/contact" className="text-blue-600 hover:underline">contact page</a>.</p>
        </section>
      </div>
    </div>
  );
}
