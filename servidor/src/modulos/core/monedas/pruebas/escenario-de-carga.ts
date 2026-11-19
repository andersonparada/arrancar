import { esDiaDePublicacionDeCruces, fechasDelRango, sumarDiasAFecha } from '../dominio/fechas-de-publicacion.js';
import type { PublicacionDeTipoDeCambio } from '../dominio/publicacion.js';
import { ActualizarMonedasDelBanguat } from '../aplicacion/casos-uso/actualizar-monedas-del-banguat.js';
import { CargarTiposDeCambio, type RelojDeCarga } from '../aplicacion/casos-uso/cargar-tipos-de-cambio.js';
import { ConsultarAlBanguat } from '../aplicacion/casos-uso/consultar-al-banguat.js';
import { VueltasDeCarga } from '../aplicacion/casos-uso/vueltas-de-carga.js';
import { FuenteConReintentos } from '../aplicacion/fuente-con-reintentos.js';
import { FuenteNoDisponible } from '../dominio/errores.js';
import { CargasDeTiposEnMemoria, CerrojoDeCargaEnMemoria } from './cargas-de-tipos-en-memoria.js';
import { FuenteDeTiposDeCambioEnMemoria } from './fuente-de-tipos-de-cambio-en-memoria.js';

/** Miércoles 18 de noviembre de 2026; el sábado es el 21. Guatemala es UTC-6 todo el año. */
export class RelojDePrueba implements RelojDeCarga {
  instante = new Date('2026-11-18T06:00:00-06:00');
  ir(hora: string, dia = '18'): void {
    this.instante = new Date(`2026-11-${dia}T${hora}:00-06:00`);
  }
  ahora = () => this.instante;
  zona = async () => 'America/Guatemala';
}

/** Lo que publica el Banguat: el dólar en quetzales; las demás, el cruce en su convención (compra = venta). */
export const publicacion = (moneda: string, fecha: string, referencia: string): PublicacionDeTipoDeCambio => ({
  moneda,
  codigoBanguat: moneda === 'USD' ? 2 : 24,
  fecha,
  referencia,
  ...(moneda === 'USD' ? {} : { compra: referencia, venta: referencia }),
});

/** Deja los 45 días anteriores a `hoy` completos (el dólar todos, las demás los hábiles) para que el relleno no pida nada. */
export function completar(cargas: CargasDeTiposEnMemoria, hoy: string): void {
  for (const fecha of fechasDelRango(sumarDiasAFecha(hoy, -46), sumarDiasAFecha(hoy, -1))) {
    if (!cargas.tipos.some((t) => t.moneda === 'USD' && t.fecha === fecha)) cargas.poner('USD', fecha, '7.70');
    const yaEsta = cargas.tipos.some((t) => t.moneda === 'EUR' && t.fecha === fecha);
    if (!yaEsta && esDiaDePublicacionDeCruces(fecha)) cargas.poner('EUR', fecha, '9.00');
  }
}

export function armar() {
  const cargas = new CargasDeTiposEnMemoria();
  const fuente = new FuenteDeTiposDeCambioEnMemoria();
  const reloj = new RelojDePrueba();
  const cerrojo = new CerrojoDeCargaEnMemoria();
  const esperar = async () => {};
  const guardados = { veces: 0 };
  const ahora = () => reloj.ahora();
  const fuentes = { dolar: new FuenteConReintentos(fuente, { esperar }), demas: fuente };
  const consultar = new ConsultarAlBanguat({ fuentes, cargas, ahora });
  const lista = new ActualizarMonedasDelBanguat({ fuente, cargas, cerrojo, ahora });
  const vueltas = new VueltasDeCarga({ consultar, cargas, esperar, alFallar: () => {} });
  const alGuardar = () => void guardados.veces++;
  const carga = new CargarTiposDeCambio({ cerrojo, cargas, vueltas, lista, reloj, alGuardar });
  return { carga, cargas, fuente, reloj, cerrojo, guardados, lista };
}

export const fallo = () => new FuenteNoDisponible('El Banguat no respondió.');
