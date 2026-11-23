import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo, UbicacionDeActivo } from '../../../dominio/activo.js';
import { FechaAnteriorAlUltimoTraslado } from '../../../dominio/errores-de-traslado.js';
import { textoOpcional } from '../../../dominio/reglas-de-activo.js';
import { Traslado, type BoletaDeTraslado, type DestinoDeTraslado } from '../../../dominio/traslado.js';
import type { UbicacionAlPonerEnUso } from '../../dto/activo.dto.js';
import { exigirMesAbierto, IncisosDeClases } from '../traslados/dependencias-de-traslados.js';
import { eventoDeTraslado } from '../traslados/eventos-de-traslados.js';
import { CLAVE_DEL_CORRELATIVO } from '../traslados/trasladar-activos.js';
import type { DependenciasDeUso } from './dependencias-de-uso.js';

const MOTIVO = 'Disponible para uso';
const RECIBE_LA_BODEGA = 'Bodega de activos';

export interface PedidoDeUbicar {
  operador: Operador;
  /** Los activos recién puestos disponibles. */
  activos: readonly Activo[];
  fecha: string;
  ubicacion: UbicacionAlPonerEnUso;
}

interface ContextoDeTraslado {
  pedido: PedidoDeUbicar;
  destino: DestinoDeTraslado;
  boleta: BoletaDeTraslado;
}

/** Sin `enBodega` escrito, el bien queda en la bodega de activos si no hay responsable (AFI §3.3). */
function destinoDe({ localidadId, departamentoId, responsable, enBodega }: UbicacionAlPonerEnUso): DestinoDeTraslado {
  const limpio = textoOpcional(responsable, 'Responsable', 150);
  return { localidadId, departamentoId, responsable: limpio, aBodega: enBodega ?? limpio === null };
}

function comoUbicacion({ aBodega, ...resto }: DestinoDeTraslado): UbicacionDeActivo {
  return { ...resto, enBodega: aBodega };
}

function sinCambio(activo: Activo, destino: DestinoDeTraslado): boolean {
  const { localidadId, departamentoId, responsable, enBodega } = activo.instantanea();
  return (
    localidadId === destino.localidadId &&
    departamentoId === destino.departamentoId &&
    responsable === destino.responsable &&
    enBodega === destino.aBodega
  );
}

/**
 * Deja a los activos en la ubicación elegida al ponerlos «Disponible para uso». Si el activo solo tiene su fila de alta
 * (aún no hubo boleta), esa fila toma la ubicación; si ya tuvo traslados, el cambio es un traslado con boleta
 * (una sola para todo el lote) con el motivo «Disponible para uso». Los componentes se mueven con su principal.
 */
export class UbicadorAlPonerEnUso {
  private readonly incisos: IncisosDeClases;

  constructor(private readonly dependencias: DependenciasDeUso) {
    this.incisos = new IncisosDeClases(dependencias.clases);
  }

  /** @returns los eventos `activo_trasladado` que se publican al confirmar. */
  async ubicar(pedido: PedidoDeUbicar): Promise<EventoDominio[]> {
    const destino = destinoDe(pedido.ubicacion);
    const eventos: EventoDominio[] = [];
    let boleta: BoletaDeTraslado | null = null;
    for (const activo of await this.conComponentes(pedido.activos)) {
      if (sinCambio(activo, destino)) continue;
      if (await this.soloTieneElAlta(activo)) {
        await this.moverAlta(activo, destino);
        continue;
      }
      boleta ??= await this.numerarBoleta(pedido);
      eventos.push(await this.trasladar(activo, { pedido, destino, boleta }));
    }
    return eventos;
  }

  private async conComponentes(activos: readonly Activo[]): Promise<Activo[]> {
    const propios = new Set(activos.map((activo) => activo.id.valor));
    const componentes = await this.dependencias.repositorio.componentesDe([...propios]);
    return [...activos, ...componentes.filter((componente) => !propios.has(componente.id.valor))];
  }

  private async soloTieneElAlta(activo: Activo): Promise<boolean> {
    const recientes = await this.dependencias.traslados.recientesDeActivo(activo.id.valor, 2);
    return recientes.length <= 1;
  }

  private async moverAlta(activo: Activo, destino: DestinoDeTraslado): Promise<void> {
    const { repositorio } = this.dependencias;
    activo.moverA(comoUbicacion(destino));
    await repositorio.guardar(activo);
    await repositorio.actualizarAlta(activo);
  }

  private async numerarBoleta({ fecha }: PedidoDeUbicar): Promise<BoletaDeTraslado> {
    const { cierres, correlativos } = this.dependencias;
    await exigirMesAbierto(cierres, fecha);
    const { numero, anio } = await correlativos.siguiente(CLAVE_DEL_CORRELATIVO, fecha);
    return { grupoId: Identificador.nuevo().valor, numero, anioDeNumero: anio };
  }

  private async trasladar(activo: Activo, { pedido, destino, boleta }: ContextoDeTraslado): Promise<EventoDominio> {
    const { traslados, repositorio, reloj } = this.dependencias;
    const { id, empresaId, codigo, claseId, ...origen } = activo.instantanea();
    const [ultimo] = await traslados.recientesDeActivo(id.valor, 1);
    if (ultimo && pedido.fecha < ultimo.fecha) throw new FechaAnteriorAlUltimoTraslado(codigo, ultimo.fecha);
    const datos = {
      ...destino,
      fecha: pedido.fecha,
      motivo: MOTIVO,
      recibidoPor: destino.responsable ?? RECIBE_LA_BODEGA,
    };
    const hoy = await reloj.hoy(pedido.operador);
    const traslado = Traslado.registrar({ empresaId, activoId: id.valor, ...boleta }, datos, hoy);
    activo.moverA(comoUbicacion(destino));
    await repositorio.guardar(activo);
    await traslados.agregarVarios([traslado]);
    const incisoFiscal = await this.incisos.de(claseId);
    const { localidadId, departamentoId, responsable } = origen;
    return eventoDeTraslado({ activo, incisoFiscal, traslado }, { localidadId, departamentoId, responsable });
  }
}
