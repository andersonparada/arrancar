import { describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { cifrasEnCero, type SaldoDeProveedor } from '../../../dominio/saldos-por-nit.js';
import { CargaInicialEnMemoria } from '../../../pruebas/dobles-de-saldos-iniciales.js';
import type {
  BaseDelCorte,
  ConsultasDeSaldosAlCorte,
  DatosParaAvisosDelCorte,
  FiltroDeDocumentosAlCorte,
} from '../../puertos/puertos-de-saldos-al-corte.js';
import { ReporteDeDocumentosAUnaFecha } from './reporte-de-documentos-a-una-fecha.js';
import { ReporteDeSaldosPorProveedor } from './reporte-de-saldos-por-proveedor.js';

const SIN_AVISOS: DatosParaAvisosDelCorte = {
  anterioresAlInicio: { cantidad: 0, totalCentavos: 0 },
  registradosDespues: { cantidad: 0, totalCentavos: 0 },
  chequesCobradosAntes: [],
};

function proveedor(datos: Partial<SaldoDeProveedor> & { proveedorId: string; neto: number }): SaldoDeProveedor {
  return { ...cifrasEnCero(), nombre: datos.proveedorId, nit: null, totalCargos: Math.max(datos.neto, 0), ...datos };
}

/** Las consultas de la prueba: devuelven lo que se les da y guardan con qué base y filtro las llamaron. */
class ConsultasDeLaPrueba implements ConsultasDeSaldosAlCorte {
  base: BaseDelCorte | undefined;
  filtro: FiltroDeDocumentosAlCorte | undefined;
  proveedoresQueExisten = new Set<string>();
  avisos: DatosParaAvisosDelCorte = SIN_AVISOS;

  constructor(private readonly proveedores: SaldoDeProveedor[] = []) {}

  async proveedorExiste(proveedorId: string) {
    return this.proveedoresQueExisten.has(proveedorId);
  }

  async saldosPorProveedor(base: BaseDelCorte) {
    this.base = base;
    return this.proveedores;
  }

  async avisosDelCorte(base: BaseDelCorte) {
    this.base = base;
    return this.avisos;
  }

  async documentos(filtro: FiltroDeDocumentosAlCorte) {
    this.filtro = filtro;
    return {
      filas: [],
      totales: {
        cantidad: 0,
        totalCentavos: 0,
        retencionesCentavos: 0,
        pagadoCentavos: 0,
        saldoCentavos: 0,
        comprometidoCentavos: 0,
      },
    };
  }
}

function dependencias(consultas: ConsultasDeLaPrueba, carga = new CargaInicialEnMemoria()) {
  return {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-03-15'),
    cargaInicial: carga,
    consultas,
  };
}

const solicitud = { autorizacion: 'todos' as const, incluirSinSaldo: false, orden: 'nombre' as const };

describe('ReporteDeSaldosPorProveedor', () => {
  it('sin corte usa el día de hoy de la empresa y lleva la fecha de inicio a la consulta', async () => {
    const consultas = new ConsultasDeLaPrueba();
    const operador = operadorDePrueba();

    const reporte = await new ReporteDeSaldosPorProveedor(dependencias(consultas)).ejecutar(operador, solicitud);

    expect(reporte).toMatchObject({ corte: '2026-03-15', fechaDeInicio: '2026-01-01' });
    expect(consultas.base).toMatchObject({
      empresaId: operador.empresaId,
      corte: '2026-03-15',
      fechaDeInicio: '2026-01-01',
    });
  });

  it('rechaza un corte anterior al día antes de la fecha de inicio, pero acepta ese día', async () => {
    const caso = new ReporteDeSaldosPorProveedor(dependencias(new ConsultasDeLaPrueba()));

    await expect(caso.ejecutar(operadorDePrueba(), { ...solicitud, corte: '2025-12-30' })).rejects.toMatchObject({
      codigo: 'corte_anterior_al_inicio',
    });
    await expect(caso.ejecutar(operadorDePrueba(), { ...solicitud, corte: '2025-12-31' })).resolves.toMatchObject({
      corte: '2025-12-31',
    });
  });

  it('sin fecha de inicio no hay corte mínimo', async () => {
    const carga = new CargaInicialEnMemoria({ fechaDeInicio: null, cerrada: false });
    const caso = new ReporteDeSaldosPorProveedor(dependencias(new ConsultasDeLaPrueba(), carga));

    await expect(caso.ejecutar(operadorDePrueba(), { ...solicitud, corte: '2000-01-01' })).resolves.toBeDefined();
  });

  it('un proveedor que no existe en la cuenta se rechaza', async () => {
    const caso = new ReporteDeSaldosPorProveedor(dependencias(new ConsultasDeLaPrueba()));

    await expect(
      caso.ejecutar(operadorDePrueba(), { ...solicitud, proveedorId: crypto.randomUUID() }),
    ).rejects.toMatchObject({ codigo: 'proveedor_del_reporte_no_existe' });
  });

  it('reparte los NIT en acreedores y deudores, suma el saldo neto y calcula los porcentajes sobre los cargos', async () => {
    const alfa = proveedor({
      proveedorId: 'a',
      nombre: 'Alfa',
      nit: '1',
      neto: 70_000,
      totalCargos: 100_000,
      saldosAFavor: 30_000,
    });
    alfa.tramos.por_vencer = 75_000;
    alfa.tramos.de_1_a_30 = 25_000;
    const beta = proveedor({ proveedorId: 'b', nombre: 'Beta', nit: '2', neto: -20_000, saldosAFavor: 20_000 });
    const consultas = new ConsultasDeLaPrueba([alfa, beta]);

    const reporte = await new ReporteDeSaldosPorProveedor(dependencias(consultas)).ejecutar(
      operadorDePrueba(),
      solicitud,
    );

    expect(reporte.acreedores.map((fila) => fila.nombre)).toEqual(['Alfa']);
    expect(reporte.deudores.map((fila) => fila.nombre)).toEqual(['Beta']);
    expect(reporte.deudores[0]).toMatchObject({ saldoNeto: '200.00', disponible: null });
    expect(reporte.totales).toMatchObject({
      saldoNeto: '500.00',
      totalCargos: '1000.00',
      porcentajesPorTramo: { porVencer: '75.00', de1a30: '25.00', masDe90: '0.00' },
    });
  });

  it('suma al aviso de cheques y a los demás el del NIT repetido', async () => {
    const consultas = new ConsultasDeLaPrueba([
      proveedor({ proveedorId: 'a', nit: '9', neto: 100 }),
      proveedor({ proveedorId: 'b', nit: '9', neto: 200 }),
    ]);
    consultas.avisos = {
      ...SIN_AVISOS,
      chequesCobradosAntes: [{ numeroDelPago: '15', referencia: '1234', anio: 2026, mes: 3 }],
    };

    const { avisos } = await new ReporteDeSaldosPorProveedor(dependencias(consultas)).ejecutar(
      operadorDePrueba(),
      solicitud,
    );

    expect(avisos.map((aviso) => aviso.codigo)).toEqual(['cheque_cobrado_antes_de_su_fecha', 'nit_en_varias_fichas']);
    expect(avisos[0]!.mensaje).toContain('El cheque 1234 se cobró en el estado de cuenta de 03/2026');
  });
});

describe('ReporteDeDocumentosAUnaFecha', () => {
  const filtro = {
    autorizacion: 'todos' as const,
    vencidos: false,
    sinContrasena: false,
    conRetencionesPorPracticar: false,
  };

  it('lleva el filtro y la base del corte a la consulta y devuelve la página pedida', async () => {
    const consultas = new ConsultasDeLaPrueba();

    const reporte = await new ReporteDeDocumentosAUnaFecha(dependencias(consultas)).ejecutar(
      operadorDePrueba(),
      { ...filtro, vencidos: true, corte: '2026-02-28' },
      { pagina: 2, limite: 50 },
    );

    expect(consultas.filtro).toMatchObject({ vencidos: true, corte: '2026-02-28', fechaDeInicio: '2026-01-01' });
    expect(reporte).toMatchObject({ corte: '2026-02-28', total: 0, pagina: 2, limite: 50 });
  });

  it('sin página (Excel) no limita y respeta el mismo corte mínimo', async () => {
    const caso = new ReporteDeDocumentosAUnaFecha(dependencias(new ConsultasDeLaPrueba()));

    await expect(caso.ejecutar(operadorDePrueba(), filtro, null)).resolves.toMatchObject({ pagina: 1, limite: null });
    await expect(caso.ejecutar(operadorDePrueba(), { ...filtro, corte: '2025-01-01' }, null)).rejects.toMatchObject({
      codigo: 'corte_anterior_al_inicio',
    });
  });
});
