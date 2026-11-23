import { expect, vi } from 'vitest';
import { ReglaDeNegocioInfringida } from '../../modulos/core/compartido/dominio/errores.js';
import '../../modulos/core/contratos/cuentas-por-cobrar.contratos.js';
import type { DocumentoDeVentaParaDestino } from '../../modulos/core/contratos/libro-de-ventas.contratos.js';
import '../../modulos/core/contratos/libro-de-ventas.contratos.js';
import { mediador } from '../../modulos/core/mediador/contexto.js';
import { ModulosActivosDeLaCuentaEnRegistro } from '../../modulos/core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import type { EntornoApi } from './entorno-api.js';
import { configurarEmpresa, HOY } from './escenario-de-documentos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './escenarios.js';

export const RUTA_DOCUMENTOS_DE_VENTA = '/api/libro-de-ventas/documentos';
export const NIT_DEL_CLIENTE = '576937K';
const MODULOS = ['terceros', 'libro-de-compras', 'libro-de-ventas'];

export class CarteraRechaza extends ReglaDeNegocioInfringida {
  readonly codigo = 'cartera_rechaza';
}

/** La cartera falsa: sustituye a Cuentas por cobrar (que aún no existe) para probar Libro de ventas sin sus reglas. */
export interface CarteraFalsa {
  recibidos: DocumentoDeVentaParaDestino[];
  rechazar: boolean;
  instalada: boolean;
  avisosDeBaja: Array<{ aviso: 'anular' | 'eliminar'; documentoId: string; motivo?: string }>;
}

/** Instala la cartera falsa: atiende `recibir_documento`, escucha los avisos de baja y hace que el módulo figure activo. */
export function instalarCarteraFalsa(): CarteraFalsa {
  mediador.retirarManejadoresDe('cuentas-por-cobrar');
  const cartera: CarteraFalsa = { recibidos: [], rechazar: false, instalada: true, avisosDeBaja: [] };
  const baja = (aviso: 'anular' | 'eliminar', documentoId: string, motivo?: string) => {
    cartera.avisosDeBaja.push({ aviso, documentoId, motivo });
    if (cartera.rechazar) throw new CarteraRechaza('La cartera no acepta la baja.');
  };
  mediador.escuchar('cuentas-por-cobrar', 'libro-de-ventas.documento_por_anular', async (datos) =>
    baja('anular', datos.documentoId, datos.motivo),
  );
  mediador.escuchar('cuentas-por-cobrar', 'libro-de-ventas.documento_por_eliminar', async (datos) =>
    baja('eliminar', datos.documentoId),
  );
  mediador.atender('cuentas-por-cobrar', 'cuentas-por-cobrar.recibir_documento', async (documento) => {
    cartera.recibidos.push(documento);
    if (cartera.rechazar) throw new CarteraRechaza('La cartera rechazó el documento.');
    return { avisos: [] };
  });
  const original = ModulosActivosDeLaCuentaEnRegistro.prototype.activosPara;
  vi.spyOn(ModulosActivosDeLaCuentaEnRegistro.prototype, 'activosPara').mockImplementation(async function (
    this: ModulosActivosDeLaCuentaEnRegistro,
    cuentaId: string,
  ) {
    const activos = new Set(await original.call(this, cuentaId));
    if (cartera.instalada) activos.add('cuentas-por-cobrar');
    return activos;
  });
  return cartera;
}

export interface EscenarioDeVentas {
  cuenta: CuentaDePrueba;
  clienteId: string;
  terceroId: string;
  conceptoId: string;
  servicioId: string;
}

/** Registra un cliente con su papel y devuelve su id de cliente y de tercero. */
export async function registrarCliente(cuenta: CuentaDePrueba, nombre: string, extra: Record<string, unknown> = {}) {
  const tercero = await cuenta.propietario.post('/api/terceros', {
    tipo: 'juridica',
    razonSocial: nombre,
    papel: { tipo: 'cliente', clase: 'directo' },
    ...extra,
  });
  expect(tercero.estado).toBe(201);
  const ficha = await cuenta.propietario.get(`/api/terceros/${tercero.cuerpo.id}`);
  return { terceroId: tercero.cuerpo.id as string, clienteId: ficha.cuerpo.cliente.id as string };
}

async function crearConcepto(cuenta: CuentaDePrueba, nombre: string, tipo: 'bien' | 'servicio'): Promise<string> {
  const respuesta = await cuenta.propietario.post('/api/libro-de-ventas/conceptos-de-ingreso', {
    nombre,
    tipo,
    activo: true,
  });
  expect(respuesta.estado).toBe(201);
  return respuesta.cuerpo.id;
}

/**
 * Da de alta una cuenta con Terceros, Libro de compras y Libro de ventas (u otros `modulos`), su empresa con NIT y
 * régimen general, un cliente con NIT y dos conceptos de ingreso (un bien y un servicio).
 */
export async function prepararEscenarioDeVentas(
  entorno: EntornoApi,
  usuario: string,
  modulos: string[] = MODULOS,
): Promise<EscenarioDeVentas> {
  const cuenta = await darDeAltaCuenta(entorno, { nombre: usuario, usuario, modulos });
  await configurarEmpresa(cuenta);
  const { clienteId, terceroId } = await registrarCliente(cuenta, 'Distribuidora Quiroa', { nit: NIT_DEL_CLIENTE });
  return {
    cuenta,
    clienteId,
    terceroId,
    conceptoId: await crearConcepto(cuenta, 'Venta de bienes de prueba', 'bien'),
    servicioId: await crearConcepto(cuenta, 'Servicios de prueba', 'servicio'),
  };
}

let consecutivo = 0;

/** Una factura de venta válida (una línea de Q1,120.00 con IVA, de hoy); `cambios` la ajusta. */
export function documentoDeVentaDePrueba(escenario: EscenarioDeVentas, cambios: Record<string, unknown> = {}) {
  consecutivo += 1;
  return {
    tipo: 'factura',
    clienteId: escenario.clienteId,
    serie: 'A',
    numero: String(consecutivo),
    fechaEmision: HOY,
    lineas: [{ conceptoDeIngresoId: escenario.conceptoId, total: '1120.00' }],
    ...cambios,
  };
}
