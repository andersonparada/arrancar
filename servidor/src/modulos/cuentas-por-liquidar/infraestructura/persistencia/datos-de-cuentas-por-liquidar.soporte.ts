/**
 * Filas válidas de anticipos y gastos para las pruebas de integración de Cuentas por liquidar: cada función pone los
 * valores mínimos y recibe los que el caso cambia. Escriben con la unidad de trabajo, como un caso de uso.
 */
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { anticipos } from './anticipos.tablas.js';
import { contextoDe, crearDocumentoDeLibro, crearMovimiento, type Escenario } from './escenario.soporte.js';
import { gastos } from './gastos.tablas.js';

let secuencia = 0;
const siguiente = () => (secuencia += 1);

type ValoresDeAnticipo = Partial<typeof anticipos.$inferInsert>;

/** Un anticipo abierto de Q1,000 con los valores mínimos válidos (con su propio cheque de Bancos). */
export async function valorDeAnticipo(
  escenario: Escenario,
  cambios: ValoresDeAnticipo = {},
): Promise<typeof anticipos.$inferInsert> {
  return {
    empresaId: escenario.empresaA1,
    numero: siguiente(),
    beneficiarioId: escenario.beneficiarioA,
    beneficiario: 'Beneficiario A',
    esEmpleado: true,
    clase: 'viatico',
    descripcion: 'Viaje a la capital',
    fecha: '2026-03-10',
    fechaLimite: '2026-03-25',
    monto: '1000',
    forma: 'cheque',
    movimientoId: await crearMovimiento(escenario),
    ...cambios,
  };
}

export async function crearAnticipo(escenario: Escenario, cambios: ValoresDeAnticipo = {}) {
  const valores = await valorDeAnticipo(escenario, cambios);
  const [fila] = await enTransaccionSegura(contextoDe(escenario), (tx) =>
    tx.insert(anticipos).values(valores).returning(),
  );
  return fila!;
}

type ValoresDeGasto = Partial<typeof gastos.$inferInsert>;

/** Un gasto sin documento asignado a un anticipo (o en la bandeja si es un documento sin anticipo). */
export const valorDeGastoSinDocumento = (
  escenario: Escenario,
  anticipoId: string | null,
  cambios: ValoresDeGasto = {},
): typeof gastos.$inferInsert => ({
  empresaId: escenario.empresaA1,
  anticipoId,
  clase: 'sin_documento',
  fecha: '2026-03-11',
  monto: '50',
  descripcion: 'Taxi',
  pagadoA: 'Taxista',
  conceptoDeGastoId: escenario.conceptoDeGastoA1,
  motivoSinDocumento: 'No dio factura',
  tratamientoSinDocumento: 'no_deducible',
  asignadoEn: anticipoId ? new Date() : null,
  asignadoPor: anticipoId ? escenario.usuarioId : null,
  ...cambios,
});

export async function valorDeGastoDeDocumento(
  escenario: Escenario,
  anticipoId: string | null,
  cambios: ValoresDeGasto = {},
): Promise<typeof gastos.$inferInsert> {
  return {
    empresaId: escenario.empresaA1,
    anticipoId,
    clase: 'documento',
    documentoDeCompraId: await crearDocumentoDeLibro(escenario),
    proveedorId: escenario.proveedorA,
    fecha: '2026-03-11',
    monto: '112',
    asignadoEn: anticipoId ? new Date() : null,
    asignadoPor: anticipoId ? escenario.usuarioId : null,
    ...cambios,
  };
}

export async function crearGasto(escenario: Escenario, valores: typeof gastos.$inferInsert) {
  const [fila] = await enTransaccionSegura(contextoDe(escenario), (tx) =>
    tx.insert(gastos).values(valores).returning(),
  );
  return fila!;
}
