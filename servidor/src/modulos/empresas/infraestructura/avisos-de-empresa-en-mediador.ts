import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  AvisosDeEmpresa,
  AvisosDeLaCarga,
  CambioDeLaCarga,
  AvisosDeFechaDeInicio,
  EmpresaGuardada,
  FechaDeInicioPorCambiar,
} from '../aplicacion/puertos/avisos-de-empresa.js';
import type { AvisoDeValorDeInmueble, AvisosDeValorDeInmueble } from '../aplicacion/puertos/valores-de-inmueble.js';

/** Avisa por el mediador; lo escuchan solo los módulos activos en la cuenta. */
export class AvisosDeEmpresaEnMediador
  implements AvisosDeEmpresa, AvisosDeFechaDeInicio, AvisosDeValorDeInmueble, AvisosDeLaCarga
{
  empresaGuardada(operador: Operador, aviso: EmpresaGuardada): Promise<void> {
    return mediador.avisar(operador, 'empresas.empresa_guardada', aviso);
  }

  fechaDeInicioPorCambiar(operador: Operador, aviso: FechaDeInicioPorCambiar): Promise<void> {
    return mediador.avisar(operador, 'empresas.fecha_de_inicio_por_cambiar', aviso);
  }

  registrado(operador: Operador, aviso: AvisoDeValorDeInmueble): Promise<void> {
    return mediador.avisar(operador, 'empresas.valor_de_inmueble_registrado', aviso);
  }

  porEliminar(operador: Operador, aviso: AvisoDeValorDeInmueble): Promise<void> {
    return mediador.avisar(operador, 'empresas.valor_de_inmueble_por_eliminar', aviso);
  }

  cargaPorCerrar(operador: Operador, aviso: CambioDeLaCarga): Promise<void> {
    return mediador.avisar(operador, 'empresas.carga_por_cerrar', aviso);
  }

  cargaPorReabrir(operador: Operador, aviso: CambioDeLaCarga): Promise<void> {
    return mediador.avisar(operador, 'empresas.carga_por_reabrir', aviso);
  }
}
