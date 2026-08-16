const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface User {
  id: string;
  email: string;
  phone?: string;
  abhaId?: string;
  createdAt: string;
  updatedAt: string;
  memberships?: OrgMembership[];
  patientProfile?: PatientProfile;
}

export interface Organization {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'lab';
  subscriptionPlanId?: string;
  address?: string;
  contactNumber?: string;
  city?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMembership {
  id: string;
  userId: string;
  orgId: string;
  role: 'admin' | 'doctor' | 'pharmacy_owner' | 'lab_owner' | 'staff';
  organization: Organization;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  orgId: string;
  specialization: string;
  licenseNo: string;
  consultationFee: number | string;
  bio?: string;
  yearsExperience?: number;
  organization?: Organization;
  user?: {
    id: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAvailabilitySlot {
  id?: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  slotDurationMinutes?: number;
}

export interface AvailableSlotItem {
  time: string;
  datetime: string;
}

export interface AvailableSlotsResponse {
  date: string;
  dayOfWeek: number;
  doctorId: string;
  doctorUserId: string;
  orgId: string;
  slots: AvailableSlotItem[];
}

export interface PatientProfile {
  id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  user?: {
    id: string;
    email: string;
    phone?: string;
    abhaId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  orgId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  organization?: Organization;
  patient?: {
    id: string;
    email: string;
    phone?: string;
    patientProfile?: PatientProfile;
  };
  doctorUser?: {
    id: string;
    email: string;
    phone?: string;
  };
  doctor?: DoctorProfile;
  prescription?: Prescription;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  id?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  orgId: string;
  notes?: string;
  items: PrescriptionItem[];
  organization?: Organization;
  doctor?: {
    id: string;
    email: string;
    phone?: string;
  };
  patient?: {
    id: string;
    email: string;
    phone?: string;
  };
  appointment?: {
    id: string;
    scheduledAt: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class ApiClient {
  private static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('curemate_access_token');
  }

  private static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('curemate_refresh_token');
  }

  public static setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('curemate_access_token', accessToken);
    localStorage.setItem('curemate_refresh_token', refreshToken);
  }

  public static clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('curemate_access_token');
    localStorage.removeItem('curemate_refresh_token');
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    activeOrgId?: string,
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (activeOrgId) {
      headers['x-org-id'] = activeOrgId;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Attempt token refresh once if unauthorized
    if (response.status === 401 && this.getRefreshToken() && !endpoint.includes('/auth/')) {
      const refreshToken = this.getRefreshToken();
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          this.setTokens(data.accessToken, data.refreshToken);
          headers['Authorization'] = `Bearer ${data.accessToken}`;

          response = await fetch(url, {
            ...options,
            headers,
          });
        } else {
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch (_e) {
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.message && Array.isArray(data.message)
          ? data.message.join(', ')
          : data?.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return data as T;
  }

  // --- Auth endpoints ---
  static async signup(body: { email: string; password: string; phone?: string; abhaId?: string }): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  static async login(body: { email: string; password: string }): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  static async getMe(): Promise<User> {
    return this.request<User>('/me', {
      method: 'GET',
    });
  }

  // --- Organization endpoints ---
  static async createOrganization(body: { name: string; type: string }): Promise<Organization> {
    return this.request<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async updateOrganization(
    orgId: string,
    body: { name?: string; address?: string; contactNumber?: string; city?: string; description?: string },
  ): Promise<Organization> {
    return this.request<Organization>(`/organizations/${orgId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, orgId);
  }

  static async getPublicOrganization(orgId: string): Promise<Organization> {
    return this.request<Organization>(`/organizations/${orgId}/public`, {
      method: 'GET',
    });
  }

  // --- Doctor endpoints ---
  static async createDoctorProfile(body: {
    orgId: string;
    specialization: string;
    licenseNo: string;
    consultationFee: number;
    bio?: string;
    yearsExperience?: number;
  }): Promise<DoctorProfile> {
    return this.request<DoctorProfile>('/doctors/profile', {
      method: 'POST',
      body: JSON.stringify(body),
    }, body.orgId);
  }

  static async updateDoctorProfile(body: {
    orgId?: string;
    specialization?: string;
    licenseNo?: string;
    consultationFee?: number;
    bio?: string;
    yearsExperience?: number;
  }): Promise<DoctorProfile> {
    return this.request<DoctorProfile>('/doctors/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, body.orgId);
  }

  static async setDoctorAvailability(body: {
    orgId: string;
    slots: DoctorAvailabilitySlot[];
  }): Promise<DoctorAvailabilitySlot[]> {
    return this.request<DoctorAvailabilitySlot[]>('/doctors/availability', {
      method: 'POST',
      body: JSON.stringify(body),
    }, body.orgId);
  }

  static async getDoctorAvailability(doctorId: string): Promise<DoctorAvailabilitySlot[]> {
    return this.request<DoctorAvailabilitySlot[]>(`/doctors/${doctorId}/availability`, {
      method: 'GET',
    });
  }

  static async getDoctorAvailableSlots(doctorId: string, date: string): Promise<AvailableSlotsResponse> {
    return this.request<AvailableSlotsResponse>(`/doctors/${doctorId}/available-slots?date=${encodeURIComponent(date)}`, {
      method: 'GET',
    });
  }

  static async getPublicDoctor(doctorId: string): Promise<DoctorProfile> {
    return this.request<DoctorProfile>(`/doctors/${doctorId}/public`, {
      method: 'GET',
    });
  }

  // --- Patient endpoints ---
  static async createPatientProfile(body: {
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }): Promise<PatientProfile> {
    return this.request<PatientProfile>('/patients/profile', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async updatePatientProfile(body: {
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }): Promise<PatientProfile> {
    return this.request<PatientProfile>('/patients/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  static async getPatientProfile(): Promise<PatientProfile> {
    return this.request<PatientProfile>('/patients/profile', {
      method: 'GET',
    });
  }

  // --- Search endpoints ---
  static async searchDoctors(query: { specialization?: string; city?: string; search?: string }): Promise<DoctorProfile[]> {
    const params = new URLSearchParams();
    if (query.specialization) params.append('specialization', query.specialization);
    if (query.city) params.append('city', query.city);
    if (query.search) params.append('search', query.search);
    return this.request<DoctorProfile[]>(`/search/doctors?${params.toString()}`, {
      method: 'GET',
    });
  }

  static async searchOrganizations(query: { type?: string; city?: string; search?: string }): Promise<Organization[]> {
    const params = new URLSearchParams();
    if (query.type) params.append('type', query.type);
    if (query.city) params.append('city', query.city);
    if (query.search) params.append('search', query.search);
    return this.request<Organization[]>(`/search/organizations?${params.toString()}`, {
      method: 'GET',
    });
  }

  // --- Appointment endpoints ---
  static async bookAppointment(body: {
    orgId: string;
    doctorId: string;
    scheduledAt: string;
    notes?: string;
  }): Promise<Appointment> {
    return this.request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async getMyAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/appointments/mine', {
      method: 'GET',
    });
  }

  static async getOrgAppointments(orgId: string): Promise<Appointment[]> {
    return this.request<Appointment[]>('/appointments/org', {
      method: 'GET',
    }, orgId);
  }

  static async updateAppointmentStatus(
    appointmentId: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
    orgId?: string,
  ): Promise<Appointment> {
    return this.request<Appointment>(`/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, orgId);
  }

  // --- Prescription endpoints ---
  static async createPrescription(body: {
    appointmentId: string;
    notes?: string;
    items: PrescriptionItem[];
  }, orgId?: string): Promise<Prescription> {
    return this.request<Prescription>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(body),
    }, orgId);
  }

  static async getMyPrescriptions(): Promise<Prescription[]> {
    return this.request<Prescription[]>('/prescriptions/mine', {
      method: 'GET',
    });
  }

  static async getPrescriptionById(id: string, orgId?: string): Promise<Prescription> {
    return this.request<Prescription>(`/prescriptions/${id}`, {
      method: 'GET',
    }, orgId);
  }
}
