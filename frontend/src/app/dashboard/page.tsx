'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  PhoneCall,
  Users,
  Package,
  BarChart3,
  Settings,
  Zap,
  TrendingUp,
  Clock,
  Calendar,
  ChevronRight,
  Plus,
  Search,
  Filter,
} from 'lucide-react';

// Mock data
const recentCalls = [
  {
    id: '1',
    prospect_name: 'John Smith',
    company: 'Acme Corp',
    duration: '14:32',
    outcome: 'follow_up',
    sentiment: 'positive',
    date: '2024-01-13T10:30:00',
  },
  {
    id: '2',
    prospect_name: 'Sarah Johnson',
    company: 'Tech Solutions',
    duration: '8:45',
    outcome: 'sale_closed',
    sentiment: 'positive',
    date: '2024-01-13T09:15:00',
  },
  {
    id: '3',
    prospect_name: 'Mike Brown',
    company: 'Global Industries',
    duration: '22:10',
    outcome: 'no_interest',
    sentiment: 'negative',
    date: '2024-01-12T16:00:00',
  },
];

const upcomingCalls = [
  {
    id: '4',
    prospect_name: 'Emily Davis',
    company: 'Startup Inc',
    scheduled_at: '2024-01-13T14:00:00',
    objective: 'Product demo',
  },
  {
    id: '5',
    prospect_name: 'Robert Wilson',
    company: 'Enterprise LLC',
    scheduled_at: '2024-01-13T16:30:00',
    objective: 'Follow-up on proposal',
  },
];

const stats = {
  total_calls: 47,
  calls_this_week: 12,
  avg_duration: '12:34',
  close_rate: 35,
  avg_sentiment: 0.72,
};

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const getOutcomeLabel = (outcome: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      sale_closed: { text: 'Sale Closed', color: 'bg-green-100 text-green-700' },
      follow_up: { text: 'Follow Up', color: 'bg-blue-100 text-blue-700' },
      no_interest: { text: 'No Interest', color: 'bg-red-100 text-red-700' },
      scheduled: { text: 'Scheduled', color: 'bg-yellow-100 text-yellow-700' },
    };
    return labels[outcome] || { text: outcome, color: 'bg-gray-100 text-gray-700' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-10">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">SalesGPT</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 bg-primary-50 text-primary-700 rounded-lg font-medium"
            >
              <BarChart3 className="w-5 h-5" />
              Dashboard
            </Link>
            <Link
              href="/calls"
              className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <PhoneCall className="w-5 h-5" />
              Calls
            </Link>
            <Link
              href="/prospects"
              className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <Users className="w-5 h-5" />
              Prospects
            </Link>
            <Link
              href="/products"
              className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <Package className="w-5 h-5" />
              Products
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <TrendingUp className="w-5 h-5" />
              Analytics
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Link
            href="/call/new"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Call
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600">Welcome back! Here's your sales overview.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-slate-600">Total Calls</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.total_calls}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-slate-600">This Week</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.calls_this_week}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm text-slate-600">Avg Duration</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.avg_duration}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-slate-600">Close Rate</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.close_rate}%</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-slate-600">Avg Sentiment</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {Math.round(stats.avg_sentiment * 100)}%
            </div>
          </div>
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Calls */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent Calls</h2>
              <Link
                href="/calls"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  className="block p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-slate-900">{call.prospect_name}</div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        getOutcomeLabel(call.outcome).color
                      }`}
                    >
                      {getOutcomeLabel(call.outcome).text}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{call.company}</span>
                    <div className="flex items-center gap-3">
                      <span>{call.duration}</span>
                      <span>{formatDate(call.date)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Calls */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Calls</h2>
              <Link
                href="/calls?filter=scheduled"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/call/${call.id}`}
                  className="block p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-slate-900">{call.prospect_name}</div>
                    <span className="text-sm text-primary-600 font-medium">
                      {formatDate(call.scheduled_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{call.company}</span>
                    <span>{call.objective}</span>
                  </div>
                </Link>
              ))}
              {upcomingCalls.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming calls scheduled</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100">
              <Link
                href="/call/new"
                className="flex items-center justify-center gap-2 w-full py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Schedule a Call
              </Link>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mt-6 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
              <p className="text-white/90 mb-3">
                Based on your recent calls, here are some tips to improve your close rate:
              </p>
              <ul className="space-y-2 text-white/80">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  Try asking more discovery questions early in the call
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  Your talk ratio is 65% - aim for 50% or less
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  Consider addressing price objections earlier in the conversation
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
