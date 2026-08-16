'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient, Appointment } from '@/lib/api';

export default function MyAppointmentsPage() {
  const { user, loading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await ApiClient.getMyAppointments();
      setAppointments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your appointments');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  if (loading || fetching) {
    return <div className="p-8 text-center text-slate-500">Loading your appointments...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Appointments</h1>
            <p className="text-xs text-slate-500">
              Your booked consultations across all hospitals and clinics (Phase 1)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/search"
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              + Book New Appointment
            </Link>
            <Link href="/dashboard" className="text-xs text-slate-600 font-semibold hover:underline">
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {appointments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="text-3xl">📅</div>
              <p className="text-xs font-semibold text-slate-700">No appointments found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You haven&apos;t booked any doctor consultations yet. Use our search tool to find specialists.
              </p>
              <Link
                href="/search"
                className="inline-block mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold"
              >
                Find Doctors
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.map((appt) => (
                <div key={appt.id} className="p-5 sm:px-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Dr. {appt.doctorUser?.email}
                      </h3>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-teal-700">
                        {appt.doctor?.specialization || 'Consultation'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          appt.status === 'confirmed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : appt.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : appt.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      🏥 <span className="font-medium">{appt.organization?.name}</span>
                      {appt.organization?.city && ` (${appt.organization.city})`}
                    </p>

                    <div className="text-xs text-slate-500 space-x-3">
                      <span>
                        ⏰ Scheduled: {new Date(appt.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {appt.notes && <span>• 📝 {appt.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {appt.prescription ? (
                      <Link
                        href="/prescriptions"
                        className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        💊 View Prescription
                      </Link>
                    ) : appt.status === 'completed' ? (
                      <span className="text-xs text-slate-400">Completed</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
