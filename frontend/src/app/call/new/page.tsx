'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  PhoneCall, 
  User, 
  Building, 
  Target, 
  FileText,
  ArrowLeft,
  Zap
} from 'lucide-react';
import Link from 'next/link';

export default function NewCallPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    prospect_name: '',
    prospect_company: '',
    prospect_phone: '',
    context: '',
    objectives: [''],
    call_type: 'outbound',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // In production, this would call the API to create a call
      const callId = crypto.randomUUID();
      
      // Navigate to the call interface
      router.push(`/call/${callId}`);
    } catch (error) {
      console.error('Failed to create call:', error);
      setIsCreating(false);
    }
  };

  const addObjective = () => {
    setFormData((prev) => ({
      ...prev,
      objectives: [...prev.objectives, ''],
    }));
  };

  const updateObjective = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      objectives: prev.objectives.map((obj, i) => (i === index ? value : obj)),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">New Call</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Prepare Your Call
            </h1>
            <p className="text-slate-600">
              Add context about the prospect to get better AI suggestions during the call.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Call Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Call Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="call_type"
                    value="outbound"
                    checked={formData.call_type === 'outbound'}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, call_type: e.target.value }))
                    }
                    className="text-primary-600"
                  />
                  <span>Outbound Call</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="call_type"
                    value="inbound"
                    checked={formData.call_type === 'inbound'}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, call_type: e.target.value }))
                    }
                    className="text-primary-600"
                  />
                  <span>Inbound Call</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="call_type"
                    value="scheduled"
                    checked={formData.call_type === 'scheduled'}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, call_type: e.target.value }))
                    }
                    className="text-primary-600"
                  />
                  <span>Scheduled Meeting</span>
                </label>
              </div>
            </div>

            {/* Prospect Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Prospect Name
                </label>
                <input
                  type="text"
                  value={formData.prospect_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, prospect_name: e.target.value }))
                  }
                  placeholder="John Smith"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Company
                </label>
                <input
                  type="text"
                  value={formData.prospect_company}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, prospect_company: e.target.value }))
                  }
                  placeholder="Acme Corp"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <PhoneCall className="w-4 h-4 inline mr-1" />
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={formData.prospect_phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prospect_phone: e.target.value }))
                }
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>

            {/* Context */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Context & Background
              </label>
              <textarea
                value={formData.context}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, context: e.target.value }))
                }
                placeholder="Any relevant background info about the prospect, their company, previous interactions, or specific needs..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
              />
            </div>

            {/* Objectives */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                Call Objectives
              </label>
              <div className="space-y-2">
                {formData.objectives.map((objective, index) => (
                  <input
                    key={index}
                    type="text"
                    value={objective}
                    onChange={(e) => updateObjective(index, e.target.value)}
                    placeholder={`Objective ${index + 1}`}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addObjective}
                className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                + Add another objective
              </button>
            </div>

            {/* Quick Templates */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-3">Quick Templates</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      objectives: ['Qualify the lead', 'Understand pain points', 'Schedule follow-up'],
                    }))
                  }
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                >
                  Discovery Call
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      objectives: ['Present product demo', 'Address questions', 'Propose next steps'],
                    }))
                  }
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                >
                  Product Demo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      objectives: ['Review proposal', 'Handle objections', 'Close the deal'],
                    }))
                  }
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                >
                  Closing Call
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      objectives: ['Check satisfaction', 'Identify upsell opportunities', 'Get referrals'],
                    }))
                  }
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                >
                  Follow-up
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-5 h-5" />
                    Start Call Now
                  </>
                )}
              </button>
              <Link
                href="/dashboard"
                className="px-8 py-3 border border-slate-300 rounded-lg font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
