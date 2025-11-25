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

// ===== DASHBOARD API =====
export interface DetailedMetrics {
  drivers: {
    total: number;
    active: number;
    onShift: number;
    inactive: number;
  };
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  shifts: {
    active: number;
    totalToday: number;
  };
  routes: {
    active: number;
    completed: number;
  };
  zones: {
    total: number;
    withDrivers: number;
  };
  alerts: {
    unresolved: number;
    total: number;
  };
}

export async function getDashboardMetrics(): Promise<DetailedMetrics> {
  const res = await fetch(`${BASE_URL}/dashboard/metrics`);
  return handleResponse<DetailedMetrics>(res);
}

export async function getOrdersTimeline(days = 7) {
  const res = await fetch(`${BASE_URL}/dashboard/orders-timeline?days=${days}`);
  return handleResponse<{ status: string; count: number }[]>(res);
}

export async function getDriverPerformance() {
  const res = await fetch(`${BASE_URL}/dashboard/driver-performance`);
  return handleResponse<any[]>(res);
}

// ===== ORDERS API =====
export type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface OrderPoint {
  id: string;
  kind: string;
  address: string;
  latitude?: number;
  longitude?: number;
  sequence: number;
  status?: string;
}

export interface Order {
  id: string;
  externalId?: string;
  customerName?: string;
  status: OrderStatus;
  createdAt: string;
  points?: OrderPoint[];
  assignments?: any[];
  zones?: any;
}

export interface CreateOrderPayload {
  externalId?: string;
  customerName?: string;
  status: OrderStatus;
  zoneId?: string;
  points?: {
    kind: string;
    address: string;
    latitude?: number;
    longitude?: number;
    sequence: number;
  }[];
}

export async function getOrders(status?: OrderStatus): Promise<Order[]> {
  const url = status ? `${BASE_URL}/orders?status=${status}` : `${BASE_URL}/orders`;
  const res = await fetch(url);
  return handleResponse<Order[]>(res);
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Order>(res);
}

export async function assignOrderToDriver(orderId: string, driverId: string): Promise<Order> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId }),
  });
  return handleResponse<Order>(res);
}

export async function deleteOrder(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orders/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete order');
}

// ===== ZONES API =====
export interface Zone {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: string;
  streets?: { id: string; street: string }[];
  assignments?: any[];
  _count?: {
    orders: number;
    assignments: number;
  };
}

export interface CreateZonePayload {
  name: string;
  color?: string;
  description?: string;
  streets?: string[];
}

export async function getZones(): Promise<Zone[]> {
  const res = await fetch(`${BASE_URL}/zones`);
  return handleResponse<Zone[]>(res);
}

export async function createZone(payload: CreateZonePayload): Promise<Zone> {
  const res = await fetch(`${BASE_URL}/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Zone>(res);
}

export async function deleteZone(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/zones/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete zone');
}

// ===== SHIFTS API =====
export type ShiftStatus = 'active' | 'completed' | 'cancelled';

export interface Shift {
  id: string;
  driverId: string;
  startTime: string;
  endTime?: string;
  status: ShiftStatus;
  ordersCompleted: number;
  distanceKm?: number;
  driver?: {
    id: string;
    name: string;
    phone: string;
  };
}

export async function getShifts(status?: ShiftStatus): Promise<Shift[]> {
  const url = status ? `${BASE_URL}/shifts?status=${status}` : `${BASE_URL}/shifts`;
  const res = await fetch(url);
  return handleResponse<Shift[]>(res);
}

export async function createShift(driverId: string): Promise<Shift> {
  const res = await fetch(`${BASE_URL}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId, status: 'active' }),
  });
  return handleResponse<Shift>(res);
}

export async function endShift(id: string, data?: { distanceKm?: number; ordersCompleted?: number }): Promise<Shift> {
  const res = await fetch(`${BASE_URL}/shifts/${id}/end`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  });
  return handleResponse<Shift>(res);
}

// ===== ALERTS API =====
export type AlertType = 'driver_late' | 'order_delayed' | 'zone_understaffed' | 'system_error' | 'custom';
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  type: AlertType;
  payload?: any;
  status: AlertStatus;
  createdAt: string;
}

export async function getAlerts(status?: AlertStatus): Promise<Alert[]> {
  const url = status ? `${BASE_URL}/alerts?status=${status}` : `${BASE_URL}/alerts`;
  const res = await fetch(url);
  return handleResponse<Alert[]>(res);
}

export async function createAlert(payload: { type: AlertType; payload?: any; status?: AlertStatus }): Promise<Alert> {
  const res = await fetch(`${BASE_URL}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Alert>(res);
}

export async function updateAlertStatus(id: string, status: AlertStatus): Promise<Alert> {
  const res = await fetch(`${BASE_URL}/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse<Alert>(res);
}

