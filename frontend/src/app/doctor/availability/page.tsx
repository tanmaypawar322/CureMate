'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient, DoctorAvailabilitySlot } from '@/lib/api';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' },
];

export default function DoctorAvailabilityPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [slots, setSlots] = useState<DoctorAvailabilitySlot[]>([
    { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 2, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 4, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const doctorMemberships = user?.memberships?.filter((m) => m.role === 'doctor') || [];

  useEffect(() => {
    if (doctorMemberships.length > 0 && !selectedOrgId) {
      setSelectedOrgId(doctorMemberships[0].orgId);
    }
  }, [doctorMemberships, selectedOrgId]);

  const handleAddSlot = () => {
    setSlots([
      ...slots,
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: slotDuration },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: keyof DoctorAvailabilitySlot, value: any) => {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const preparedSlots = slots.map((s) => ({
        ...s,
        slotDurationMinutes: Number(slotDuration),
      }));

      await ApiClient.setDoctorAvailability({
        orgId: selectedOrgId,
        slots: preparedSlots,
      });

      setSuccess('Weekly schedule and available slots saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save availability schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (doctorMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white p-6 rounded-xl border border-slate-200 text-center">
          <div className="text-3xl mb-2">⏰</div>
          <h2 className="text-base font-bold text-slate-800">Doctor Access Required</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            You must be registered as a Doctor to configure availability.
          </p>
          <Link href="/dashboard" className="text-blue-600 text-xs font-semibold hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Doctor Availability Schedule</h1>
            <p className="text-xs text-slate-500">
              Configure your weekly working days and appointment slot duration
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
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Organization
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {doctorMemberships.map((m) => (
                  <option key={m.orgId} value={m.orgId}>
                    {m.organization.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Default Slot Duration (Minutes)
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800">Weekly Schedule Windows</h2>
              <button
                type="button"
                onClick={handleAddSlot}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                + Add Time Window
              </button>
            </div>

            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="w-36">
                    <select
                      value={slot.dayOfWeek}
                      onChange={(e) => handleSlotChange(index, 'dayOfWeek', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {DAYS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span>From</span>
                    <input
                      type="time"
                      required
                      value={slot.startTime}
                      onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      required
                      value={slot.endTime}
                      onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
          >
            {saving ? 'Saving Availability...' : 'Save Weekly Schedule'}
          </button>
        </form>
      </div>
    </div>
  );
}
