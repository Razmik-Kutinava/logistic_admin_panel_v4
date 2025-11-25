import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { AssignDriverToZoneDto } from './dto/assign-driver.dto';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zonesService.create(createZoneDto);
  }

  @Get()
  findAll() {
    return this.zonesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zonesService.update(id, updateZoneDto);
  }

  @Post(':id/assign-driver')
  assignDriver(
    @Param('id') id: string,
    @Body() assignDriverDto: AssignDriverToZoneDto,
  ) {
    return this.zonesService.assignDriver(id, assignDriverDto);
  }

  @Delete(':id/drivers/:driverId')
  unassignDriver(@Param('id') id: string, @Param('driverId') driverId: string) {
    return this.zonesService.unassignDriver(id, driverId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }
}
