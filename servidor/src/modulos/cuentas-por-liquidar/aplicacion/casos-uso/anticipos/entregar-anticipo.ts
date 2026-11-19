import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { CLAVE_DE_ANTICIPOS, type Anticipo } from '../../../dominio/anticipos.js';
import { AnticipoEntregado } from '../../../dominio/eventos-de-anticipos.js';
import {
  exigirFechaDelAnticipo,
  exigirMontoDelAnticipo,
  fechaLimiteDelAnticipo,
} from '../../../dominio/reglas-del-anticipo.js';
import type { AnticipoDto } from '../../dto/anticipos.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-bancos.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { LectorDelAnticipo } from './lector-del-anticipo.js';
import { ordenarElAnticipo, type DatosParaElAnticipo, type PeticionDeAnticipo } from './peticion-de-anticipo.js';
import { RevisorDelBeneficiario, type BeneficiarioRevisado } from './revisor-del-beneficiario.js';

/** El anticipo ya validado, listo para ordenar a Bancos y guardar. */
interface DatosDelAnticipo extends DatosParaElAnticipo {
  fechaLimite: string;
  revisado: BeneficiarioRevisado;
}

interface AnticipoPorGuardar {
  pedido: PeticionDeAnticipo;
  datos: DatosDelAnticipo;
  movimiento: MovimientoCreado;
}

/**
 * Entrega un anticipo (`anticipos.crear`): revisa al beneficiario y sus vencidos, ordena a Bancos el cheque (a nombre del
 * beneficiario, nunca al portador y «no negociable» por omisión) o la nota de débito con el anticipo como origen y el
 * concepto «Anticipos por liquidar»; si Bancos lanza (saldo, chequera, mes conciliado), nada se guarda. El anticipo queda
 * abierto con su fecha límite (la escrita o la entrega más los días de la configuración). Responde con los avisos de Bancos,
 * el de los vencidos y el de las facturas a nombre de la empresa (C8). Publica `anticipo_entregado` al confirmar.
 */
export class EntregarAnticipo {
  private readonly lector: LectorDelAnticipo;
  private readonly revisor: RevisorDelBeneficiario;

  constructor(private readonly dependencias: DependenciasDeAnticipos) {
    this.lector = new LectorDelAnticipo(dependencias);
    this.revisor = new RevisorDelBeneficiario(dependencias);
  }

  /**
   * @throws FechaDelAnticipoInvalida, FechaLimiteInvalida, MontoDelAnticipoInvalido, BeneficiarioNoDisponible,
   * BeneficiarioDelAnticipoInvalido, BeneficiarioUsuarioInvalido, LocalidadDelAnticipoInvalida,
   * BeneficiarioConVencidos, MotivoConVencidosObligatorio y lo que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeAnticipo): Promise<AnticipoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.entregar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async entregar(operador: Operador, pedido: PeticionDeAnticipo) {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const datos = await this.datosDelAnticipo(operador, pedido, hoy);
    const movimiento = await ordenarElAnticipo(this.dependencias.bancos, operador, { pedido, datos });
    const anticipo = await this.guardar({ pedido, datos, movimiento });
    const avisos = [...movimiento.avisos.map(({ mensaje }) => mensaje), ...datos.revisado.avisos];
    return {
      dto: await this.lector.leer(operador, anticipo, avisos),
      eventos: [this.evento(operador, anticipo, movimiento.cuentaBancariaId)],
    };
  }

  /** Lo que se valida antes de ordenar nada a Bancos: las fechas, el monto y el beneficiario. */
  private async datosDelAnticipo(
    operador: Operador,
    pedido: PeticionDeAnticipo,
    hoy: string,
  ): Promise<DatosDelAnticipo> {
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDelAnticipo(fecha, hoy);
    const montoCentavos = exigirMontoDelAnticipo(aCentavos(pedido.monto));
    const dias = await this.dependencias.politica.diasParaLiquidar(operador);
    const fechaLimite = fechaLimiteDelAnticipo({ fecha, escrita: pedido.fechaLimite, dias });
    const revisado = await this.revisor.revisar(operador, pedido, hoy);
    return {
      anticipoId: crypto.randomUUID(),
      fecha,
      fechaLimite,
      montoCentavos,
      beneficiario: revisado.nombre,
      revisado,
    };
  }

  private async guardar({ pedido, datos, movimiento }: AnticipoPorGuardar): Promise<Anticipo> {
    const { correlativos, anticipos } = this.dependencias;
    const asignado = await correlativos.siguiente(CLAVE_DE_ANTICIPOS, datos.fecha);
    await anticipos.agregar({
      id: datos.anticipoId,
      numero: asignado.numero,
      anioDeNumero: asignado.anio,
      beneficiarioId: pedido.beneficiarioId,
      beneficiario: datos.beneficiario,
      esEmpleado: pedido.esEmpleado,
      beneficiarioUsuarioId: pedido.beneficiarioUsuarioId ?? null,
      clase: pedido.clase,
      descripcion: pedido.descripcion.trim(),
      localidadId: pedido.localidadId ?? null,
      fecha: datos.fecha,
      fechaLimite: datos.fechaLimite,
      montoCentavos: datos.montoCentavos,
      forma: pedido.forma,
      movimientoId: movimiento.movimientoId,
      motivoConVencidos: datos.revisado.motivoConVencidos,
    });
    return (await anticipos.buscar(datos.anticipoId))!;
  }

  private evento(operador: Operador, anticipo: Anticipo, cuentaBancariaId: string): EventoDominio {
    return new AnticipoEntregado({
      empresaId: operador.empresaId,
      anticipoId: anticipo.id,
      numero: anticipo.numero,
      forma: anticipo.forma,
      fecha: anticipo.fecha,
      fechaLimite: anticipo.fechaLimite,
      montoCentavos: anticipo.montoCentavos,
      movimientoId: anticipo.movimientoId,
      cuentaBancariaId,
      beneficiarioId: anticipo.beneficiarioId,
      beneficiario: anticipo.beneficiario,
      esEmpleado: anticipo.esEmpleado,
    });
  }
}
