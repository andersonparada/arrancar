import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { cuerpoDeContrasena, EscenarioDeContrasenas, type ProveedorDePrueba } from './cuentas-por-pagar-contrasenas.js';
import type { EntornoApi } from './entorno-api.js';
import { configurarEmpresa, consultar, HOY } from './escenario-de-documentos.js';
import { conceptoGeneral } from './escenarios-de-bancos.js';
import { cuentaConChequera } from './ordenes-de-bancos.js';

export const RUTA_DE_PAGOS = '/api/cuentas-por-pagar/pagos';
const RUTA_DE_DOCUMENTOS = '/api/cuentas-por-pagar/documentos';

/** Una línea del pago: el cargo (id de Cuentas por pagar) y cuánto se le paga. */
export type LineaDePrueba = { cargoId: string; monto: string };

/** Una cuenta con Cuentas por pagar y Bancos, una empresa agente de retención, una cuenta con fondos y su chequera. */
export class EscenarioDePagos {
  private constructor(
    readonly mundo: EscenarioDeContrasenas,
    private readonly bancos: { cuentaBancariaId: string; chequeraId: string; conceptoDeActivo: string },
  ) {}

  get cuentaBancariaId(): string {
    return this.bancos.cuentaBancariaId;
  }

  get chequeraId(): string {
    return this.bancos.chequeraId;
  }

  get conceptoDeActivo(): string {
    return this.bancos.conceptoDeActivo;
  }

  static async preparar(
    entorno: EntornoApi,
    usuario: string,
    fiscal: Record<string, unknown> = { agenteDeRetencionIva: 'contribuyente_especial', esAgenteDeRetencionIsr: true },
  ): Promise<EscenarioDePagos> {
    const mundo = await EscenarioDeContrasenas.preparar(entorno, usuario);
    await configurarEmpresa(mundo.escenario.cuenta, fiscal);
    const propietario = mundo.propietario();
    const { cuentaBancariaId, chequeraId } = await cuentaConChequera(propietario, 'Cuenta de pagos');
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
    const activo = await propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
      nombre: 'Maquinaria',
      tipoPorOmision: 'bien',
      esProductoAgropecuario: false,
      esActivoFijo: true,
      activo: true,
    });
    return new EscenarioDePagos(mundo, { cuentaBancariaId, chequeraId, conceptoDeActivo: activo.cuerpo.id });
  }

  propietario(): ClienteApi {
    return this.mundo.propietario();
  }

  /** Un cargo del proveedor completado y autorizado; con `activoFijo`, de un concepto de activo fijo. */
  async cargoAutorizado(proveedor: ProveedorDePrueba, total = '1120.00', activoFijo = false): Promise<string> {
    const { documentos, escenario } = this.mundo;
    const conceptoId = activoFijo ? this.conceptoDeActivo : escenario.conceptoId;
    const libroId = await documentos.registrar({
      proveedorId: proveedor.proveedorId,
      nitEmisor: proveedor.nitEmisor,
      lineas: [{ conceptoId, total }],
    });
    return this.autorizar((await documentos.fila(libroId))!.id);
  }

  /** Completa y autoriza un documento (el propietario puede autorizar lo suyo). */
  async autorizar(id: string, { yaCompletado = false } = {}): Promise<string> {
    if (!yaCompletado) {
      const completado = await this.propietario().post(`${RUTA_DE_DOCUMENTOS}/registrar`, { documentos: [{ id }] });
      expect(completado.estado, JSON.stringify(completado.cuerpo)).toBe(200);
    }
    const autorizado = await this.propietario().post(`${RUTA_DE_DOCUMENTOS}/autorizar`, { ids: [id] });
    expect(autorizado.estado, JSON.stringify(autorizado.cuerpo)).toBe(200);
    return id;
  }

  /** Mete los cargos en una contraseña vigente del proveedor y devuelve su id. */
  async contrasena(proveedor: ProveedorDePrueba, ids: string[]): Promise<string> {
    const creada = await this.mundo.crear(cuerpoDeContrasena(proveedor.proveedorId, ids));
    expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
    return creada.cuerpo.id;
  }

  /** Un proveedor con un cargo autorizado dentro de su contraseña. */
  async proveedorConCargo(total = '1120.00') {
    const proveedor = await this.mundo.unProveedor();
    const cargo = await this.cargoAutorizado(proveedor, total);
    const contrasena = await this.contrasena(proveedor, [cargo]);
    return { proveedor, cargo, contrasena };
  }

  /** El cuerpo de un cheque de la chequera de la cuenta. */
  cheque(proveedorId: string, aplicaciones: LineaDePrueba[], cambios: Record<string, unknown> = {}) {
    return { forma: 'cheque', proveedorId, chequeraId: this.chequeraId, aplicaciones, ...cambios };
  }

  /** El cuerpo de una nota de débito contra la cuenta. */
  nota(proveedorId: string, aplicaciones: LineaDePrueba[], cambios: Record<string, unknown> = {}) {
    return { forma: 'nota_de_debito', proveedorId, cuentaBancariaId: this.cuentaBancariaId, aplicaciones, ...cambios };
  }

  pagar(cuerpo: Record<string, unknown>, cliente: ClienteApi = this.propietario()) {
    return cliente.post(RUTA_DE_PAGOS, cuerpo);
  }
}

/** Un pago en efectivo vigente de este mes (los casos de uso del efectivo llegan en CP4-E3), sembrado en la base. */
export async function sembrarEfectivo(cargoId: string, monto: string): Promise<void> {
  const [datos] = await consultar<{
    empresa_id: string;
    proveedor_id: string;
    contrasena_id: string;
    movimiento: string;
  }>(
    `select d.empresa_id, d.proveedor_id, cd.contrasena_id,
            (select id from bancos.movimientos where empresa_id = d.empresa_id limit 1) as movimiento
       from cuentas_por_pagar.documentos d
       join cuentas_por_pagar.contrasena_documentos cd on cd.documento_id = d.id and cd.vigente
      where d.id = $1`,
    [cargoId],
  );
  const [retiro] = await consultar<{ id: string }>(
    `insert into cuentas_por_pagar.retiros_de_efectivo (empresa_id, numero, forma, fecha, monto, movimiento_id, custodio)
     values ($1, 9001, 'cheque', $2, $3, $4, 'Custodio') returning id`,
    [datos!.empresa_id, HOY, monto, datos!.movimiento],
  );
  const [pago] = await consultar<{ id: string }>(
    `insert into cuentas_por_pagar.pagos (empresa_id, proveedor_id, numero, forma, fecha, monto, retiro_id)
     values ($1, $2, 9001, 'efectivo', $3, $4, $5) returning id`,
    [datos!.empresa_id, datos!.proveedor_id, HOY, monto, retiro!.id],
  );
  await consultar(
    `insert into cuentas_por_pagar.aplicaciones_de_pagos (empresa_id, proveedor_id, pago_id, contrasena_id, cargo_id, monto)
     values ($1, $2, $3, $4, $5, $6)`,
    [datos!.empresa_id, datos!.proveedor_id, pago!.id, datos!.contrasena_id, cargoId, monto],
  );
}
