import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ShiftStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateShiftDto {
  @IsString()
  driverId: string;

  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;
}
