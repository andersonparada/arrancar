import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { MediosParaElegir } from '../../servicios/opciones.api';

export type FormaDeMedio = 'cheque' | 'nota_de_debito';

const porTexto = (a: { texto: string }, b: { texto: string }): number =>
  a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

/** Cada chequera activa con su siguiente cheque, por nombre de cuenta; sin cheques disponibles se ve apagada. */
export function opcionesDeChequeras(medios: MediosParaElegir | null): OpcionBuscable<string>[] {
  const opciones = (medios?.cuentas ?? []).flatMap((cuenta) =>
    cuenta.chequeras.map((chequera) => {
      const serie = chequera.serie ? ` serie ${chequera.serie}` : '';
      const siguiente =
        chequera.siguienteNumero === null ? 'sin cheques disponibles' : `siguiente cheque ${chequera.siguienteNumero}`;
      return {
        valor: chequera.chequeraId,
        texto: `${cuenta.nombre} · chequera${serie} · ${siguiente} · saldo ${formatearMonto(cuenta.saldo)}`,
        deshabilitada: chequera.siguienteNumero === null,
      };
    }),
  );
  return opciones.sort(porTexto);
}

/** Las cuentas activas por nombre, con su saldo a la fecha para que se vea si alcanza. */
export function opcionesDeCuentas(medios: MediosParaElegir | null): OpcionBuscable<string>[] {
  return (medios?.cuentas ?? [])
    .map((cuenta) => ({
      valor: cuenta.cuentaBancariaId,
      texto: `${cuenta.nombre}${cuenta.bancoNombre ? ` (${cuenta.bancoNombre})` : ''} · saldo ${formatearMonto(cuenta.saldo)}`,
    }))
    .sort(porTexto);
}

/** Las opciones de la forma elegida: la chequera (cheque) o la cuenta (nota de débito). */
export const opcionesDelMedio = (forma: FormaDeMedio, medios: MediosParaElegir | null): OpcionBuscable<string>[] =>
  forma === 'cheque' ? opcionesDeChequeras(medios) : opcionesDeCuentas(medios);

/** El medio si solo hay uno que se pueda usar; si no, hay que escoger. */
export function medioPorOmision(forma: FormaDeMedio, medios: MediosParaElegir | null): string {
  const libres = opcionesDelMedio(forma, medios).filter(({ deshabilitada }) => !deshabilitada);
  return libres.length === 1 ? libres[0]!.valor : '';
}

/** El texto corto del medio elegido (sin el saldo), para el resumen de confirmación. */
export function nombreDelMedio(forma: FormaDeMedio, medios: MediosParaElegir | null, valor: string): string {
  const opcion = opcionesDelMedio(forma, medios).find((candidata) => candidata.valor === valor);
  return opcion?.texto.split(' · saldo ')[0] ?? 'la cuenta elegida';
}

export const OPCIONES_DE_FORMA: { valor: FormaDeMedio; texto: string }[] = [
  { valor: 'cheque', texto: 'Cheque (a nombre del beneficiario)' },
  { valor: 'nota_de_debito', texto: 'Transferencia (nota de débito)' },
];
