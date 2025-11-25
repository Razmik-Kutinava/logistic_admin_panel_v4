import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
  Matches,
} from 'class-validator';
import { DRIVER_STATUS, DriverStatusValue } from '../driver-status.enum';

export class CreateDriverDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^[\d\+\-\(\)\s]+$/, {
    message: 'Номер телефона содержит недопустимые символы',
  })
  phone: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsEnum(DRIVER_STATUS, {
    message: `status должен быть одним из значений: ${Object.values(
      DRIVER_STATUS,
    ).join(', ')}`,
  })
  @IsOptional()
  status?: DriverStatusValue;

  @IsString()
  @MaxLength(64)
  licenseNumber: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoAcceptOrders?: boolean;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsDateString()
  documentIssuedAt?: string;

  @IsOptional()
  @IsDateString()
  documentExpiresAt?: string;

  @IsOptional()
  @IsString()
  documentFileUrl?: string;

  @IsOptional()
  @IsString()
  statusReason?: string;
}

