import { Module } from "@nestjs/common";
import { DistrictsController } from "./districts.controller";
import { DistrictsService } from "./districts.service";
import { DistrictsRepository } from "../../common/repositories/districts.repository";

import { StatesRepository } from "../../common/repositories/states.repository";

@Module({
    controllers:[DistrictsController],
    providers:[DistrictsService, DistrictsRepository, StatesRepository],
    exports:[DistrictsService]
})
export class DistrictsModule{}