ALTER TABLE "terceros"."clientes" ADD COLUMN "creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."clientes" ADD COLUMN "actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."contactos" ADD COLUMN "creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."contactos" ADD COLUMN "actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."categorias_proveedor" ADD COLUMN "creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."categorias_proveedor" ADD COLUMN "actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."proveedores" ADD COLUMN "creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."proveedores" ADD COLUMN "actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."terceros" ADD COLUMN "creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "terceros"."terceros" ADD COLUMN "actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;