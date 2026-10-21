import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { PublicadorEventosTrasConfirmar } from '../../core/compartido/infraestructura/publicador-eventos-tras-confirmar.js';
import { AnularPorAviso } from '../aplicacion/casos-uso/bajas/anular-por-aviso.js';
import { EliminarPorAviso } from '../aplicacion/casos-uso/bajas/eliminar-por-aviso.js';
import { RecibirDocumento } from '../aplicacion/casos-uso/recibir-documento.js';
import { REGLAS_PARA_ANULAR, REGLAS_PARA_ELIMINAR } from '../dominio/reglas-de-baja.js';
import { ConsultasDeCargosDrizzle } from '../infraestructura/persistencia/consultas-de-cargos.drizzle.js';
import { CondicionesDeProveedoresDrizzle } from '../infraestructura/persistencia/condiciones-de-proveedores.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { PlazoPorOmisionEnConfiguracion } from '../infraestructura/plazo-por-omision-en-configuracion.js';
import { atenderOrdenesDeDocumentos } from './ordenes-de-documentos.js';

/**
 * Raíz de composición de los documentos por pagar: el único lugar donde se eligen las implementaciones concretas.
 * Registra en el mediador lo que el módulo atiende y escucha (los avisos de baja corren con la transacción de Libro de
 * compras, así que su evento espera a que esa transacción se confirme); las rutas propias llegan con los pasos de consulta y autorización.
 */
export function rutasDeDocumentosComponidas(): FastifyPluginAsync {
  const compartidas = dependenciasCompartidas();
  const aplicaciones = new RepositorioDeAplicacionesDrizzle();
  const documentos = new RepositorioDeDocumentosDrizzle(aplicaciones);
  const { unidadDeTrabajo, auditoria } = compartidas;
  const bajas = { unidadDeTrabajo, documentos, aplicaciones, auditoria };
  const publicadorEventos = new PublicadorEventosTrasConfirmar(compartidas.publicadorEventos);
  const cargos = new ConsultasDeCargosDrizzle();
  const condiciones = new CondicionesDeProveedoresDrizzle();
  const plazo = new PlazoPorOmisionEnConfiguracion();
  atenderOrdenesDeDocumentos({
    recibir: new RecibirDocumento({ ...bajas, cargos, condiciones, plazo }),
    anularPorAviso: new AnularPorAviso({ ...bajas, publicadorEventos, reglas: REGLAS_PARA_ANULAR }),
    eliminarPorAviso: new EliminarPorAviso({ ...bajas, reglas: REGLAS_PARA_ELIMINAR }),
  });
  return async () => {};
}
