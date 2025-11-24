const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export type DriverStatus = 'active' | 'inactive' | 'on_shift';

export interface DriverProfile {
  licenseNumber: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
  };
}

export interface DriverSettings {
  notificationsEnabled: boolean;
  autoAcceptOrders: boolean;
  preferredLanguage?: string;
}

export interface DriverDocument {
  id: string;
  documentType: string;
  documentNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
  fileUrl?: string;
  createdAt: string;
}

export interface DriverStatusSnapshot {
  id: string;
  status: DriverStatus;
  reason?: string;
  effectiveAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: DriverStatus;
  createdAt: string;
  driverProfile?: DriverProfile;
  driverSettings?: DriverSettings;
  driverDocuments?: DriverDocument[];
  driverStatuses?: DriverStatusSnapshot[];
}

export interface CreateDriverPayload {
  name: string;
  phone: string;
  email: string;
  status?: DriverStatus;
  licenseNumber: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notificationsEnabled?: boolean;
  autoAcceptOrders?: boolean;
  preferredLanguage?: string;
  documentType?: string;
  documentNumber?: string;
  documentIssuedAt?: string;
  documentExpiresAt?: string;
  documentFileUrl?: string;
  statusReason?: string;
}

export interface DashboardMetrics {
  drivers: number;
  zones: number;
  orders: number;
  routes: number;
  shifts: number;
  devices: number;
  alerts: number;
  documents: number;
  logs: {
    systemLogs: number;
    apiLogs: number;
    appErrors: number;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message ?? 'API request failed');
  }
  return (await response.json()) as T;
}

export async function getDrivers(): Promise<Driver[]> {
  const res = await fetch(`${BASE_URL}/drivers`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<Driver[]>(res);
}

export async function createDriver(payload: CreateDriverPayload): Promise<Driver> {
  const res = await fetch(`${BASE_URL}/drivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Driver>(res);
}

export async function deleteDriver(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/drivers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message ?? 'Не удалось удалить водителя');
  }
}

export async function getMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${BASE_URL}/metrics`);
  return handleResponse<DashboardMetrics>(res);
}

