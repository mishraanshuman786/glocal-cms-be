ALTER TABLE "itineraries" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "itineraries" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::text;--> statement-breakpoint
DROP TYPE "public"."itinerary_status";--> statement-breakpoint
CREATE TYPE "public"."itinerary_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
ALTER TABLE "itineraries" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"public"."itinerary_status";--> statement-breakpoint
ALTER TABLE "itineraries" ALTER COLUMN "status" SET DATA TYPE "public"."itinerary_status" USING "status"::"public"."itinerary_status";