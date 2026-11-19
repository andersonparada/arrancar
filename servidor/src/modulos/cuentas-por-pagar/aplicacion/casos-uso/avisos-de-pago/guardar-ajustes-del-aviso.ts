import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  AjustesDelAviso,
  ConfiguracionDelAviso,
  GuardadorDeAjustesDelAviso,
} from '../../puertos/puertos-de-avisos-de-pago.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  configuracion: ConfiguracionDelAviso;
  guardador: GuardadorDeAjustesDelAviso;
}

/**
 * Guarda los ajustes de los avisos de pago de la empresa (`avisos-de-pago.configurar`). Los valores ya pasaron por el
 * esquema de cada variable en la capa http; la configuración los vuelve a validar al guardar. Si algo cambia, audita
 * `configurar` con los valores de antes y de después: el texto sale con el remitente de la empresa y debe quedar
 * constancia de qué dijo y quién lo puso. La auditoría se escribe antes de guardar, así que si el guardado falla se
 * deshace; la configuración usa su propia conexión, por eso no entra en la misma transacción.
 */
export class GuardarAjustesDelAviso {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, ajustes: AjustesDelAviso): Promise<AjustesDelAviso> {
    const { unidadDeTrabajo, auditoria, configuracion, guardador } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const antes = await configuracion.de(operador);
      if (cambio(antes, ajustes)) {
        await auditoria.registrar({
          recurso: 'cuentas-por-pagar.avisos-de-pago',
          registroId: operador.empresaId,
          accion: 'configurar',
          anterior: { antes, despues: ajustes },
        });
      }
      await guardador.guardar(operador, ajustes);
      return ajustes;
    });
  }
}

function cambio(antes: AjustesDelAviso, despues: AjustesDelAviso): boolean {
  return (Object.keys(antes) as (keyof AjustesDelAviso)[]).some((ajuste) => antes[ajuste] !== despues[ajuste]);
}
