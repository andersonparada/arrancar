import { foreignKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { contrasenaDocumentos } from './contrasena-documentos.tablas.js';
import { documentos } from './documentos.tablas.js';
import { pagos } from './pagos.tablas.js';

/** Las columnas de `aplicaciones_de_pagos` que usan sus llaves. */
type T = Record<'empresaId' | 'proveedorId' | 'pagoId' | 'contrasenaId' | 'cargoId', AnyPgColumn>;

/**
 * Las llaves de una línea de pago: del pago (misma empresa y proveedor), del cargo (mismo proveedor; se va
 * con él) y de la contraseña que lo contiene (sin cascada, para que un cargo con pagos no se quite de ella).
 */
export const llavesDeAplicacionDePago = (t: T) => [
  foreignKey({
    name: 'aplicaciones_de_pagos_pago_fk',
    columns: [t.pagoId, t.empresaId, t.proveedorId],
    foreignColumns: [pagos.id, pagos.empresaId, pagos.proveedorId],
  }),
  foreignKey({
    name: 'aplicaciones_de_pagos_cargo_fk',
    columns: [t.cargoId, t.empresaId, t.proveedorId],
    foreignColumns: [documentos.id, documentos.empresaId, documentos.proveedorId],
  }).onDelete('cascade'),
  foreignKey({
    name: 'aplicaciones_de_pagos_en_la_contrasena_fk',
    columns: [t.contrasenaId, t.cargoId],
    foreignColumns: [contrasenaDocumentos.contrasenaId, contrasenaDocumentos.documentoId],
  }),
];
