import { IsString } from 'class-validator';

export class AssignOrderDto {
  @IsString()
  driverId: string;
}
