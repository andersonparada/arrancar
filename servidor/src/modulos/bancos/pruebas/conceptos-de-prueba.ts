import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ConceptosDeMovimientos } from '../aplicacion/conceptos-de-movimientos.js';
import { Concepto, type DatosDeConcepto } from '../dominio/concepto.js';
import { CONCEPTOS_DE_SISTEMA } from '../dominio/conceptos-iniciales.js';
import { ConceptosEnMemoria } from './dobles-de-conceptos.js';

const idDe = (numero: number) => `00000000-0000-4000-8000-00000000c0${String(numero).padStart(2, '0')}`;

/** Conceptos del usuario con ids fijos, para que las pruebas los nombren sin buscarlos. */
export const CONCEPTO_GENERAL = idDe(1);
export const CONCEPTO_DE_CREDITO = idDe(2);
export const CONCEPTO_DE_DEBITO = idDe(3);
export const CONCEPTO_INACTIVO = idDe(4);
const PRIMERO_DE_SISTEMA = 10;

const EMPRESA = Identificador.desde<'Empresa'>('00000000-0000-4000-8000-0000000000aa');

const base: DatosDeConcepto = {
  nombre: '',
  aplicaA: 'ambos',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: null,
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
};

const delUsuario = (id: string, cambios: Partial<DatosDeConcepto>) =>
  Concepto.reconstruir({
    ...base,
    ...cambios,
    id: Identificador.desde(id),
    empresaId: EMPRESA,
    claveDeSistema: null,
  });

/** El id fijo del concepto de sistema con esa clave. */
export const idDeSistema = (clave: string): string =>
  idDe(PRIMERO_DE_SISTEMA + CONCEPTOS_DE_SISTEMA.findIndex((c) => c.claveDeSistema === clave));

function deSistema(indice: number): Concepto {
  const { claveDeSistema, datos } = CONCEPTOS_DE_SISTEMA[indice]!;
  return Concepto.reconstruir({
    ...datos,
    id: Identificador.desde(idDe(PRIMERO_DE_SISTEMA + indice)),
    empresaId: EMPRESA,
    claveDeSistema,
  });
}

/** Un catálogo ya sembrado: los de sistema y cuatro del usuario (general, de crédito, de débito e inactivo). */
export function conceptosSembrados(): ConceptosEnMemoria {
  const propios = [
    delUsuario(CONCEPTO_GENERAL, { nombre: 'General' }),
    delUsuario(CONCEPTO_DE_CREDITO, { nombre: 'Depósito de ventas', aplicaA: 'credito' }),
    delUsuario(CONCEPTO_DE_DEBITO, { nombre: 'Comisiones bancarias', aplicaA: 'debito' }),
    delUsuario(CONCEPTO_INACTIVO, { nombre: 'Viejo', activo: false }),
  ];
  return new ConceptosEnMemoria().precargar(...propios, ...CONCEPTOS_DE_SISTEMA.map((_, i) => deSistema(i)));
}

/** El servicio de conceptos de los movimientos, armado sobre un catálogo ya sembrado. */
export const conceptosDeMovimientosDe = (conceptos: ConceptosEnMemoria) => new ConceptosDeMovimientos(conceptos);

export const CONCEPTO_SIN_CLASIFICAR = idDeSistema('sin_clasificar');
export const CONCEPTO_TRANSFERENCIA = idDeSistema('transferencia');
export const CONCEPTO_SALDO_INICIAL = idDeSistema('saldo_inicial');

const NOMBRES = new Map<string, string>([
  [CONCEPTO_GENERAL, 'General'],
  [CONCEPTO_DE_CREDITO, 'Depósito de ventas'],
  [CONCEPTO_DE_DEBITO, 'Comisiones bancarias'],
  [CONCEPTO_INACTIVO, 'Viejo'],
  ...CONCEPTOS_DE_SISTEMA.map(({ datos }, i) => [idDe(PRIMERO_DE_SISTEMA + i), datos.nombre] as [string, string]),
]);

/** El nombre que tendría el concepto de prueba en un DTO. */
export const nombreDelConceptoDePrueba = (id: string): string => NOMBRES.get(id) ?? 'Concepto de prueba';
