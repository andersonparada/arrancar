import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import '../../core/contratos/cuentas-por-pagar.contratos.js';
import { busEventos } from '../../core/eventos/bus-eventos.js';
import { ArmadorDelAviso } from '../aplicacion/casos-uso/avisos-de-pago/armador-del-aviso.js';
import { AvisarPagoRegistrado } from '../aplicacion/casos-uso/avisos-de-pago/avisar-pago-registrado.js';
import { CancelarAvisoDePago } from '../aplicacion/casos-uso/avisos-de-pago/cancelar-aviso-de-pago.js';
import { CancelarAvisosDePagoAnulado } from '../aplicacion/casos-uso/avisos-de-pago/cancelar-avisos-de-pago-anulado.js';
import { EnviarAvisoDePago } from '../aplicacion/casos-uso/avisos-de-pago/enviar-aviso-de-pago.js';
import { PrepararAvisoDePago } from '../aplicacion/casos-uso/avisos-de-pago/preparar-aviso-de-pago.js';
import { ObtenerComprobanteDePago } from '../aplicacion/casos-uso/pagos/consultas-de-la-ficha-de-pagos.js';
import { GuardarAjustesDelAviso } from '../aplicacion/casos-uso/avisos-de-pago/guardar-ajustes-del-aviso.js';
import { ObtenerAjustesDelAviso } from '../aplicacion/casos-uso/avisos-de-pago/obtener-ajustes-del-aviso.js';
import { AjustesDelAvisoControlador } from '../http/ajustes-del-aviso.controlador.js';
import { rutasDeAjustesDelAviso } from '../http/ajustes-del-aviso.rutas.js';
import { AvisosDePagoControlador } from '../http/avisos-de-pago.controlador.js';
import { rutasDeAvisosDePago } from '../http/avisos-de-pago.rutas.js';
import { ConfiguracionDelAvisoEnConfiguracion } from '../infraestructura/configuracion-del-aviso-en-configuracion.js';
import { CorreosDelProveedorEnMediador } from '../infraestructura/correos-del-proveedor-en-mediador.js';
import { DatosDeLaEmpresaEnMediador } from '../infraestructura/datos-de-empresa-en-mediador.js';
import { OperadorDelUsuarioEnIdentidad } from '../infraestructura/operador-del-usuario-en-identidad.js';
import { GeneradorPdfkitDelComprobante } from '../infraestructura/pdf/generador-pdfkit-del-comprobante.js';
import { EmpresaDelAvisoDrizzle } from '../infraestructura/persistencia/empresa-del-aviso.drizzle.js';
import { armadorDeLaFicha } from './consulta-de-pagos.js';

function piezas() {
  const { unidadDeTrabajo, bandeja } = dependenciasCompartidas();
  const comprobantes = new ObtenerComprobanteDePago({
    unidadDeTrabajo,
    armador: armadorDeLaFicha(),
    empresa: new DatosDeLaEmpresaEnMediador(),
  });
  const armador = new ArmadorDelAviso({
    comprobantes,
    correos: new CorreosDelProveedorEnMediador(),
    empresa: new EmpresaDelAvisoDrizzle(),
    configuracion: new ConfiguracionDelAvisoEnConfiguracion(),
    generador: new GeneradorPdfkitDelComprobante(),
  });
  return { unidadDeTrabajo, bandeja, armador };
}

/**
 * Los suscriptores de los eventos de pagos: si la empresa configuró el envío automático, avisan al registrar el pago, y
 * al anularlo cancelan los avisos pendientes. Siempre «sin romper»: un fallo se registra y el pago ya confirmado sigue.
 */
function suscribirEventos({ unidadDeTrabajo, bandeja, armador }: ReturnType<typeof piezas>): void {
  const operadores = new OperadorDelUsuarioEnIdentidad();
  const configuracion = new ConfiguracionDelAvisoEnConfiguracion();
  const avisar = new AvisarPagoRegistrado({ unidadDeTrabajo, armador, bandeja, configuracion, operadores });
  const cancelar = new CancelarAvisosDePagoAnulado({ unidadDeTrabajo, bandeja, operadores });
  busEventos.suscribirSinRomper(
    'cuentas-por-pagar.pago_registrado',
    async (pago) => void (await avisar.ejecutar(pago)),
    'aviso de pago al registrar el pago',
  );
  busEventos.suscribirSinRomper(
    'cuentas-por-pagar.pago_anulado',
    async (pago) => void (await cancelar.ejecutar(pago)),
    'cancelar los avisos pendientes de un pago anulado',
  );
}

/** Raíz de composición del aviso de pago por correo: sus rutas y los suscriptores de los eventos de pagos. */
export function rutasDeAvisosDePagoComponidas(): FastifyPluginAsync {
  const compuestas = piezas();
  suscribirEventos(compuestas);
  const { unidadDeTrabajo, bandeja, armador } = compuestas;
  const rutasDelAviso = rutasDeAvisosDePago(
    new AvisosDePagoControlador({
      preparar: new PrepararAvisoDePago({ unidadDeTrabajo, armador, bandeja }),
      enviar: new EnviarAvisoDePago({ unidadDeTrabajo, armador, bandeja }),
      cancelar: new CancelarAvisoDePago({ unidadDeTrabajo, bandeja }),
    }),
  );
  const rutasDeAjustes = rutasDeAjustesDelAviso(controladorDeAjustes(unidadDeTrabajo));
  return async (app) => {
    await app.register(rutasDelAviso);
    await app.register(rutasDeAjustes);
  };
}

function controladorDeAjustes(unidadDeTrabajo: ReturnType<typeof piezas>['unidadDeTrabajo']) {
  const configuracion = new ConfiguracionDelAvisoEnConfiguracion();
  return new AjustesDelAvisoControlador({
    obtener: new ObtenerAjustesDelAviso({ unidadDeTrabajo, configuracion }),
    guardar: new GuardarAjustesDelAviso({
      unidadDeTrabajo,
      auditoria: dependenciasCompartidas().auditoria,
      configuracion,
      guardador: configuracion,
    }),
  });
}
