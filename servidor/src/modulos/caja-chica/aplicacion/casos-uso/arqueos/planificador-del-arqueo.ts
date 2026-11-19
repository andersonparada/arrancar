import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DestinoDelFaltante, LineaDeConteo } from '../../../dominio/arqueos.js';
import { normalizarElConteo, totalDelConteo } from '../../../dominio/conteo-de-efectivo.js';
import type { Fondo } from '../../../dominio/fondos.js';
import { efectivoEsperado } from '../../../dominio/monto-del-fondo.js';
import {
  diferenciaDelArqueo,
  exigirDiferenciaExplicada,
  exigirFechaDelArqueo,
  revisarLaSeparacionEnElArqueo,
} from '../../../dominio/reglas-de-arqueos.js';
import { custodioVigente } from '../fondos/lector-del-fondo.js';
import type { DependenciasDeArqueos } from './dependencias-de-arqueos.js';

export interface PeticionDeArqueo {
  fondoId: string;
  /** ISO 8601 con zona; ahora si falta. */
  realizadoEn?: string;
  conteo: LineaDeConteo[];
  valoresPorCambiarCentavos?: number;
  comprobantesCompletos: boolean;
  observaciones?: string | null;
  motivoDeDiferencia?: string | null;
  destinoDelFaltante?: DestinoDelFaltante | null;
}

/** Lo que el sistema decía de la caja al contar (centavos). */
export interface CifrasDelArqueo {
  montoCentavos: number;
  pendienteCentavos: number;
  valesCentavos: number;
  esperadoCentavos: number;
}

/** Lo que se decide antes de guardar nada. */
export interface PlanDelArqueo {
  realizadoEn: Date;
  /** La fecha contable del conteo (`AAAA-MM-DD`). */
  fecha: string;
  conteo: LineaDeConteo[];
  contadoCentavos: number;
  valoresPorCambiarCentavos: number;
  cifras: CifrasDelArqueo;
  diferenciaCentavos: number;
  motivo: string | null;
  destino: DestinoDelFaltante | null;
  custodio: { nombre: string; usuarioId: string | null };
  elCustodioArquea: boolean;
  aviso: string | null;
}

type Dependencias = Pick<DependenciasDeArqueos, 'reloj' | 'ahora' | 'consultasDeFondos' | 'configuracion' | 'fondos'>;

/** Revisa y calcula todo lo del arqueo (fecha, conteo, diferencia, separación de funciones) sin escribir nada. */
export class PlanificadorDelArqueo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado, FechaDelArqueoInvalida, ConteoInvalido, MotivoDeDiferenciaObligatorio,
   * DestinoDelFaltanteObligatorio, DatoDeDiferenciaQueNoAplica, SeparacionDeFuncionesEnElArqueo
   */
  async planear(operador: Operador, por: { fondo: Fondo; pedido: PeticionDeArqueo }): Promise<PlanDelArqueo> {
    const { fondo, pedido } = por;
    const { fecha, realizadoEn } = await this.fechar(operador, { fondo, pedido });
    const conteo = normalizarElConteo(pedido.conteo);
    const cifras = await this.cifrasDe(fondo.id);
    const control = await this.controlDelCustodio(operador, fondo);
    return { ...control, ...this.diferencia(pedido, { conteo, cifras }), realizadoEn, fecha, conteo, cifras };
  }

  /** Lo contado, la diferencia contra lo esperado y lo que la explica. */
  private diferencia(pedido: PeticionDeArqueo, por: { conteo: LineaDeConteo[]; cifras: CifrasDelArqueo }) {
    const contadoCentavos = totalDelConteo(por.conteo);
    const valoresPorCambiarCentavos = pedido.valoresPorCambiarCentavos ?? 0;
    const diferenciaCentavos = diferenciaDelArqueo({
      contadoCentavos,
      valoresPorCambiarCentavos,
      esperadoCentavos: por.cifras.esperadoCentavos,
    });
    const { motivo, destino } = exigirDiferenciaExplicada({
      diferenciaCentavos,
      motivo: pedido.motivoDeDiferencia,
      destino: pedido.destinoDelFaltante,
    });
    return { contadoCentavos, valoresPorCambiarCentavos, diferenciaCentavos, motivo, destino };
  }

  private async fechar(operador: Operador, por: { fondo: Fondo; pedido: PeticionDeArqueo }) {
    const { reloj, ahora } = this.dependencias;
    const { fondo, pedido } = por;
    const hoy = await reloj.hoy(operador);
    const realizadoEn = pedido.realizadoEn ? new Date(pedido.realizadoEn) : ahora();
    const fecha = pedido.realizadoEn ? pedido.realizadoEn.slice(0, 10) : hoy;
    exigirFechaDelArqueo({ fecha, realizadoEn }, { hoy, ahora: ahora(), fondo });
    return { fecha, realizadoEn };
  }

  /** Lo que decía el sistema: monto, pendiente, vales y el efectivo esperado. */
  private async cifrasDe(fondoId: string): Promise<CifrasDelArqueo> {
    const lectura = (await this.dependencias.consultasDeFondos.datosDeLectura([fondoId])).get(fondoId);
    if (!lectura) throw new RecursoNoEncontrado('El fondo');
    const { montoCentavos, pendienteCentavos, valesCentavos } = lectura;
    return { montoCentavos, pendienteCentavos, valesCentavos, esperadoCentavos: efectivoEsperado(lectura) };
  }

  /** El custodio vigente (o el nombre del fondo si no hay), si es quien arquea y el aviso o bloqueo que corresponde. */
  private async controlDelCustodio(operador: Operador, fondo: Fondo) {
    const vigente = custodioVigente(await this.dependencias.fondos.custodios(fondo.id));
    const custodio = { nombre: vigente?.custodio ?? fondo.nombre, usuarioId: vigente?.custodioUsuarioId ?? null };
    const elCustodioArquea = custodio.usuarioId === operador.usuarioId;
    const configurada = await this.dependencias.configuracion.separacionDeFunciones(operador);
    return { custodio, elCustodioArquea, aviso: revisarLaSeparacionEnElArqueo(elCustodioArquea, configurada) };
  }
}
