import type { ConsultasBandeja } from '../../puertos/consultas-bandeja.js';
import type { LectorDeUmbral } from '../../puertos/lector-de-umbral.js';
import type { RepositorioDescartes } from '../../puertos/repositorio-descartes.js';
import type { DependenciasDeCostos } from '../costos/dependencias-de-costos.js';

/** Lo que usan los casos de uso de la bandeja: la consulta sobre el libro, el umbral y los descartes. */
export interface DependenciasDeBandeja extends Pick<
  DependenciasDeCostos,
  'unidadDeTrabajo' | 'costos' | 'lineas' | 'auditoria' | 'cargaInicial'
> {
  bandeja: ConsultasBandeja;
  umbral: LectorDeUmbral;
  descartes: RepositorioDescartes;
}
