export const DRIVER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_SHIFT: 'on_shift',
} as const;

export type DriverStatusValue =
  (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS];

export const DRIVER_STATUS_VALUES: DriverStatusValue[] = Object.values(
  DRIVER_STATUS,
) as DriverStatusValue[];

