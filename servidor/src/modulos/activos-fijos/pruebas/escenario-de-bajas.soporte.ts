import { AbrirActaDeBaja } from '../aplicacion/casos-uso/bajas/abrir-acta-de-baja.js';
import { AbrirDenunciaDeBaja } from '../aplicacion/casos-uso/bajas/abrir-denuncia-de-baja.js';
import { AbridorDeDocumentosDeBaja } from '../aplicacion/casos-uso/bajas/abrir-documento-de-baja.js';
import { AdjuntadorDeDocumentos } from '../aplicacion/casos-uso/bajas/adjuntar-documento-de-baja.js';
import { AnularBaja } from '../aplicacion/casos-uso/bajas/anular-baja.js';
import { DarDeBaja } from '../aplicacion/casos-uso/bajas/dar-de-baja.js';
import { RegistrarVenta } from '../aplicacion/casos-uso/bajas/registrar-venta.js';
import { RegistradorDeBajas } from '../aplicacion/casos-uso/bajas/registrador-de-bajas.js';
import { SubirActaDeBaja } from '../aplicacion/casos-uso/bajas/subir-acta-de-baja.js';
import { SubirDenunciaDeBaja } from '../aplicacion/casos-uso/bajas/subir-denuncia-de-baja.js';
import type { SolicitudDeBaja } from '../aplicacion/dto/baja.dto.js';
import type { Activo } from '../dominio/activo.js';
import type { IncisoFiscal } from '../dominio/incisos-fiscales.js';
import { BajasEnMemoria } from './dobles-de-bajas.js';
import { DocumentosDePrueba } from './dobles-de-boleta-firmada.js';
import { HistorialEnMemoria } from './dobles-de-mejoras.js';
import { armarUso, operador, uso } from './escenario-de-uso.soporte.js';

export { operador };

/** Una destrucción del 10 de junio de 2027; `cambios` la ajusta. */
export const solicitudDeBaja = (activo: Activo, cambios: Partial<SolicitudDeBaja> = {}): SolicitudDeBaja => ({
  activoId: activo.id.valor,
  fecha: '2027-06-10',
  causa: 'destruccion',
  descripcion: 'Quedó inservible tras el incendio',
  autorizadaPor: 'Gerencia',
  destinoDelBien: null,
  numeroDeDenuncia: null,
  inventarioId: null,
  venta: null,
  ...cambios,
});

/** Una venta de Q100,000.00 con IVA de Q12,000.00 el 10 de junio de 2027; `cambios` la ajusta. */
export const solicitudDeVenta = (activo: Activo, cambios: Partial<SolicitudDeBaja> = {}): SolicitudDeBaja =>
  solicitudDeBaja(activo, {
    causa: 'venta',
    descripcion: 'Venta del vehículo usado',
    venta: {
      comprador: 'Transportes del Norte, S. A.',
      nitDelComprador: 'CF',
      precio: '100000.00',
      iva: '12000.00',
      serieFel: 'A1B2',
      numeroFel: '98765',
      autorizacionFel: '3f2b6c1a-8d4e-4b7a-9c01-5e6f7a8b9c0d',
    },
    ...cambios,
  });

interface OpcionesDeActivoEnUso {
  inciso?: IncisoFiscal;
  monto?: string;
  porcentaje?: string;
  datos?: Parameters<ReturnType<typeof armarUso>['activoConCosto']>[2];
}

/** Las bajas y ventas con todo en memoria, sobre activos puestos en uso desde el 10 de marzo de 2027. */
export function armarBajas() {
  const base = armarUso();
  const bajas = new BajasEnMemoria(base.activos);
  const historial = new HistorialEnMemoria();
  const documentos = new DocumentosDePrueba();
  const dependencias = {
    ...base.dependencias,
    consultas: base.activos,
    historial,
    documentos,
    bajas,
    consultasDeBajas: bajas,
  };
  const registrador = new RegistradorDeBajas(dependencias);
  const adjuntador = new AdjuntadorDeDocumentos(dependencias);
  const abridor = new AbridorDeDocumentosDeBaja(dependencias);
  const anular = new AnularBaja(dependencias);

  /** Un activo en uso desde el 10 de marzo de 2027 con Q250,000.00 de costo (el pick-up del §7.5). */
  const activoEnUso = async (opciones: OpcionesDeActivoEnUso = {}) => {
    const { inciso = 'maquinaria_y_vehiculos', monto = '250000.00', porcentaje = '20.00', datos = {} } = opciones;
    const activo = await base.activoConCosto(await base.claseDe(inciso, porcentaje), monto, datos);
    await base.poner(activo, uso());
    return activo;
  };

  return {
    ...base,
    bajas,
    historial,
    documentos,
    activoEnUso,
    darDeBaja: (solicitud: SolicitudDeBaja) => new DarDeBaja(registrador).ejecutar(operador, solicitud),
    vender: (solicitud: SolicitudDeBaja) => new RegistrarVenta(registrador).ejecutar(operador, solicitud),
    anular: (bajaId: string, motivo = 'Se registró por error') => anular.ejecutar(operador, { bajaId, motivo }),
    subirActa: (bajaId: string, tipoDeActa: 'administrativa' | 'notarial' = 'administrativa') =>
      new SubirActaDeBaja(adjuntador).ejecutar(operador, {
        bajaId,
        contenido: Buffer.from('acta'),
        nombre: null,
        tipoDeActa,
      }),
    subirDenuncia: (bajaId: string) =>
      new SubirDenunciaDeBaja(adjuntador).ejecutar(operador, {
        bajaId,
        contenido: Buffer.from('denuncia'),
        nombre: null,
      }),
    abrirActa: (bajaId: string) => new AbrirActaDeBaja(abridor).ejecutar(operador, bajaId),
    abrirDenuncia: (bajaId: string) => new AbrirDenunciaDeBaja(abridor).ejecutar(operador, bajaId),
    estadoDe: (activo: Activo) => base.activos.registros.get(activo.id.valor)!.instantanea(),
  };
}

export type EscenarioDeBajas = ReturnType<typeof armarBajas>;
