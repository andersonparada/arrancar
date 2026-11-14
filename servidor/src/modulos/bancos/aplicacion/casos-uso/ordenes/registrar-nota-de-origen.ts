import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { OrdenesEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { deCentavos } from '../../../dominio/centavos.js';
import type { CrearMovimiento } from '../movimientos/crear-movimiento.js';

type Orden = OrdenesEntreModulos['bancos.registrar_nota_de_origen'];

/**
 * La orden `bancos.registrar_nota_de_origen`: registra una nota de débito (pago) o de crédito (reintegro) con el mismo
 * caso de uso que la pantalla de Bancos, pero con el origen y los conceptos que manda el otro módulo.
 */
export class RegistrarNotaDeOrigen {
  constructor(private readonly crear: CrearMovimiento) {}

  async ejecutar(operador: Operador, datos: Orden['datos']): Promise<Orden['respuesta']> {
    const nota = await this.crear.ejecutar(operador, {
      cuentaBancariaId: datos.cuentaBancariaId,
      tipo: datos.tipo,
      fecha: datos.fecha,
      monto: deCentavos(datos.montoCentavos),
      saldoInicial: false,
      referencia: datos.referencia ?? null,
      beneficiario: datos.beneficiario,
      observaciones: datos.observaciones ?? null,
      origen: datos.origen,
      conceptos: datos.conceptos,
    });
    return { movimientoId: nota.id, numero: nota.numero as number, anioDeNumero: nota.anioDeNumero, avisos: [] };
  }
}
