import { IsOptional, IsNumber } from 'class-validator';

export class EndShiftDto {
  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  ordersCompleted?: number;
}
