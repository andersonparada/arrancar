import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';
import type { EntornoApi } from './entorno-api.js';
import { HOY } from './escenario-de-documentos.js';
import { conceptoGeneral } from './escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './escenarios.js';
import { cuentaConChequera } from './ordenes-de-bancos.js';

export const RUTA_DE_FONDOS = '/api/caja-chica/fondos';
export const RUTA_DE_ACCESOS = '/api/caja-chica/accesos-a-fondos';

const MODULOS = ['terceros', 'libro-de-compras', 'bancos', 'caja-chica'];

/** Una cuenta con Caja chica y Bancos, y una cuenta bancaria con fondos y su chequera. */
export class EscenarioDeCajaChica {
  private constructor(
    readonly cuenta: CuentaDePrueba,
    readonly cuentaBancariaId: string,
    readonly chequeraId: string,
  ) {}

  static async preparar(entorno: EntornoApi, usuario: string): Promise<EscenarioDeCajaChica> {
    const cuenta = await darDeAltaCuenta(entorno, { nombre: usuario, usuario, modulos: MODULOS });
    const { cuentaBancariaId, chequeraId } = await cuentaConChequera(cuenta.propietario, 'Cuenta del fondo');
    const deposito = await cuenta.propietario.post('/api/bancos/notas', {
      cuentaBancariaId,
      tipo: 'credito',
      fecha: HOY,
      monto: '60000.00',
      referencia: 'Fondos de la prueba',
      beneficiario: null,
      observaciones: null,
      conceptoId: await conceptoGeneral(cuenta.propietario),
    });
    expect(deposito.estado, JSON.stringify(deposito.cuerpo)).toBe(201);
    return new EscenarioDeCajaChica(cuenta, cuentaBancariaId, chequeraId);
  }

  propietario(): ClienteApi {
    return this.cuenta.propietario;
  }

  /** El cuerpo de abrir un fondo con cheque de la chequera, a nombre del custodio escrito. */
  conCheque(nombre: string, cambios: Record<string, unknown> = {}) {
    return {
      forma: 'cheque',
      chequeraId: this.chequeraId,
      nombre,
      monto: '1000.00',
      custodio: 'Juan Pérez',
      ...cambios,
    };
  }

  /** El cuerpo de abrir un fondo con nota de débito contra la cuenta. */
  conNota(nombre: string, cambios: Record<string, unknown> = {}) {
    return {
      forma: 'nota_de_debito',
      cuentaBancariaId: this.cuentaBancariaId,
      nombre,
      monto: '1000.00',
      custodio: 'Juan Pérez',
      referencia: 'BOL-1',
      ...cambios,
    };
  }

  /** Abre un fondo y comprueba que salió bien; devuelve el `FondoDto`. */
  async abrir(cuerpo: Record<string, unknown>, cliente: ClienteApi = this.propietario()) {
    const respuesta = await cliente.post(RUTA_DE_FONDOS, cuerpo);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    return respuesta.cuerpo;
  }
}

/** El fondo como quedó en la base. */
export async function fondoEnBase(fondoId: string) {
  const [fila] = await comoPropietario<{
    estado: string;
    nombre: string;
    tope_por_comprobante: string | null;
    fecha_de_cierre: string | null;
    motivo_de_cierre: string | null;
    cuenta_bancaria_id: string | null;
  }>(
    `select estado, nombre, tope_por_comprobante::text, fecha_de_cierre::text, motivo_de_cierre, cuenta_bancaria_id
       from caja_chica.fondos where id = $1`,
    [fondoId],
  );
  return fila!;
}

/** Los cambios de monto del fondo, del primero al último. */
export const cambiosEnBase = (fondoId: string) =>
  comoPropietario<{
    id: string;
    tipo: string;
    forma: string;
    estado: string;
    monto: string;
    movimiento_id: string | null;
    fecha_de_anulacion: string | null;
  }>(
    `select id, tipo, forma, estado, monto::text, movimiento_id, fecha_de_anulacion::text
       from caja_chica.cambios_de_monto where fondo_id = $1 order by creado_en`,
    [fondoId],
  );

/** El cheque o la nota de Bancos, con su origen. */
export async function movimientoDeBancos(movimientoId: string) {
  const [fila] = await comoPropietario<{
    tipo: string;
    modulo: string | null;
    origen: string | null;
    beneficiario: string | null;
    no_negociable: boolean | null;
    cheque_id: string | null;
    concepto: string | null;
  }>(
    `select m.tipo, m.modulo_de_origen as modulo, m.documento_de_origen_id as origen, m.beneficiario,
            c.no_negociable, c.id as cheque_id, k.clave_de_sistema as concepto
       from bancos.movimientos m left join bancos.cheques c on c.movimiento_id = m.id
       left join bancos.conceptos k on k.id = m.concepto_id where m.id = $1`,
    [movimientoId],
  );
  return fila!;
}

/** Los usuarios con acceso al fondo, por su nombre de usuario. */
export const conAccesoAlFondo = async (fondoId: string): Promise<string[]> =>
  (
    await comoPropietario<{ usuario: string }>(
      `select u.usuario from caja_chica.accesos_a_fondos a join core.usuarios u on u.id = a.usuario_id
        where a.fondo_id = $1 order by u.usuario`,
      [fondoId],
    )
  ).map(({ usuario }) => usuario);

let numeroDeVale = 0;

/**
 * Un vale provisional abierto sembrado en la base (los casos de uso de los vales llegan en CC-6): reduce el efectivo
 * esperado y cuenta como uso del fondo.
 */
export async function sembrarVale(fondoId: string, empresaId: string, monto: string): Promise<void> {
  numeroDeVale += 1;
  await comoPropietario(
    `insert into caja_chica.vales_provisionales (empresa_id, fondo_id, numero, fecha, entregado_a, monto, motivo)
     values ($1, $2, $3, $5::date, 'Pedro López', $4, 'Compra de insumos')`,
    [empresaId, fondoId, numeroDeVale, monto, HOY],
  );
}
