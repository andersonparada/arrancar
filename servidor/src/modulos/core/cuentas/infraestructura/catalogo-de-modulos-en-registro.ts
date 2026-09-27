import { obtenerRegistroModulos } from '../../modulos-sistema/registro-global.js';
import type { EstadoDeModuloDto } from '../aplicacion/dto/cuenta.dto.js';
import type { CatalogoDeModulos } from '../aplicacion/puertos/catalogo-de-modulos.js';

/** Las reglas de dependencias viven en el registro, que conoce a todos los módulos. */
export class CatalogoDeModulosEnRegistro implements CatalogoDeModulos {
  activos(contratados: string[]): ReadonlySet<string> {
    return obtenerRegistroModulos().resolverActivos(contratados);
  }

  esEsencial(modulo: string): boolean {
    return obtenerRegistroModulos().obtener(modulo)?.esencial ?? false;
  }

  exigirQueSePuedaActivar(modulo: string, activos: ReadonlySet<string>): void {
    obtenerRegistroModulos().validarActivacion(modulo, activos);
  }

  exigirQueSePuedaDesactivar(modulo: string, activos: ReadonlySet<string>): void {
    obtenerRegistroModulos().validarDesactivacion(modulo, activos);
  }

  estados(activos: ReadonlySet<string>): EstadoDeModuloDto[] {
    return obtenerRegistroModulos()
      .listar()
      .map((modulo) => ({
        clave: modulo.clave,
        nombre: modulo.nombre,
        descripcion: modulo.descripcion,
        esencial: modulo.esencial ?? false,
        dependeDe: [...(modulo.dependeDe ?? [])],
        activo: activos.has(modulo.clave),
      }));
  }
}
