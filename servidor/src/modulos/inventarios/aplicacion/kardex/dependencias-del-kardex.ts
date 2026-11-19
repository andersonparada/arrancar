import type { Auditoria } from '../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { AlmacenDelKardex } from '../puertos/almacen-del-kardex.js';
import type { CatalogosDelKardex } from '../puertos/catalogos-del-kardex.js';
import type { ConsultasDelKardex } from '../puertos/consultas-del-kardex.js';
import type { CargaInicial, LectorDelMetodoInicial, MesesCerrados } from '../puertos/entorno-del-kardex.js';
import type { ExistenciasPorBodega } from '../puertos/existencias-por-bodega.js';
import type { RepositorioDeDocumentos } from '../puertos/repositorio-de-documentos.js';
import type { RepositorioDeMetodos } from '../puertos/repositorio-de-metodos.js';

/** Lo que usan los casos de uso que mueven el kardex y los que lo consultan. */
export interface DependenciasDelKardex {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  correlativos: Correlativos;
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
  almacen: AlmacenDelKardex;
  documentos: RepositorioDeDocumentos;
  existencias: ExistenciasPorBodega;
  metodos: RepositorioDeMetodos;
  catalogos: CatalogosDelKardex;
  consultas: ConsultasDelKardex;
  cargaInicial: CargaInicial;
  cierres: MesesCerrados;
  metodoInicial: LectorDelMetodoInicial;
}
