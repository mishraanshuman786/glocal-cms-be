import { Module } from "@nestjs/common";
import { ItineraryModule } from "./itinerary/itinerary.module";
import { StatesModule } from "./states/states.module";

@Module({
imports:[ItineraryModule, StatesModule]
})
export class MastersModule{}