import { Module } from "@nestjs/common";
import { ItineraryModule } from "./itinerary/itinerary.module";

@Module({
imports:[ItineraryModule]
})
export class MastersModule{}