import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type {
  ChequeraParaElFondo,
  CuentaParaElFondo,
  LocalidadParaElFondo,
  UsuarioParaElFondo,
} from '../../servicios/catalogos.api';
import type { FormaDeEntrega } from '../../servicios/tipos-de-fondos';

type Opcion = OpcionBuscable<string | null>;

const porTexto = (a: Opcion, b: Opcion): number => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

const ordenadas = (opciones: Opcion[], vacia?: string): Opcion[] => {
  const lista = [...opciones].sort(porTexto);
  return vacia ? [{ valor: null, texto: vacia }, ...lista] : lista;
};

/** Cada chequera activa con su cuenta; sin cheques disponibles se ve apagada. */
export function opcionesDeChequeras(chequeras: readonly ChequeraParaElFondo[]): Opcion[] {
  return ordenadas(
    chequeras.map((c) => ({
      valor: c.id,
      texto: `${c.cuentaBancariaNombre} · ${c.serie ? `serie ${c.serie}` : 'sin serie'} · ${
        c.disponibles === 1 ? '1 cheque disponible' : `${c.disponibles} cheques disponibles`
      }`,
      deshabilitada: c.disponibles === 0,
    })),
  );
}

/** Las cuentas activas, por nombre (el saldo es de Bancos y no se ofrece aquí). */
export function opcionesDeCuentas(cuentas: readonly CuentaParaElFondo[], vacia?: string): Opcion[] {
  return ordenadas(
    cuentas.map((c) => ({ valor: c.id, texto: c.nombre })),
    vacia,
  );
}

/** Los medios que se pueden elegir según cómo sale el dinero. */
export function opcionesDelMedio(
  forma: FormaDeEntrega,
  medios: { chequeras: readonly ChequeraParaElFondo[]; cuentas: readonly CuentaParaElFondo[] },
): Opcion[] {
  return forma === 'cheque' ? opcionesDeChequeras(medios.chequeras) : opcionesDeCuentas(medios.cuentas);
}

export const opcionesDeLocalidades = (localidades: readonly LocalidadParaElFondo[], vacia: string): Opcion[] =>
  ordenadas(
    localidades.map((l) => ({ valor: l.id, texto: l.nombre })),
    vacia,
  );

export const opcionesDeUsuarios = (usuarios: readonly UsuarioParaElFondo[], vacia: string): Opcion[] =>
  ordenadas(
    usuarios.map((u) => ({ valor: u.id, texto: u.nombre })),
    vacia,
  );

/** Para un campo de selección de un solo conjunto de ids y nombres (conceptos de gasto, proveedores…). */
export const opcionesDeNombres = (registros: readonly { id: string; nombre: string }[], vacia: string): Opcion[] =>
  ordenadas(
    registros.map((r) => ({ valor: r.id, texto: r.nombre })),
    vacia,
  );
