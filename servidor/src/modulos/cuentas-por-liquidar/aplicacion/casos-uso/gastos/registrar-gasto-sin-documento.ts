import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Anticipo } from '../../../dominio/anticipos.js';
import { AVISO_DE_GASTO_SIN_DOCUMENTO } from '../../../dominio/avisos-de-gastos.js';
import { ConceptoDeGastoInvalido, GastosSinDocumentoNoPermitidos } from '../../../dominio/errores-de-gastos.js';
import { eventoDeGastoAsignado } from '../../../dominio/eventos-de-gastos.js';
import type { TratamientoSinDocumento } from '../../../dominio/gastos.js';
import {
  exigirFechaDelGasto,
  exigirMontoDelGasto,
  textoDelGasto,
  tratamientoDelGastoSinDocumento,
} from '../../../dominio/reglas-del-gasto.js';
import type { GastoDto } from '../../dto/gastos.dto.js';
import { anticipoAbiertoBloqueado } from './anticipo-abierto.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';
import { LectorDelGasto } from './lector-del-gasto.js';

export interface PeticionDeGastoSinDocumento {
  anticipoId: string;
  /** Por omisión, hoy. */
  fecha?: string | undefined;
  monto: string;
  descripcion: string;
  pagadoA: string;
  conceptoDeGastoId: string;
  motivoSinDocumento: string;
  /** Por omisión `no_deducible` (V-6, por validar). */
  tratamiento?: TratamientoSinDocumento | undefined;
}

/** Lo ya validado del gasto, listo para guardar. */
interface DatosDelGasto {
  fecha: string;
  montoCentavos: number;
  descripcion: string;
  pagadoA: string;
  motivoSinDocumento: string;
  tratamiento: TratamientoSinDocumento;
}

/**
 * Registra un gasto sin documento en un anticipo abierto (`gastos.crear`), solo si la empresa lo permite
 * (`cuentas-por-liquidar.gastos_sin_documento.permitidos`): con concepto de gasto activo, a quién se pagó, el motivo y cómo
 * se trata (por omisión no deducible; renta del trabajo solo si el beneficiario es empleado). Nace asignado, con quién lo
 * registró. Avisa que no es deducible y publica `gasto_asignado` al confirmar.
 */
export class RegistrarGastoSinDocumento {
  private readonly lector: LectorDelGasto;

  constructor(private readonly dependencias: DependenciasDeGastos) {
    this.lector = new LectorDelGasto(dependencias);
  }

  /**
   * @throws GastosSinDocumentoNoPermitidos, RecursoNoEncontrado, AnticipoNoAbierto, MontoDelGastoInvalido,
   * FechaDelGastoInvalida, TextoDelGastoInvalido, ConceptoDeGastoInvalido, RentaDelTrabajoSoloEmpleados
   */
  async ejecutar(operador: Operador, pedido: PeticionDeGastoSinDocumento): Promise<GastoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async registrar(operador: Operador, pedido: PeticionDeGastoSinDocumento) {
    const { gastos, politica } = this.dependencias;
    if (!(await politica.sinDocumentoPermitido(operador))) throw new GastosSinDocumentoNoPermitidos();
    const anticipo = await anticipoAbiertoBloqueado(this.dependencias, pedido.anticipoId);
    const datos = await this.validar(operador, anticipo, pedido);
    const id = crypto.randomUUID();
    await gastos.agregarSinDocumento({
      id,
      anticipoId: anticipo.id,
      conceptoDeGastoId: pedido.conceptoDeGastoId,
      asignadoPor: operador.usuarioId,
      ...datos,
    });
    const gasto = (await gastos.buscar(id))!;
    return {
      dto: await this.lector.leer(gasto, [AVISO_DE_GASTO_SIN_DOCUMENTO]),
      evento: eventoDeGastoAsignado(operador.empresaId, gasto),
    };
  }

  private async validar(operador: Operador, anticipo: Anticipo, pedido: PeticionDeGastoSinDocumento) {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDelGasto(fecha, { entrega: anticipo.fecha, hoy });
    if (!(await this.dependencias.referencias.conceptoDeGastoActivo(pedido.conceptoDeGastoId))) {
      throw new ConceptoDeGastoInvalido();
    }
    const datos: DatosDelGasto = {
      fecha,
      montoCentavos: exigirMontoDelGasto(aCentavos(pedido.monto)),
      descripcion: textoDelGasto(pedido.descripcion, { campo: 'descripcion', nombre: 'qué se compró', maximo: 300 }),
      pagadoA: textoDelGasto(pedido.pagadoA, { campo: 'pagadoA', nombre: 'a quién se le pagó', maximo: 150 }),
      motivoSinDocumento: textoDelGasto(pedido.motivoSinDocumento, {
        campo: 'motivoSinDocumento',
        nombre: 'por qué no hay documento',
        maximo: 300,
      }),
      tratamiento: tratamientoDelGastoSinDocumento(pedido.tratamiento, anticipo.esEmpleado),
    };
    return datos;
  }
}
