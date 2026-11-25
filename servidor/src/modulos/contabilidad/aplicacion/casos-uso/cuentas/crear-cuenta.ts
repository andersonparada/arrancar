import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Cuenta } from '../../../dominio/cuenta.js';
import { datosDeCuenta } from '../../datos-de-cuenta.js';
import type { CuentaDto, SolicitudDeCuenta } from '../../dto/cuenta.dto.js';
import { ubicacionDeCuentaNueva, type DependenciasDeCuentas } from './dependencias-de-cuentas.js';

export class CrearCuenta {
  constructor(private readonly dependencias: DependenciasDeCuentas) {}

  /**
   * La cuenta superior y el nivel salen del código y de la máscara de la empresa.
   * @throws ContabilidadSinIniciar si la empresa no tiene máscara todavía.
   * @throws CodigoFueraDeLaMascara, CuentaInvalida o CuentaNoEsDeDetalle si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si el código o el nombre ya existen.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeCuenta): Promise<CuentaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const ubicacion = await ubicacionDeCuentaNueva(this.dependencias, solicitud.codigo);
      const cuenta = Cuenta.crear(Identificador.desde(operador.empresaId), datosDeCuenta(solicitud), ubicacion);
      await repositorio.agregar(cuenta);
      return consultas.obtener(cuenta.id.valor);
    });
  }
}
