import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/cuentas-por-pagar.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import {
  ListarPagos,
  ObtenerComprobanteDePago,
  ObtenerPago,
} from '../aplicacion/casos-uso/pagos/consultas-de-la-ficha-de-pagos.js';
import { DetalleParaComprobanteDeEgreso } from '../aplicacion/casos-uso/pagos/detalle-para-comprobante-de-egreso.js';
import { ArmadorDeLaFichaDelPago } from '../aplicacion/casos-uso/pagos/ficha-del-pago.js';
import { REGLAS_PARA_ANULAR_PAGO, REGLAS_PARA_REAPLICAR_PAGO } from '../dominio/reglas-de-anulacion-de-pagos.js';
import { ConsultaDePagosControlador } from '../http/consulta-de-pagos.controlador.js';
import { rutasDeConsultaDePagos } from '../http/consulta-de-pagos.rutas.js';
import { DatosDeLaEmpresaEnMediador } from '../infraestructura/datos-de-empresa-en-mediador.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ConsultasDePagosDrizzle } from '../infraestructura/persistencia/consultas-de-pagos.drizzle.js';
import { ExtrasDeLosPagosDrizzle } from '../infraestructura/persistencia/extras-de-los-pagos.drizzle.js';
import { RetencionesDelLibroDrizzle } from '../infraestructura/persistencia/lecturas-del-libro.drizzle.js';
import { ListaDePagosDrizzle } from '../infraestructura/persistencia/lista-de-pagos.drizzle.js';
import { MovimientosDePagosDrizzle } from '../infraestructura/persistencia/movimientos-de-pagos.drizzle.js';
import { RepositorioDeAjustesDrizzle } from '../infraestructura/persistencia/repositorio-de-ajustes.drizzle.js';
import { RepositorioDePagosDrizzle } from '../infraestructura/persistencia/repositorio-de-pagos.drizzle.js';
import { TopeDeDiferenciaDelPagoEnConfiguracion } from '../infraestructura/tope-de-diferencia-del-pago-en-configuracion.js';

export function armadorDeLaFicha(): ArmadorDeLaFichaDelPago {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  return new ArmadorDeLaFichaDelPago({
    unidadDeTrabajo,
    reloj,
    pagos: new RepositorioDePagosDrizzle(),
    consultas: new ConsultasDeDocumentosDrizzle(),
    consultasDePagos: new ConsultasDePagosDrizzle(),
    movimientos: new MovimientosDePagosDrizzle(),
    ajustes: new RepositorioDeAjustesDrizzle(),
    retenciones: new RetencionesDelLibroDrizzle(),
    extras: new ExtrasDeLosPagosDrizzle(),
    topeDeDiferencia: new TopeDeDiferenciaDelPagoEnConfiguracion(),
    reglasParaAnular: REGLAS_PARA_ANULAR_PAGO,
    reglasParaReaplicar: REGLAS_PARA_REAPLICAR_PAGO,
  });
}

/** Raíz de composición de la lista, la ficha y el comprobante de los pagos (solo lectura). */
export function rutasDeConsultaDePagosComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const armador = armadorDeLaFicha();
  const empresa = new DatosDeLaEmpresaEnMediador();
  const detalle = new DetalleParaComprobanteDeEgreso({ pagos: new RepositorioDePagosDrizzle(), armador });
  mediador.atender('cuentas-por-pagar', 'cuentas-por-pagar.detalle_para_comprobante_de_egreso', (datos, operador) =>
    detalle.ejecutar(operador, datos),
  );
  return rutasDeConsultaDePagos(
    new ConsultaDePagosControlador({
      listar: new ListarPagos({ unidadDeTrabajo, reloj, lista: new ListaDePagosDrizzle() }),
      obtener: new ObtenerPago({ unidadDeTrabajo, armador }),
      comprobante: new ObtenerComprobanteDePago({ unidadDeTrabajo, armador, empresa }),
    }),
  );
}
