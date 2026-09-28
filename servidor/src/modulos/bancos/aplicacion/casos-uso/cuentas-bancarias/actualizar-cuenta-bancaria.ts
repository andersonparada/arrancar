import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeCuentaBancaria } from '../../datos-de-cuenta-bancaria.js';
import type { CuentaBancariaDto, SolicitudDeCuentaBancaria } from '../../dto/cuenta-bancaria.dto.js';
import { cuentaBancariaExistente, type DependenciasDeCuentasBancarias } from './dependencias-de-cuentas-bancarias.js';

interface CambioDeCuentaBancaria {
  cuentaBancariaId: string;
  solicitud: SolicitudDeCuentaBancaria;
}

export class ActualizarCuentaBancaria {
  constructor(private readonly dependencias: DependenciasDeCuentasBancarias) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { cuentaBancariaId, solicitud }: CambioDeCuentaBancaria): Promise<CuentaBancariaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cuentaBancaria = await cuentaBancariaExistente(repositorio, cuentaBancariaId);
      await consultas.exigirReferencias(solicitud);
      const anterior = await consultas.obtener(cuentaBancariaId);
      cuentaBancaria.cambiarDatos(datosDeCuentaBancaria(solicitud));
      await repositorio.guardar(cuentaBancaria);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'bancos.cuentas-bancarias',
        registroId: cuentaBancariaId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(cuentaBancariaId);
    });
  }
}
