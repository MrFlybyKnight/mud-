import React from 'react';
import { Heart, Mic, Watch, Users, Shield, Sparkles, Download, ArrowRight, Check } from 'lucide-react';
import { ALL_EMOTIONS, getEmotionColor, type EmotionType } from '@/utils/emotionUtils';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=one.mudring.app';
const APP_URL = 'https://mudring.one';

const NAVY = '#0A1628';
const NAVY_SOFT = '#0F1F36';
const TEAL = '#00B4D8';
const TEAL_SOFT = '#48CAE4';

const PlayBadge: React.FC<{ size?: 'lg' | 'md'; label?: string }> = ({ size = 'lg', label }) => (
  <a
    href={PLAY_STORE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-3 rounded-2xl font-semibold transition-all hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(0,180,216,0.5)] ${
      size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3 text-base'
    }`}
    style={{
      background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_SOFT} 100%)`,
      color: NAVY,
      boxShadow: '0 8px 32px rgba(0, 180, 216, 0.35)',
    }}
  >
    <Download className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
    {label ?? 'Get it on Google Play'}
  </a>
);

const SectionTitle: React.FC<{ eyebrow?: string; title: string; sub?: string }> = ({ eyebrow, title, sub }) => (
  <div className="text-center max-w-3xl mx-auto mb-14">
    {eyebrow && (
      <div className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: TEAL }}>
        {eyebrow}
      </div>
    )}
    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">{title}</h2>
    {sub && <p className="text-lg text-white/60">{sub}</p>}
  </div>
);

const Landing: React.FC = () => {
  const valueProps = [
    { icon: Heart, title: 'Feel It', text: 'Emotion detection from your voice and heart rate, in real time.' },
    { icon: Sparkles, title: 'Understand It', text: '16 emotions measured against YOUR personal baseline — not a generic average.' },
    { icon: Users, title: 'Share It', text: 'Your Trusted Circle sees your emotional state in real time, the moment it matters.' },
  ];

  const steps = [
    { icon: Watch, title: 'Wear your watch', text: 'Pair your Galaxy Watch 4 or later (Wear OS).' },
    { icon: Mic, title: 'Speak naturally', text: 'MūD quietly listens to your voice — never the words.' },
    { icon: Heart, title: 'See your emotion', text: 'Your cow changes color in real time as you feel.' },
  ];

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: ['Live emotion detection', 'Personal baseline calibration', 'Basic history (7 days)', '1 Trusted Circle contact'],
      highlight: false,
    },
    {
      name: 'Premium Plus',
      price: '$14.99',
      period: '/month',
      features: ['Everything in Free', 'Unlimited history & trends', 'Up to 5 Trusted Circle contacts', 'Emergency distress alerts', 'Daily emotion insights'],
      highlight: true,
    },
    {
      name: 'Prestige',
      price: '$19.99',
      period: '/month',
      features: ['Everything in Premium Plus', 'Unlimited Trusted Circle', 'Advanced HRV analytics', 'Priority support', 'Early access to new features'],
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: NAVY }}>
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-center justify-between">
        <div className="text-2xl font-black tracking-tight">
          M<span style={{ color: TEAL }}>ū</span>D
        </div>
        <a
          href={APP_URL}
          className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1"
        >
          Sign In <ArrowRight className="w-4 h-4" />
        </a>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-24 px-6">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at 50% 20%, ${TEAL}33 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${TEAL}1a 0%, transparent 40%)`,
          }}
        />
        <div className="relative max-w-5xl mx-auto text-center">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-6 leading-none">
            M<span style={{ color: TEAL, textShadow: `0 0 60px ${TEAL}99` }}>ū</span>D
          </h1>
          <p className="text-2xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Digitized Emotional Intelligence
          </p>
          <p className="text-base md:text-lg text-white/60 mb-10">
            Powered by <span className="font-bold tracking-widest text-white/90">OLOGI</span> — your biology, decoded.
          </p>
          <div className="flex flex-col items-center gap-4">
            <PlayBadge />
            <a href={APP_URL} className="text-sm text-white/50 hover:text-white transition-colors underline underline-offset-4">
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </section>

      {/* WHAT IS MūD */}
      <section className="py-24 px-6" style={{ background: NAVY_SOFT }}>
        <SectionTitle eyebrow="What is MūD" title="Three things, done well." />
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {valueProps.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1"
              style={{ background: NAVY }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: `${TEAL}22`, color: TEAL }}
              >
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{title}</h3>
              <p className="text-white/60 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6">
        <SectionTitle eyebrow="How it works" title="From wrist to feeling in seconds." />
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 relative">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="text-center relative">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center border-2"
                style={{ borderColor: TEAL, background: `${TEAL}11` }}
              >
                <Icon className="w-9 h-9" style={{ color: TEAL }} />
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                Step {i + 1}
              </div>
              <h3 className="text-xl font-bold mb-2">{title}</h3>
              <p className="text-white/60">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 16 EMOTIONS */}
      <section className="py-24 px-6" style={{ background: NAVY_SOFT }}>
        <SectionTitle
          eyebrow="The spectrum"
          title="16 emotions. Yours, measured."
          sub="Every emotion is calibrated against your personal baseline — not a textbook average."
        />
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3">
          {ALL_EMOTIONS.map((emotion: EmotionType) => {
            const color = getEmotionColor(emotion);
            return (
              <div
                key={emotion}
                className="px-5 py-2.5 rounded-full font-semibold capitalize text-sm border transition-all hover:scale-105"
                style={{
                  background: `${color}1f`,
                  borderColor: `${color}66`,
                  color,
                  boxShadow: `0 0 20px ${color}22`,
                }}
              >
                {emotion}
              </div>
            );
          })}
        </div>
      </section>

      {/* TRUSTED CIRCLE */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto rounded-3xl p-10 md:p-16 text-center border border-white/10 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${NAVY_SOFT} 0%, ${NAVY} 100%)` }}>
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{ background: `radial-gradient(circle at 50% 0%, ${TEAL}33, transparent 60%)` }}
          />
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: `${TEAL}22`, color: TEAL }}
            >
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Your people, always close.</h2>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
              Long press to signal distress. Your circle responds — instantly, wherever they are.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 px-6" style={{ background: NAVY_SOFT }}>
        <SectionTitle eyebrow="Pricing" title="Start free. Grow when you're ready." />
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl p-8 border transition-all hover:-translate-y-1 relative ${
                tier.highlight ? 'border-2' : 'border-white/10'
              }`}
              style={{
                background: NAVY,
                borderColor: tier.highlight ? TEAL : undefined,
                boxShadow: tier.highlight ? `0 0 40px ${TEAL}33` : undefined,
              }}
            >
              {tier.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ background: TEAL, color: NAVY }}
                >
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black">{tier.price}</span>
                <span className="text-white/50">{tier.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-white/70">
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: TEAL }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                style={
                  tier.highlight
                    ? { background: TEAL, color: NAVY }
                    : { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }
                }
              >
                Download
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* DOWNLOAD CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at center, ${TEAL}22 0%, transparent 70%)` }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
            Ready to feel <span style={{ color: TEAL }}>understood?</span>
          </h2>
          <p className="text-lg text-white/60 mb-10">
            Free forever. No credit card. Just your biology, decoded.
          </p>
          <PlayBadge label="Download MūD Free" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/50">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href={`${APP_URL}/privacy`} className="hover:text-white transition-colors">Privacy Policy</a>
            <span className="text-white/20">|</span>
            <a href={`${APP_URL}/terms`} className="hover:text-white transition-colors">Terms</a>
            <span className="text-white/20">|</span>
            <a href="mailto:support@mudring.one" className="hover:text-white transition-colors">support@mudring.one</a>
          </div>
          <div className="text-center md:text-right">
            <div className="text-xs">
              Powered by <span className="font-bold tracking-widest text-white/80">OLOGI</span> Solutions
            </div>
            <div className="text-xs text-white/40 mt-1">
              © 2026 Taste Good Coffee LLC DBA OLOGI Solutions
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
