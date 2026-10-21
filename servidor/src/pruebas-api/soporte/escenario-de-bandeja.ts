import { expect } from 'vitest';
import { bd } from '../../modulos/core/base-datos/conexion.js';
import type { Operador } from '../../modulos/core/compartido/aplicacion/operador.js';
import { Identificador } from '../../modulos/core/compartido/dominio/identificador.js';
import { UnidadDeTrabajoPostgres } from '../../modulos/core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import {
  DteRecibido,
  type BorradorDelDte,
  type DatosDelDte,
} from '../../modulos/libro-de-compras/dominio/dte-recibido.js';
import type { LoteDeDte } from '../../modulos/libro-de-compras/dominio/lote-de-dte.js';
import { RepositorioDeDteRecibidosDrizzle } from '../../modulos/libro-de-compras/infraestructura/persistencia/repositorio-de-dte-recibidos.drizzle.js';
import { RepositorioDeLotesDeDteDrizzle } from '../../modulos/libro-de-compras/infraestructura/persistencia/repositorio-de-lotes-de-dte.drizzle.js';
import type { EntornoApi } from './entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  HOY,
  instalarDestinoFalso,
  NIT_DE_LA_EMPRESA,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './escenario-de-documentos.js';

export const RUTA_DTE = '/api/libro-de-compras/dte-recibidos';

const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
const filas = new RepositorioDeDteRecibidosDrizzle();
const lotes = new RepositorioDeLotesDeDteDrizzle();
let consecutivo = 0;

/** Quien actúa en la base al sembrar la bandeja: el usuario de soporte (la importación aún no existe). */
export async function operadorDeLaBandeja(escenario: EscenarioDeDocumentos): Promise<Operador> {
  const [soporte] = await consultar<{ id: string }>('select id from core.usuarios where es_superacceso');
  return {
    empresaId: escenario.cuenta.empresaId,
    cuentaId: escenario.cuenta.cuentaId,
    usuarioId: soporte!.id,
    esSuperacceso: true,
  };
}

/** Un lote de importación con los encabezados desconocidos que se le den. */
export function sembrarLote(operador: Operador, cambios: Partial<LoteDeDte> = {}): Promise<string> {
  const lote: LoteDeDte = {
    id: crypto.randomUUID(),
    empresaId: operador.empresaId,
    proposito: 'bandeja',
    formato: 'xlsx',
    nombreDelArchivo: 'recibidos.xlsx',
    sha256: crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'),
    tamanoEnBytes: 2048,
    versionDelMapa: '1',
    emisionDesde: null,
    emisionHasta: null,
    filasLeidas: 0,
    filasNuevas: 0,
    filasActualizadas: 0,
    filasSinCambio: 0,
    filasRechazadas: 0,
    anuladasEnLaSat: 0,
    rechazos: [],
    encabezadosNoReconocidos: [],
    resumenDeConciliacion: null,
    ...cambios,
  };
  return unidadDeTrabajo.ejecutar(operador, async () => {
    await lotes.agregar(lote);
    return lote.id;
  });
}

/** Lo que cambia de una fila a otra: los datos del DTE y lo que el usuario ya completó. */
export type CambiosDeLaFila = Partial<DatosDelDte> & Partial<BorradorDelDte>;

/** Una factura FACT de hoy, a nombre de la empresa, de Q1,120.00 con IVA de Q120.00. */
export function datosDeLaFila(cambios: CambiosDeLaFila = {}): DatosDelDte {
  consecutivo += 1;
  return {
    autorizacionFel: crypto.randomUUID(),
    tipoDte: 'FACT',
    serie: 'B',
    numero: String(900000 + consecutivo),
    fechaEmision: HOY,
    nitEmisor: '576937K',
    nombreEmisor: 'Agro del Norte, S.A.',
    nitReceptor: NIT_DE_LA_EMPRESA,
    total: '1120.00',
    iva: '120.00',
    idp: '0.00',
    otrosImpuestos: '0.00',
    otrosImpuestosDetalle: {},
    filaOriginal: {},
    estadoSat: 'vigente',
    anuladoEnLaSatEl: null,
    ...cambios,
  };
}

const CAMPOS_DEL_BORRADOR = [
  'proveedorId',
  'conceptoId',
  'destino',
  'fechaRecepcion',
  'periodo',
  'noVinculado',
  'documentoAfectadoId',
] as const;

/** Siembra una fila pendiente con el repositorio, como la dejaría la importación (que aún no existe). */
export function sembrarFila(operador: Operador, loteId: string, cambios: CambiosDeLaFila = {}): Promise<string> {
  const borrador: Partial<BorradorDelDte> = {};
  for (const campo of CAMPOS_DEL_BORRADOR) if (campo in cambios) Object.assign(borrador, { [campo]: cambios[campo] });
  const fila = DteRecibido.crear({
    empresaId: Identificador.desde<'Empresa'>(operador.empresaId),
    loteId,
    datos: datosDeLaFila(cambios),
    borrador,
  });
  return unidadDeTrabajo.ejecutar(operador, async () => {
    await filas.agregar(fila);
    return fila.id.valor;
  });
}

/** La fila tal como quedó en la base, con sus columnas en snake_case. */
export async function filaGuardada(id: string) {
  const [fila] = await consultar<Record<string, any>>('select * from libro_de_compras.dte_recibidos where id = $1', [
    id,
  ]);
  return fila!;
}

/** Una empresa que no retiene nada, con un proveedor que ya tiene un documento (de ahí salen su último concepto y destino). */
export interface BandejaGeneral {
  escenario: EscenarioDeDocumentos;
  operador: Operador;
  loteId: string;
  proveedorId: string;
  /** El documento anterior del proveedor, una factura que sirve para las notas. */
  facturaId: string;
  /** Siembra una fila pendiente de ese proveedor, con concepto y destino ya completados; `cambios` la ajusta. */
  sembrar(cambios?: CambiosDeLaFila): Promise<string>;
}

export async function prepararBandejaGeneral(
  entorno: EntornoApi,
  datos: { usuario: string; nitDelProveedor: string; encabezadosNoReconocidos?: string[] },
): Promise<BandejaGeneral> {
  instalarDestinoFalso();
  const escenario = await prepararEscenario(entorno, datos.usuario);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  const operador = await operadorDeLaBandeja(escenario);
  const loteId = await sembrarLote(operador, { encabezadosNoReconocidos: datos.encabezadosNoReconocidos ?? [] });
  const nit = datos.nitDelProveedor;
  const { proveedorId } = await registrarProveedor(escenario.cuenta, 'Agro del Norte, S.A.', { nit });
  const previo = await escenario.cuenta.propietario.post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, { proveedorId, nitEmisor: nit }),
  );
  expect(previo.estado, JSON.stringify(previo.cuerpo)).toBe(201);
  const sembrar = (cambios: CambiosDeLaFila = {}) =>
    sembrarFila(operador, loteId, {
      nitEmisor: nit,
      conceptoId: escenario.conceptoId,
      destino: 'cuentas-por-pagar',
      ...cambios,
    });
  return { escenario, operador, loteId, proveedorId, facturaId: previo.cuerpo.documento.id, sembrar };
}
