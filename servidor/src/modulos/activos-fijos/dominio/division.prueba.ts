import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Activo } from './activo.js';
import { costosDeDivision } from './costos-de-division.js';
import type { CifrasDeDivision } from './depreciacion/division.js';
import { Division, type DatosDeDivision } from './division.js';
import { ActivoInvalido } from './errores-de-activo.js';
import {
  CantidadASepararInvalida,
  DivisionInvalida,
  DivisionNoAnulable,
  DivisionNoPermitida,
} from './errores-de-division.js';
import type { IncisoFiscal } from './incisos-fiscales.js';
import { exigirCantidadASeparar, exigirDivisible } from './reglas-de-division.js';
import { separarActivo } from './separar-activo.js';
import { CostoNoAnulable } from './errores-de-costo.js';

const empresa = Identificador.nuevo<'Empresa'>();

function sillas(cambios: { activoPadreId?: string | null; cantidad?: number } = {}): Activo {
  return Activo.crear(
    empresa,
    {
      datos: {
        codigo: 'AF-0200',
        descripcion: 'Silla apilable',
        claseId: crypto.randomUUID(),
        activoPadreId: cambios.activoPadreId ?? null,
        tipoDeRegistro: 'activo',
        origen: 'compra',
        propietario: null,
        formaDeTenencia: null,
        fechaDeAdquisicion: '2027-01-05',
        valorComoGanadoComun: null,
        valorDeMatricula: null,
        valorCatastral: null,
        valoresDelInmuebleCompleto: false,
        marca: 'Rimax',
        modelo: 'A1',
        numeroDeSerie: 'S-1',
        placa: 'P-1',
        cantidad: cambios.cantidad ?? 50,
        observaciones: 'Del almacén',
      },
      ubicacion: { localidadId: null, departamentoId: null, responsable: null, enBodega: true },
    },
    'otros_muebles',
  );
}

const contexto = (incisoFiscal: IncisoFiscal = 'otros_muebles', tieneComponentes = false) => ({
  incisoFiscal,
  tieneComponentes,
});

describe('exigirDivisible', () => {
  it('admite un activo suelto de una clase que se reparte en piezas', () => {
    expect(() => exigirDivisible(sillas().instantanea(), contexto())).not.toThrow();
  });

  it.each(['edificios', 'terrenos', 'reproductores', 'intangibles', 'llave'] as const)(
    'no divide la clase de inciso %s',
    (inciso) => {
      expect(() => exigirDivisible(sillas().instantanea(), contexto(inciso))).toThrowError(DivisionNoPermitida);
    },
  );

  it('no divide un componente ni un principal con componentes', () => {
    const componente = sillas({ activoPadreId: crypto.randomUUID() }).instantanea();

    expect(() => exigirDivisible(componente, contexto())).toThrowError(/componente/);
    expect(() => exigirDivisible(sillas().instantanea(), contexto('otros_muebles', true))).toThrowError(/componentes/);
  });

  it('no divide un activo dado de baja y la causa va en los detalles', () => {
    const activo = sillas();
    activo.cambiarCantidad(50);
    const dadoDeBaja = { ...activo.instantanea(), estado: 'dado_de_baja' as const };

    try {
      exigirDivisible(dadoDeBaja, contexto());
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DivisionNoPermitida);
      expect((error as DivisionNoPermitida).detalles).toEqual({ causa: 'dado_de_baja' });
    }
  });
});

describe('exigirCantidadASeparar', () => {
  it.each([0, 50, 51, 2.5])('rechaza separar %s de 50', (cantidad) => {
    expect(() => exigirCantidadASeparar(50, cantidad)).toThrowError(CantidadASepararInvalida);
  });

  it.each([1, 20, 49])('acepta separar %s de 50', (cantidad) => {
    expect(() => exigirCantidadASeparar(50, cantidad)).not.toThrow();
  });
});

describe('separarActivo', () => {
  it('crea el activo nuevo con la cantidad y el código, sin serie, placa, foto ni observaciones, y deja el resto en el origen', () => {
    const origen = sillas();

    const nuevo = separarActivo(origen, { cantidad: 20, codigo: 'AF-0201' });

    expect(origen.instantanea().cantidad).toBe(30);
    expect(nuevo.instantanea()).toMatchObject({
      codigo: 'AF-0201',
      cantidad: 20,
      descripcion: 'Silla apilable',
      marca: 'Rimax',
      modelo: 'A1',
      enBodega: true,
      numeroDeSerie: null,
      placa: null,
      fotoArchivoId: null,
      observaciones: null,
    });
    expect(nuevo.id.valor).not.toBe(origen.id.valor);
  });

  it('rechaza un código con formato inválido sin tocar el origen', () => {
    const origen = sillas();

    expect(() => separarActivo(origen, { cantidad: 20, codigo: 'AF 1' })).toThrowError(ActivoInvalido);
    expect(origen.instantanea().cantidad).toBe(50);
  });
});

const CIFRAS_NUEVAS: CifrasDeDivision = {
  costoQueAplicaCentavos: 600_000,
  costoQueNoAplicaCentavos: 2_500,
  acumuladaContableCentavos: 60_000,
  acumuladaFiscalCentavos: 60_000,
  valorResidualCentavos: 0,
  baseFiscalCentavos: 600_000,
  baseDelPorcentajeCentavos: 600_000,
};

describe('costosDeDivision', () => {
  const entrada = {
    empresaId: empresa,
    divisionId: crypto.randomUUID(),
    activoOrigenId: crypto.randomUUID(),
    activoNuevoId: crypto.randomUUID(),
    fecha: '2027-07-10',
    nuevo: CIFRAS_NUEVAS,
    descripcion: 'Parte separada',
  };

  it('da un costo negativo cedido en el origen y uno positivo recibido en el nuevo, por cada grupo con monto', () => {
    const costos = costosDeDivision(entrada).map((costo) => costo.instantanea());

    expect(
      costos.map((c) => [c.claseDeCosto, c.activoId === entrada.activoNuevoId, c.montoCentavos, c.aplicaAlLibroFiscal]),
    ).toEqual([
      ['division_cedida', false, -600_000, true],
      ['division_recibida', true, 600_000, true],
      ['division_cedida', false, -2_500, false],
      ['division_recibida', true, 2_500, false],
    ]);
    expect(costos.every((c) => c.origen === 'division' && c.divisionId === entrada.divisionId)).toBe(true);
    expect(costos.filter((c) => !c.aplicaAlLibroFiscal).every((c) => c.motivoFueraDelLibroFiscal !== null)).toBe(true);
  });

  it('un grupo sin monto no deja costos', () => {
    const costos = costosDeDivision({ ...entrada, nuevo: { ...CIFRAS_NUEVAS, costoQueNoAplicaCentavos: 0 } });

    expect(costos).toHaveLength(2);
  });

  it('un costo de división no se anula a mano, pero sí con la división', () => {
    const [cedido] = costosDeDivision(entrada);
    const entradaDeAnulacion = { motivo: 'Se deshace', usuarioId: crypto.randomUUID(), ahora: new Date() };

    expect(() => cedido!.anular(entradaDeAnulacion)).toThrowError(CostoNoAnulable);
    cedido!.anularPorDivision(entradaDeAnulacion);
    expect(cedido!.instantanea().estado).toBe('anulado');
    expect(() => cedido!.anularPorDivision(entradaDeAnulacion)).toThrowError(CostoNoAnulable);
  });
});

describe('Division', () => {
  const datos = (cambios: Partial<DatosDeDivision> = {}): DatosDeDivision => ({
    empresaId: empresa,
    activoOrigenId: crypto.randomUUID(),
    activoNuevoId: crypto.randomUUID(),
    codigoDelActivoNuevo: 'AF-0201',
    fecha: '2027-07-10',
    periodo: '2027-07-01',
    cantidadOriginal: 50,
    cantidadSeparada: 20,
    causa: 'manual',
    motivo: '  Entrega parcial  ',
    costoSeparadoCentavos: 600_000,
    costoFiscalSeparadoCentavos: 600_000,
    acumuladaContableSeparadaCentavos: 60_000,
    acumuladaFiscalSeparadaCentavos: 60_000,
    residualSeparadoCentavos: 0,
    ...cambios,
  });

  it('nace vigente con el motivo recortado', () => {
    const division = Division.registrar(datos());

    expect(division.instantanea()).toMatchObject({ estado: 'vigente', motivo: 'Entrega parcial', anuladoEn: null });
  });

  it.each([
    ['sin motivo', { motivo: '   ' }],
    ['con un motivo larguísimo', { motivo: 'x'.repeat(301) }],
    ['separando todo', { cantidadSeparada: 50 }],
    ['separando cero', { cantidadSeparada: 0 }],
  ])('no se registra %s', (_caso, cambios) => {
    expect(() => Division.registrar(datos(cambios))).toThrowError(DivisionInvalida);
  });

  it('al anularse deja su llave en nulo y conserva el código del activo nuevo', () => {
    const division = Division.registrar(datos());

    division.anular({ motivo: 'Fue un error', usuarioId: crypto.randomUUID(), ahora: new Date() });

    expect(division.instantanea()).toMatchObject({
      estado: 'anulada',
      activoNuevoId: null,
      codigoDelActivoNuevo: 'AF-0201',
      motivoDeAnulacion: 'Fue un error',
    });
  });

  it('no se anula dos veces ni sin motivo', () => {
    const division = Division.registrar(datos());
    const anulacion = { motivo: 'Error', usuarioId: crypto.randomUUID(), ahora: new Date() };

    expect(() => division.anular({ ...anulacion, motivo: ' ' })).toThrowError(DivisionInvalida);
    division.anular(anulacion);
    expect(() => division.anular(anulacion)).toThrowError(DivisionNoAnulable);
  });
});
