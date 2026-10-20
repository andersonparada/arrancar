/** Piezas comunes de las pruebas de integración de la bandeja de DTE: lotes y filas válidos que cada caso cambia. */
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';
import { lotesDeDte } from './lotes-de-dte.tablas.js';

export type LoteNuevo = typeof lotesDeDte.$inferInsert;
export type DteNuevo = typeof dteRecibidos.$inferInsert;

let secuencia = 0;

/** Un lote de una importación con 3 filas leídas (1 nueva, 1 actualizada, 1 sin cambio, 0 rechazadas). */
export function loteValido(empresaId: string, cambios: Partial<LoteNuevo> = {}): LoteNuevo {
  secuencia += 1;
  return {
    empresaId,
    proposito: 'bandeja',
    formato: 'xlsx',
    nombreDelArchivo: 'recibidos.xlsx',
    sha256: secuencia.toString(16).padStart(64, '0'),
    tamanoEnBytes: 2048,
    versionDelMapa: '1',
    emisionDesde: '2026-03-01',
    emisionHasta: '2026-03-31',
    filasLeidas: 3,
    filasNuevas: 1,
    filasActualizadas: 1,
    filasSinCambio: 1,
    filasRechazadas: 0,
    anuladasEnLaSat: 0,
    ...cambios,
  };
}

/** Una factura recibida pendiente, que cuadra (Q112 con IVA de Q12). */
export function dteValido(empresaId: string, loteId: string, cambios: Partial<DteNuevo> = {}): DteNuevo {
  secuencia += 1;
  return {
    empresaId,
    autorizacionFel: crypto.randomUUID(),
    tipoDte: 'FACT',
    serie: 'A',
    numero: `N${secuencia}`,
    fechaEmision: '2026-03-10',
    nitEmisor: '1234567',
    nombreEmisor: 'Proveedor A',
    nitReceptor: '7654321',
    total: '112',
    iva: '12',
    filaOriginal: { 'Número de autorización': 'x' },
    estadoSat: 'vigente',
    loteId,
    primerLoteId: loteId,
    ...cambios,
  };
}

/** Inserta un lote y devuelve su id. */
export async function insertarLote(contexto: ContextoEmpresa, cambios: Partial<LoteNuevo> = {}): Promise<string> {
  const valores = loteValido(contexto.empresaId, cambios);
  const [fila] = await enTransaccionSegura(contexto, (tx) => tx.insert(lotesDeDte).values(valores).returning());
  return fila!.id;
}

/** Inserta una fila de la bandeja (con su propio lote si no se le da uno) y devuelve su id. */
export async function insertarDte(
  contexto: ContextoEmpresa,
  cambios: Partial<DteNuevo> = {},
  loteId?: string,
): Promise<string> {
  const lote = loteId ?? (await insertarLote(contexto));
  const valores = dteValido(contexto.empresaId, lote, cambios);
  const [fila] = await enTransaccionSegura(contexto, (tx) => tx.insert(dteRecibidos).values(valores).returning());
  return fila!.id;
}
