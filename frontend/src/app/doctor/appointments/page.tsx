'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient, Appointment, PrescriptionItem } from '@/lib/api';

export default function DoctorAppointmentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Prescription modal state
  const [prescribingAppt, setPrescribingAppt] = useState<Appointment | null>(null);
  const [prescNotes, setPrescNotes] = useState('');
  const [prescItems, setPrescItems] = useState<PrescriptionItem[]>([
    { medicineName: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily after meals', durationDays: 5 },
  ]);
  const [submittingPresc, setSubmittingPresc] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const doctorMemberships = user?.memberships?.filter((m) => m.role === 'doctor' || m.role === 'admin') || [];

  useEffect(() => {
    if (doctorMemberships.length > 0 && !selectedOrgId) {
      setSelectedOrgId(doctorMemberships[0].orgId);
    }
  }, [doctorMemberships, selectedOrgId]);

  const loadAppointments = async (orgId: string) => {
    if (!orgId) return;
    setLoadingAppts(true);
    setError(null);
    try {
      const data = await ApiClient.getOrgAppointments(orgId);
      setAppointments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch appointments');
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId) {
      loadAppointments(selectedOrgId);
    }
  }, [selectedOrgId]);

  const handleStatusUpdate = async (apptId: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    setError(null);
    try {
      await ApiClient.updateAppointmentStatus(apptId, status, selectedOrgId);
      setSuccess(`Appointment marked as ${status}`);
      await loadAppointments(selectedOrgId);
    } catch (err: any) {
      setError(err.message || 'Failed to update appointment status');
    }
  };

  const handleAddMedicineItem = () => {
    setPrescItems([
      ...prescItems,
      { medicineName: '', dosage: '', frequency: 'Once daily', durationDays: 3 },
    ]);
  };

  const handleRemoveMedicineItem = (index: number) => {
    setPrescItems(prescItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updated = [...prescItems];
    updated[index] = { ...updated[index], [field]: value };
    setPrescItems(updated);
  };

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescribingAppt) return;

    setSubmittingPresc(true);
    setError(null);

    try {
      await ApiClient.createPrescription({
        appointmentId: prescribingAppt.id,
        notes: prescNotes.trim() ? prescNotes.trim() : undefined,
        items: prescItems.map((item) => ({
          ...item,
          durationDays: Number(item.durationDays),
        })),
      }, selectedOrgId);

      setSuccess('Prescription created and appointment marked completed!');
      setPrescribingAppt(null);
      setPrescNotes('');
      setPrescItems([{ medicineName: '', dosage: '', frequency: '', durationDays: 3 }]);
      await loadAppointments(selectedOrgId);
    } catch (err: any) {
      setError(err.message || 'Failed to create prescription');
    } finally {
      setSubmittingPresc(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Loading doctor queue...</p>
        </div>
      </div>
    );
  }

  if (doctorMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white p-6 rounded-xl border border-slate-200 text-center">
          <div className="text-3xl mb-2">🩺</div>
          <h2 className="text-base font-bold text-slate-800">Doctor Access Required</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            You must be registered as a Doctor or Admin in an organization to view patient queues.
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Doctor Clinical Queue</h1>
            <p className="text-xs text-slate-500">
              Manage scheduled consultations, update patient status, and write digital prescriptions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {doctorMemberships.map((m) => (
                <option key={m.orgId} value={m.orgId}>
                  {m.organization.name}
                </option>
              ))}
            </select>
            <Link href="/dashboard" className="text-xs text-blue-600 font-semibold hover:underline">
              ← Dashboard
            </Link>
          </div>
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

        {/* Appointments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Appointments Queue ({appointments.length})
            </h2>
            <button
              onClick={() => loadAppointments(selectedOrgId)}
              disabled={loadingAppts}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Refresh
            </button>
          </div>

          {loadingAppts ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No appointments scheduled for this organization.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {appointments.map((appt) => (
                <div key={appt.id} className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">
                        Patient: {appt.patient?.email}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
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

                    <div className="text-xs text-slate-500 space-x-3">
                      <span>
                        ⏰ {new Date(appt.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {appt.patient?.phone && <span>• 📞 {appt.patient.phone}</span>}
                      {appt.notes && <span>• 📝 Notes: {appt.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => setPrescribingAppt(appt)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                        >
                          💊 Write Prescription
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(appt.id, 'completed')}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(appt.id, 'cancelled')}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {appt.status === 'completed' && (
                      <span className="text-xs font-semibold text-emerald-600">
                        ✓ Consultation Completed {appt.prescription ? '(Prescription Issued)' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prescription Modal */}
        {prescribingAppt && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl border border-slate-200 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Prescription</h3>
                  <p className="text-xs text-slate-500">
                    Patient: {prescribingAppt.patient?.email} • {new Date(prescribingAppt.scheduledAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setPrescribingAppt(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePrescriptionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Doctor Clinical Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Diagnosis observations, diet instructions, or follow-up advice..."
                    value={prescNotes}
                    onChange={(e) => setPrescNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase text-slate-600">
                      Prescribed Medicines (Structured Items)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedicineItem}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      + Add Medicine
                    </button>
                  </div>

                  <div className="space-y-3">
                    {prescItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Medicine Name (e.g. Amoxicillin)"
                            value={item.medicineName}
                            onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Dosage (e.g. 500mg, 1 tablet)"
                            value={item.dosage}
                            onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <input
                            type="text"
                            required
                            placeholder="Frequency (e.g. Twice daily)"
                            value={item.frequency}
                            onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                            className="sm:col-span-2 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              required
                              min={1}
                              placeholder="Days"
                              value={item.durationDays}
                              onChange={(e) => handleItemChange(idx, 'durationDays', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {prescItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMedicineItem(idx)}
                                className="text-red-500 hover:text-red-700 px-1 text-xs font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPrescribingAppt(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPresc}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                  >
                    {submittingPresc ? 'Saving Prescription...' : 'Issue Prescription'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
