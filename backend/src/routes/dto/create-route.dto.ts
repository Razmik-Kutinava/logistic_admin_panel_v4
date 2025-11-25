import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum RouteStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateRoutePointDto {
  @IsString()
  address: string;

  @IsNumber()
  sequence: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateRouteDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsEnum(RouteStatus)
  status: RouteStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoutePointDto)
  points?: CreateRoutePointDto[];
}
