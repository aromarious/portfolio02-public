CREATE TABLE "contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"subject" varchar(256) NOT NULL,
	"message" text NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"browser_name" varchar(100),
	"browser_version" varchar(50),
	"os_name" varchar(100),
	"device_type" varchar(20),
	"screen_resolution" varchar(20),
	"timezone" varchar(50),
	"language" varchar(10),
	"referer" text,
	"session_id" varchar(256),
	"form_duration" integer,
	"previous_visit_at" timestamp,
	"notion_synced" boolean DEFAULT false NOT NULL,
	"slack_notified" boolean DEFAULT false NOT NULL,
	"notion_synced_at" timestamp,
	"slack_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"company" varchar(256),
	"twitter_handle" varchar(50),
	"first_contact_at" timestamp DEFAULT now() NOT NULL,
	"last_contact_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "person_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" "inet",
	"email" varchar(254),
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"first_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_person_id_idx" ON "contact" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "contact_created_at_idx" ON "contact" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "person_email_idx" ON "person" USING btree ("email");--> statement-breakpoint
CREATE INDEX "rate_limit_ip_time_idx" ON "rate_limit" USING btree ("ip_address","last_attempt_at");--> statement-breakpoint
CREATE INDEX "rate_limit_email_time_idx" ON "rate_limit" USING btree ("email","last_attempt_at");--> statement-breakpoint
CREATE INDEX "rate_limit_cleanup_idx" ON "rate_limit" USING btree ("created_at");