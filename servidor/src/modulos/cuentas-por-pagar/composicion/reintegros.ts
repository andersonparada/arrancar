import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/bancos.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AnularReintegro } from '../aplicacion/casos-uso/reintegros/anular-reintegro.js';
import { AtenderReintegroPorCambiar } from '../aplicacion/casos-uso/reintegros/atender-reintegro-por-cambiar.js';
import { ObtenerReintegro, ReciboDeReintegro } from '../aplicacion/casos-uso/reintegros/consultas-de-reintegros.js';
import type { DependenciasDeReintegros } from '../aplicacion/casos-uso/reintegros/dependencias-de-reintegros.js';
import { RegistrarReintegro } from '../aplicacion/casos-uso/reintegros/registrar-reintegro.js';
import { ReintegrosControlador } from '../http/reintegros.controlador.js';
import { rutasDeReintegros } from '../http/reintegros.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { DatosDeLaEmpresaEnMediador } from '../infraestructura/datos-de-empresa-en-mediador.js';
import { PagosEnBancosEnMediador } from '../infraestructura/pagos-en-bancos-en-mediador.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ConsultasDeReintegrosDrizzle } from '../infraestructura/persistencia/consultas-de-reintegros.drizzle.js';
import { FechasDeEntradaDrizzle } from '../infraestructura/persistencia/fechas-de-entrada.drizzle.js';
import { NombreDelNitDrizzle } from '../infraestructura/persistencia/lecturas-del-libro.drizzle.js';
import { MovimientosDePagosDrizzle } from '../infraestructura/persistencia/movimientos-de-pagos.drizzle.js';
import { RepositorioDeAplicacionesDrizzle } from '../infraestructura/persistencia/repositorio-de-aplicaciones.drizzle.js';
import { RepositorioDeDocumentosDrizzle } from '../infraestructura/persistencia/repositorio-de-documentos.drizzle.js';
import { RepositorioDeReintegrosDrizzle } from '../infraestructura/persistencia/repositorio-de-reintegros.drizzle.js';

/**
 * Raíz de composición de los reintegros del proveedor: registrar (depósito o efectivo), ver, el recibo y anular. También
 * atiende el aviso de Bancos antes de cambiar la nota de crédito de un depósito.
 */
export function rutasDeReintegrosComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeReintegros();
  const atender = new AtenderReintegroPorCambiar(dependencias);
  mediador.escuchar('cuentas-por-pagar', 'bancos.movimiento_por_cambiar', (aviso, operador) =>
    atender.ejecutar(operador, aviso),
  );
  return rutasDeReintegros(
    new ReintegrosControlador({
      registrar: new RegistrarReintegro(dependencias),
      obtener: new ObtenerReintegro(dependencias),
      recibo: new ReciboDeReintegro(dependencias),
      anular: new AnularReintegro(dependencias),
    }),
  );
}

function dependenciasDeReintegros(): DependenciasDeReintegros {
  const { unidadDeTrabajo, reloj, correlativos, auditoria, publicadorEventos } = dependenciasCompartidas();
  const movimientos = new MovimientosDePagosDrizzle();
  return {
    unidadDeTrabajo,
    documentos: new RepositorioDeDocumentosDrizzle(new RepositorioDeAplicacionesDrizzle()),
    consultas: new ConsultasDeDocumentosDrizzle(),
    reintegros: new RepositorioDeReintegrosDrizzle(),
    lecturas: new ConsultasDeReintegrosDrizzle(),
    empresa: new DatosDeLaEmpresaEnMediador(),
    nombreDelNit: new NombreDelNitDrizzle(),
    bancos: new PagosEnBancosEnMediador(movimientos),
    movimientos,
    cargaInicial: new CargaInicialEnMediador(),
    fechasDeEntrada: new FechasDeEntradaDrizzle(),
    correlativos,
    auditoria,
    publicadorEventos,
    reloj,
  };
}
