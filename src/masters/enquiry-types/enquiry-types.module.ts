import { Module } from "@nestjs/common";

import { EnquiryTypesController } from "./enquiry-types.controller";
import { EnquiryTypesService } from "./enquiry-types.service";
import { EnquiryTypesRepository } from "../../common/repositories/enquiry-types.repository";

@Module({
  controllers: [EnquiryTypesController],
  providers: [
    EnquiryTypesService,
    EnquiryTypesRepository,
  ],
  exports: [EnquiryTypesService],
})
export class EnquiryTypesModule {}