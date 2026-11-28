import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

import { EnquiryTypesService } from "./enquiry-types.service";

import { CreateEnquiryTypeDto, UpdateEnquiryTypeDto, UpdateEnquiryTypeStatusDto, GetEnquiryTypesDto } from "../../common/dto/enquiry-type.dto";

@Controller("masters/enquiry-types")
@UseGuards(JwtAuthGuard)
export class EnquiryTypesController {
  constructor(
    private readonly enquiryTypesService: EnquiryTypesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() payload: CreateEnquiryTypeDto) {
    const data = await this.enquiryTypesService.create(payload);

    return {
      success: true,
      message: "Enquiry type created successfully.",
      data,
    };
  }

  @Get()
  async findAll(@Query() query: GetEnquiryTypesDto) {
    const result = await this.enquiryTypesService.findAll(query);

    return {
      success: true,
      message: "Enquiry types fetched successfully.",
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const data = await this.enquiryTypesService.findOne(id);

    return {
      success: true,
      message: "Enquiry type fetched successfully.",
      data,
    };
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() payload: UpdateEnquiryTypeDto,
  ) {
    const data = await this.enquiryTypesService.update(id, payload);

    return {
      success: true,
      message: "Enquiry type updated successfully.",
      data,
    };
  }

//   @Patch(":id/status")
//   async updateStatus(
//     @Param("id", ParseUUIDPipe) id: string,
//     @Body() payload: UpdateEnquiryTypeStatusDto,
//   ) {
//     const data = await this.enquiryTypesService.updateStatus(
//       id,
//       payload,
//     );

//     return {
//       success: true,
//       message: `Enquiry type ${payload.isActive ? "activated" : "deactivated"} successfully.`,
//       data,
//     };
//   }

  @Delete(":id")
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const data = await this.enquiryTypesService.remove(id);

    return {
      success: true,
      message: "Enquiry type deleted successfully.",
      data,
    };
  }
}