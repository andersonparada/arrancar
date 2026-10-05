import pg from 'pg';
import { expect, vi } from 'vitest';
import { configuracion } from '../../configuracion.js';
import { ReglaDeNegocioInfringida } from '../../modulos/core/compartido/dominio/errores.js';
import '../../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import type { DocumentoParaDestino } from '../../modulos/core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../modulos/core/mediador/contexto.js';
import { ModulosActivosDeLaCuentaEnRegistro } from '../../modulos/core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import type { EntornoApi } from './entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './escenarios.js';

export const RUTA_DOCUMENTOS = '/api/libro-de-compras/documentos';
export const NIT_DE_LA_EMPRESA = '12345679';
export const NIT_DEL_PROVEEDOR = '576937K';
const CLAVE = 'libro-de-compras';

/** La fecha de hoy en Guatemala, como la ve el servidor. */
export const HOY = new Date().toLocaleDateString('sv', { timeZone: 'America/Guatemala' });

export class DestinoRechaza extends ReglaDeNegocioInfringida {
  readonly codigo = 'destino_rechaza';
}

/** El destino falso: Cuentas por pagar aún no existe, así que se simula que está instalado y atiende la orden. */
export interface DestinoFalso {
  recibidos: DocumentoParaDestino[];
  rechazar: boolean;
  instalado: boolean;
}

/** Registra el manejador de `cuentas-por-pagar.recibir_documento` y hace que el módulo figure como activo. */
export function instalarDestinoFalso(): DestinoFalso {
  const destino: DestinoFalso = { recibidos: [], rechazar: false, instalado: true };
  mediador.atender('cuentas-por-pagar', 'cuentas-por-pagar.recibir_documento', async (documento) => {
    destino.recibidos.push(documento);
    if (destino.rechazar) throw new DestinoRechaza('El destino rechazó el documento.');
  });
  const original = ModulosActivosDeLaCuentaEnRegistro.prototype.activosPara;
  vi.spyOn(ModulosActivosDeLaCuentaEnRegistro.prototype, 'activosPara').mockImplementation(async function (
    this: ModulosActivosDeLaCuentaEnRegistro,
    cuentaId: string,
  ) {
    const activos = new Set(await original.call(this, cuentaId));
    if (destino.instalado) activos.add('cuentas-por-pagar');
    return activos;
  });
  return destino;
}

/** Consulta como propietario de la base (sin seguridad por filas), para comprobar lo guardado. */
export async function consultar<Fila extends object>(sql: string, parametros: unknown[] = []): Promise<Fila[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return (await conexion.query<Fila>(sql, parametros)).rows;
  } finally {
    await conexion.end();
  }
}

export interface EscenarioDeDocumentos {
  cuenta: CuentaDePrueba;
  proveedorId: string;
  terceroId: string;
  conceptoId: string;
  combustibleId: string;
}

/** Cambia la sección fiscal de la empresa (régimen y agente de retención) por el formulario de Empresas. */
export async function configurarEmpresa(cuenta: CuentaDePrueba, seccion: Record<string, unknown> = {}) {
  const respuesta = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}`, {
    nombre: 'Rancho fiscal',
    nit: NIT_DE_LA_EMPRESA,
    secciones: { [CLAVE]: seccion },
  });
  expect(respuesta.estado).toBe(200);
}

/** Registra un proveedor con su papel y, si se pide, su sección fiscal; devuelve su id de proveedor y de tercero. */
export async function registrarProveedor(cuenta: CuentaDePrueba, nombre: string, extra: Record<string, unknown> = {}) {
  const tercero = await cuenta.propietario.post('/api/terceros', {
    tipo: 'juridica',
    razonSocial: nombre,
    papel: { tipo: 'proveedor' },
    ...extra,
  });
  expect(tercero.estado).toBe(201);
  const ficha = await cuenta.propietario.get(`/api/terceros/${tercero.cuerpo.id}`);
  return { terceroId: tercero.cuerpo.id as string, proveedorId: ficha.cuerpo.proveedor.id as string };
}

/** Da de alta una cuenta con Terceros y Libro de compras, su empresa con NIT, un proveedor sin NIT, un concepto y un combustible. */
export async function prepararEscenario(entorno: EntornoApi, usuario: string): Promise<EscenarioDeDocumentos> {
  const cuenta = await darDeAltaCuenta(entorno, { nombre: usuario, usuario, modulos: ['terceros', CLAVE] });
  await configurarEmpresa(cuenta);
  const { proveedorId, terceroId } = await registrarProveedor(cuenta, 'Veterinaria El Quiroa');
  const concepto = await cuenta.propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
    nombre: 'Medicinas',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  });
  const combustible = await cuenta.propietario.post('/api/libro-de-compras/combustibles', {
    nombre: 'Diésel',
    activo: true,
  });
  return { cuenta, proveedorId, terceroId, conceptoId: concepto.cuerpo.id, combustibleId: combustible.cuerpo.id };
}

let consecutivo = 0;

/** Un documento de compra válido (factura general con una línea de Q1,120.00 con IVA); `cambios` lo ajusta. */
export function documentoDePrueba(escenario: EscenarioDeDocumentos, cambios: Record<string, unknown> = {}) {
  consecutivo += 1;
  return {
    tipo: 'factura',
    proveedorId: escenario.proveedorId,
    destino: 'cuentas-por-pagar',
    nitEmisor: NIT_DEL_PROVEEDOR,
    serie: 'A',
    numero: String(consecutivo),
    autorizacionFel: crypto.randomUUID(),
    fechaEmision: HOY,
    fechaRecepcion: HOY,
    lineas: [{ conceptoId: escenario.conceptoId, total: '1120.00' }],
    ...cambios,
  };
}

/** Un NIT válido (dígito verificador de módulo 11) para el cuerpo dado, para no repetir NIT entre proveedores. */
export function nitValido(cuerpo: string): string {
  const suma = [...cuerpo].reduce(
    (total, digito, posicion) => total + Number(digito) * (cuerpo.length + 1 - posicion),
    0,
  );
  const verificador = (11 - (suma % 11)) % 11;
  return cuerpo + (verificador === 10 ? 'K' : String(verificador));
}

/** La fecha de hoy menos `dias` días (`AAAA-MM-DD`). */
export function haceDias(dias: number, desde: string = HOY): string {
  return new Date(new Date(`${desde}T00:00:00Z`).getTime() - dias * 86_400_000).toISOString().slice(0, 10);
}
