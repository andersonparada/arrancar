import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { DEFINICIONES_DE_ROLES, rolesDeLosModulos } from '../../../dominio/roles-de-enlace.js';
import type { RolDeEnlaceDto } from '../../dto/enlace.dto.js';
import type { DependenciasDeEnlaces } from './dependencias-de-enlaces.js';

type Usadas = Pick<DependenciasDeEnlaces, 'unidadDeTrabajo' | 'consultas' | 'modulosActivos'>;

/** Los roles de los módulos activos de la cuenta, cada uno con sus enlaces. */
export class ListarEnlaces {
  constructor(private readonly dependencias: Usadas) {}

  ejecutar(operador: Operador): Promise<RolDeEnlaceDto[]> {
    const { unidadDeTrabajo, consultas, modulosActivos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const roles = rolesDeLosModulos(await modulosActivos.de(operador));
      const enlaces = await consultas.listar();
      return roles.map((rol) => ({
        rol,
        ...DEFINICIONES_DE_ROLES[rol],
        enlaces: enlaces.filter((enlace) => enlace.rol === rol),
      }));
    });
  }
}
