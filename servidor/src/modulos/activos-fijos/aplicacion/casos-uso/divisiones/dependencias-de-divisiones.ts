import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { ConsultasDivisiones } from '../../puertos/consultas-divisiones.js';
import type { ConsultasMejoras } from '../../puertos/consultas-mejoras.js';
import type { LectorDePrefijo } from '../../puertos/lector-de-prefijo.js';
import type { RepositorioDivisiones } from '../../puertos/repositorio-divisiones.js';
import type { RepositorioTraslados } from '../../puertos/repositorio-traslados.js';
import type { DependenciasDeCambioDeLibros } from '../mejoras/dependencias-de-mejoras.js';

/** El recurso de la auditoría de las divisiones (§10.2). */
export const RECURSO_DE_DIVISIONES = 'activos-fijos.divisiones';

/** Lo que usan los casos de uso de las divisiones: lo de los cambios de depreciación y lo propio de dividir. */
export interface DependenciasDeDivisiones extends DependenciasDeCambioDeLibros {
  correlativos: Correlativos;
  prefijo: LectorDePrefijo;
  divisiones: RepositorioDivisiones;
  consultasDeDivisiones: ConsultasDivisiones;
  /** Las mejoras vigentes: ninguna puede ser posterior a la división. */
  consultasDeMejoras: ConsultasMejoras;
  /** Los traslados: ninguno (salvo el alta) puede ser posterior a la división. */
  traslados: RepositorioTraslados;
}
