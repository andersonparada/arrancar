import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PaginaDeContrasenasDto } from '../../dto/contrasena.dto.js';
import { dtoResumenDeContrasena } from '../../dto/dto-de-contrasena.js';
import type { PaginacionDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import type { FiltroDeContrasenas } from '../../puertos/puertos-de-contrasenas.js';
import type { DependenciasDeConsultaDeContrasenas } from './dependencias-de-contrasenas.js';

/** Las contraseñas de la empresa, de la más reciente a la más antigua, con su saldo de hoy. */
export class ListarContrasenas {
  constructor(private readonly dependencias: DependenciasDeConsultaDeContrasenas) {}

  ejecutar(
    operador: Operador,
    filtro: FiltroDeContrasenas,
    paginacion: PaginacionDeDocumentos,
  ): Promise<PaginaDeContrasenasDto> {
    const { unidadDeTrabajo, reloj, contrasenas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hoy = await reloj.hoy(operador);
      const { filas, total } = await contrasenas.listar(filtro, paginacion);
      return { elementos: filas.map((fila) => dtoResumenDeContrasena(fila, hoy)), total, ...paginacion };
    });
  }
}
