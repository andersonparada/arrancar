import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import {
  DatosFiscalesDeCliente,
  type PropiedadesFiscalesDeCliente,
} from '../../../dominio/datos-fiscales-de-cliente.js';
import type { RepositorioDeDatosFiscalesDeCliente } from '../../puertos/repositorio-de-datos-fiscales-de-cliente.js';
import { dtoDeCliente } from './dto-de-datos-fiscales-de-cliente.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeCliente;
  auditoria: Auditoria;
}

interface CambioDeDatosFiscales {
  clienteId: string;
  datos: PropiedadesFiscalesDeCliente;
}

/**
 * Guarda la sección fiscal de un cliente (de la cuenta: vale para todas sus empresas). La llama el aviso
 * `terceros.cliente_guardado`, dentro de la transacción del formulario de Clientes.
 */
export class GuardarDatosFiscalesDeCliente {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Un cambio respecto de lo que valía (lo guardado o, si nunca se guardó, los valores por omisión) queda en la
   * auditoría como `corregir` con los datos anteriores, porque cambia las retenciones esperadas de las ventas futuras.
   * @throws DatosFiscalesDeClienteInvalidos si los datos se contradicen.
   */
  async ejecutar(operador: Operador, { clienteId, datos }: CambioDeDatosFiscales): Promise<void> {
    const { unidadDeTrabajo, repositorio, auditoria } = this.dependencias;
    const nuevos = DatosFiscalesDeCliente.crear(datos);
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const guardados = await repositorio.buscar(clienteId);
      const anteriores = guardados ?? DatosFiscalesDeCliente.porOmision();
      await repositorio.guardar(clienteId, nuevos);
      if (anteriores.esIgualA(nuevos)) return;
      await auditoria.registrar({
        recurso: 'libro-de-ventas.datos-fiscales-de-cliente',
        registroId: clienteId,
        accion: 'corregir',
        anterior: dtoDeCliente(clienteId, anteriores, guardados !== null),
      });
    });
  }
}
