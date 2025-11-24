const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export type DriverStatus = 'active' | 'inactive' | 'on_shift';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: DriverStatus;
  createdAt: string;
}

export interface CreateDriverPayload {
  name: string;
  phone: string;
  email: string;
  status?: DriverStatus;
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

