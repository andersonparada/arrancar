import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
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
import { AplicacionesEnMemoria, DocumentosEnMemoria } from '../../../pruebas/dobles-de-documentos.js';
import { AplicarNota } from './aplicar-nota.js';
import { ListarCargosParaAplicar } from './listar-cargos-para-aplicar.js';
import { QuitarAplicacion } from './quitar-aplicacion.js';

const operador = operadorDePrueba();
let aplicaciones: AplicacionesEnMemoria;
let documentos: DocumentosEnMemoria;
let fechas: FechasDeEntradaFijas;
let carga: CargaInicialFija;
let auditoria: AuditoriaEnMemoria;
let aplicar: AplicarNota;
let quitar: QuitarAplicacion;
let listar: ListarCargosParaAplicar;

beforeEach(() => {
  aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  fechas = new FechasDeEntradaFijas();
  carga = new CargaInicialFija();
  auditoria = new AuditoriaEnMemoria();
  const consultas = new ConsultasEnMemoria(documentos, aplicaciones);
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  aplicar = new AplicarNota({
    unidadDeTrabajo,
    documentos,
    consultas,
    aplicaciones,
    cargaInicial: carga,
    fechasDeEntrada: fechas,
    reloj: new RelojFijo('2026-06-01'),
  });
  quitar = new QuitarAplicacion({ unidadDeTrabajo, documentos, consultas, aplicaciones, auditoria });
  listar = new ListarCargosParaAplicar({
    unidadDeTrabajo,
    consultas,
    cargaInicial: carga,
    fechasDeEntrada: fechas,
    umbral: new UmbralFijo(),
  });
});

/** Siembra el documento con su recepción en el libro (`null` lo deja como un saldo inicial). */
function sembrar(cambios: Partial<DocumentoPorPagar>, recepcion: string | null = '2026-03-10'): DocumentoPorPagar {
  const documento = documentoSembrado(cambios);
  documentos.documentos.push(documento);
  fechas.recepciones.set(documento.id, recepcion);
  return documento;
}

const nota = (cambios: Partial<DocumentoPorPagar> = {}, recepcion: string | null = '2026-03-10') =>
  sembrar({ tipo: 'nota_de_credito', totalCentavos: 5000, vencimiento: null, ...cambios }, recepcion);

describe('AplicarNota', () => {
  it('aplica a varios cargos con forma manual, la fecha de hoy y la referencia recortada', async () => {
    const [a, b] = [sembrar({}), sembrar({})];
    const origen = nota();

    await aplicar.ejecutar(operador, {
      notaId: origen.id,
      referencia: ' Acuerdo 1 ',
      aplicaciones: [
        { cargoId: a!.id, monto: '30.00' },
        { cargoId: b!.id, monto: '20.00' },
      ],
    });

    expect(aplicaciones.lista.map(({ cargoId, montoCentavos }) => [cargoId, montoCentavos])).toEqual([
      [a!.id, 3000],
      [b!.id, 2000],
    ]);
    expect(aplicaciones.datos).toEqual([{ forma: 'manual', fecha: '2026-06-01', referencia: 'Acuerdo 1' }]);
  });

  it('rechaza el cargo de otro proveedor sin guardar nada', async () => {
    const propio = sembrar({});
    const ajeno = sembrar({ proveedorId: 'otro' });
    const origen = nota();

    await expect(
      aplicar.ejecutar(operador, {
        notaId: origen.id,
        aplicaciones: [
          { cargoId: propio.id, monto: '10.00' },
          { cargoId: ajeno.id, monto: '10.00' },
        ],
      }),
    ).rejects.toMatchObject({ codigo: 'cargo_no_disponible', detalles: { campo: 'aplicaciones.1.cargoId' } });
    expect(aplicaciones.lista).toEqual([]);
  });

  it('rechaza más que el saldo del cargo y más que el saldo libre, considerando lo ya aplicado', async () => {
    const cargo = sembrar({ totalCentavos: 3000 });
    const origen = nota();
    await expect(
      aplicar.ejecutar(operador, { notaId: origen.id, aplicaciones: [{ cargoId: cargo.id, monto: '30.01' }] }),
    ).rejects.toMatchObject({ codigo: 'aplicacion_mayor_que_el_saldo' });

    await aplicar.ejecutar(operador, { notaId: origen.id, aplicaciones: [{ cargoId: cargo.id, monto: '30.00' }] });
    const otro = sembrar({ totalCentavos: 9000 });
    await expect(
      aplicar.ejecutar(operador, { notaId: origen.id, aplicaciones: [{ cargoId: otro.id, monto: '20.01' }] }),
    ).rejects.toMatchObject({ codigo: 'aplicacion_mayor_que_el_saldo_libre' });
  });

  it('rechaza una nota anulada y una fecha futura o anterior a la recepción', async () => {
    const cargo = sembrar({});
    const anulada = nota({ estado: 'anulado' });
    const lineas = [{ cargoId: cargo.id, monto: '10.00' }];
    await expect(aplicar.ejecutar(operador, { notaId: anulada.id, aplicaciones: lineas })).rejects.toMatchObject({
      codigo: 'no_es_nota_con_saldo',
    });

    const vigente = nota();
    for (const fecha of ['2026-06-02', '2026-03-09']) {
      await expect(
        aplicar.ejecutar(operador, { notaId: vigente.id, fecha, aplicaciones: lineas }),
      ).rejects.toMatchObject({ codigo: 'fecha_de_aplicacion_invalida' });
    }
  });

  it('una nota de saldo inicial usa la fecha de inicio como mínima', async () => {
    const cargo = sembrar({});
    const saldoInicial = nota({ origen: 'saldo_inicial', documentoId: null }, null);
    const lineas = [{ cargoId: cargo.id, monto: '10.00' }];
    await expect(
      aplicar.ejecutar(operador, { notaId: saldoInicial.id, fecha: '2025-12-31', aplicaciones: lineas }),
    ).rejects.toMatchObject({ codigo: 'fecha_de_aplicacion_invalida' });

    await aplicar.ejecutar(operador, { notaId: saldoInicial.id, fecha: '2026-03-10', aplicaciones: lineas });
    expect(aplicaciones.lista).toHaveLength(1);
  });

  it('un saldo inicial pagado en parte solo admite su saldo al inicio', async () => {
    const saldoInicial = sembrar(
      { origen: 'saldo_inicial', documentoId: null, totalCentavos: 5000, saldoAlInicioCentavos: 3000 },
      null,
    );
    const origen = nota({ totalCentavos: 9000 });
    await expect(
      aplicar.ejecutar(operador, { notaId: origen.id, aplicaciones: [{ cargoId: saldoInicial.id, monto: '30.01' }] }),
    ).rejects.toMatchObject({ codigo: 'aplicacion_mayor_que_el_saldo' });

    await aplicar.ejecutar(operador, {
      notaId: origen.id,
      fecha: '2026-03-10',
      aplicaciones: [{ cargoId: saldoInicial.id, monto: '30.00' }],
    });
    expect(aplicaciones.aplicadoAl(saldoInicial)).toBe(3000);
  });
});

describe('QuitarAplicacion', () => {
  async function conUnaAplicacion(forma: 'automatica' | 'manual') {
    const cargo = sembrar({});
    const origen = nota();
    await aplicaciones.agregar(origen, [{ cargoId: cargo.id, montoCentavos: 2500 }], {
      forma,
      fecha: '2026-05-01',
      referencia: forma === 'manual' ? 'Acuerdo' : null,
    });
    return { cargo, origen, aplicacionId: aplicaciones.lista[0]!.id };
  }

  it('quita una manual y la audita con los dos documentos y el motivo', async () => {
    const { aplicacionId, origen, cargo } = await conUnaAplicacion('manual');

    await quitar.ejecutar(operador, { aplicacionId, motivo: ' Se pactó mal ' });

    expect(aplicaciones.lista).toEqual([]);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'cuentas-por-pagar.aplicaciones-de-notas',
        accion: 'quitar',
        registroId: aplicacionId,
        motivo: 'Se pactó mal',
        anterior: expect.objectContaining({
          monto: '25.00',
          referencia: 'Acuerdo',
          notaNumero: origen.numero,
          cargoNumero: cargo.numero,
        }),
      }),
    ]);
  });

  it('no quita una automática ni una que no existe, y pide motivo', async () => {
    const { aplicacionId } = await conUnaAplicacion('automatica');
    await expect(quitar.ejecutar(operador, { aplicacionId, motivo: 'x' })).rejects.toMatchObject({
      codigo: 'aplicacion_no_se_quita',
    });
    await expect(quitar.ejecutar(operador, { aplicacionId: 'no-existe', motivo: 'x' })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
    await expect(quitar.ejecutar(operador, { aplicacionId, motivo: '  ' })).rejects.toMatchObject({
      codigo: 'motivo_invalido',
    });
    expect(auditoria.entradas).toEqual([]);
  });
});

describe('ListarCargosParaAplicar', () => {
  it('ofrece primero los autorizados, propone el reparto y marca los que llegan al umbral', async () => {
    const registrado = sembrar({ vencimiento: '2026-04-01', totalCentavos: 4000 });
    const autorizado = sembrar({ estado: 'autorizado', vencimiento: '2026-09-01', totalCentavos: 3000000 });
    sembrar({ proveedorId: 'otro' });
    sembrar({ estado: 'anulado' });
    const origen = nota({ totalCentavos: 5000 });

    const resultado = await listar.ejecutar(operador, origen.id);

    expect(resultado.saldoLibre).toBe('50.00');
    expect(resultado.fechaMinima).toBe('2026-03-10');
    expect(
      resultado.cargos.map(({ id, propuesto, sobreUmbralDeBancarizacion }) => [
        id,
        propuesto,
        sobreUmbralDeBancarizacion,
      ]),
    ).toEqual([
      [autorizado.id, '50.00', true],
      [registrado.id, '0.00', false],
    ]);
  });

  it('una nota de saldo inicial parte de la fecha de inicio; una factura no es una nota', async () => {
    const saldoInicial = nota({ origen: 'saldo_inicial', documentoId: null }, null);
    expect((await listar.ejecutar(operador, saldoInicial.id)).fechaMinima).toBe('2026-01-01');
    const factura = sembrar({});
    await expect(listar.ejecutar(operador, factura.id)).rejects.toMatchObject({ codigo: 'no_es_nota_con_saldo' });
  });
});
