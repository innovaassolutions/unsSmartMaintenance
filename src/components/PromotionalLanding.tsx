'use client';

import { useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Cable,
  Container,
  LayoutDashboard,
  Lock,
  AlertTriangle,
  TrendingDown,
  Clock,
  ChevronRight,
  CheckCircle,
  Send,
} from 'lucide-react';
import ExecutiveDashboard from '@/components/mockups/ExecutiveDashboard';
import FactoryFloor from '@/components/mockups/FactoryFloor';
import MaintenanceAlerts from '@/components/mockups/MaintenanceAlerts';

interface LeadForm {
  name: string;
  email: string;
  company: string;
  role: string;
  notes: string;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function PromotionalLanding() {
  const [form, setForm] = useState<LeadForm>({
    name: '',
    email: '',
    company: '',
    role: '',
    notes: '',
  });
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch(
        'https://nova-cyan-mu.vercel.app/api/leads/capture',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            organization_name: form.company || undefined,
            role: form.role || undefined,
            notes: form.notes || undefined,
            page_slug: 'novapredict-landing',
            source: 'novapredict-landing',
            interest: 'novapredict',
          }),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed (${res.status})`);
      }
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    }
  };

  const scrollToForm = () => {
    document
      .getElementById('early-access')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#181f2a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-md bg-[#181f2a]/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F25C05] flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">NovaPredict</span>
          </div>
          <button
            onClick={scrollToForm}
            className="bg-[#F25C05] hover:bg-[#d94e04] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Request Early Access
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F25C05]/5 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[#F25C05]/30 bg-[#F25C05]/10 text-[#F25C05] text-sm font-medium">
              Private Beta — Now Accepting Early Access
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Predict. Prevent. <span className="text-[#F25C05]">Perform.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-8 leading-relaxed">
              Transform your factory floor from reactive firefighting to
              predictive optimization. Real-time monitoring, ML-powered failure
              predictions, and unified namespace architecture — deployed in 60
              seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={scrollToForm}
                className="bg-[#F25C05] hover:bg-[#d94e04] text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
              >
                Request Early Access <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
            {[
              { value: '30-40%', label: 'Less Downtime' },
              { value: '60%', label: 'Faster Decisions' },
              { value: '2-4 Week', label: 'Advance Warnings' },
              { value: '60-Second', label: 'Deployment' },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
              >
                <div className="text-2xl sm:text-3xl font-bold text-[#F25C05]">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Hero Mockup */}
          <div className="rounded-xl overflow-hidden shadow-2xl shadow-[#F25C05]/10 border border-white/10">
            <ExecutiveDashboard />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-[#0f1520]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Still Fighting Fires on Your Factory Floor?
            </h2>
            <p className="text-gray-400 text-lg">
              Most manufacturers are trapped in reactive maintenance cycles. The
              hidden costs are enormous.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: AlertTriangle,
                text: '$50,000/hour in unplanned downtime',
                color: 'text-red-400',
              },
              {
                icon: TrendingDown,
                text: 'Decisions made on hours-old data',
                color: 'text-yellow-400',
              },
              {
                icon: Clock,
                text: '6-month deployment cycles',
                color: 'text-orange-400',
              },
              {
                icon: Lock,
                text: 'Vendor lock-in & data silos',
                color: 'text-red-400',
              },
            ].map(item => (
              <div
                key={item.text}
                className="bg-white/5 border border-white/10 rounded-xl p-6 text-center"
              >
                <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-3`} />
                <p className="text-sm text-gray-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              What <span className="text-[#F25C05]">NovaPredict</span> Does
            </h2>
            <p className="text-gray-400 text-lg">
              Built on unified namespace architecture and enterprise-class
              streaming technology. Every machine, sensor, and system connected
              in one real-time intelligence platform.
            </p>
          </div>

          {/* Factory Floor Mockup */}
          <div className="rounded-xl overflow-hidden shadow-2xl shadow-[#F25C05]/10 border border-white/10 mb-16">
            <FactoryFloor />
          </div>

          {/* Solution Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <Activity className="w-10 h-10 text-[#F25C05] mb-4" />
              <h3 className="text-xl font-bold mb-3">
                Real-Time Machine Monitoring
              </h3>
              <p className="text-gray-400">
                Sub-100ms latency from sensor to dashboard. Every temperature,
                vibration, and pressure reading flowing in real-time across your
                entire fleet.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <BrainCircuit className="w-10 h-10 text-[#F25C05] mb-4" />
              <h3 className="text-xl font-bold mb-3">
                Predictive ML Analytics
              </h3>
              <p className="text-gray-400">
                ML models trained on 400K+ data points from the NASA IMS bearing
                dataset. Predict failures 2-4 weeks before they happen with 85%+
                accuracy.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <Cable className="w-10 h-10 text-[#F25C05] mb-4" />
              <h3 className="text-xl font-bold mb-3">
                Unified Namespace Architecture
              </h3>
              <p className="text-gray-400">
                ISA-95 compliant topic structure. One integration point for all
                machines, all protocols, all applications. No more spaghetti
                architecture.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <LayoutDashboard className="w-10 h-10 text-[#F25C05] mb-4" />
              <h3 className="text-xl font-bold mb-3">Role-Based Dashboards</h3>
              <p className="text-gray-400">
                Executives see KPIs. Floor managers see machines. Maintenance
                sees predictions. Everyone sees what matters — in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Maintenance Alerts Mockup */}
      <section className="py-20 bg-[#0f1520]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              See Failures <span className="text-[#F25C05]">Before</span> They
              Happen
            </h2>
            <p className="text-gray-400 text-lg">
              ML-powered predictions with remaining useful life analysis,
              confidence scoring, and automated work order creation.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-2xl shadow-[#F25C05]/10 border border-white/10">
            <MaintenanceAlerts />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for Industrial Reality
            </h2>
            <p className="text-gray-400 text-lg">
              Enterprise-grade reliability with startup-speed deployment.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Activity,
                title: 'Real-Time Monitoring',
                desc: 'Sub-100ms sensor-to-dashboard latency. 30+ msg/sec sustained throughput.',
              },
              {
                icon: BrainCircuit,
                title: 'Predictive ML',
                desc: 'Trained on NASA bearing dataset. 2-4 week advance failure warnings.',
              },
              {
                icon: Cable,
                title: '50+ Protocol Support',
                desc: 'OPC UA, Modbus, Siemens S7, Ethernet/IP, MQTT, REST APIs, and more.',
              },
              {
                icon: LayoutDashboard,
                title: 'Role-Based Dashboards',
                desc: 'Executive, factory floor, and maintenance views — each seeing what matters.',
              },
              {
                icon: Container,
                title: 'Single Container Deployment',
                desc: 'docker run novapredict — live dashboards in 60 seconds. No Kubernetes.',
              },
              {
                icon: Lock,
                title: 'No Vendor Lock-In',
                desc: 'Open source Apache 2.0. Standard protocols. Your data stays yours.',
              },
            ].map(feature => (
              <div
                key={feature.title}
                className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <feature.icon className="w-6 h-6 text-[#F25C05] shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Capture Form */}
      <section id="early-access" className="py-20 bg-[#0f1520]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Request Early Access
            </h2>
            <p className="text-gray-400 text-lg">
              NovaPredict is currently in private beta. Request early access
              below and we&apos;ll be in touch within one business day.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            {status === 'success' ? (
              <div className="text-center py-10">
                <CheckCircle className="w-16 h-16 text-[#F25C05] mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">
                  Thanks! We&apos;ll be in touch shortly.
                </h3>
                <p className="text-gray-400">
                  We&apos;ve received your request and will reach out within one
                  business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Smith"
                      className="w-full bg-[#181f2a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] focus:ring-1 focus:ring-[#F25C05] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="jane@company.com"
                      className="w-full bg-[#181f2a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] focus:ring-1 focus:ring-[#F25C05] transition-colors"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="Acme Manufacturing"
                      className="w-full bg-[#181f2a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] focus:ring-1 focus:ring-[#F25C05] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Job Title / Role
                    </label>
                    <input
                      type="text"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      placeholder="Plant Manager"
                      className="w-full bg-[#181f2a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] focus:ring-1 focus:ring-[#F25C05] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Tell us about your factory
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="How many machines? What protocols? What are your biggest maintenance challenges?"
                    className="w-full bg-[#181f2a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F25C05] focus:ring-1 focus:ring-[#F25C05] transition-colors resize-none"
                  />
                </div>

                {status === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-[#F25C05] hover:bg-[#d94e04] disabled:opacity-60 text-white py-3.5 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  {status === 'submitting' ? (
                    'Sending...'
                  ) : (
                    <>
                      Request Early Access <Send className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  We respect your privacy and will never share your information.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stop Reacting. Start Predicting.
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Your next equipment failure is already brewing. Your competition
            might already know when it will happen. Don&apos;t let reactive
            maintenance burn through another budget cycle.
          </p>
          <button
            onClick={scrollToForm}
            className="bg-[#F25C05] hover:bg-[#d94e04] text-white px-8 py-3.5 rounded-lg font-semibold text-lg transition-colors inline-flex items-center gap-2"
          >
            Request Early Access <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#F25C05] flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold">NovaPredict</span>
            <span className="text-sm text-gray-500">by Innovaas</span>
          </div>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Innovaas Sdn Bhd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
