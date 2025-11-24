import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';
import { IsOptional } from 'class-validator';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {}

