import { apiPlataforma, type EntradaBitacora } from '../../servicios/plataforma.api';
import { usarCarga } from '../usar-carga';

const ACCIONES: Record<string, string> = { entrada_empresa: 'Entró a la empresa' };

/** Lo que dice la bitácora con palabras; una acción nueva sin traducir se muestra con su código. */
export const nombreDeLaAccion = (accion: string) => ACCIONES[accion] ?? accion;

/** Las entradas recientes de soporte a empresas ajenas. */
export function usarBitacora() {
  const { datos: entradas } = usarCarga<EntradaBitacora[]>(
    () => apiPlataforma.bitacora(),
    [],
    'No se pudo cargar la bitácora.',
  );
  return { entradas };
}
