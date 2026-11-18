import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CargoParaPagar, FormaDePagoNuevo, MediosDePago, ProveedorPorPagar } from '../../servicios/tipos-de-pagos';
import { textoDeCentavos } from '../dinero';

export const ETIQUETAS_DE_FORMA: Record<FormaDePagoNuevo, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Transferencia o débito',
  nota_ligada: 'Nota ya registrada',
  cuenta_de_apertura: 'Cuenta de apertura',
};

/** El permiso que el servidor pide en la ruta de cada forma. */
export const PERMISO_DE_FORMA: Record<FormaDePagoNuevo, string> = {
  cheque: 'cuentas-por-pagar.pagos.emitir',
  nota_de_debito: 'cuentas-por-pagar.pagos.emitir',
  nota_ligada: 'cuentas-por-pagar.pagos.ligar-notas-de-debito',
  cuenta_de_apertura: 'cuentas-por-pagar.pagos.aplicar-a-apertura',
};

const ORDEN_DE_FORMAS: FormaDePagoNuevo[] = ['cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura'];

/** Las pestañas que el usuario puede usar: por permiso y, la apertura, solo si hay saldos iniciales por pagar. */
export function formasDisponibles(
  puede: (permiso: string) => boolean,
  cargos: readonly CargoParaPagar[],
): FormaDePagoNuevo[] {
  const hayInicial = cargos.some(({ origen }) => origen === 'saldo_inicial');
  return ORDEN_DE_FORMAS.filter(
    (forma) => puede(PERMISO_DE_FORMA[forma]) && (forma !== 'cuenta_de_apertura' || hayInicial),
  );
}

const porTexto = (a: { texto: string }, b: { texto: string }): number =>
  a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

/** Los proveedores con algo por pagar, por nombre (con su NIT y lo que se les debe, para no confundir homónimos). */
export function opcionesDeProveedores(proveedores: readonly ProveedorPorPagar[]): OpcionBuscable<string>[] {
  return proveedores
    .map(({ proveedorId, nombre, nit, porPagar }) => ({
      valor: proveedorId,
      texto: `${nombre}${nit ? ` · NIT ${nit}` : ''} · por pagar ${formatearMonto(porPagar)}`,
    }))
    .sort(porTexto);
}

/** Cada chequera activa con su siguiente cheque; sin cheques disponibles se ve apagada. */
export function opcionesDeChequeras(medios: MediosDePago | null): OpcionBuscable<string>[] {
  const opciones = (medios?.cuentas ?? []).flatMap((cuenta) =>
    cuenta.chequeras.map((chequera) => {
      const siguiente =
        chequera.siguienteNumero === null ? 'sin cheques disponibles' : `siguiente cheque ${chequera.siguienteNumero}`;
      const serie = chequera.serie ? `serie ${chequera.serie}` : 'sin serie';
      return {
        valor: chequera.chequeraId,
        texto: `${cuenta.nombre} · chequera ${serie} · ${siguiente} · saldo ${formatearMonto(textoDeCentavos(cuenta.saldoCentavos))}`,
        deshabilitada: chequera.siguienteNumero === null,
      };
    }),
  );
  return opciones.sort(porTexto);
}

/** Las cuentas activas con su saldo a la fecha. */
export function opcionesDeCuentas(medios: MediosDePago | null): OpcionBuscable<string>[] {
  return (medios?.cuentas ?? [])
    .map((cuenta) => ({
      valor: cuenta.cuentaBancariaId,
      texto: `${cuenta.nombre} · saldo ${formatearMonto(textoDeCentavos(cuenta.saldoCentavos))}`,
    }))
    .sort(porTexto);
}
