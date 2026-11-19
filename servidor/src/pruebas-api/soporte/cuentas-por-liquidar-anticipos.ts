import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import { consultar, HOY } from './escenario-de-documentos.js';
import { conceptoGeneral } from './escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './escenarios.js';
import { cuentaConChequera } from './ordenes-de-bancos.js';

export const RUTA_DE_ANTICIPOS = '/api/cuentas-por-liquidar/anticipos';

/** Los módulos de una cuenta con Cuentas por liquidar y los que necesita. */
export const MODULOS_CON_CUENTAS_POR_LIQUIDAR = ['terceros', 'libro-de-compras', 'bancos', 'cuentas-por-liquidar'];

/** Una cuenta con Cuentas por liquidar, una cuenta bancaria con fondos y su chequera, y un beneficiario. */
export class EscenarioDeAnticipos {
  private constructor(
    readonly cuenta: CuentaDePrueba,
    private readonly bancos: { cuentaBancariaId: string; chequeraId: string; conceptoDeGastoId: string },
  ) {}

  get cuentaBancariaId(): string {
    return this.bancos.cuentaBancariaId;
  }

  get chequeraId(): string {
    return this.bancos.chequeraId;
  }

  get conceptoDeGastoId(): string {
    return this.bancos.conceptoDeGastoId;
  }

  static async preparar(entorno: EntornoApi, usuario: string): Promise<EscenarioDeAnticipos> {
    const cuenta = await darDeAltaCuenta(entorno, {
      nombre: `Anticipos ${usuario}`,
      usuario,
      modulos: MODULOS_CON_CUENTAS_POR_LIQUIDAR,
    });
    const propietario = cuenta.propietario;
    const { cuentaBancariaId, chequeraId } = await cuentaConChequera(propietario, 'Cuenta de anticipos');
    const deposito = await propietario.post('/api/bancos/notas', {
      cuentaBancariaId,
      tipo: 'credito',
      fecha: HOY,
      monto: '60000.00',
      referencia: 'Fondos de la prueba',
      beneficiario: null,
      observaciones: null,
      conceptoId: await conceptoGeneral(propietario),
    });
    expect(deposito.estado, JSON.stringify(deposito.cuerpo)).toBe(201);
    const concepto = await propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
      nombre: 'Viáticos',
      tipoPorOmision: 'servicio',
      esProductoAgropecuario: false,
      esActivoFijo: false,
      activo: true,
    });
    expect(concepto.estado, JSON.stringify(concepto.cuerpo)).toBe(201);
    return new EscenarioDeAnticipos(cuenta, { cuentaBancariaId, chequeraId, conceptoDeGastoId: concepto.cuerpo.id });
  }

  propietario(): ClienteApi {
    return this.cuenta.propietario;
  }

  /** Un tercero individual de la cuenta; devuelve su id. */
  async tercero(nombres: string, apellidos: string): Promise<string> {
    const creado = await this.propietario().post('/api/terceros', { tipo: 'individual', nombres, apellidos });
    expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
    return creado.cuerpo.id;
  }

  /** El cuerpo de un anticipo con cheque de la chequera de la cuenta, a nombre del beneficiario. */
  conCheque(beneficiarioId: string, monto: string, cambios: Record<string, unknown> = {}) {
    return {
      forma: 'cheque',
      chequeraId: this.chequeraId,
      beneficiarioId,
      esEmpleado: true,
      clase: 'viatico',
      descripcion: 'Viaje a la finca',
      monto,
      ...cambios,
    };
  }

  /** El cuerpo de un anticipo con nota de débito (transferencia) contra la cuenta. */
  conNota(beneficiarioId: string, monto: string, cambios: Record<string, unknown> = {}) {
    const { chequeraId: _chequera, forma: _forma, ...resto } = this.conCheque(beneficiarioId, monto);
    return {
      ...resto,
      forma: 'nota_de_debito',
      cuentaBancariaId: this.cuentaBancariaId,
      referencia: 'TRF-123',
      ...cambios,
    };
  }

  /** Entrega un anticipo y comprueba que salió bien; devuelve el `AnticipoDto`. */
  async entregar(cuerpo: Record<string, unknown>, cliente: ClienteApi = this.propietario()) {
    const respuesta = await cliente.post(RUTA_DE_ANTICIPOS, cuerpo);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    return respuesta.cuerpo;
  }

  /** Un gasto sin documento vigente sembrado en la base (los casos de uso de los gastos llegan en CL-3). */
  async sembrarGasto(anticipoId: string, monto: string, cambios: { fecha?: string } = {}) {
    await consultar(
      `insert into cuentas_por_liquidar.gastos
         (empresa_id, cuenta_id, anticipo_id, clase, fecha, monto, descripcion, pagado_a, concepto_de_gasto_id,
          motivo_sin_documento, tratamiento_sin_documento, asignado_en, asignado_por)
       select $1, $2, $3, 'sin_documento', $4, $5, 'Taxi', 'Taxista', $6, 'No dio factura', 'no_deducible', now(),
              (select id from core.usuarios where usuario = $7)`,
      [
        this.cuenta.empresaId,
        this.cuenta.cuentaId,
        anticipoId,
        cambios.fecha ?? HOY,
        monto,
        this.conceptoDeGastoId,
        this.cuenta.usuario,
      ],
    );
  }
}

/** El anticipo como quedó en la base. */
export async function anticipoEnBase(anticipoId: string) {
  const [fila] = await consultar<{
    estado: string;
    numero: number;
    fecha: string;
    fecha_limite: string;
    fecha_de_anulacion: string | null;
    motivo_con_vencidos: string | null;
    beneficiario: string;
    es_empleado: boolean;
    movimiento_id: string;
  }>(
    `select estado, numero, fecha::text, fecha_limite::text, fecha_de_anulacion::text, motivo_con_vencidos, beneficiario,
            es_empleado, movimiento_id
       from cuentas_por_liquidar.anticipos where id = $1`,
    [anticipoId],
  );
  return fila!;
}

export async function cuantosAnticipos(): Promise<number> {
  const [fila] = await consultar<{ total: string }>(
    'select count(*)::text as total from cuentas_por_liquidar.anticipos',
  );
  return Number(fila!.total);
}

/** El cheque o la nota de Bancos de un anticipo, tal como quedó en la base. */
export async function movimientoDelAnticipo(movimientoId: string) {
  const [fila] = await consultar<{
    tipo: string;
    beneficiario: string | null;
    referencia: string | null;
    modulo: string | null;
    origen: string | null;
    no_negociable: boolean | null;
    clave: string | null;
    inverso_fecha: string | null;
  }>(
    `select m.tipo, m.beneficiario, m.referencia, m.modulo_de_origen as modulo, m.documento_de_origen_id as origen,
            c.no_negociable, k.clave_de_sistema as clave,
            (select i.fecha::text from bancos.movimientos i where i.revierte_a_id = m.id) as inverso_fecha
       from bancos.movimientos m
       left join bancos.cheques c on c.movimiento_id = m.id
       join bancos.conceptos k on k.id = m.concepto_id
      where m.id = $1`,
    [movimientoId],
  );
  return fila!;
}

/** El cheque de Bancos de un anticipo, para anularlo desde Bancos. */
export async function chequeDelAnticipo(anticipoId: string): Promise<string> {
  const [fila] = await consultar<{ id: string }>(
    `select c.id from bancos.cheques c join cuentas_por_liquidar.anticipos a on a.movimiento_id = c.movimiento_id
      where a.id = $1`,
    [anticipoId],
  );
  return fila!.id;
}

/** Pasa el anticipo (y su plazo) a otra fecha: la prueba necesita anticipos viejos y vencidos; no pasa por los casos de uso. */
export async function ponerFechasAlAnticipo(anticipoId: string, fecha: string, fechaLimite: string): Promise<void> {
  await consultar(
    'update bancos.movimientos set fecha = $2 where id = (select movimiento_id from cuentas_por_liquidar.anticipos where id = $1)',
    [anticipoId, fecha],
  );
  await consultar('update cuentas_por_liquidar.anticipos set fecha = $2, fecha_limite = $3 where id = $1', [
    anticipoId,
    fecha,
    fechaLimite,
  ]);
}
