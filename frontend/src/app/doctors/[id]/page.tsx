'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiClient, DoctorProfile, AvailableSlotsResponse, AvailableSlotItem } from '@/lib/api';

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.id as string;
  const { user } = useAuth();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Default to tomorrow
    return today.toISOString().split('T')[0];
  });
  const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlotItem | null>(null);
  const [notes, setNotes] = useState('');

  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadDoctor = async () => {
      if (!doctorId) return;
      try {
        const data = await ApiClient.getPublicDoctor(doctorId);
        setDoctor(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load doctor profile');
      } finally {
        setLoadingDoctor(false);
      }
    };
    loadDoctor();
  }, [doctorId]);

  const loadSlots = async (date: string) => {
    if (!doctorId || !date) return;
    setLoadingSlots(true);
    setError(null);
    try {
      const data = await ApiClient.getDoctorAvailableSlots(doctorId, date);
      setSlotsData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch available slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (doctorId && selectedDate) {
      loadSlots(selectedDate);
    }
  }, [doctorId, selectedDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    if (!doctor || !selectedSlot) return;

    setBooking(true);
    setError(null);
    try {
      await ApiClient.bookAppointment({
        orgId: doctor.orgId,
        doctorId: doctor.userId,
        scheduledAt: selectedSlot.datetime,
        notes: notes.trim() || undefined,
      });

      setSuccess('Appointment confirmed successfully!');
      setSelectedSlot(null);
      setNotes('');
      // Reload slots to reflect the booked appointment
      await loadSlots(selectedDate);
    } catch (err: any) {
      setError(err.message || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  if (loadingDoctor) {
    return <div className="p-8 text-center text-slate-500">Loading doctor details...</div>;
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-sm text-red-500 mb-4">{error || 'Doctor not found'}</p>
        <Link href="/search" className="text-blue-600 text-xs font-semibold hover:underline">
          ← Back to Search
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/search" className="text-xs text-blue-600 font-semibold hover:underline">
            ← Back to Doctors Search
          </Link>
          {user && (
            <Link href="/appointments" className="text-xs text-slate-600 font-semibold hover:underline">
              View My Appointments
            </Link>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center justify-between">
            <span>✓ {success}</span>
            <Link href="/appointments" className="font-bold underline text-xs">
              Go to Appointments →
            </Link>
          </div>
        )}

        {/* Doctor Profile Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold uppercase tracking-wider">
                {doctor.specialization}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-2">
                Dr. {doctor.user?.email}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                🏥 Affiliated with <span className="font-semibold text-slate-700">{doctor.organization?.name}</span>
                {doctor.organization?.city && ` (${doctor.organization.city})`}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Consultation Fee</span>
              <span className="text-2xl font-bold text-slate-900">₹{Number(doctor.consultationFee)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-400 block uppercase">License No</span>
              <span className="font-medium">{doctor.licenseNo}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 block uppercase">Experience</span>
              <span className="font-medium">{doctor.yearsExperience || 0} Years</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400 block uppercase">Clinic Address</span>
              <span className="font-medium">{doctor.organization?.address || 'Consultation via clinic'}</span>
            </div>
          </div>

          {doctor.bio && (
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {doctor.bio}
            </p>
          )}
        </div>

        {/* Live Slot Booking Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Select Date & Appointment Slot</h2>
              <p className="text-xs text-slate-500">
                Live availability calculated minus existing confirmed consultations
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600">Date:</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          {loadingSlots ? (
            <div className="text-center py-12 text-xs text-slate-400">Computing available time slots...</div>
          ) : !slotsData || slotsData.slots.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="text-2xl mb-1">📅</div>
              <p className="text-xs font-semibold text-slate-700">No open slots available on this date</p>
              <p className="text-xs text-slate-400 mt-1">
                Please pick another date or check doctor working days.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-3">
                Available Open Slots ({slotsData.slots.length})
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {slotsData.slots.map((slot) => (
                  <button
                    key={slot.datetime}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      selectedSlot?.datetime === slot.datetime
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-sky-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Booking Confirmation Box */}
          {selectedSlot && (
            <form onSubmit={handleBook} className="mt-6 p-5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-blue-950">Confirm Slot Booking</h3>
                  <p className="text-xs text-blue-800">
                    {selectedDate} at {selectedSlot.time} (UTC / Local Clinic Time)
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-900">
                  Fee: ₹{Number(doctor.consultationFee)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-blue-900 mb-1">
                  Reason for visit / Patient symptoms (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mild fever, routine checkup, follow-up..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  {booking ? 'Confirming...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
