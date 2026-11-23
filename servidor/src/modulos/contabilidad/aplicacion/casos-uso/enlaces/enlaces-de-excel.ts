import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { normalizar } from '../../../../core/intercambio/aplicacion/columnas.js';
import { EnlaceInvalido } from '../../../dominio/errores.js';
import type { EnlaceDto, SolicitudDeEnlaceDeExcel } from '../../dto/enlace.dto.js';
import type { DependenciasDeEnlaces } from './dependencias-de-enlaces.js';
import type { GuardarEnlace } from './guardar-enlace.js';
import type { ListarLlavesDeEnlace } from './listar-llaves-de-enlace.js';

/** Todos los enlaces de la empresa, uno por fila, para exportarlos. */
export class ListarEnlacesParaExcel {
  constructor(private readonly dependencias: Pick<DependenciasDeEnlaces, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<EnlaceDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}

/** Una fila del Excel: la llave se escribe por su nombre y aquí se busca entre las que ofrecen los módulos. */
export class GuardarEnlaceDeExcel {
  constructor(
    private readonly guardar: Pick<GuardarEnlace, 'ejecutar'>,
    private readonly llaves: Pick<ListarLlavesDeEnlace, 'ejecutar'>,
  ) {}

  /** @throws EnlaceInvalido si el nombre no es el de ninguna llave del rol (además de lo que revisa `GuardarEnlace`). */
  async ejecutar(operador: Operador, { rol, llaveNombre, cuentaId }: SolicitudDeEnlaceDeExcel): Promise<EnlaceDto> {
    return this.guardar.ejecutar(operador, {
      rol,
      solicitud: { cuentaId, llave: llaveNombre ? await this.idDeLaLlave(operador, rol, llaveNombre) : null },
    });
  }

  private async idDeLaLlave(operador: Operador, rol: SolicitudDeEnlaceDeExcel['rol'], nombre: string): Promise<string> {
    const ofrecidas = await this.llaves.ejecutar(operador, rol);
    const elegida = ofrecidas.find((llave) => normalizar(llave.nombre) === normalizar(nombre));
    if (!elegida) throw new EnlaceInvalido(`«${nombre}» no está entre las llaves de este rol.`, 'llaveNombre');
    return elegida.llave;
  }
}
