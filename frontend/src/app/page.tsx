'use client';

import Link from 'next/link';
import { 
  PhoneCall, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  Zap,
  TrendingUp,
  Clock
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">SalesGPT</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-slate-600 hover:text-primary-600 transition">
                Dashboard
              </Link>
              <Link href="/calls" className="text-slate-600 hover:text-primary-600 transition">
                Calls
              </Link>
              <Link href="/products" className="text-slate-600 hover:text-primary-600 transition">
                Products
              </Link>
              <Link href="/login" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Your AI-Powered<br />
            <span className="text-primary-600">Sales Coach</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Get real-time guidance during sales calls. From opening to closing,
            SalesGPT helps you say the right thing at the right time.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/call/new"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition flex items-center gap-2"
            >
              <PhoneCall className="w-5 h-5" />
              Start a Call
            </Link>
            <Link
              href="/demo"
              className="bg-white text-slate-700 px-8 py-4 rounded-lg text-lg font-semibold border border-slate-300 hover:border-primary-500 transition"
            >
              Watch Demo
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Real-Time Coaching
            </h3>
            <p className="text-slate-600">
              Get instant suggestions for responses, objection handling, and
              questions to ask during live calls.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-success-50 rounded-lg flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-success-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Smart Product Matching
            </h3>
            <p className="text-slate-600">
              AI automatically suggests the best products based on prospect
              needs and pain points.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-warning-50 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-warning-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Call Analytics
            </h3>
            <p className="text-slate-600">
              Track talk ratio, sentiment, and performance metrics to
              continuously improve your skills.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-16 p-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">35%</div>
              <div className="text-slate-600">Higher Close Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">50%</div>
              <div className="text-slate-600">Faster Onboarding</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">Real-time</div>
              <div className="text-slate-600">AI Assistance</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">24/7</div>
              <div className="text-slate-600">Available</div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Add Context</h4>
              <p className="text-slate-600 text-sm">
                Enter prospect info and call objectives before starting
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Start Call</h4>
              <p className="text-slate-600 text-sm">
                Begin your call with AI listening in real-time
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Get Coaching</h4>
              <p className="text-slate-600 text-sm">
                Receive real-time suggestions and guidance
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Review & Improve</h4>
              <p className="text-slate-600 text-sm">
                Get summaries, analytics, and AI-generated follow-ups
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">SalesGPT</span>
              </div>
              <p className="text-slate-400 text-sm">
                AI-powered sales assistant for closing more deals.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Product</h5>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400 text-sm">
            © 2024 SalesGPT. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
