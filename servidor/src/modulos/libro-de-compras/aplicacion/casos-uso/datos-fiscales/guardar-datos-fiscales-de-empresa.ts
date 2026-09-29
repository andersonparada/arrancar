import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import {
  DatosFiscalesDeEmpresa,
  type PropiedadesFiscalesDeEmpresa,
} from '../../../dominio/datos-fiscales-de-empresa.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';
import { dtoDeEmpresa } from './dtos-de-datos-fiscales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeEmpresa;
  auditoria: Auditoria;
}

interface CambioDeDatosFiscales {
  empresaId: string;
  datos: PropiedadesFiscalesDeEmpresa;
}

/**
 * Guarda la sección fiscal de una empresa. La llama el aviso `empresas.empresa_guardada`, dentro de la
 * transacción del formulario de Empresas, con esa empresa como empresa del operador.
 */
export class GuardarDatosFiscalesDeEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Un cambio respecto de lo que valía (lo guardado o, si nunca se guardó, los valores por omisión) queda en la
   * auditoría como `corregir` con los datos anteriores, porque cambia las retenciones de las compras futuras.
   * @throws DatosFiscalesInvalidos si los datos se contradicen.
   */
  async ejecutar(operador: Operador, { empresaId, datos }: CambioDeDatosFiscales): Promise<void> {
    const { unidadDeTrabajo, repositorio, auditoria } = this.dependencias;
    const nuevos = DatosFiscalesDeEmpresa.crear(datos);
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const guardados = await repositorio.buscar(empresaId);
      const anteriores = guardados ?? DatosFiscalesDeEmpresa.porOmision();
      await repositorio.guardar(empresaId, nuevos);
      if (anteriores.esIgualA(nuevos)) return;
      await auditoria.registrar({
        recurso: 'libro-de-compras.datos-fiscales-de-empresa',
        registroId: empresaId,
        accion: 'corregir',
        anterior: dtoDeEmpresa(empresaId, anteriores, guardados !== null),
      });
    });
  }
}
