import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { CausaDeBajaNoPermitida, BajaInvalida, BajaParcialNoDisponible } from '../../../dominio/errores-de-baja.js';
import { FechaDeBajaAnteriorAlUso } from '../../../dominio/errores-de-baja.js';
import { ActivoDadoDeBaja, ActivoNoEnUso } from '../../../dominio/errores-de-activo.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import { FechaAnteriorAlUltimoTraslado } from '../../../dominio/errores-de-traslado.js';
import { Traslado } from '../../../dominio/traslado.js';
import {
  armarBajas,
  solicitudDeBaja,
  solicitudDeVenta,
  type EscenarioDeBajas,
} from '../../../pruebas/escenario-de-bajas.soporte.js';

let e: EscenarioDeBajas;

beforeEach(() => {
  e = armarBajas();
});

describe('DarDeBaja: lo que se congela', () => {
  it('congela costo, acumuladas y valor en libros con los meses abiertos que van antes, y deja el activo dado de baja', async () => {
    const camioneta = await e.activoEnUso();

    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));

    expect(baja).toMatchObject({
      numero: 1,
      causa: 'destruccion',
      costo: '250000.00',
      depreciacionAcumuladaContable: '11250.00',
      valorEnLibros: '238750.00',
      costoFiscal: '250000.00',
      baseFiscal: '250000.00',
      cuotaDelMesContable: '0.00',
      cuotaDelMesFiscal: '0.00',
      resultadoContable: null,
      resultadoFiscal: null,
      estado: 'vigente',
    });
    expect(Number(baja.depreciacionAcumuladaFiscal)).toBeGreaterThan(12499);
    expect(Number(baja.valorFiscalPorDepreciar)).toBe(250000 - Number(baja.depreciacionAcumuladaFiscal));
    expect(e.estadoDe(camioneta)).toMatchObject({ estado: 'dado_de_baja', fechaDeBaja: '2027-06-10' });
    expect(e.publicador.nombres()).toEqual(['activos-fijos.activo_dado_de_baja']);
  });

  it('con meses cerrados da lo mismo que proyectándolos', async () => {
    const camioneta = await e.activoEnUso();
    e.cierres.ultimoMes = '2027-05-01';
    const tramos = await e.tramos.vigentesConIdDeActivo(camioneta.id.valor);
    const depreciadoPorTramo = new Map(
      tramos.map((tramo) => [tramo.id, tramo.libro === 'contable' ? 1125000 : 1250000]),
    );
    e.historial.porActivo.set(camioneta.id.valor, {
      depreciadoPorTramo,
      acumuladaCentavos: { contable: 1125000, fiscal: 1250000 },
    });

    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));

    expect(baja).toMatchObject({ depreciacionAcumuladaContable: '11250.00', depreciacionAcumuladaFiscal: '12500.00' });
  });

  it('con primer mes «mes siguiente» el mes de la baja sí se deprecia y su cuota queda aparte', async () => {
    e.primerMes.regla = 'mes_siguiente';
    const camioneta = await e.activoEnUso();

    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));

    expect(baja).toMatchObject({
      depreciacionAcumuladaContable: '11250.00',
      cuotaDelMesContable: '3750.00',
      valorEnLibros: '238750.00',
    });
    expect(Number(baja.cuotaDelMesFiscal)).toBeGreaterThan(4166);
  });

  it('dar de baja en el mismo mes en que se puso en uso no depreciaba nada con «mes de inicio»', async () => {
    const camioneta = await e.activoEnUso();

    const baja = await e.darDeBaja(solicitudDeBaja(camioneta, { fecha: '2027-03-20' }));

    expect(baja).toMatchObject({ depreciacionAcumuladaContable: '0.00', valorEnLibros: '250000.00' });
  });

  it('un terreno no se deprecia: su valor en libros es el costo', async () => {
    const terreno = await e.activoEnUso({ inciso: 'terrenos', porcentaje: '0.00', monto: '900000.00' });

    const baja = await e.darDeBaja(solicitudDeBaja(terreno, { causa: 'otra' }));

    expect(baja).toMatchObject({
      costo: '900000.00',
      depreciacionAcumuladaContable: '0.00',
      valorEnLibros: '900000.00',
    });
  });

  it('el costo fiscal no lleva el tope del inmueble: el exceso sobre la matrícula se queda en el costo fiscal (A1)', async () => {
    const bodega = await e.activoEnUso({
      inciso: 'edificios',
      porcentaje: '5.00',
      monto: '1000000.00',
      datos: { valorDeMatricula: '600000.00' },
    });

    const baja = await e.darDeBaja(solicitudDeBaja(bodega, { causa: 'destruccion' }));

    expect(baja).toMatchObject({ costo: '1000000.00', costoFiscal: '1000000.00', baseFiscal: '600000.00' });
  });
});

describe('DarDeBaja: otros tipos de bien y componentes', () => {
  it('un bien de control lleva los montos en cero', async () => {
    const clase = await e.claseDe('herramientas', '25.00');
    const taladro = await e.activoConCosto(clase, '800.00', { tipoDeRegistro: 'bien_de_control' });

    const baja = await e.darDeBaja(solicitudDeBaja(taladro, { causa: 'robo', numeroDeDenuncia: 'MP001-2027-1' }));

    expect(baja).toMatchObject({
      costo: '0.00',
      valorEnLibros: '0.00',
      costoFiscal: '0.00',
      numeroDeDenuncia: 'MP001-2027-1',
    });
  });

  it('un bien de terceros solo se devuelve a su dueño, no se vende ni se dona', async () => {
    const clase = await e.claseDe('herramientas', '25.00');
    const prestado = await e.activoConCosto(clase, null, {
      tipoDeRegistro: 'de_terceros',
      propietario: 'Vecino',
      formaDeTenencia: 'comodato',
      origen: null,
    });

    await expect(e.darDeBaja(solicitudDeBaja(prestado, { causa: 'donacion' }))).rejects.toBeInstanceOf(
      CausaDeBajaNoPermitida,
    );
    const baja = await e.darDeBaja(solicitudDeBaja(prestado, { causa: 'devuelto_al_dueno' }));
    expect(baja.causa).toBe('devuelto_al_dueno');
  });

  it('«devuelto al dueño» no vale para un activo propio', async () => {
    const camioneta = await e.activoEnUso();

    await expect(e.darDeBaja(solicitudDeBaja(camioneta, { causa: 'devuelto_al_dueno' }))).rejects.toBeInstanceOf(
      CausaDeBajaNoPermitida,
    );
  });

  it('un activo principal se da de baja con sus componentes, con la misma acta, y avisa', async () => {
    const otro = await e.activoEnUso({ monto: '40000.00' });
    const principal = await e.activoEnUso();
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const hijo = await e.activoConCosto(clase, '10000.00', { activoPadreId: principal.id.valor });
    await e.poner(hijo);

    const baja = await e.darDeBaja(solicitudDeBaja(principal));

    expect(baja.componentes).toMatchObject([{ codigo: hijo.instantanea().codigo }]);
    expect(baja.avisos.map((aviso) => aviso.codigo)).toContain('con_componentes');
    expect(e.estadoDe(hijo)).toMatchObject({ estado: 'dado_de_baja', fechaDeBaja: '2027-06-10' });
    const actas = [...e.bajas.registros.values()].map((registro) => registro.instantanea().numero);
    expect(actas).toEqual([1, 1]);
    expect(e.estadoDe(otro).estado).toBe('en_uso');
  });

  it('un componente se puede dar de baja solo', async () => {
    const principal = await e.activoEnUso();
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const motor = await e.activoConCosto(clase, '10000.00', { activoPadreId: principal.id.valor });
    await e.poner(motor);

    await e.darDeBaja(solicitudDeBaja(motor));

    expect(e.estadoDe(motor).estado).toBe('dado_de_baja');
    expect(e.estadoDe(principal).estado).toBe('en_uso');
  });
});

describe('DarDeBaja: avisos', () => {
  it('avisa si falta el acta; robo o extravío sin denuncia; donación y faltante con IVA', async () => {
    const robado = await e.activoEnUso();
    const donado = await e.activoEnUso();
    const faltante = await e.activoEnUso();

    const robo = await e.darDeBaja(solicitudDeBaja(robado, { causa: 'robo' }));
    const donacion = await e.darDeBaja(solicitudDeBaja(donado, { causa: 'donacion', destinoDelBien: 'Escuela' }));
    const falta = await e.darDeBaja(solicitudDeBaja(faltante, { causa: 'faltante_de_inventario' }));

    expect(robo.avisos.map((aviso) => aviso.codigo)).toEqual(['sin_acta', 'sin_denuncia']);
    expect(donacion.avisos.map((aviso) => aviso.codigo)).toEqual(['sin_acta', 'donacion_con_iva']);
    expect(falta.avisos.map((aviso) => aviso.codigo)).toEqual(['sin_acta', 'faltante_con_iva']);
    expect(donacion.avisos[1]!.mensaje).toContain('puede generar débito de IVA');
  });

  it('un número de denuncia basta para no avisar de la denuncia', async () => {
    const robado = await e.activoEnUso();

    const robo = await e.darDeBaja(solicitudDeBaja(robado, { causa: 'extravio', numeroDeDenuncia: 'PNC-55' }));

    expect(robo.avisos.map((aviso) => aviso.codigo)).toEqual(['sin_acta']);
  });
});

describe('DarDeBaja: lo que rechaza', () => {
  it('una venta no se registra como baja', async () => {
    const camioneta = await e.activoEnUso();

    await expect(e.darDeBaja(solicitudDeVenta(camioneta))).rejects.toBeInstanceOf(BajaInvalida);
  });

  it('un activo que no existe', async () => {
    const camioneta = await e.activoEnUso();
    const solicitud = solicitudDeBaja(camioneta, { activoId: '99999999-9999-4999-8999-999999999999' });

    await expect(e.darDeBaja(solicitud)).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('un activo en construcción o ya dado de baja', async () => {
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const obra = await e.activoConCosto(clase, '1000.00');
    const camioneta = await e.activoEnUso();
    await e.darDeBaja(solicitudDeBaja(camioneta));

    await expect(e.darDeBaja(solicitudDeBaja(obra))).rejects.toBeInstanceOf(ActivoNoEnUso);
    await expect(e.darDeBaja(solicitudDeBaja(camioneta))).rejects.toBeInstanceOf(ActivoDadoDeBaja);
  });

  it('fecha futura, anterior al uso o de un mes cerrado', async () => {
    const camioneta = await e.activoEnUso();

    await expect(e.darDeBaja(solicitudDeBaja(camioneta, { fecha: '2027-07-01' }))).rejects.toBeInstanceOf(BajaInvalida);
    await expect(e.darDeBaja(solicitudDeBaja(camioneta, { fecha: '2027-03-01' }))).rejects.toBeInstanceOf(
      FechaDeBajaAnteriorAlUso,
    );
    e.cierres.ultimoMes = '2027-06-01';
    await expect(e.darDeBaja(solicitudDeBaja(camioneta))).rejects.toBeInstanceOf(MesCerrado);
  });

  it('una fecha anterior al último traslado', async () => {
    const camioneta = await e.activoEnUso();
    const boleta = { grupoId: crypto.randomUUID(), numero: 1, anioDeNumero: 2027 };
    const traslado = Traslado.registrar(
      { empresaId: camioneta.instantanea().empresaId, activoId: camioneta.id.valor, ...boleta },
      {
        fecha: '2027-06-12',
        localidadId: null,
        departamentoId: null,
        responsable: null,
        aBodega: false,
        recibidoPor: 'Ana',
        motivo: 'Entrega',
      },
      '2027-06-15',
    );
    await e.traslados.agregarVarios([traslado]);

    await expect(e.darDeBaja(solicitudDeBaja(camioneta))).rejects.toBeInstanceOf(FechaAnteriorAlUltimoTraslado);
  });

  it('la baja de solo una parte de un grupo (llega con AFI-6) y los datos sin descripción o sin quien autoriza', async () => {
    const sillas = await e.activoEnUso({ datos: { cantidad: 30 } });

    await expect(e.darDeBaja(solicitudDeBaja(sillas, { cantidad: 3 }))).rejects.toBeInstanceOf(BajaParcialNoDisponible);
    await expect(e.darDeBaja(solicitudDeBaja(sillas, { descripcion: '  ' }))).rejects.toBeInstanceOf(BajaInvalida);
    await expect(e.darDeBaja(solicitudDeBaja(sillas, { autorizadaPor: '' }))).rejects.toBeInstanceOf(BajaInvalida);
  });
});
