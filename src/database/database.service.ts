import {Injectable,OnModuleInit, OnModuleDestroy} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {drizzle, NodePgDatabase} from "drizzle-orm/node-postgres";
import { Pool } from "pg";

@Injectable()
export class DatabaseService implements OnModuleInit,OnModuleDestroy{
    private readonly pool:Pool;
    public readonly db:NodePgDatabase;

    constructor(private readonly configService:ConfigService){

        const databaseUrl=this.configService.get<string>("DATABASE_URL");
        if(!databaseUrl){
            throw new Error("DATABASE_URL is not Configured!");
        }

        this.pool=new Pool({
            connectionString:databaseUrl
        });

        this.db=drizzle(this.pool);
         console.log("✅ PostgreSQL database connected");

    }

    // Verify the connection
    async onModuleInit() {
        await this.pool.query("SELECT 1");
    }


    // closing the connection on Module Destro
    async onModuleDestroy() {
        await this.pool.end();
    }
}