import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DistrictsService } from './districts.service';
import {
  CreateDistrictDto,
  ListDistrictsDto,
  UpdateDistrictDto,
  UpdateDistrictStatusDto,
} from '../../common/dto/districts.dto';

@Controller('masters/districts')
@UseGuards(JwtAuthGuard)
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Get()
  async findAll(@Query() query: ListDistrictsDto) {
    const result = await this.districtsService.findAll(query);

    return {
      success: true,
      message: 'Districts retrieved successfully',
      ...result,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const district = await this.districtsService.findOne(id);

    return {
      success: true,
      message: 'District retrieved successfully',
      data: district,
    };
  }

  @Post()
  async create(@Body() dto: CreateDistrictDto) {
    const district = await this.districtsService.create(dto);

    return {
      success: true,
      message: 'District Created Successfully',
      data: district,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistrictStatusDto,
  ) {
    const district = await this.districtsService.updateStatus(id, dto.isActive);

    return {
      success: true,
      message: 'District status updated Successfully.',
      data: district,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistrictDto,
  ) {
    const district = await this.districtsService.update(id, dto);

    return {
      success: true,
      message: 'District updated successfully',
      data: district,
    };
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    const district = await this.districtsService.delete(id);

    return {
      success: true,
      message: 'District deleted successfully',
      data: district,
    };
  }
}
