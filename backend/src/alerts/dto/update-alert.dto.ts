import { IsEnum } from 'class-validator';
import { AlertStatus } from './create-alert.dto';

export class UpdateAlertDto {
  @IsEnum(AlertStatus)
  status: AlertStatus;
}
