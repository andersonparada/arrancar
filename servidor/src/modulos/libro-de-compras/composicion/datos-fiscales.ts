import type { DependenciasCompartidas } from '../../core/compartido/aplicacion/dependencias-compartidas.js';
import '../../core/contratos/empresas.contratos.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { GuardarDatosFiscalesDeEmpresa } from '../aplicacion/casos-uso/datos-fiscales/guardar-datos-fiscales-de-empresa.js';
import { GuardarDatosFiscalesDeProveedor } from '../aplicacion/casos-uso/datos-fiscales/guardar-datos-fiscales-de-proveedor.js';
import { ObtenerDatosFiscalesDeEmpresa } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-empresa.js';
import { ObtenerDatosFiscalesDeProveedor } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-proveedor.js';
import { DatosFiscalesControlador } from '../http/datos-fiscales.controlador.js';
import { seccionFiscalDeEmpresa, seccionFiscalDeProveedor } from '../http/datos-fiscales.esquemas-http.js';
import { rutasDeDatosFiscales } from '../http/datos-fiscales.rutas.js';
import { AccesoAEmpresasDrizzle } from '../infraestructura/persistencia/acceso-a-empresas.drizzle.js';
import {
  RepositorioDeDatosFiscalesDeEmpresaDrizzle,
  RepositorioDeDatosFiscalesDeProveedorDrizzle,
} from '../infraestructura/persistencia/repositorios-de-datos-fiscales.drizzle.js';

const MODULO = 'libro-de-compras';

/**
 * Este módulo aporta su sección a los formularios de Empresas y de Proveedores: cuando esos módulos avisan que
 * guardaron, valida y guarda la suya en la misma transacción. Una sección inválida deshace todo el formulario.
 */
function escucharLosFormularios(
  guardarDeEmpresa: GuardarDatosFiscalesDeEmpresa,
  guardarDeProveedor: GuardarDatosFiscalesDeProveedor,
): void {
  mediador.escuchar(MODULO, 'empresas.empresa_guardada', async ({ empresaId, secciones }, operador) => {
    const datos = seccionFiscalDeEmpresa(secciones);
    if (datos) await guardarDeEmpresa.ejecutar(operador, { empresaId, datos });
  });
  mediador.escuchar(MODULO, 'terceros.proveedor_guardado', async ({ proveedorId, secciones }, operador) => {
    const datos = seccionFiscalDeProveedor(secciones);
    if (datos) await guardarDeProveedor.ejecutar(operador, { proveedorId, datos });
  });
}

/** Raíz de composición de los datos fiscales: devuelve sus rutas de lectura y registra sus escuchas. */
export function rutasDeDatosFiscalesComponidas({ unidadDeTrabajo, auditoria }: DependenciasCompartidas) {
  const repositorioDeEmpresa = new RepositorioDeDatosFiscalesDeEmpresaDrizzle();
  const repositorioDeProveedor = new RepositorioDeDatosFiscalesDeProveedorDrizzle();
  escucharLosFormularios(
    new GuardarDatosFiscalesDeEmpresa({ unidadDeTrabajo, repositorio: repositorioDeEmpresa, auditoria }),
    new GuardarDatosFiscalesDeProveedor({ unidadDeTrabajo, repositorio: repositorioDeProveedor, auditoria }),
  );
  return rutasDeDatosFiscales(
    new DatosFiscalesControlador({
      obtenerDeEmpresa: new ObtenerDatosFiscalesDeEmpresa({
        unidadDeTrabajo,
        repositorio: repositorioDeEmpresa,
        acceso: new AccesoAEmpresasDrizzle(),
      }),
      obtenerDeProveedor: new ObtenerDatosFiscalesDeProveedor({ unidadDeTrabajo, repositorio: repositorioDeProveedor }),
    }),
  );
}
