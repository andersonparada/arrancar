import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { avisosDeBaja, type DatosParaLosAvisos } from './avisos-de-baja.js';
import { Baja } from './baja.js';
import { cifrasDeBaja } from './depreciacion/cifras-de-baja.js';
import { tramosDeInicioDeUso } from './depreciacion/inicio-de-uso.js';
import type { TramoGuardado } from './depreciacion/tramo.js';
import { BajaAnulada, BajaInvalida, BajaNoAnulable } from './errores-de-baja.js';
import { repartirEnProporcion, resultadosDeVenta } from './resultados-de-venta.js';
import type { CifrasDeBaja, DatosDeBaja } from './tipos-de-baja.js';

const CONTEXTO = {
  codigoDelActivo: 'AF-1',
  tipoDeRegistro: 'activo',
  fechaDeInicioDeUso: '2027-03-10',
  hoy: '2027-06-15',
} as const;

const CIFRAS: CifrasDeBaja = {
  costoCentavos: 25000000,
  depreciacionAcumuladaContableCentavos: 1125000,
  valorEnLibrosCentavos: 23875000,
  costoFiscalCentavos: 25000000,
  baseFiscalCentavos: 25000000,
  depreciacionAcumuladaFiscalCentavos: 1250000,
  valorFiscalPorDepreciarCentavos: 23750000,
  cuotaDelMesContableCentavos: 0,
  cuotaDelMesFiscalCentavos: 0,
};

const BAJA: DatosDeBaja = {
  fecha: '2027-06-10',
  causa: 'destruccion',
  descripcion: 'Incendio',
  autorizadaPor: 'Gerencia',
  destinoDelBien: null,
  numeroDeDenuncia: null,
  inventarioId: null,
  venta: null,
};

const entrada = {
  empresaId: Identificador.nuevo<'Empresa'>(),
  activoId: 'a1',
  cifras: CIFRAS,
  costoFiscal: { origen: 'en_libros' as const, motivo: null },
  numero: 1,
  anioDeNumero: 2027,
};

describe('Baja', () => {
  it('nace vigente, sin documentos, con lo congelado', () => {
    const baja = Baja.registrar(entrada, BAJA, CONTEXTO).instantanea();

    expect(baja).toMatchObject({
      estado: 'vigente',
      acta: null,
      denunciaArchivoId: null,
      resultadoFiscalCentavos: null,
    });
    expect(baja.cifras.valorEnLibrosCentavos).toBe(23875000);
  });

  it('en una venta calcula los dos resultados', () => {
    const venta = {
      comprador: 'Ana',
      nitDelComprador: 'cf',
      precioCentavos: 20000000,
      ivaCentavos: 2400000,
      serieFel: null,
      numeroFel: '1',
      autorizacionFel: '3f2b6c1a-8d4e-4b7a-9c01-5e6f7a8b9c0d',
    };

    const baja = Baja.registrar(entrada, { ...BAJA, causa: 'venta', venta }, CONTEXTO).instantanea();

    expect(baja.resultadoContableCentavos).toBe(20000000 - 23875000);
    expect(baja.resultadoFiscalCentavos).toBe(20000000 - (25000000 - 1250000));
    expect(baja.venta?.nitDelComprador).toBe('CF');
  });

  it('valida los textos, la causa y la fecha', () => {
    const registrar = (cambios: Partial<DatosDeBaja>) => () =>
      Baja.registrar(entrada, { ...BAJA, ...cambios }, CONTEXTO);

    expect(registrar({ descripcion: ' ' })).toThrow(BajaInvalida);
    expect(registrar({ descripcion: 'x'.repeat(501) })).toThrow(BajaInvalida);
    expect(registrar({ autorizadaPor: 'x'.repeat(151) })).toThrow(BajaInvalida);
    expect(registrar({ numeroDeDenuncia: 'x'.repeat(61) })).toThrow(BajaInvalida);
    expect(registrar({ fecha: '2027-06-16' })).toThrow(BajaInvalida);
    expect(registrar({ causa: 'venta' })).toThrow(BajaInvalida);
  });

  it('se anula una vez, con motivo; el acta y la denuncia solo en una baja vigente', () => {
    const baja = Baja.registrar(entrada, BAJA, CONTEXTO);
    baja.ponerActa({ archivoId: 'f1', tipo: 'notarial' });
    baja.ponerDenuncia('f2');
    expect(baja.instantanea()).toMatchObject({ acta: { tipo: 'notarial' }, denunciaArchivoId: 'f2' });

    expect(() => baja.anular({ motivo: '', usuarioId: 'u', ahora: new Date() })).toThrow(BajaInvalida);
    baja.anular({ motivo: 'Error', usuarioId: 'u', ahora: new Date() });

    expect(baja.instantanea().estado).toBe('anulada');
    expect(() => baja.anular({ motivo: 'Otra', usuarioId: 'u', ahora: new Date() })).toThrow(BajaNoAnulable);
    expect(() => baja.ponerActa({ archivoId: 'f3', tipo: 'administrativa' })).toThrow(BajaAnulada);
    expect(() => baja.ponerDenuncia('f4')).toThrow(BajaAnulada);
  });
});

describe('resultados y reparto de una venta', () => {
  it('el fiscal recupera lo que no se depreció (A1) y el contable usa el valor en libros', () => {
    const cifras = { ...CIFRAS, costoFiscalCentavos: 100000000, depreciacionAcumuladaFiscalCentavos: 0 };

    expect(resultadosDeVenta(30000000, cifras)).toEqual({ contableCentavos: 6125000, fiscalCentavos: -70000000 });
  });

  it('reparte en proporción con el sobrante al último y la suma exacta', () => {
    expect(repartirEnProporcion(10000, [3, 1])).toEqual([7500, 2500]);
    const partes = repartirEnProporcion(10001, [1, 1, 1]);
    expect(partes).toEqual([3333, 3333, 3335]);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(10001);
  });

  it('con pesos en cero reparte por igual', () => {
    expect(repartirEnProporcion(100, [0, 0])).toEqual([50, 50]);
  });
});

describe('cifras al dar de baja', () => {
  const { contable, fiscal } = tramosDeInicioDeUso({
    fechaDeInicioDeUso: '2027-03-10',
    primerMes: 'mes_de_inicio',
    costoCentavos: 25000000,
    baseFiscalCentavos: 25000000,
    porcentajeFiscal: '20.00',
    vidaUtilContableMeses: 60,
    valorResidualCentavos: 2500000,
  });
  const tramos: TramoGuardado[] = [
    { ...contable, id: 'c' },
    { ...fiscal, id: 'f' },
  ];
  const estado = (ultimoMesCerrado: string | null) => ({
    tramos,
    depreciadoPorTramo: new Map<string, number>(),
    acumuladaCentavos: { contable: 0, fiscal: 0 },
    ultimoMesCerrado,
  });
  const base = {
    fechaDeBaja: '2027-06-10',
    costoCentavos: 25000000,
    costoFiscalCentavos: 25000000,
    baseFiscalCentavos: 25000000,
  };

  it('proyecta los meses abiertos hasta el mes anterior y no deprecia el de la baja con «mes de inicio»', () => {
    const cifras = cifrasDeBaja({ ...base, estado: estado(null), primerMes: 'mes_de_inicio' });

    expect(cifras.depreciacionAcumuladaContableCentavos).toBe(1125000);
    expect(cifras.cuotaDelMesContableCentavos).toBe(0);
    expect(cifras.valorEnLibrosCentavos).toBe(23875000);
  });

  it('con «mes siguiente» suma la cuota del mes de la baja y la guarda aparte', () => {
    const cifras = cifrasDeBaja({ ...base, estado: estado(null), primerMes: 'mes_siguiente' });

    expect(cifras.cuotaDelMesContableCentavos).toBeGreaterThan(0);
    expect(cifras.depreciacionAcumuladaContableCentavos).toBe(
      cifrasDeBaja({ ...base, estado: estado(null), primerMes: 'mes_de_inicio' })
        .depreciacionAcumuladaContableCentavos + cifras.cuotaDelMesContableCentavos,
    );
  });

  it('el valor fiscal por depreciar es la base menos la acumulada fiscal', () => {
    const cifras = cifrasDeBaja({ ...base, estado: estado(null), primerMes: 'mes_de_inicio' });

    expect(cifras.valorFiscalPorDepreciarCentavos).toBe(25000000 - cifras.depreciacionAcumuladaFiscalCentavos);
  });
});

describe('avisosDeBaja', () => {
  const datos = (cambios: Partial<DatosParaLosAvisos>): DatosParaLosAvisos => ({
    causa: 'destruccion',
    fecha: '2027-06-10',
    tieneActa: true,
    tipoDeActa: 'notarial',
    tieneDenuncia: true,
    esDeTerceros: false,
    esDeControl: false,
    regimenDeIva: 'general',
    regimenDeIsr: 'utilidades',
    origenDelCostoFiscal: null,
    componentes: 0,
    incisoFiscal: 'maquinaria_y_vehiculos',
    tipoDePersona: 'juridica',
    resultadoFiscalCentavos: null,
    ...cambios,
  });

  it('con todo en orden no avisa nada', () => {
    expect(avisosDeBaja(datos({}))).toEqual([]);
  });

  const codigos = (cambios: Partial<DatosParaLosAvisos>) => avisosDeBaja(datos(cambios)).map((a) => a.codigo);

  it('el faltante avisa del IVA aunque tenga acta: el acta no elimina el IVA', () => {
    expect(codigos({ causa: 'faltante_de_inventario', tieneActa: false })).toEqual(['sin_acta', 'faltante_con_iva']);
    expect(codigos({ causa: 'faltante_de_inventario' })).toEqual(['faltante_con_iva']);
  });

  it('la destrucción pide acta notarial: la administrativa no la sustituye', () => {
    expect(codigos({ causa: 'destruccion', tipoDeActa: 'administrativa' })).toEqual(['destruccion_sin_acta_notarial']);
    expect(codigos({ causa: 'destruccion', tipoDeActa: 'notarial' })).toEqual([]);
  });

  it('el robo pide la certificación de la denuncia y el extravío no da por hecha la excepción', () => {
    expect(codigos({ causa: 'robo', tieneDenuncia: false })).toEqual(['sin_denuncia']);
    expect(codigos({ causa: 'extravio' })).toEqual(['extravio_sin_excepcion']);
  });

  it('un bien de terceros perdido avisa de la posible responsabilidad ante el dueño', () => {
    expect(codigos({ causa: 'robo', esDeTerceros: true })).toEqual(['posible_responsabilidad_ante_el_dueno']);
    expect(codigos({ causa: 'devuelto_al_dueno', esDeTerceros: true })).toEqual([]);
  });

  it('el aviso del IVA de la venta depende del bien y del régimen, sin afirmar de más', () => {
    const venta = { causa: 'venta', resultadoFiscalCentavos: 100 } as const;
    const mensaje = (cambios: Partial<DatosParaLosAvisos>) =>
      avisosDeBaja(datos({ ...venta, ...cambios })).find((a) => a.codigo === 'venta_con_iva')!.mensaje;

    expect(mensaje({})).toContain('débito fiscal de IVA');
    expect(mensaje({ incisoFiscal: 'edificios' })).toContain('primera venta');
    expect(mensaje({ incisoFiscal: 'edificios' })).not.toContain('débito fiscal');
    expect(mensaje({ regimenDeIva: 'pequeno_contribuyente' })).toContain('según su régimen');
    expect(mensaje({ regimenDeIva: 'pequeno_contribuyente' })).not.toContain('débito fiscal');
    expect(mensaje({ regimenDeIva: null })).not.toContain('débito fiscal');
  });

  it('la exención de inmuebles solo desde el 1-ene-2027 y para personas individuales', () => {
    const venta = { causa: 'venta', incisoFiscal: 'terrenos', resultadoFiscalCentavos: 100 } as const;

    const deVenta = (cambios: Partial<DatosParaLosAvisos>) => codigos({ ...venta, ...cambios });

    expect(deVenta({ tipoDePersona: 'individual' })).toContain('inmueble_de_persona_individual');
    expect(deVenta({ tipoDePersona: 'individual', fecha: '2026-12-31' })).not.toContain(
      'inmueble_de_persona_individual',
    );
    expect(deVenta({ tipoDePersona: 'juridica' })).not.toContain('inmueble_de_persona_individual');
    expect(deVenta({ tipoDePersona: null })).not.toContain('inmueble_de_persona_individual');
  });
});
