import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/empresas.contratos.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { CompletadorDeNit, DatosDeLaEmpresaParaDocumentos } from '../aplicacion/puertos/puertos-de-documentos.js';

/** El NIT de la empresa activa lo da Empresas (orden `empresas.obtener_datos_de_empresa`). */
export class DatosDeLaEmpresaEnMediador implements DatosDeLaEmpresaParaDocumentos {
  async nit(operador: Operador): Promise<string | null> {
    const datos = await mediador.enviar(operador, 'empresas.obtener_datos_de_empresa', {
      empresaId: operador.empresaId,
    });
    return datos.nit;
  }
}

/** Terceros pone el NIT al proveedor que no lo tiene (orden `terceros.completar_nit`). */
export class CompletadorDeNitEnMediador implements CompletadorDeNit {
  completar(operador: Operador, proveedorId: string, nit: string): Promise<void> {
    return mediador.enviar(operador, 'terceros.completar_nit', { proveedorId, nit });
  }
}
