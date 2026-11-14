import { beforeEach, describe, expect, it } from 'vitest';
import {
  CorrelativosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoPorPagar } from '../../../dominio/documento-por-pagar.js';
import { ConsultasEnMemoria } from '../../../pruebas/dobles-de-acciones.js';
import {
  CargaInicialFija,
  documentoSembrado,
  FechasDeEntradaFijas,
  UmbralFijo,
} from '../../../pruebas/dobles-de-aplicaciones.js';
import { ContrasenasEnMemoria } from '../../../pruebas/dobles-de-contrasenas.js';
import { AplicacionesEnMemoria, DocumentosEnMemoria } from '../../../pruebas/dobles-de-documentos.js';
import type { DatosDeLaEmpresa, LeyendaDeContrasenas } from '../../puertos/puertos-de-impresion-de-contrasenas.js';
import { CrearContrasena } from './crear-contrasena.js';
import { ObtenerImpresionDeContrasena } from './obtener-impresion-de-contrasena.js';
import { RegistrarImpresion } from './registrar-impresion.js';

const operador = operadorDePrueba();
let documentos: DocumentosEnMemoria;
let aplicaciones: AplicacionesEnMemoria;
let fechas: FechasDeEntradaFijas;
let contrasenas: ContrasenasEnMemoria;
let crear: CrearContrasena;
let ver: ObtenerImpresionDeContrasena;
let imprimir: RegistrarImpresion;
let leyenda = 'Pagos los viernes.';

const empresa: DatosDeLaEmpresa = {
  obtener: async () => ({ nombre: 'Rancho', nit: '1234567', razonSocial: 'Rancho S.A.', nombreComercial: 'El Rancho' }),
};
const textoDeLaLeyenda: LeyendaDeContrasenas = { texto: async () => leyenda };

beforeEach(() => {
  leyenda = 'Pagos los viernes.';
  aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  fechas = new FechasDeEntradaFijas();
  const consultas = new ConsultasEnMemoria(documentos, aplicaciones);
  contrasenas = new ContrasenasEnMemoria(consultas, aplicaciones);
  contrasenas.proveedoresConocidos.add('proveedor-1');
  const comunes = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-06-01'),
    contrasenas,
    umbral: new UmbralFijo(),
  };
  const paraImprimir = { ...comunes, empresa, leyenda: textoDeLaLeyenda };
  crear = new CrearContrasena({
    ...comunes,
    documentos,
    consultas,
    repositorio: contrasenas,
    fechasDeEntrada: fechas,
    proveedores: contrasenas,
    correlativos: new CorrelativosEnMemoria(),
    cargaInicial: new CargaInicialFija(),
  });
  ver = new ObtenerImpresionDeContrasena(paraImprimir);
  imprimir = new RegistrarImpresion({ ...paraImprimir, repositorio: contrasenas });
});

function sembrar(cambios: Partial<DocumentoPorPagar> = {}) {
  const documento = documentoSembrado(cambios);
  documentos.documentos.push(documento);
  fechas.recepciones.set(documento.id, '2026-03-10');
  return documento;
}

const hacer = (ids: string[]) =>
  crear.ejecutar(operador, { proveedorId: 'proveedor-1', fechaDePago: '2026-07-01', documentos: ids });

describe('la contraseña impresa', () => {
  it('lleva la empresa, el proveedor, lo fijo, lo vivo al día, las dos hojas y la leyenda', async () => {
    const nota = sembrar({ tipo: 'nota_de_credito', totalCentavos: 3000, vencimiento: null, serie: 'N', numero: '77' });
    const cargo = sembrar({ totalCentavos: 10000, retencionesCentavos: 500 });
    const creada = await hacer([cargo.id, nota.id]);

    const impresion = await ver.ejecutar(operador, creada.id);

    expect(impresion).toMatchObject({
      empresa: { nombre: 'Rancho', nit: '1234567', razonSocial: 'Rancho S.A.', nombreComercial: 'El Rancho' },
      contrasena: { numero: '1', fechaDePago: '2026-07-01', estado: 'vigente' },
      proveedor: { nombre: 'Proveedor', nit: '1234567' },
      alDia: '2026-06-01',
      leyenda: 'Pagos los viernes.',
      hayRetenciones: true,
      leyendaDeRetenciones: 'Las retenciones se documentan con su constancia.',
      impresoPorNombre: 'Quien imprime',
    });
    expect(impresion.hojas.map(({ rotulo, firmaElProveedor }) => [rotulo, firmaElProveedor])).toEqual([
      ['ORIGINAL — PROVEEDOR', false],
      ['COPIA — EMPRESA', true],
    ]);
    expect(impresion.cargos).toEqual([
      expect.objectContaining({ total: '100.00', retenciones: '5.00', rebajado: '30.00', saldo: '65.00' }),
    ]);
    expect(impresion.totales).toMatchObject({ total: '100.00', rebajado: '30.00', saldo: '65.00' });
    expect(impresion.compensaciones).toEqual([
      expect.objectContaining({ monto: '30.00', texto: 'Compensación con nota N-77 (saldo a favor)' }),
    ]);
  });

  it('sin retenciones no lleva la leyenda de constancias; la leyenda vacía no se imprime', async () => {
    leyenda = '   ';
    const creada = await hacer([sembrar({ retencionesCentavos: 0 }).id]);

    const impresion = await ver.ejecutar(operador, creada.id);

    expect(impresion).toMatchObject({ hayRetenciones: false, leyendaDeRetenciones: null, leyenda: null });
    expect(impresion.retencionesPorEmitir).toEqual([]);
  });

  it('un saldo inicial con retención por practicar la informa «por emitir» sin restarla del saldo', async () => {
    const saldo = sembrar({
      origen: 'saldo_inicial',
      totalCentavos: 112000,
      retencionesCentavos: 12000,
      saldoAlInicioCentavos: 70000,
      retencionesPorPracticarCentavos: 5000,
    });
    const creada = await hacer([saldo.id]);

    const impresion = await ver.ejecutar(operador, creada.id);

    expect(impresion.retencionesPorEmitir).toEqual([
      {
        documentoId: saldo.id,
        monto: '50.00',
        texto: 'Retención por emitir: Q50.00; se entregará su constancia',
      },
    ]);
    expect(impresion.cargos[0]).toMatchObject({ retenciones: '120.00', saldo: '700.00' });
    expect(impresion.hayRetenciones).toBe(true);
  });

  it('una anulada se imprime con su anulación', async () => {
    const creada = await hacer([sembrar().id]);
    contrasenas.guardadas[0]!.vigente = false;
    contrasenas.guardadas[0]!.anulacion = { anuladaPor: 'u', motivo: 'Error' };

    const impresion = await ver.ejecutar(operador, creada.id);

    expect(impresion).toMatchObject({ contrasena: { estado: 'anulada' }, anulacion: { motivo: 'Error' } });
  });

  it('una que no existe da no encontrada', async () => {
    await expect(ver.ejecutar(operador, 'nada')).rejects.toThrow(/no existe|no se encontr/i);
    await expect(imprimir.ejecutar(operador, 'nada')).rejects.toThrow(/no existe|no se encontr/i);
  });
});

describe('la marca de impresión', () => {
  it('la vista previa no gasta la primera impresión', async () => {
    const creada = await hacer([sembrar().id]);

    const previa = await ver.ejecutar(operador, creada.id);
    const otra = await ver.ejecutar(operador, creada.id);

    expect(previa.reimpresion).toBe(false);
    expect(otra.reimpresion).toBe(false);
    expect(contrasenas.guardadas[0]!.impresaEn).toBeUndefined();
  });

  it('la primera impresión no dice REIMPRESIÓN; la segunda sí, y la vista previa de ahí en adelante también', async () => {
    const creada = await hacer([sembrar().id]);

    const primera = await imprimir.ejecutar(operador, creada.id);
    const segunda = await imprimir.ejecutar(operador, creada.id);
    const previa = await ver.ejecutar(operador, creada.id);

    expect(primera.reimpresion).toBe(false);
    expect(segunda.reimpresion).toBe(true);
    expect(previa.reimpresion).toBe(true);
    expect(contrasenas.guardadas[0]!.impresaEn).toBe('2026-06-01T10:00:00.000Z');
  });
});
