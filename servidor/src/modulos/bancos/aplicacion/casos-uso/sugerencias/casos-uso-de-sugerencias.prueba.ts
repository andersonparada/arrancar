import { beforeEach, describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { Ejemplo } from '../../../../bancos/dominio/sugerencias/tipos.js';
import {
  CONCEPTO_DE_CREDITO,
  CONCEPTO_DE_DEBITO,
  CONCEPTO_GENERAL,
  CONCEPTO_INACTIVO,
  conceptosSembrados,
  idDeSistema,
} from '../../../pruebas/conceptos-de-prueba.js';
import { CuentasPorPagarFijo } from '../../../pruebas/dobles-de-cheques.js';
import { ConsultasDeSugerenciasEnMemoria, PoliticaDeSugerenciasFija } from '../../../pruebas/dobles-de-sugerencias.js';
import type { PendienteDeClasificar } from '../../puertos/consultas-de-sugerencias.js';
import { MotorDeSugerencias } from '../../sugerencias/motor-de-sugerencias.js';
import {
  MAXIMO_DE_PENDIENTES_CON_SUGERENCIA,
  SugerirConceptosDeSinClasificar,
} from './sugerir-conceptos-de-sin-clasificar.js';
import { SugerirConceptoAlCapturar } from './sugerir-concepto-al-capturar.js';

const operador = operadorDePrueba();
const CUENTA = 'cuenta-1';

let consultas: ConsultasDeSugerenciasEnMemoria;
let politica: PoliticaDeSugerenciasFija;

function armar(cuentasPorPagar = false) {
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    consultasDeSugerencias: consultas,
    politicaDeSugerencias: politica,
    reloj: new RelojFijo('2026-04-01'),
    motor: new MotorDeSugerencias({
      consultasDeSugerencias: consultas,
      consultasDeConceptos: conceptosSembrados(),
      politicaDeSugerencias: politica,
      cuentasPorPagar: new CuentasPorPagarFijo(cuentasPorPagar),
    }),
  };
  return {
    bandeja: new SugerirConceptosDeSinClasificar(dependencias),
    captura: new SugerirConceptoAlCapturar(dependencias),
  };
}

const ejemplo = (id: number, cambios: Partial<Ejemplo> = {}): Ejemplo => ({
  id: `e${id}`,
  conceptoId: CONCEPTO_DE_DEBITO,
  fecha: '2026-04-01',
  montoEnCentavos: 5000,
  direccion: 'salida',
  cuentaBancariaId: CUENTA,
  beneficiarioParaComparar: 'banco',
  textoParaComparar: null,
  ...cambios,
});

const pendiente = (id: string, cambios: Partial<PendienteDeClasificar> = {}): PendienteDeClasificar => ({
  id,
  tipo: 'debito',
  fecha: '2026-04-01',
  montoEnCentavos: 5000,
  direccion: 'salida',
  cuentaBancariaId: CUENTA,
  beneficiarioParaComparar: 'banco',
  textoParaComparar: null,
  ...cambios,
});

beforeEach(() => {
  consultas = new ConsultasDeSugerenciasEnMemoria();
  politica = new PoliticaDeSugerenciasFija();
});

describe('sugerir los conceptos de la bandeja', () => {
  it('sugiere desde dos casos iguales y devuelve una sugerencia por pendiente, también las vacías', async () => {
    consultas.ejemplosGuardados = [ejemplo(1), ejemplo(2)];
    consultas.pendientesGuardados = [pendiente('p1'), pendiente('p2', { beneficiarioParaComparar: 'desconocido' })];

    const respuesta = await armar().bandeja.ejecutar(operador, {});

    expect(respuesta).toMatchObject({ confianzaMinima: 60, vidaMediaDias: 180, truncado: false });
    expect(respuesta.sugerencias).toHaveLength(2);
    expect(respuesta.sugerencias[0]).toMatchObject({
      movimientoId: 'p1',
      sugerido: { conceptoId: CONCEPTO_DE_DEBITO, conceptoNombre: 'Comisiones bancarias', confianza: 67 },
      casosComparados: 2,
    });
    expect(respuesta.sugerencias[1]).toEqual({
      movimientoId: 'p2',
      sugerido: null,
      alternativas: [],
      casosComparados: 0,
    });
  });

  it('con un solo caso no hay sugerido: se muestra como posible', async () => {
    consultas.ejemplosGuardados = [ejemplo(1)];
    consultas.pendientesGuardados = [pendiente('p1')];

    const [sugerencia] = (await armar().bandeja.ejecutar(operador, {})).sugerencias;

    expect(sugerencia?.sugerido).toBeNull();
    expect(sugerencia?.alternativas[0]).toMatchObject({ conceptoId: CONCEPTO_DE_DEBITO, confianza: 50 });
  });

  it('un concepto inactivo o de la otra dirección resta confianza y no se ofrece', async () => {
    consultas.ejemplosGuardados = [
      ejemplo(1),
      ejemplo(2),
      ejemplo(3, { conceptoId: CONCEPTO_INACTIVO }),
      ejemplo(4, { conceptoId: CONCEPTO_INACTIVO }),
      ejemplo(5, { conceptoId: CONCEPTO_DE_CREDITO }),
      ejemplo(6, { direccion: 'entrada', conceptoId: CONCEPTO_GENERAL }),
    ];
    consultas.pendientesGuardados = [pendiente('p1')];

    const [sugerencia] = (await armar().bandeja.ejecutar(operador, {})).sugerencias;

    expect(sugerencia?.casosComparados).toBe(5);
    const ofrecidos = [sugerencia?.sugerido, ...(sugerencia?.alternativas ?? [])].map((o) => o?.conceptoId);
    expect(ofrecidos).not.toContain(CONCEPTO_INACTIVO);
    expect(ofrecidos).not.toContain(CONCEPTO_DE_CREDITO);
    expect(sugerencia?.sugerido).toBeNull();
  });

  it('«Pago a proveedores» se sugiere a un cheque solo sin Cuentas por pagar', async () => {
    const pago = idDeSistema('pago_a_proveedor');
    consultas.ejemplosGuardados = [ejemplo(1, { conceptoId: pago }), ejemplo(2, { conceptoId: pago })];
    consultas.pendientesGuardados = [pendiente('cheque', { tipo: 'cheque' }), pendiente('nota')];

    const sin = (await armar(false).bandeja.ejecutar(operador, {})).sugerencias;
    const con = (await armar(true).bandeja.ejecutar(operador, {})).sugerencias;

    expect(sin[0]?.sugerido?.conceptoId).toBe(pago);
    expect(sin[1]?.sugerido).toBeNull();
    expect(con[0]?.sugerido).toBeNull();
  });

  it('usa la vida media y la confianza mínima de la empresa', async () => {
    consultas.ejemplosGuardados = [ejemplo(1), ejemplo(2)];
    consultas.pendientesGuardados = [pendiente('p1')];
    politica = new PoliticaDeSugerenciasFija({ vidaMediaDias: 90, confianzaMinima: 70 });

    const respuesta = await armar().bandeja.ejecutar(operador, {});

    expect(respuesta).toMatchObject({ confianzaMinima: 70, vidaMediaDias: 90 });
    expect(respuesta.sugerencias[0]?.sugerido).toBeNull();
  });

  it('avisa si hubo más pendientes de los que se calculan', async () => {
    consultas.pendientesGuardados = Array.from({ length: MAXIMO_DE_PENDIENTES_CON_SUGERENCIA + 1 }, (_, i) =>
      pendiente(`p${i}`),
    );

    const respuesta = await armar().bandeja.ejecutar(operador, {});

    expect(respuesta.truncado).toBe(true);
    expect(respuesta.sugerencias).toHaveLength(MAXIMO_DE_PENDIENTES_CON_SUGERENCIA);
  });

  it('sin pendientes no consulta nada más', async () => {
    const respuesta = await armar().bandeja.ejecutar(operador, {});

    expect(respuesta.sugerencias).toEqual([]);
  });
});

describe('sugerir el concepto al capturar', () => {
  it('con el mismo cálculo, sin id, y normalizando el beneficiario', async () => {
    consultas.ejemplosGuardados = [ejemplo(1), ejemplo(2)];

    const sugerencia = await armar().captura.ejecutar(operador, {
      tipo: 'debito',
      cuentaBancariaId: CUENTA,
      beneficiario: ' BANCO ',
    });

    expect(sugerencia.sugerido).toMatchObject({ conceptoId: CONCEPTO_DE_DEBITO });
    expect(sugerencia).not.toHaveProperty('movimientoId');
  });

  it('sin monto ni fecha igual sugiere (fecha de hoy, el monto no distingue)', async () => {
    consultas.ejemplosGuardados = [ejemplo(1, { montoEnCentavos: 1 }), ejemplo(2, { montoEnCentavos: 99_999_999 })];

    const sugerencia = await armar().captura.ejecutar(operador, {
      tipo: 'cheque',
      cuentaBancariaId: CUENTA,
      beneficiario: 'banco',
      monto: null,
      fecha: null,
    });

    expect(sugerencia.sugerido?.confianza).toBe(67);
  });

  it('sin beneficiario mira los de la misma cuenta y su texto', async () => {
    consultas.ejemplosGuardados = [
      ejemplo(1, { beneficiarioParaComparar: null, textoParaComparar: 'comision mensual' }),
      ejemplo(2, { beneficiarioParaComparar: null, textoParaComparar: 'comision mensual' }),
      ejemplo(3, { beneficiarioParaComparar: null, cuentaBancariaId: 'otra' }),
    ];

    const sugerencia = await armar().captura.ejecutar(operador, {
      tipo: 'debito',
      cuentaBancariaId: CUENTA,
      observaciones: 'Comision Mensual',
    });

    expect(sugerencia.casosComparados).toBe(2);
    expect(sugerencia.sugerido?.porque.base).toBe('misma_cuenta_sin_beneficiario');
  });
});
