import type { DependenciasCompartidas } from '../../core/compartido/aplicacion/dependencias-compartidas.js';
import '../../core/contratos/empresas.contratos.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { SeccionInvalida } from '../../core/compartido/aplicacion/errores-de-seccion.js';
import { CambiosAlHistorialFiscal } from '../aplicacion/casos-uso/datos-fiscales/cambios-al-historial-fiscal.js';
import { GuardarDatosFiscalesDeEmpresa } from '../aplicacion/casos-uso/datos-fiscales/guardar-datos-fiscales-de-empresa.js';
import { GuardarDatosFiscalesDeProveedor } from '../aplicacion/casos-uso/datos-fiscales/guardar-datos-fiscales-de-proveedor.js';
import { ObtenerDatosFiscalesDeEmpresa } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-empresa.js';
import { ObtenerDatosFiscalesDeProveedor } from '../aplicacion/casos-uso/datos-fiscales/obtener-datos-fiscales-de-proveedor.js';
import { QuitarVigenciaFiscalDeEmpresa } from '../aplicacion/casos-uso/datos-fiscales/quitar-vigencia-fiscal-de-empresa.js';
import { DatosFiscalesInvalidos } from '../dominio/errores.js';
import { DatosFiscalesControlador } from '../http/datos-fiscales.controlador.js';
import {
  CLAVE_DE_LA_SECCION_FISCAL,
  seccionFiscalDeEmpresa,
  seccionFiscalDeProveedor,
} from '../http/datos-fiscales.esquemas-http.js';
import { rutasDeDatosFiscales } from '../http/datos-fiscales.rutas.js';
import { AccesoAEmpresasDrizzle } from '../infraestructura/persistencia/acceso-a-empresas.drizzle.js';
import { ConsultaDePeriodosConDocumentosDrizzle } from '../infraestructura/persistencia/consulta-de-periodos-con-documentos.drizzle.js';
import { RepositorioDeDatosFiscalesDeEmpresaDrizzle } from '../infraestructura/persistencia/repositorio-de-datos-fiscales-de-empresa.drizzle.js';
import { RepositorioDeDatosFiscalesDeProveedorDrizzle } from '../infraestructura/persistencia/repositorios-de-datos-fiscales.drizzle.js';

const MODULO = 'libro-de-compras';

/** Los problemas de los datos fiscales salen con el prefijo de la sección, como los del esquema de Zod. */
async function guardarConPrefijo(guardar: () => Promise<void>): Promise<void> {
  try {
    await guardar();
  } catch (error) {
    if (!(error instanceof DatosFiscalesInvalidos)) throw error;
    throw new SeccionInvalida(
      error.problemas.map(({ campo, mensaje }) => ({
        campo: `secciones.${CLAVE_DE_LA_SECCION_FISCAL}.${campo}`,
        mensaje,
      })),
    );
  }
}

/**
 * Este módulo aporta su sección a los formularios de Empresas y de Proveedores: cuando esos módulos avisan que
 * guardaron, valida y guarda la suya en la misma transacción. Una sección inválida deshace todo el formulario.
 */
function escucharLosFormularios(
  guardarDeEmpresa: GuardarDatosFiscalesDeEmpresa,
  guardarDeProveedor: GuardarDatosFiscalesDeProveedor,
): void {
  mediador.escuchar(MODULO, 'empresas.empresa_guardada', async ({ empresaId, secciones }, operador) => {
    const seccion = seccionFiscalDeEmpresa(secciones);
    if (seccion) await guardarConPrefijo(() => guardarDeEmpresa.ejecutar(operador, { empresaId, ...seccion }));
  });
  mediador.escuchar(MODULO, 'terceros.proveedor_guardado', async ({ proveedorId, secciones }, operador) => {
    const datos = seccionFiscalDeProveedor(secciones);
    if (datos) await guardarDeProveedor.ejecutar(operador, { proveedorId, datos });
  });
}

/** Los casos de uso del historial fiscal de la empresa, armados con el repositorio de Drizzle. */
function casosDeUsoDeEmpresa({ unidadDeTrabajo, auditoria, reloj }: DependenciasCompartidas) {
  const repositorio = new RepositorioDeDatosFiscalesDeEmpresaDrizzle();
  const documentos = new ConsultaDePeriodosConDocumentosDrizzle();
  const acceso = new AccesoAEmpresasDrizzle();
  const cambios = new CambiosAlHistorialFiscal({ repositorio, documentos });
  return {
    guardar: new GuardarDatosFiscalesDeEmpresa({ unidadDeTrabajo, repositorio, cambios, auditoria, reloj }),
    obtener: new ObtenerDatosFiscalesDeEmpresa({ unidadDeTrabajo, repositorio, documentos, acceso, reloj }),
    quitar: new QuitarVigenciaFiscalDeEmpresa({ unidadDeTrabajo, repositorio, cambios, acceso, auditoria }),
  };
}

/** Raíz de composición de los datos fiscales: devuelve sus rutas y registra sus escuchas. */
export function rutasDeDatosFiscalesComponidas(compartidas: DependenciasCompartidas) {
  const { unidadDeTrabajo, auditoria } = compartidas;
  const repositorioDeProveedor = new RepositorioDeDatosFiscalesDeProveedorDrizzle();
  const empresa = casosDeUsoDeEmpresa(compartidas);
  escucharLosFormularios(
    empresa.guardar,
    new GuardarDatosFiscalesDeProveedor({ unidadDeTrabajo, repositorio: repositorioDeProveedor, auditoria }),
  );
  return rutasDeDatosFiscales(
    new DatosFiscalesControlador({
      obtenerDeEmpresa: empresa.obtener,
      quitarVigenciaDeEmpresa: empresa.quitar,
      obtenerDeProveedor: new ObtenerDatosFiscalesDeProveedor({ unidadDeTrabajo, repositorio: repositorioDeProveedor }),
    }),
  );
}
