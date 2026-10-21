import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/empresas.contratos.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { IdentidadDeLaEmpresa } from '../aplicacion/puertos/consultas-del-libro.js';
import type {
  CreadorDeProveedores,
  PedidoDeProveedorNuevo,
  ProveedorDeLaBandeja,
} from '../aplicacion/puertos/puertos-de-la-bandeja.js';
import type {
  CompletadorDeDpi,
  CompletadorDeNit,
  DatosDeLaEmpresaParaDocumentos,
} from '../aplicacion/puertos/puertos-de-documentos.js';

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

/** Terceros pone el CUI al proveedor que no lo tiene (orden `terceros.completar_dpi`). */
export class CompletadorDeDpiEnMediador implements CompletadorDeDpi {
  completar(operador: Operador, proveedorId: string, dpi: string): Promise<void> {
    return mediador.enviar(operador, 'terceros.completar_dpi', { proveedorId, dpi });
  }
}

/** El nombre y el NIT de la empresa que encabezan el libro (orden `empresas.obtener_datos_de_empresa`). */
export class IdentidadDeLaEmpresaEnMediador implements IdentidadDeLaEmpresa {
  async datos(operador: Operador): Promise<{ nombre: string; nit: string | null }> {
    const { nombre, nit } = await mediador.enviar(operador, 'empresas.obtener_datos_de_empresa', {
      empresaId: operador.empresaId,
    });
    return { nombre, nit };
  }
}

/** Terceros crea el proveedor del DTE sin duplicar el NIT (orden `terceros.crear_proveedor_desde_dte`). */
export class CreadorDeProveedoresEnMediador implements CreadorDeProveedores {
  crear(operador: Operador, pedido: PedidoDeProveedorNuevo): Promise<ProveedorDeLaBandeja> {
    return mediador.enviar(operador, 'terceros.crear_proveedor_desde_dte', pedido);
  }
}
