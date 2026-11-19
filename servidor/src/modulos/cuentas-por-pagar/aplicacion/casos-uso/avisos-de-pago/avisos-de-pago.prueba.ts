import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BandejaDeSalida, MensajePorEncolar } from '../../../../core/correo/aplicacion/bandeja-de-salida.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { comprobanteDePrueba } from '../../../pruebas/comprobante-de-prueba.js';
import type { AjustesDelAviso } from '../../puertos/puertos-de-avisos-de-pago.js';
import { AvisoNoDisponible } from '../../errores-de-avisos.js';
import { ArmadorDelAviso } from './armador-del-aviso.js';
import { AvisarPagoRegistrado } from './avisar-pago-registrado.js';
import { CancelarAvisosDePagoAnulado } from './cancelar-avisos-de-pago-anulado.js';
import { EnviarAvisoDePago } from './enviar-aviso-de-pago.js';

const AJUSTES: AjustesDelAviso = {
  envio: 'automatico',
  asunto: 'Aviso de pago {numero} – {empresa}',
  mensaje: 'Pagamos {monto} con {forma}: {documentos}. {fecha_de_cobro}',
  adjuntarComprobante: true,
  copiaALaEmpresa: true,
};
const PDF = Buffer.from('%PDF-1.7 prueba');
const PAGO = { empresaId: 'e-1', cuentaId: 'c-1', usuarioId: 'u-1', pagoId: 'pago-1' };

let operador: Operador;
let ajustes: AjustesDelAviso;
let correosDelProveedor: Parameters<typeof armar>[0];
let encolados: MensajePorEncolar[];
let bandeja: BandejaDeSalida;

function armar(
  proveedor: {
    terceroId: string;
    nombre: string;
    correo: string | null;
    contactos: Array<{ id: string; nombre: string; correo: string | null; recibeAvisosDePago: boolean }>;
  },
  comprobante = comprobanteDePrueba(),
  correoDeLaEmpresa: string | null = 'pagos@rancho.com',
) {
  return new ArmadorDelAviso({
    comprobantes: { ejecutar: async () => comprobante },
    correos: { obtener: async () => proveedor },
    empresa: { obtener: async () => ({ nombre: 'Rancho Ñandú', correo: correoDeLaEmpresa }) },
    configuracion: { de: async () => ajustes },
    generador: { generar: async () => PDF },
  });
}

beforeEach(() => {
  operador = operadorDePrueba();
  ajustes = { ...AJUSTES };
  encolados = [];
  correosDelProveedor = {
    terceroId: 't-1',
    nombre: 'Agroservicios',
    correo: 'ventas@agro.com',
    contactos: [{ id: 'c-1', nombre: 'Ana', correo: 'ana@agro.com', recibeAvisosDePago: true }],
  };
  bandeja = {
    encolar: async (_operador, mensaje) => {
      encolados.push(mensaje);
      return { id: 'correo-1', estado: 'pendiente', asunto: '', destinatarios: [] };
    },
    cancelarPendientesDe: vi.fn(async () => 2),
    cancelar: vi.fn(),
    deRegistro: async () => [],
  };
});

describe('ArmadorDelAviso', () => {
  it('arma el mensaje con la plantilla, los valores del pago, el PDF y la copia a la empresa', async () => {
    const armador = armar(correosDelProveedor);
    const preparado = await armador.preparar(operador, 'pago-1');

    const mensaje = await armador.mensaje(operador, preparado, {
      destinatarios: preparado.posibles.filter((p) => p.preseleccionado),
      conCopia: true,
    });

    expect(mensaje.tipo).toBe('cuentas-por-pagar.aviso_de_pago');
    expect(mensaje.origen).toEqual({ recurso: 'cuentas-por-pagar.pagos', registroId: 'pago-1' });
    expect(mensaje.responderA).toBe('pagos@rancho.com');
    expect(mensaje.destinatarios.map((d) => [d.direccion, d.clase, d.origen])).toEqual([
      ['ana@agro.com', 'para', 'contacto'],
      ['pagos@rancho.com', 'copia', 'empresa'],
    ]);
    expect(mensaje.plantilla.valores).toMatchObject({
      numero: '2026-15',
      forma: 'cheque',
      monto: 'Q1,000.00',
      documentos: 'A-123',
      fecha_de_cobro: '',
      empresa: 'Rancho Ñandú',
      adjunto: 'Adjuntamos el comprobante del pago. ',
    });
    expect(mensaje.adjunto).toEqual({ nombre: 'comprobante-de-pago-2026-15.pdf', contenido: PDF });
  });

  it('sin adjuntar el comprobante o sin copia, no los lleva; sin correo de la empresa no hay copia ni «Responder a»', async () => {
    ajustes.adjuntarComprobante = false;
    const armador = armar(correosDelProveedor, comprobanteDePrueba(), null);
    const preparado = await armador.preparar(operador, 'pago-1');

    const mensaje = await armador.mensaje(operador, preparado, {
      destinatarios: [preparado.posibles[0]!],
      conCopia: true,
    });

    expect(mensaje.adjunto).toBeNull();
    expect(mensaje.plantilla.valores.adjunto).toBe('');
    expect(mensaje.responderA).toBeNull();
    expect(mensaje.destinatarios.map((d) => d.clase)).toEqual(['para']);
  });

  it('un cheque posfechado trae la fecha de cobro', async () => {
    const base = comprobanteDePrueba();
    const armador = armar(
      correosDelProveedor,
      comprobanteDePrueba({ pago: { ...base.pago, posfechado: true, fecha: '2026-12-20' } }),
    );

    const { valores } = await armador.preparar(operador, 'pago-1');

    expect(valores.fecha_de_cobro).toBe('20/12/2026');
  });
});

describe('EnviarAvisoDePago', () => {
  const enviarCon = (armador: ArmadorDelAviso) =>
    new EnviarAvisoDePago({ unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(), armador, bandeja });

  it('un pago anulado no se avisa', async () => {
    const base = comprobanteDePrueba();
    const armador = armar(correosDelProveedor, comprobanteDePrueba({ pago: { ...base.pago, estado: 'anulado' } }));

    await expect(
      enviarCon(armador).ejecutar(operador, 'pago-1', {
        destinatarios: [{ origen: 'contacto', origenId: 'c-1' }],
        copiaALaEmpresa: false,
      }),
    ).rejects.toBeInstanceOf(AvisoNoDisponible);
    expect(encolados).toHaveLength(0);
  });
});

describe('AvisarPagoRegistrado', () => {
  const avisarCon = (armador: ArmadorDelAviso, operadorEncontrado: Operador | null = operador) =>
    new AvisarPagoRegistrado({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      armador,
      bandeja,
      configuracion: { de: async () => ajustes },
      operadores: { de: async () => operadorEncontrado },
    });

  it('con envío automático encola el aviso a los preseleccionados', async () => {
    const encolo = await avisarCon(armar(correosDelProveedor)).ejecutar(PAGO);

    expect(encolo).toBe(true);
    expect(encolados[0]?.destinatarios.map((d) => d.direccion)).toEqual(['ana@agro.com', 'pagos@rancho.com']);
  });

  it('con envío manual no hace nada', async () => {
    ajustes.envio = 'manual';

    expect(await avisarCon(armar(correosDelProveedor)).ejecutar(PAGO)).toBe(false);
    expect(encolados).toHaveLength(0);
  });

  it('sin destinatario utilizable no encola nada', async () => {
    const vacio = { ...correosDelProveedor, correo: null, contactos: [] };

    expect(await avisarCon(armar(vacio)).ejecutar(PAGO)).toBe(false);
    expect(encolados).toHaveLength(0);
  });

  it('si el usuario ya no puede trabajar en la empresa, no avisa', async () => {
    expect(await avisarCon(armar(correosDelProveedor), null).ejecutar(PAGO)).toBe(false);
  });

  it('un pago anulado o de la cuenta de apertura no se avisa', async () => {
    const base = comprobanteDePrueba();
    const apertura = comprobanteDePrueba({ pago: { ...base.pago, forma: 'cuenta_de_apertura' } });

    expect(await avisarCon(armar(correosDelProveedor, apertura)).ejecutar(PAGO)).toBe(false);
  });
});

describe('CancelarAvisosDePagoAnulado', () => {
  it('cancela los pendientes del pago con el motivo «Pago anulado»', async () => {
    const caso = new CancelarAvisosDePagoAnulado({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      bandeja,
      operadores: { de: async () => operador },
    });

    const cuantos = await caso.ejecutar(PAGO);

    expect(cuantos).toBe(2);
    expect(bandeja.cancelarPendientesDe).toHaveBeenCalledWith(
      operador,
      { recurso: 'cuentas-por-pagar.pagos', registroId: 'pago-1' },
      'Pago anulado',
    );
  });
});
