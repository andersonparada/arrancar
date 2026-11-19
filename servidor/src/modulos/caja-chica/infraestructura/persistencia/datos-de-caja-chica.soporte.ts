/**
 * Filas válidas de las tablas de Caja chica para las pruebas de integración: cada función pone los valores mínimos
 * y recibe los que el caso cambia. Escriben con la unidad de trabajo, como un caso de uso.
 */
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { arqueos } from './arqueos.tablas.js';
import { cambiosDeMonto } from './cambios-de-monto.tablas.js';
import { comprobantes } from './comprobantes.tablas.js';
import { crearDocumentoDeLibro, contextoDe, type Escenario } from './escenario.soporte.js';
import { fondos } from './fondos.tablas.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';
import { valesProvisionales } from './vales-provisionales.tablas.js';

let secuencia = 0;
const siguiente = () => (secuencia += 1);

/** Un fondo abierto de la empresa A1 con los valores mínimos válidos. */
export async function crearFondo(
  escenario: Escenario,
  cambios: Partial<typeof fondos.$inferInsert> = {},
  contexto = contextoDe(escenario),
) {
  const valores = {
    empresaId: contexto.empresaId,
    nombre: `Fondo ${siguiente()}`,
    fechaDeApertura: '2026-03-01',
    ...cambios,
  };
  const [fila] = await enTransaccionSegura(contexto, (tx) => tx.insert(fondos).values(valores).returning());
  return fila!;
}

/** Los valores de un arqueo sin diferencia (cuenta justo lo que esperaba), para insertar o para cambiar. */
export const arqueoValido = (
  escenario: Escenario,
  fondoId: string,
  cambios: Partial<typeof arqueos.$inferInsert> = {},
): typeof arqueos.$inferInsert => ({
  empresaId: escenario.empresaA1,
  fondoId,
  numero: siguiente(),
  realizadoEn: new Date('2026-03-15T10:00:00Z'),
  arqueadoPor: escenario.usuarioId,
  custodio: 'Juan Pérez',
  conteo: [{ denominacionCentavos: 10000, cantidad: 1 }],
  efectivoContado: '100',
  montoDelFondo: '100',
  pendienteDeReponer: '0',
  valesAbiertos: '0',
  efectivoEsperado: '100',
  diferencia: '0',
  comprobantesCompletos: true,
  ...cambios,
});

export async function crearArqueo(
  escenario: Escenario,
  fondoId: string,
  cambios: Partial<typeof arqueos.$inferInsert> = {},
) {
  const valores = arqueoValido(escenario, fondoId, cambios);
  const [fila] = await enTransaccionSegura(contextoDe(escenario), (tx) =>
    tx.insert(arqueos).values(valores).returning(),
  );
  return fila!;
}

export async function crearVale(
  escenario: Escenario,
  fondoId: string,
  cambios: Partial<typeof valesProvisionales.$inferInsert> = {},
) {
  const valores = {
    empresaId: escenario.empresaA1,
    fondoId,
    numero: siguiente(),
    fecha: '2026-03-10',
    entregadoA: 'Pedro López',
    monto: '50',
    motivo: 'Compra de insumos',
    ...cambios,
  };
  const [fila] = await enTransaccionSegura(contextoDe(escenario), (tx) =>
    tx.insert(valesProvisionales).values(valores).returning(),
  );
  return fila!;
}

/** Un cambio de monto (la apertura por omisión) del fondo. */
export async function crearCambioDeMonto(
  escenario: Escenario,
  fondoId: string,
  cambios: Partial<typeof cambiosDeMonto.$inferInsert> = {},
) {
  const valores = {
    empresaId: escenario.empresaA1,
    fondoId,
    tipo: 'apertura' as const,
    forma: 'saldo_inicial' as const,
    fecha: '2026-03-01',
    monto: '1000',
    ...cambios,
  };
  const [fila] = await enTransaccionSegura(contextoDe(escenario), (tx) =>
    tx.insert(cambiosDeMonto).values(valores).returning(),
  );
  return fila!;
}

/** Un vale de gasto asignado al fondo (el comprobante que no necesita documento del libro). */
export const valeDeGastoValido = (
  escenario: Escenario,
  fondoId: string | null,
  cambios: Partial<typeof comprobantes.$inferInsert> = {},
): typeof comprobantes.$inferInsert => ({
  empresaId: escenario.empresaA1,
  fondoId,
  clase: 'vale_de_gasto',
  fecha: '2026-03-10',
  monto: '25',
  numero: siguiente(),
  descripcion: 'Taxi',
  pagadoA: 'Taxista',
  conceptoDeGastoId: escenario.conceptoDeGastoA1,
  motivoSinDocumento: 'No dio factura',
  asignadoEn: fondoId ? new Date() : null,
  asignadoPor: fondoId ? escenario.usuarioId : null,
  ...cambios,
});

/** Un documento del libro de compras recibido por Caja chica; sin `fondoId` queda en la bandeja. */
export async function valorDeDocumento(
  escenario: Escenario,
  fondoId: string | null,
  cambios: Partial<typeof comprobantes.$inferInsert> = {},
): Promise<typeof comprobantes.$inferInsert> {
  return {
    empresaId: escenario.empresaA1,
    fondoId,
    clase: 'documento',
    documentoDeCompraId: await crearDocumentoDeLibro(escenario),
    proveedorId: escenario.proveedorA,
    fecha: '2026-03-10',
    monto: '112',
    asignadoEn: fondoId ? new Date() : null,
    asignadoPor: fondoId ? escenario.usuarioId : null,
    ...cambios,
  };
}

export async function crearComprobante(escenario: Escenario, valores: typeof comprobantes.$inferInsert) {
  const [fila] = await enTransaccionSegura(contextoDe(escenario), (tx) =>
    tx.insert(comprobantes).values(valores).returning(),
  );
  return fila!;
}

/**
 * Una reposición; las pruebas la ligan a comprobantes. Con `movimientoId` es de cheque, y sin él, compensada al
 * cerrar (la forma se puede cambiar para probar las reglas).
 */
export async function crearReposicion(
  escenario: Escenario,
  fondoId: string,
  cambios: Partial<typeof reposiciones.$inferInsert> = {},
) {
  const valores = {
    empresaId: escenario.empresaA1,
    fondoId,
    numero: siguiente(),
    fecha: '2026-03-20',
    forma: cambios.movimientoId ? ('cheque' as const) : ('compensada_al_cerrar' as const),
    monto: '100',
    movimientoId: null,
    custodio: 'Juan Pérez',
    ...cambios,
  };
  const [fila] = await enTransaccionSegura(contextoDe(escenario), (tx) =>
    tx.insert(reposiciones).values(valores).returning(),
  );
  return fila!;
}

export async function ligarComprobante(
  escenario: Escenario,
  linea: typeof reposicionComprobantes.$inferInsert,
): Promise<void> {
  await enTransaccionSegura(contextoDe(escenario), (tx) => tx.insert(reposicionComprobantes).values(linea));
}
