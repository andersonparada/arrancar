CREATE TABLE "core"."departamentos" (
	"codigo" char(2) PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."municipios" (
	"departamento_codigo" char(2) NOT NULL,
	"codigo" char(2) NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "municipios_departamento_codigo_codigo_pk" PRIMARY KEY("departamento_codigo","codigo")
);
--> statement-breakpoint
ALTER TABLE "core"."municipios" ADD CONSTRAINT "municipios_departamento_codigo_departamentos_codigo_fk" FOREIGN KEY ("departamento_codigo") REFERENCES "core"."departamentos"("codigo") ON DELETE restrict ON UPDATE no action;