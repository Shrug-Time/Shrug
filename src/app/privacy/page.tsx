import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Shrug',
  description: 'Privacy Policy for Shrug platform',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: February 28, 2026</p>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
          <p>We collect information you provide when creating an account (name, email address) and content you post (questions, answers, totems). We also collect usage data such as pages visited and interactions with the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
          <p>We use your information to: provide and improve the platform, personalize your experience, communicate with you about your account, and ensure platform safety and security.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Information Sharing</h2>
          <p>We do not sell your personal information. We may share information with service providers who help us operate the platform (e.g., hosting, analytics, payment processing). Your public profile and posts are visible to other users.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Data Storage</h2>
          <p>Your data is stored securely using Firebase (Google Cloud). We retain your data for as long as your account is active or as needed to provide our services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Cookies</h2>
          <p>We use cookies and similar technologies for authentication and to remember your preferences. These are essential for the platform to function properly.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
          <p>You may: access and update your personal information through your profile settings, request deletion of your account and associated data, and opt out of non-essential communications.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Security</h2>
          <p>We implement industry-standard security measures to protect your data, including encryption in transit and at rest. However, no method of transmission over the internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Children&apos;s Privacy</h2>
          <p>Shrug is not intended for children under 13. We do not knowingly collect information from children under 13.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify you of significant changes via the platform or email.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">10. Contact</h2>
          <p>Questions about your privacy? Visit our <a href="/contact" className="text-blue-600 hover:underline">contact page</a>.</p>
        </section>
      </div>
    </div>
  );
}
