import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
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
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Номер телефона должен быть в формате E.164',
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
}

