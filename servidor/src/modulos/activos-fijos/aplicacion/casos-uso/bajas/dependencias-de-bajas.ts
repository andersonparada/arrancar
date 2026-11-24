import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { DocumentosProtegidos } from '../../../../core/compartido/aplicacion/documentos-protegidos.js';
import type { ConsultasBajas } from '../../puertos/consultas-bajas.js';
import type { ConsultasMejoras } from '../../puertos/consultas-mejoras.js';
import type { RepositorioBajas } from '../../puertos/repositorio-bajas.js';
import type { RepositorioTraslados } from '../../puertos/repositorio-traslados.js';
import type { DependenciasDeCambioDeLibros } from '../mejoras/dependencias-de-mejoras.js';

/** El recurso de la auditoría de las bajas y el `recurso_dueno` de sus archivos (acta y denuncia). */
export const RECURSO_DE_BAJAS = 'activos-fijos.bajas';

/** El correlativo del número del acta: uno por baja (los componentes que se dan de baja con el activo lo comparten). */
export const CORRELATIVO_DE_BAJAS = 'activos-fijos.bajas';

/** Lo que usan los casos de uso de las bajas y ventas: lo de los cambios de depreciación y lo propio de las bajas. */
export interface DependenciasDeBajas extends DependenciasDeCambioDeLibros {
  correlativos: Correlativos;
  traslados: RepositorioTraslados;
  bajas: RepositorioBajas;
  consultasDeBajas: ConsultasBajas;
  /** Las fechas de las mejoras vigentes: la baja no puede ser anterior a ninguna. */
  consultasDeMejoras: ConsultasMejoras;
  documentos: DocumentosProtegidos;
}
