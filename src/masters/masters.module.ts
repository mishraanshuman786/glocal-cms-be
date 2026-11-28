import { Module } from "@nestjs/common";
import { ItineraryModule } from "./itinerary/itinerary.module";
import { StatesModule } from "./states/states.module";
import { DistrictsModule } from "./districts/districts.module";
import { EnquiryTypesModule } from "./enquiry-types/enquiry-types.module";

@Module({
imports:[ItineraryModule, StatesModule, DistrictsModule, EnquiryTypesModule]
})
export class MastersModule{}