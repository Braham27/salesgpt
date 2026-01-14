'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { callsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface Call {
  id: string;
  prospect?: {
    name: string;
    company?: string;
  };
  status: string;
  start_time: string;
  end_time?: string;
  summary?: {
    summary?: string;
  };
}

export default function CallsPage() {
  const { isAuthenticated } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const response = await callsApi.list();
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const filteredCalls = calls.filter((call: Call) => {
    const matchesSearch = 
      call.prospect?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.prospect?.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-400';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getDuration = (call: Call) => {
    if (!call.end_time || !call.start_time) return '-';
    const duration = Math.round((new Date(call.end_time).getTime() - new Date(call.start_time).getTime()) / 1000 / 60);
    return `${duration} min`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              SalesGPT
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">Dashboard</Link>
              <Link href="/products" className="text-gray-300 hover:text-white transition-colors">Products</Link>
              <Link href="/prospects" className="text-gray-300 hover:text-white transition-colors">Prospects</Link>
              <Link href="/calls" className="text-white font-medium">Calls</Link>
            </nav>
          </div>
          <Link href="/call/new">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              New Call
            </motion.button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Call History</h1>
          <p className="text-gray-400">View and manage all your sales calls and summaries.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Calls', value: calls.length, icon: '📞' },
            { label: 'This Week', value: calls.filter((c: Call) => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(c.start_time) > weekAgo;
            }).length, icon: '📅' },
            { label: 'Completed', value: calls.filter((c: Call) => c.status === 'completed').length, icon: '✅' },
            { label: 'Avg Duration', value: calls.length > 0 ? `${Math.round(
              calls.filter((c: Call) => c.end_time).reduce((acc: number, c: Call) => {
                return acc + (new Date(c.end_time!).getTime() - new Date(c.start_time).getTime()) / 1000 / 60;
              }, 0) / Math.max(calls.filter((c: Call) => c.end_time).length, 1)
            )} min` : '-', icon: '⏱️' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{stat.icon}</span>
                <span className="text-gray-400 text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search calls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all" className="bg-slate-800">All Status</option>
            <option value="scheduled" className="bg-slate-800">Scheduled</option>
            <option value="in_progress" className="bg-slate-800">In Progress</option>
            <option value="completed" className="bg-slate-800">Completed</option>
            <option value="cancelled" className="bg-slate-800">Cancelled</option>
          </select>
        </div>

        {/* Calls List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No calls found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery ? 'Try a different search term' : 'Start your first AI-powered sales call'}
            </p>
            <Link href="/call/new">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg"
              >
                Start Your First Call
              </motion.button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCalls.map((call: Call) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 hover:border-blue-500/50 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {call.prospect?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {call.prospect?.name || 'Unknown Prospect'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {call.prospect?.company || 'No company'} • {new Date(call.start_time).toLocaleDateString()} at {new Date(call.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(call.status)}`}>
                      {call.status.replace('_', ' ').charAt(0).toUpperCase() + call.status.replace('_', ' ').slice(1)}
                    </span>
                    <div className="text-gray-400 text-sm">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {getDuration(call)}
                      </span>
                    </div>
                    <Link
                      href={`/calls/${call.id}/summary`}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                    >
                      View Summary
                    </Link>
                  </div>
                </div>

                {call.summary?.summary && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-gray-300 text-sm line-clamp-2">{call.summary.summary}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
