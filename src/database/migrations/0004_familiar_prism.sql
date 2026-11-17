CREATE TYPE "public"."state_region" AS ENUM('NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTH_EAST');--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"region" "state_region" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "districts_state_name_unique" ON "districts" USING btree ("state_id",lower("name"));--> statement-breakpoint
CREATE INDEX "districts_state_id_idx" ON "districts" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "districts_is_active_idx" ON "districts" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "states_name_unique" ON "state" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "states_region_idx" ON "state" USING btree ("region");--> statement-breakpoint
CREATE INDEX "states_is_active_idx" ON "state" USING btree ("is_active");