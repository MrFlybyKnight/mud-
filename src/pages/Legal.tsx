import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PoweredByBadge from "@/components/PoweredByBadge";

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

const LegalShell: React.FC<LegalPageProps> = ({ title, children }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: May 10, 2026
        </p>
        <article className="prose prose-invert max-w-none space-y-6 text-sm sm:text-base leading-relaxed">
          {children}
        </article>
        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground flex gap-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/delete-account" className="hover:text-foreground">Delete Account</Link>
          <span className="ml-auto">© {new Date().getFullYear()} MūD by Ologi</span>
        </footer>
        <div className="mt-3 flex justify-center">
          <PoweredByBadge />
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-muted-foreground space-y-2">{children}</div>
  </section>
);

export const PrivacyPage: React.FC = () => (
  <LegalShell title="Privacy Policy">
    <p className="text-muted-foreground">
      MūD is a communication and wellbeing companion built by Ologi. This policy explains
      what data we collect, how we use it, and the choices you have.
    </p>

    <Section title="Data we collect">
      <ul className="list-disc pl-5 space-y-1">
        <li>Heart rate and heart rate variability (HRV) from your watch or phone sensors.</li>
        <li>Voice patterns and derived speech metrics (pace, tone, energy, sentiment).</li>
        <li>Approximate location (only when you enable location-aware features).</li>
        <li>Account information such as your email address and display name.</li>
      </ul>
    </Section>

    <Section title="How we use your data">
      <ul className="list-disc pl-5 space-y-1">
        <li>Real-time emotion and stress detection.</li>
        <li>Personalizing coaching, baselines, and recommendations.</li>
        <li>Generating your private history, summaries, and trends.</li>
      </ul>
    </Section>

    <Section title="What we never do">
      <ul className="list-disc pl-5 space-y-1">
        <li>We never store raw audio recordings of your conversations.</li>
        <li>We never sell your data to advertisers or third parties.</li>
        <li>We never share identifiable health data without your explicit consent.</li>
      </ul>
    </Section>

    <Section title="Data retention">
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>On device:</strong> raw signals are kept for up to 24 hours, then discarded.</li>
        <li><strong>Cloud:</strong> processed metrics are kept for up to 30 days.</li>
        <li><strong>Summaries:</strong> aggregate, anonymized summaries may be retained indefinitely so your long-term trends remain available.</li>
      </ul>
    </Section>

    <Section title="Your rights">
      <p>
        You can export or delete your data at any time from Settings → Account, or by
        contacting us. We honor access, correction, and deletion requests in accordance
        with applicable laws (including GDPR and CCPA).
      </p>
    </Section>

    <Section title="Medical disclaimer">
      <p>
        MūD is <strong>not a medical device</strong>. It does not diagnose, treat, cure,
        or prevent any disease. Always consult a qualified healthcare professional for
        medical advice.
      </p>
    </Section>

    <Section title="Contact">
      <p>
        Questions or requests? Email us at{" "}
        <a className="text-primary hover:underline" href="mailto:support@ologi.net">
          support@ologi.net
        </a>
        .
      </p>
    </Section>
  </LegalShell>
);

export const TermsPage: React.FC = () => (
  <LegalShell title="Terms of Service">
    <p className="text-muted-foreground">
      These Terms govern your use of MūD, provided by Ologi. By creating an account or
      using the app, you agree to these Terms.
    </p>

    <Section title="1. Acceptance of terms">
      <p>
        By accessing or using MūD you confirm that you have read, understood, and agree
        to be bound by these Terms and our Privacy Policy. If you do not agree, do not
        use the service.
      </p>
    </Section>

    <Section title="2. Description of service">
      <p>
        MūD is a communication and wellbeing companion that uses biometric and voice
        signals to provide real-time feedback, coaching, and personal insights. Features
        and availability may change over time.
      </p>
    </Section>

    <Section title="3. User responsibilities">
      <ul className="list-disc pl-5 space-y-1">
        <li>You must be at least 13 years old (or the age of digital consent in your country).</li>
        <li>You are responsible for keeping your account credentials secure.</li>
        <li>You will not misuse the service, attempt to reverse engineer it, or use it to harm others.</li>
        <li>You will only record or analyze your own voice, or voices you have permission to capture.</li>
      </ul>
    </Section>

    <Section title="4. Subscriptions and billing">
      <p>
        Premium, Premium Plus, and Prestige plans are billed on a recurring basis through
        the applicable app store or payment processor. You can cancel at any time; access
        continues until the end of the paid period. Refunds follow the policies of the
        store you purchased through.
      </p>
    </Section>

    <Section title="5. No medical advice">
      <p>
        MūD is <strong>not a medical device</strong> and does not provide medical advice,
        diagnosis, or treatment. Information shown in the app is for general wellbeing
        purposes only. Seek the advice of a qualified professional for any medical
        condition.
      </p>
    </Section>

    <Section title="6. Limitation of liability">
      <p>
        To the maximum extent permitted by law, Ologi and its affiliates shall not be
        liable for any indirect, incidental, special, consequential, or punitive damages,
        or any loss of data, revenue, or profits arising from your use of MūD. The
        service is provided "as is" without warranties of any kind.
      </p>
    </Section>

    <Section title="7. Governing law">
      <p>
        These Terms are governed by the laws of the State of Georgia, USA, without regard
        to its conflict of law principles. Any disputes shall be resolved in the state or
        federal courts located in Georgia.
      </p>
    </Section>

    <Section title="8. Changes to these terms">
      <p>
        We may update these Terms from time to time. Material changes will be communicated
        in-app or by email. Continued use after changes take effect constitutes acceptance.
      </p>
    </Section>

    <Section title="9. Contact">
      <p>
        Questions about these Terms? Email{" "}
        <a className="text-primary hover:underline" href="mailto:support@ologi.net">
          support@ologi.net
        </a>
        .
      </p>
    </Section>
  </LegalShell>
);
