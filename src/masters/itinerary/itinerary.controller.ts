
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ItineraryService } from './itinerary.service';
import { CreateItineraryDto, ListItinerariesDto, UpdateItineraryStatusDto } from '../../common/dto/itinerary.dto';


interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    roleId: string;
    roleName: string;
  };
}

@Controller('masters/itineraries')
@UseGuards(JwtAuthGuard)
export class ItineraryController {
  constructor(
    private readonly itineraryService: ItineraryService,
  ) {}

  @Get()
  async findAll(@Query() query: ListItinerariesDto) {
    const result = await this.itineraryService.findAll(query);

    return {
      success: true,
      message: 'Itineraries retrieved successfully',
      ...result,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const itinerary = await this.itineraryService.findById(id);

    return {
      success: true,
      message: 'Itinerary retrieved successfully',
      data: itinerary,
    };
  }

  @Post()
  async create(
    @Body() dto: CreateItineraryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const itinerary = await this.itineraryService.create(
      dto,
      request.user.id,
    );

    return {
      success: true,
      message: 'Itinerary created successfully',
      data: itinerary,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItineraryStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const itinerary = await this.itineraryService.updateStatus(
      id,
      dto.status,
      request.user.id,
    );

    return {
      success: true,
      message: 'Itinerary status updated successfully',
      data: itinerary,
    };
  }

  @Post(':id/copy')
  async copy(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const itinerary = await this.itineraryService.copy(
      id,
      request.user.id,
    );

    return {
      success: true,
      message: 'Itinerary copied successfully',
      data: itinerary,
    };
  }
}
