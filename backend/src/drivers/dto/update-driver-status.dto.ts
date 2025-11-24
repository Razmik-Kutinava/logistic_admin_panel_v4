import { IsEnum } from 'class-validator';
import { DRIVER_STATUS, DriverStatusValue } from '../driver-status.enum';

export class UpdateDriverStatusDto {
  @IsEnum(DRIVER_STATUS)
  status: DriverStatusValue;
}

