'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient } from '@/lib/api';

export default function OrgSettingsPage() {
  const { user, loading } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const adminMemberships = user?.memberships?.filter((m) => m.role === 'admin') || [];

  useEffect(() => {
    if (adminMemberships.length > 0 && !selectedOrgId) {
      const first = adminMemberships[0];
      setSelectedOrgId(first.orgId);
      setName(first.organization.name || '');
      setCity(first.organization.city || '');
      setAddress(first.organization.address || '');
      setContactNumber(first.organization.contactNumber || '');
      setDescription(first.organization.description || '');
    }
  }, [adminMemberships, selectedOrgId]);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const membership = adminMemberships.find((m) => m.orgId === orgId);
    if (membership) {
      setName(membership.organization.name || '');
      setCity(membership.organization.city || '');
      setAddress(membership.organization.address || '');
      setContactNumber(membership.organization.contactNumber || '');
      setDescription(membership.organization.description || '');
    }
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await ApiClient.updateOrganization(selectedOrgId, {
        name,
        city,
        address,
        contactNumber,
        description,
      });
      setSuccess('Organization profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  if (adminMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white p-6 rounded-xl border border-slate-200 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h2 className="text-base font-bold text-slate-800">Admin Access Required</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            You do not hold an Admin role in any registered organization.
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
            <h1 className="text-xl font-bold text-slate-900">Organization Settings</h1>
            <p className="text-xs text-slate-500">
              Manage public clinic and hospital profile details (Phase 1)
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          {adminMemberships.length > 1 && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Select Organization
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {adminMemberships.map((m) => (
                  <option key={m.orgId} value={m.orgId}>
                    {m.organization.name} ({m.organization.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 22 1234 5678"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Full Address
              </label>
              <input
                type="text"
                placeholder="123 Hospital Road, Opp. Metro Station"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                About / Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of departments, facilities, or specialties offered..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            >
              {saving ? 'Saving changes...' : 'Save Organization Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
