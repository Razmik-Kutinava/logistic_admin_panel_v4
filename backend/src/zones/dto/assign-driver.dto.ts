import { IsString } from 'class-validator';

export class AssignDriverToZoneDto {
  @IsString()
  driverId: string;
}
