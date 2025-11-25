import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum AlertType {
  DRIVER_LATE = 'driver_late',
  ORDER_DELAYED = 'order_delayed',
  ZONE_UNDERSTAFFED = 'zone_understaffed',
  SYSTEM_ERROR = 'system_error',
  CUSTOM = 'custom',
}

export enum AlertStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export class CreateAlertDto {
  @IsEnum(AlertType)
  type: AlertType;

  @IsOptional()
  @IsObject()
  payload?: any;

  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;
}
