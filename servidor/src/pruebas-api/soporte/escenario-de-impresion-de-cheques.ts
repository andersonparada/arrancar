import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import { conceptoGeneral } from './escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './escenarios.js';
import { cuentaConChequera } from './ordenes-de-bancos.js';

/** Una cuenta con Bancos, una cuenta bancaria con saldo y su chequera del 1 al 50, para las pruebas de impresión de cheques. */
export class EscenarioDeCheques {
  private constructor(
    readonly cuenta: CuentaDePrueba,
    private readonly bancos: { cuentaBancariaId: string; chequeraId: string; conceptoId: string },
  ) {}

  get cuentaBancariaId(): string {
    return this.bancos.cuentaBancariaId;
  }

  get chequeraId(): string {
    return this.bancos.chequeraId;
  }

  get conceptoId(): string {
    return this.bancos.conceptoId;
  }

  static async preparar(entorno: EntornoApi, usuario: string, modulos = ['bancos']): Promise<EscenarioDeCheques> {
    const cuenta = await darDeAltaCuenta(entorno, { nombre: `Cheques ${usuario}`, usuario, modulos });
    const { cuentaBancariaId, chequeraId } = await cuentaConChequera(cuenta.propietario, `Cuenta ${usuario}`);
    return new EscenarioDeCheques(cuenta, {
      cuentaBancariaId,
      chequeraId,
      conceptoId: await conceptoGeneral(cuenta.propietario),
    });
  }

  get propietario(): ClienteApi {
    return this.cuenta.propietario;
  }

  /** Una chequera más de la misma cuenta bancaria. */
  async crearChequera(desde: number, hasta: number, serie: string | null = null): Promise<string> {
    const creada = await this.propietario.post(`/api/bancos/cuentas-bancarias/${this.cuentaBancariaId}/chequeras`, {
      serie,
      desde,
      hasta,
    });
    expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
    return creada.cuerpo.id as string;
  }

  /** El id del cheque con ese número en la chequera. */
  async chequeDe(numero: number, chequeraId = this.chequeraId): Promise<string> {
    const cheques = await this.propietario.get(`/api/bancos/chequeras/${chequeraId}/cheques`);
    return cheques.cuerpo.find((c: { numero: number }) => c.numero === numero).id as string;
  }

  /** Emite el cheque con ese número; devuelve el id del cheque y el del movimiento. */
  async emitir(
    numero: number,
    cambios: Record<string, unknown> = {},
    chequeraId = this.chequeraId,
  ): Promise<{ chequeId: string; movimientoId: string }> {
    const chequeId = await this.chequeDe(numero, chequeraId);
    const emitido = await this.propietario.post(`/api/bancos/cheques/${chequeId}/emitir`, {
      fecha: '2026-02-01',
      monto: '150.00',
      beneficiario: 'Juan Pérez López',
      noNegociable: true,
      conceptoId: this.conceptoId,
      referencia: null,
      observaciones: null,
      ...cambios,
    });
    expect(emitido.estado, JSON.stringify(emitido.cuerpo)).toBe(200);
    return { chequeId, movimientoId: emitido.cuerpo.id as string };
  }
}
