'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient } from '@/lib/api';

export default function PatientProfilePage() {
  const { user, loading } = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('other');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await ApiClient.getPatientProfile();
        if (profile) {
          if (profile.dateOfBirth) {
            setDateOfBirth(profile.dateOfBirth.split('T')[0]);
          }
          if (profile.gender) setGender(profile.gender);
          if (profile.address) setAddress(profile.address);
          if (profile.emergencyContactName) setEmergencyName(profile.emergencyContactName);
          if (profile.emergencyContactPhone) setEmergencyPhone(profile.emergencyContactPhone);
        }
      } catch (_e) {
        // No existing profile yet
      } finally {
        setFetching(false);
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await ApiClient.createPatientProfile({
        dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
        gender,
        address: address.trim() ? address.trim() : undefined,
        emergencyContactName: emergencyName.trim() ? emergencyName.trim() : undefined,
        emergencyContactPhone: emergencyPhone.trim() ? emergencyPhone.trim() : undefined,
      });
      setSuccess('Patient profile created successfully!');
    } catch (err: any) {
      try {
        await ApiClient.updatePatientProfile({
          dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
          gender,
          address: address.trim() ? address.trim() : undefined,
          emergencyContactName: emergencyName.trim() ? emergencyName.trim() : undefined,
          emergencyContactPhone: emergencyPhone.trim() ? emergencyPhone.trim() : undefined,
        });
        setSuccess('Patient profile updated successfully!');
      } catch (updateErr: any) {
        setError(updateErr.message || err.message || 'Failed to save patient profile');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || fetching) {
    return <div className="p-8 text-center text-slate-500">Loading patient profile...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Patient Health Profile</h1>
            <p className="text-xs text-slate-500">
              Your global health profile connected across all hospitals and clinics (Phase 1)
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

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other / Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Residential Address
            </label>
            <input
              type="text"
              placeholder="Flat 101, Green Meadows, Bengaluru, Karnataka"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                placeholder="Parent / Spouse / Relative"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
          >
            {saving ? 'Saving Profile...' : 'Save Patient Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
