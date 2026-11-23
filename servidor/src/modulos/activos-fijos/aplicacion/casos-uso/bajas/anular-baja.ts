import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import type { Baja, BajaId } from '../../../dominio/baja.js';
import { BajaDeComponenteConSuPrincipal, BajaNoAnulable } from '../../../dominio/errores-de-baja.js';
import type { BajaDto } from '../../dto/baja.dto.js';
import { exigirMesAbierto, IncisosDeClases } from '../traslados/dependencias-de-traslados.js';
import { RECURSO_DE_BAJAS, type DependenciasDeBajas } from './dependencias-de-bajas.js';
import { eventoDeBajaAnulada } from './eventos-de-bajas.js';

interface AnulacionPedida {
  bajaId: string;
  motivo: string;
}

/** Las bajas de una misma acta con los activos que se dieron de baja, ya bloqueados. */
interface ActaCargada {
  baja: Baja;
  bajas: Baja[];
  activos: Activo[];
}

export class AnularBaja {
  constructor(private readonly dependencias: DependenciasDeBajas) {}

  /**
   * Anula la baja o venta con su motivo: el activo vuelve a estar en uso (con sus componentes si se dieron de baja
   * juntos) y la fila queda como rastro. Solo si la baja es de un mes abierto. Cada baja anulada queda en la auditoría
   * como estaba y, al confirmar, publica `baja_anulada` por activo.
   * @throws RecursoNoEncontrado si la baja no existe o no es de la empresa.
   * @throws BajaNoAnulable si ya está anulada; BajaInvalida si falta el motivo.
   * @throws MesCerrado si el mes de la baja ya está cerrado.
   * @throws BajaDeComponenteConSuPrincipal si es un componente que se dio de baja junto con su principal.
   */
  async ejecutar(operador: Operador, pedido: AnulacionPedida): Promise<BajaDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { baja, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return baja;
  }

  private async anular(operador: Operador, { bajaId, motivo }: AnulacionPedida) {
    await this.dependencias.cierres.bloquear('compartido');
    const acta = await this.cargar(bajaId);
    await exigirMesAbierto(this.dependencias.cierres, acta.baja.instantanea().fecha);
    const incisos = new IncisosDeClases(this.dependencias.clases);
    const eventos: EventoDominio[] = [];
    for (const baja of this.aAnular(acta)) {
      const activo = acta.activos.find((candidato) => candidato.id.valor === baja.instantanea().activoId)!;
      await this.anularUna({ baja, activo }, { operador, motivo });
      const incisoFiscal = await incisos.de(activo.instantanea().claseId);
      eventos.push(eventoDeBajaAnulada({ activo, baja, incisoFiscal }));
    }
    return { baja: await this.dependencias.consultasDeBajas.obtener(bajaId), eventos };
  }

  /** Anula la baja, devuelve el activo a uso y deja la auditoría con la baja como estaba. */
  private async anularUna(
    { baja, activo }: { baja: Baja; activo: Activo },
    { operador, motivo }: { operador: Operador; motivo: string },
  ): Promise<void> {
    const { auditoria, consultasDeBajas, repositorio, bajas } = this.dependencias;
    const anterior = await consultasDeBajas.obtener(baja.id.valor);
    baja.anular({ motivo, usuarioId: operador.usuarioId, ahora: new Date() });
    activo.deshacerBaja();
    await bajas.guardar(baja);
    await repositorio.guardar(activo);
    const registroId = baja.id.valor;
    await auditoria.registrar({ recurso: RECURSO_DE_BAJAS, registroId, accion: 'anular', anterior, motivo });
  }

  /** La baja pedida, vigente, y las de su acta, con sus activos bloqueados; un componente no se anula sin su principal. */
  private async cargar(bajaId: string): Promise<ActaCargada> {
    const { bajas, repositorio } = this.dependencias;
    const baja = await bajas.buscarBloqueando(Identificador.desde(bajaId) as BajaId);
    if (!baja) throw new RecursoNoEncontrado('La baja');
    if (baja.instantanea().estado === 'anulada') throw new BajaNoAnulable();
    const delActo = (await bajas.delActo(baja.instantanea())).filter((otra) => otra.instantanea().estado === 'vigente');
    const activos = await repositorio.buscarBloqueando(delActo.map((otra) => otra.instantanea().activoId));
    const propio = activos.find((activo) => activo.id.valor === baja.instantanea().activoId)!;
    const principal = activos.find((activo) => activo.id.valor === propio.instantanea().activoPadreId);
    if (principal) throw new BajaDeComponenteConSuPrincipal(principal.instantanea().codigo);
    return { baja, bajas: delActo, activos };
  }

  /** La baja pedida y las de los componentes que se dieron de baja con ella. */
  private aAnular({ baja, bajas, activos }: ActaCargada): Baja[] {
    const propio = baja.instantanea().activoId;
    const componentes = bajas.filter((otra) => {
      const activo = activos.find((candidato) => candidato.id.valor === otra.instantanea().activoId);
      return activo?.instantanea().activoPadreId === propio;
    });
    return [baja, ...componentes];
  }
}
