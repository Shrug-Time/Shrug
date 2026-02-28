import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Shrug',
  description: 'Get in touch with the Shrug team',
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Contact Us</h1>

      <div className="space-y-6 text-gray-700">
        <p>Have a question, found a bug, or want to share feedback? We&apos;d love to hear from you.</p>

        <section className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Get in Touch</h2>
          <div className="space-y-3">
            <p>
              <span className="font-medium">Email:</span>{' '}
              <a href="mailto:support@shrug.com" className="text-blue-600 hover:underline">
                support@shrug.com
              </a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Report an Issue</h2>
          <p>If you&apos;ve found a bug or something isn&apos;t working right, please include as much detail as possible so we can help quickly.</p>
        </section>
      </div>
    </div>
  );
}
