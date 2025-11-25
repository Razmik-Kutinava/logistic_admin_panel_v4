import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  streets?: string[];
}
