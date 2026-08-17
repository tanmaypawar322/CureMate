'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient, Prescription } from '@/lib/api';

export default function MyPrescriptionsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const loadPrescriptions = async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await ApiClient.getMyPrescriptions();
      setPrescriptions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your prescriptions');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPrescriptions();
    }
  }, [user]);

  if (loading || !user || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Loading prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Digital Prescriptions</h1>
            <p className="text-xs text-slate-500">
              Prescribed medications and doctor instructions across all clinics (Phase 1)
            </p>
          </div>
          <Link href="/dashboard" className="text-xs text-blue-600 font-semibold hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {prescriptions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <div className="text-3xl">💊</div>
            <p className="text-xs font-semibold text-slate-700">No prescriptions found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Prescriptions issued by your consulting doctors will appear here automatically with structured dosage details.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {prescriptions.map((presc) => (
              <div
                key={presc.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-slate-900">
                        Prescription by Dr. {presc.doctor?.email}
                      </h2>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">
                        Verified Doctor
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      🏥 {presc.organization?.name} {presc.organization?.city ? `• ${presc.organization.city}` : ''}
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <span>Issued: {new Date(presc.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                    <span className="block font-mono text-[10px] text-slate-300">ID: {presc.id.slice(0, 8)}...</span>
                  </div>
                </div>

                {/* Doctor Notes */}
                {presc.notes && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950">
                    <span className="font-bold block uppercase tracking-wider text-[10px] text-amber-800 mb-1">
                      Doctor Advice / Instructions:
                    </span>
                    {presc.notes}
                  </div>
                )}

                {/* Structured Medicine Table */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Medications & Dosages ({presc.items?.length || 0})
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Medicine Name</th>
                          <th className="p-3">Dosage</th>
                          <th className="p-3">Frequency</th>
                          <th className="p-3 text-right">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {presc.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-900">{item.medicineName}</td>
                            <td className="p-3 font-medium text-slate-700">{item.dosage}</td>
                            <td className="p-3 text-slate-600">{item.frequency}</td>
                            <td className="p-3 text-right font-semibold text-slate-800">{item.durationDays} Days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
