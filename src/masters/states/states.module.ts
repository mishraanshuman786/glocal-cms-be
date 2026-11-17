import { Module } from "@nestjs/common";
import { StatesController } from "./states.controller";
import { StatesService } from "./states.service";
import { StatesRepository } from "../../common/repositories/states.repository";

@Module({
controllers:[StatesController],
providers:[StatesService, StatesRepository],
exports:[StatesService]
})
export class StatesModule{};