
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
} from "@nestjs/common";

import type { Request } from "express";

import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

import { StatesService } from "./states.service";

import { CreateStateDto, ListStatesDto, UpdateStateStatusDto } from "../../common/dto/states.dto";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    roleId: string;
    roleName: string;
  };
}

@Controller("masters/states")
@UseGuards(JwtAuthGuard)
export class StatesController {
  constructor(
    private readonly statesService: StatesService,
  ) {}

  @Get()
  async findAll(@Query() query: ListStatesDto) {
    const result = await this.statesService.findAll(query);

    return {
      success: true,
      message: "States retrieved successfully",
      ...result,
    };
  }

  @Get("summary")
  async getSummary() {
    const summary = await this.statesService.getSummary();

    return {
      success: true,
      message: "State summary retrieved successfully",
      data: summary,
    };
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const state = await this.statesService.findOne(id);

    return {
      success: true,
      message: "State retrieved successfully",
      data: state,
    };
  }

  @Post()
  async create(
    @Body() dto: CreateStateDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const state = await this.statesService.create(
      dto,
    );

    return {
      success: true,
      message: "State created successfully",
      data: state,
    };
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStateStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const state = await this.statesService.updateStatus(
      id,
      dto.isActive
    );

    return {
      success: true,
      message: "State status updated successfully",
      data: state,
    };
  }
}
