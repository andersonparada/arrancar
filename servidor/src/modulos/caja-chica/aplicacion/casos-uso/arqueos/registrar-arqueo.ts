import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { RECURSO_DE_ARQUEOS } from '../../../dominio/arqueos.js';
import { ArqueoRegistrado } from '../../../dominio/eventos-de-arqueos.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import type { ArqueoDto } from '../../dto/arqueos.dto.js';
import type { AjusteDeArqueoNuevo, ArqueoNuevo } from '../../puertos/puertos-de-arqueos.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import type { DependenciasDeArqueos } from './dependencias-de-arqueos.js';
import { LectorDeArqueos } from './lector-de-arqueos.js';
import { PlanificadorDelArqueo, type PeticionDeArqueo, type PlanDelArqueo } from './planificador-del-arqueo.js';

export type { PeticionDeArqueo } from './planificador-del-arqueo.js';

/** La clave del correlativo de los arqueos. */
export const CLAVE_DE_ARQUEOS = 'caja-chica.arqueos';

/** El arqueo ya numerado, listo para guardar. */
interface ArqueoPorGuardar {
  arqueoId: string;
  numero: number;
  anio: number;
  operador: Operador;
  pedido: PeticionDeArqueo;
  plan: PlanDelArqueo;
}

/**
 * Registra un arqueo de un fondo abierto (`arqueos.crear`, §5.7): compara lo contado por denominación (más los cheques de
 * reposición sin cambiar) con el efectivo esperado. Con diferencia pide el motivo, y con faltante su destino (pérdida o
 * cobro al custodio), crea el comprobante faltante o sobrante del fondo y audita `ajustar` con el fondo como estaba
 * antes. Avisa o bloquea si quien arquea es el custodio (`caja-chica.control.separacion_de_funciones`). Publica
 * `arqueo_registrado` al confirmar.
 */
export class RegistrarArqueo {
  private readonly lector: LectorDelFondo;
  private readonly lectorDeArqueos: LectorDeArqueos;
  private readonly planificador: PlanificadorDelArqueo;

  constructor(private readonly dependencias: DependenciasDeArqueos) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
    this.lectorDeArqueos = new LectorDeArqueos(dependencias);
    this.planificador = new PlanificadorDelArqueo(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, ConteoInvalido, FechaDelArqueoInvalida, MotivoDeDiferenciaObligatorio,
   * DestinoDelFaltanteObligatorio, DatoDeDiferenciaQueNoAplica, SeparacionDeFuncionesEnElArqueo
   */
  async ejecutar(operador: Operador, pedido: PeticionDeArqueo): Promise<ArqueoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.arquear(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async arquear(operador: Operador, pedido: PeticionDeArqueo) {
    const fondo = await this.lector.bloquear(pedido.fondoId);
    exigirFondoAbierto(fondo);
    const plan = await this.planificador.planear(operador, { fondo, pedido });
    const fondoAntes = plan.diferenciaCentavos === 0 ? null : await this.lector.leer(fondo);
    const { numero, anio } = await this.dependencias.correlativos.siguiente(CLAVE_DE_ARQUEOS, plan.fecha);
    const arqueoId = crypto.randomUUID();
    await this.dependencias.arqueos.agregar(armarElNuevo({ arqueoId, numero, anio, operador, pedido, plan }));
    const comprobanteId = await this.ajustar(operador, { arqueoId, numero, pedido, plan, fondoAntes });
    const arqueo = (await this.dependencias.arqueos.buscar(arqueoId))!;
    return {
      dto: await this.lectorDeArqueos.leer(arqueo, plan.aviso ? [plan.aviso] : []),
      eventos: [eventoDelArqueo(operador, { pedido, plan, arqueoId, numero, comprobanteId })],
    };
  }

  /** Con diferencia: crea el faltante o sobrante del fondo y lo audita (`ajustar`); sin ella no hay nada que auditar. */
  private async ajustar(
    operador: Operador,
    por: Pick<ArqueoPorGuardar, 'arqueoId' | 'numero' | 'pedido' | 'plan'> & { fondoAntes: unknown },
  ): Promise<string | null> {
    const { arqueoId, plan, fondoAntes } = por;
    if (plan.diferenciaCentavos === 0) return null;
    const comprobanteId = await this.dependencias.comprobantes.agregar(ajusteDelArqueo(operador, por));
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_ARQUEOS,
      registroId: arqueoId,
      accion: 'ajustar',
      anterior: fondoAntes,
      motivo: plan.motivo,
    });
    return comprobanteId;
  }
}

/** El faltante o sobrante que nace de la diferencia: un comprobante del fondo por su valor absoluto. */
function ajusteDelArqueo(
  operador: Operador,
  { arqueoId, numero, pedido, plan }: Pick<ArqueoPorGuardar, 'arqueoId' | 'numero' | 'pedido' | 'plan'>,
): AjusteDeArqueoNuevo {
  const faltante = plan.diferenciaCentavos < 0;
  return {
    arqueoId,
    fondoId: pedido.fondoId,
    clase: faltante ? 'faltante' : 'sobrante',
    fecha: plan.fecha,
    montoCentavos: Math.abs(plan.diferenciaCentavos),
    descripcion: `${faltante ? 'Faltante' : 'Sobrante'} del arqueo ${numero}`,
    destinoDelFaltante: plan.destino,
    asignadoPor: operador.usuarioId,
  };
}

function armarElNuevo({ arqueoId, numero, anio, operador, pedido, plan }: ArqueoPorGuardar): ArqueoNuevo {
  return {
    id: arqueoId,
    fondoId: pedido.fondoId,
    numero,
    anioDeNumero: anio,
    realizadoEn: plan.realizadoEn,
    arqueadoPor: operador.usuarioId,
    custodio: plan.custodio.nombre,
    custodioUsuarioId: plan.custodio.usuarioId,
    loHizoElCustodio: plan.elCustodioArquea,
    conteo: plan.conteo,
    efectivoContadoCentavos: plan.contadoCentavos,
    valoresPorCambiarCentavos: plan.valoresPorCambiarCentavos,
    montoDelFondoCentavos: plan.cifras.montoCentavos,
    pendienteDeReponerCentavos: plan.cifras.pendienteCentavos,
    valesAbiertosCentavos: plan.cifras.valesCentavos,
    efectivoEsperadoCentavos: plan.cifras.esperadoCentavos,
    diferenciaCentavos: plan.diferenciaCentavos,
    comprobantesCompletos: pedido.comprobantesCompletos,
    motivoDeDiferencia: plan.motivo,
    observaciones: pedido.observaciones ?? null,
  };
}

function eventoDelArqueo(
  operador: Operador,
  por: Pick<ArqueoPorGuardar, 'pedido' | 'plan' | 'arqueoId' | 'numero'> & { comprobanteId: string | null },
): EventoDominio {
  const { pedido, plan, arqueoId, numero, comprobanteId } = por;
  return new ArqueoRegistrado({
    empresaId: operador.empresaId,
    fondoId: pedido.fondoId,
    arqueoId,
    numero,
    fecha: plan.fecha,
    efectivoContadoCentavos: plan.contadoCentavos,
    efectivoEsperadoCentavos: plan.cifras.esperadoCentavos,
    diferenciaCentavos: plan.diferenciaCentavos,
    destinoDelFaltante: plan.destino,
    comprobanteId,
  });
}
