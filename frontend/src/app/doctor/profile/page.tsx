'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient } from '@/lib/api';

export default function DoctorProfilePage() {
  const { user, loading } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(500);
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const doctorMemberships = user?.memberships?.filter((m) => m.role === 'doctor') || [];

  useEffect(() => {
    if (doctorMemberships.length > 0 && !selectedOrgId) {
      setSelectedOrgId(doctorMemberships[0].orgId);
    }
  }, [doctorMemberships, selectedOrgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await ApiClient.createDoctorProfile({
        orgId: selectedOrgId,
        specialization,
        licenseNo,
        consultationFee: Number(consultationFee),
        bio: bio.trim() ? bio.trim() : undefined,
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
      });
      setSuccess('Doctor profile created/updated successfully!');
    } catch (err: any) {
      // If already exists, attempt patch
      try {
        await ApiClient.updateDoctorProfile({
          orgId: selectedOrgId,
          specialization,
          licenseNo,
          consultationFee: Number(consultationFee),
          bio: bio.trim() ? bio.trim() : undefined,
          yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        });
        setSuccess('Doctor profile updated successfully!');
      } catch (updateErr: any) {
        setError(updateErr.message || err.message || 'Failed to save doctor profile');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading doctor profile...</div>;
  }

  if (doctorMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white p-6 rounded-xl border border-slate-200 text-center">
          <div className="text-3xl mb-2">🩺</div>
          <h2 className="text-base font-bold text-slate-800">Doctor Role Required</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            You are not assigned as a Doctor in any organization. Please contact your organization administrator.
          </p>
          <Link href="/dashboard" className="text-teal-600 text-xs font-semibold hover:underline">
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
            <h1 className="text-xl font-bold text-slate-900">Doctor Profile</h1>
            <p className="text-xs text-slate-500">
              Manage your clinical credentials, specialization, and consultation fees
            </p>
          </div>
          <Link href="/dashboard" className="text-xs text-teal-600 font-semibold hover:underline">
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Affiliated Organization
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {doctorMemberships.map((m) => (
                <option key={m.orgId} value={m.orgId}>
                  {m.organization.name} ({m.organization.type})
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Specialization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiologist, Dermatologist"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Medical License No. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCI-123456"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Consultation Fee (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min={0}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Bio / Summary
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of your clinical expertise and background..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            >
              {saving ? 'Saving Profile...' : 'Save Doctor Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
