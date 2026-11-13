import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AplicarNota } from '../aplicacion/casos-uso/aplicaciones/aplicar-nota.js';
import { ListarCargosParaAplicar } from '../aplicacion/casos-uso/aplicaciones/listar-cargos-para-aplicar.js';
import { QuitarAplicacion } from '../aplicacion/casos-uso/aplicaciones/quitar-aplicacion.js';
import { AplicacionesControlador, type CasosDeUsoDeAplicaciones } from '../http/aplicaciones.controlador.js';
import { rutasDeAplicaciones } from '../http/aplicaciones.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { FechasDeEntradaDrizzle } from '../infraestructura/persistencia/fechas-de-entrada.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { TopeDeDiferenciaEnConfiguracion } from '../infraestructura/tope-de-diferencia-en-configuracion.js';
import { UmbralDeBancarizacionEnConfiguracion } from '../infraestructura/umbral-de-bancarizacion-en-configuracion.js';

/** Raíz de composición de las aplicaciones manuales de notas de crédito: cargos para aplicar, aplicar y quitar. */
export function rutasDeAplicacionesComponidas(): FastifyPluginAsync {
  return rutasDeAplicaciones(new AplicacionesControlador(casosDeUso()));
}

function casosDeUso(): CasosDeUsoDeAplicaciones {
  const { unidadDeTrabajo, reloj, auditoria } = dependenciasCompartidas();
  const aplicaciones = new RepositorioDeAplicacionesDrizzle();
  const comunes = {
    unidadDeTrabajo,
    consultas: new ConsultasDeDocumentosDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
    fechasDeEntrada: new FechasDeEntradaDrizzle(),
    topeDeDiferencia: new TopeDeDiferenciaEnConfiguracion(),
  };
  const documentos = new RepositorioDeDocumentosDrizzle(aplicaciones);
  return {
    listarCargos: new ListarCargosParaAplicar({ ...comunes, umbral: new UmbralDeBancarizacionEnConfiguracion() }),
    aplicar: new AplicarNota({ ...comunes, documentos, aplicaciones, reloj }),
    quitar: new QuitarAplicacion({ ...comunes, documentos, aplicaciones, auditoria }),
  };
}
