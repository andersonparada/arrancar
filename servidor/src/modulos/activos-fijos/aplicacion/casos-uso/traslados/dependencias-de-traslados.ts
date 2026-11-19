import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { periodoDe } from '../../../dominio/depreciacion/meses.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import type { Cierres } from '../../puertos/cierres.js';
import type { ConsultasActivos } from '../../puertos/consultas-activos.js';
import type { ConsultasTraslados } from '../../puertos/consultas-traslados.js';
import type { LectorDeUbicaciones } from '../../puertos/lector-de-ubicaciones.js';
import type { RepositorioActivos } from '../../puertos/repositorio-activos.js';
import type { RepositorioClases } from '../../puertos/repositorio-clases.js';
import type { RepositorioTraslados } from '../../puertos/repositorio-traslados.js';

/** Lo que usan los casos de uso de los traslados y sus boletas. */
export interface DependenciasDeTraslados {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  correlativos: Correlativos;
  reloj: Reloj;
  publicadorEventos: PublicadorEventos;
  repositorio: RepositorioActivos;
  /** La ficha del activo: lo que queda en la auditoría de «marcar ocioso» como estaba. */
  consultas: ConsultasActivos;
  clases: RepositorioClases;
  ubicaciones: LectorDeUbicaciones;
  cierres: Cierres;
  traslados: RepositorioTraslados;
  consultasDeTraslados: ConsultasTraslados;
}

/** @throws MesCerrado si el mes de la fecha ya tiene un cierre de depreciación. */
export async function exigirMesAbierto(cierres: Cierres, fecha: string): Promise<void> {
  const ultimo = await cierres.ultimoMesCerrado();
  if (ultimo && periodoDe(fecha) <= periodoDe(ultimo)) throw new MesCerrado(periodoDe(fecha));
}

/** El inciso fiscal de la clase de cada activo, para quien escucha los eventos; una lectura por clase. */
export class IncisosDeClases {
  private readonly leidos = new Map<string, IncisoFiscal>();

  constructor(private readonly clases: RepositorioClases) {}

  async de(claseId: string): Promise<IncisoFiscal> {
    const leido = this.leidos.get(claseId);
    if (leido) return leido;
    const clase = await this.clases.buscar(Identificador.desde(claseId));
    const inciso = clase!.instantanea().incisoFiscal;
    this.leidos.set(claseId, inciso);
    return inciso;
  }
}
