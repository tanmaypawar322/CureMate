'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout, refreshMe } = useAuth();

  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<'hospital' | 'clinic' | 'pharmacy' | 'lab'>('hospital');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgSuccess, setOrgSuccess] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      router.replace('/login');
    }
    return null;
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError(null);
    setOrgSuccess(null);
    setCreatingOrg(true);

    try {
      const newOrg = await ApiClient.createOrganization({
        name: orgName,
        type: orgType,
      });
      setOrgSuccess(`Organization "${newOrg.name}" created successfully! You are assigned as Admin.`);
      setOrgName('');
      await refreshMe();
    } catch (err: any) {
      setOrgError(err.message || 'Failed to create organization');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isDoctor = user.memberships?.some((m) => m.role === 'doctor');
  const isAdmin = user.memberships?.some((m) => m.role === 'admin');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                CM
              </div>
              <span className="text-lg font-bold text-slate-800">CureMate</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-4 text-sm font-medium text-slate-600">
              <Link href="/search" className="hover:text-teal-600 transition-colors">
                Find Doctors
              </Link>
              <Link href="/appointments" className="hover:text-teal-600 transition-colors">
                My Appointments
              </Link>
              <Link href="/prescriptions" className="hover:text-teal-600 transition-colors">
                My Prescriptions
              </Link>
              <Link href="/patient/profile" className="hover:text-teal-600 transition-colors">
                Patient Profile
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs sm:text-sm text-slate-600 font-medium">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Phase 1 Quick Navigation Cards */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Quick Actions & Clinical Modules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/search"
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">🔍</div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-teal-600">
                Find Doctors & Clinics
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Search specialists across all hospitals and view available booking slots.
              </p>
            </Link>

            <Link
              href="/appointments"
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">📅</div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-teal-600">
                My Appointments
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                View upcoming appointments, clinic info, and consultation statuses.
              </p>
            </Link>

            <Link
              href="/prescriptions"
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">💊</div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-teal-600">
                My Prescriptions
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Access structured prescriptions with medicines, dosages, and doctor notes.
              </p>
            </Link>

            <Link
              href="/patient/profile"
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">👤</div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-teal-600">
                Patient Profile
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Manage your global health identity, DOB, gender, and emergency contacts.
              </p>
            </Link>
          </div>
        </section>

        {/* Doctor & Org Admin Portals */}
        {(isDoctor || isAdmin) && (
          <section className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
            <h2 className="text-base font-bold text-teal-300 mb-1">
              Practitioner & Administration Controls
            </h2>
            <p className="text-xs text-slate-300 mb-4">
              Manage clinical schedules, organization settings, and patient queues for your assigned organizations.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAdmin && (
                <Link
                  href="/org-settings"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-semibold text-white transition-colors"
                >
                  ⚙️ Organization Settings (Admin)
                </Link>
              )}
              {isDoctor && (
                <>
                  <Link
                    href="/doctor/appointments"
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    🩺 Doctor Appointment Queue & Prescriptions
                  </Link>
                  <Link
                    href="/doctor/availability"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-semibold text-white transition-colors"
                  >
                    ⏰ Weekly Availability
                  </Link>
                  <Link
                    href="/doctor/profile"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-semibold text-white transition-colors"
                  >
                    👨‍⚕️ Doctor Profile
                  </Link>
                </>
              )}
            </div>
          </section>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Profile Details & Create Org */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                User Account (Global)
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400 block">User ID</span>
                  <span className="font-mono text-xs text-slate-700 break-all">{user.id}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400 block">Email</span>
                  <span className="text-slate-800 font-medium">{user.email}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400 block">Phone</span>
                  <span className="text-slate-700">{user.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400 block">ABHA ID</span>
                  <span className="text-slate-700">{user.abhaId || 'Not linked'}</span>
                </div>
              </div>
            </div>

            {/* Create Organization Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-2">
                Create Organization
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Register a hospital or clinic. You will automatically become its Admin.
              </p>

              {orgError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {orgError}
                </div>
              )}
              {orgSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
                  {orgSuccess}
                </div>
              )}

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Apollo City Hospital"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Organization Type
                  </label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="hospital">Hospital</option>
                    <option value="clinic">Clinic</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="lab">Diagnostic Lab</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creatingOrg}
                  className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
                >
                  {creatingOrg ? 'Creating...' : '+ Create Organization'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Multi-Tenant Organizations & Roles */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">
                    Your Organization Memberships
                  </h2>
                  <p className="text-xs text-slate-500">
                    Row-Level Security (RLS) restricts access to your tenant contexts
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                  {user.memberships?.length || 0} {user.memberships?.length === 1 ? 'Org' : 'Orgs'}
                </span>
              </div>

              {(!user.memberships || user.memberships.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                  <div className="text-3xl mb-2">🏥</div>
                  <h3 className="text-sm font-semibold text-slate-700">No organizations linked</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    You currently have a standalone patient identity. Use the search above to find doctors and book consultations.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {user.memberships.map((membership) => (
                    <div key={membership.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {membership.organization?.name || 'Unnamed Organization'}
                          </h3>
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-xs font-medium uppercase">
                            {membership.organization?.type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 space-x-3">
                          <span>Org ID: <code className="text-slate-700">{membership.orgId}</code></span>
                          {membership.organization?.city && (
                            <>
                              <span>•</span>
                              <span>City: {membership.organization.city}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-slate-800 text-white rounded-md text-xs font-semibold uppercase tracking-wider">
                          {membership.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
