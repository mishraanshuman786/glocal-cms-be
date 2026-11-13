import { Module } from "@nestjs/common";
import { ItineraryController } from "./itinerary.controller";
import { ItineraryService } from "./itinerary.service";
import { ItineraryRepository } from "../../common/repositories/itinerary.repository";

@Module({
controllers:[ItineraryController],
providers:[ItineraryService, ItineraryRepository],
exports:[ItineraryService]
})
export class ItineraryModule{}
