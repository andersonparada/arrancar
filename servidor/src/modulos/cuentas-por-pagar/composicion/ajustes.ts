import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { AjustarSaldo } from '../aplicacion/casos-uso/ajustes/ajustar-saldo.js';
import { AnularAjuste } from '../aplicacion/casos-uso/ajustes/anular-ajuste.js';
import { AjustesControlador } from '../http/ajustes.controlador.js';
import { rutasDeAjustes } from '../http/ajustes.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { FechasDeEntradaDrizzle } from '../infraestructura/persistencia/fechas-de-entrada.drizzle.js';
import { RepositorioDeAjustesDrizzle } from '../infraestructura/persistencia/repositorio-de-ajustes.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { TopeDeDiferenciaEnConfiguracion } from '../infraestructura/tope-de-diferencia-en-configuracion.js';

/** Raíz de composición de los ajustes del saldo libre de las notas de crédito: ajustar y anular el ajuste. */
export function rutasDeAjustesComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj, auditoria, publicadorEventos } = dependenciasCompartidas();
  const dependencias = {
    unidadDeTrabajo,
    reloj,
    auditoria,
    publicadorEventos,
    documentos: new RepositorioDeDocumentosDrizzle(new RepositorioDeAplicacionesDrizzle()),
    consultas: new ConsultasDeDocumentosDrizzle(),
    ajustes: new RepositorioDeAjustesDrizzle(),
    cargaInicial: new CargaInicialEnMediador(),
    fechasDeEntrada: new FechasDeEntradaDrizzle(),
    topeDeDiferencia: new TopeDeDiferenciaEnConfiguracion(),
  };
  return rutasDeAjustes(
    new AjustesControlador({ ajustar: new AjustarSaldo(dependencias), anular: new AnularAjuste(dependencias) }),
  );
}
