CREATE TABLE "core"."feriados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha" date NOT NULL,
	"nombre" text NOT NULL,
	"origen" text DEFAULT 'asueto_sat' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feriados_fecha_unica" UNIQUE("fecha"),
	CONSTRAINT "feriados_origen_valido" CHECK ("core"."feriados"."origen" in ('fijo', 'semana_santa', 'asueto_sat'))
);
