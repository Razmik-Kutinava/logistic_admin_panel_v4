import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto, ShiftStatus } from './dto/create-shift.dto';
import { EndShiftDto } from './dto/end-shift.dto';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  findAll(@Query('status') status?: ShiftStatus) {
    return this.shiftsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id/end')
  endShift(@Param('id') id: string, @Body() endShiftDto?: EndShiftDto) {
    return this.shiftsService.endShift(id, endShiftDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }
}
