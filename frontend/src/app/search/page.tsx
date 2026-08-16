'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient, DoctorProfile, Organization } from '@/lib/api';

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<'doctors' | 'organizations'>('doctors');
  const [specialization, setSpecialization] = useState('');
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'doctors') {
        const results = await ApiClient.searchDoctors({
          specialization: specialization.trim() || undefined,
          city: city.trim() || undefined,
          search: search.trim() || undefined,
        });
        setDoctors(results);
      } else {
        const results = await ApiClient.searchOrganizations({
          city: city.trim() || undefined,
          search: search.trim() || undefined,
        });
        setOrganizations(results);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Find Healthcare Providers</h1>
            <p className="text-xs text-slate-500">
              Search verified doctors, clinics, and hospitals across India
            </p>
          </div>
          <Link href="/dashboard" className="text-xs text-teal-600 font-semibold hover:underline">
            ← Dashboard
          </Link>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`pb-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'doctors'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            👨‍⚕️ Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            className={`pb-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'organizations'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🏥 Hospitals & Clinics ({organizations.length})
          </button>
        </div>

        {/* Search Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
          {activeTab === 'doctors' && (
            <input
              type="text"
              placeholder="Specialization (e.g. Cardiologist)"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          )}
          <input
            type="text"
            placeholder="City (e.g. Mumbai, Delhi)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="text"
            placeholder="Keyword (name, hospital, etc.)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              activeTab === 'organizations' ? 'sm:col-span-2' : ''
            }`}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Results List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Searching records...</div>
        ) : activeTab === 'doctors' ? (
          doctors.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No doctors found matching your search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-teal-400 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {doctor.user?.email}
                        </h3>
                        <p className="text-xs text-teal-700 font-semibold uppercase tracking-wider">
                          {doctor.specialization}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-teal-50 text-teal-800 rounded-lg text-xs font-bold">
                        ₹{Number(doctor.consultationFee)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p>
                        🏥 <span className="font-semibold text-slate-700">{doctor.organization?.name}</span>
                        {doctor.organization?.city && ` • ${doctor.organization.city}`}
                      </p>
                      <p>📜 License: {doctor.licenseNo} {doctor.yearsExperience ? `• ${doctor.yearsExperience} yrs exp` : ''}</p>
                      {doctor.bio && <p className="text-slate-600 italic mt-1 line-clamp-2">{doctor.bio}</p>}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Available for Online/Clinic Booking</span>
                    <Link
                      href={`/doctors/${doctor.id}`}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
                    >
                      Book Slot →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          organizations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              No organizations found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizations.map((org) => (
                <div key={org.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">{org.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold uppercase">
                      {org.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    {org.city && <p>📍 City: {org.city}</p>}
                    {org.address && <p>🏢 {org.address}</p>}
                    {org.contactNumber && <p>📞 {org.contactNumber}</p>}
                    {org.description && <p className="text-slate-600 mt-2">{org.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
