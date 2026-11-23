import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { LocalidadInactiva, MedicionConFechaFutura, ParcelaInvalida } from '../../../dominio/errores-de-parcela.js';
import {
  AvisosDeParcelaEnMemoria,
  ConfiguracionDeParcelasFija,
  LigasEnMemoria,
  MedicionesEnMemoria,
  ParcelasEnMemoria,
} from '../../../pruebas/dobles-de-parcelas.js';
import type { SolicitudDeMedicion } from '../../dto/medicion.dto.js';
import type { SolicitudDeParcela } from '../../dto/parcela.dto.js';
import { AuditoriaEnMemoria } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { RegistrarMedicion } from '../mediciones/registrar-medicion.js';
import { CrearParcela } from './crear-parcela.js';

const operador = operadorDePrueba();
const localidadId = randomUUID();

const medicion = (cambios: Partial<SolicitudDeMedicion> = {}): SolicitudDeMedicion => ({
  vigenteDesde: '2026-01-01',
  fuente: 'escritura',
  cantidadOriginal: '2',
  unidadOriginal: 'manzana',
  varasPorLadoDeCuerda: null,
  cantidadUtil: null,
  documento: null,
  ...cambios,
});

const solicitud = (cambios: Partial<SolicitudDeParcela> = {}): SolicitudDeParcela => ({
  localidadId,
  parcelaMadreId: null,
  tipoId: randomUUID(),
  codigo: 'P1',
  nombre: 'Potrero 1',
  formaDeTenencia: 'propia',
  latitud: null,
  longitud: null,
  colindanciaNorte: null,
  colindanciaSur: null,
  colindanciaOriente: null,
  colindanciaPoniente: null,
  observaciones: null,
  inmuebles: [],
  medicion: null,
  ...cambios,
});

function armar() {
  const parcelas = new ParcelasEnMemoria();
  const mediciones = new MedicionesEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: parcelas,
    consultas: parcelas,
    ligas: new LigasEnMemoria(),
    mediciones,
    consultasDeMediciones: mediciones,
    configuracion: new ConfiguracionDeParcelasFija(2),
    avisos: new AvisosDeParcelaEnMemoria(),
    reloj: new RelojFijo('2026-11-23'),
    auditoria: new AuditoriaEnMemoria(),
  };
  return {
    parcelas,
    crear: new CrearParcela(dependencias),
    registrarMedicion: new RegistrarMedicion(dependencias),
  };
}

describe('reglas al crear parcelas', () => {
  it('no crea parcelas en una localidad inactiva', async () => {
    const { parcelas, crear } = armar();
    parcelas.localidadesInactivas.add(localidadId);

    await expect(crear.ejecutar(operador, solicitud())).rejects.toThrow(LocalidadInactiva);
    expect(parcelas.registros.size).toBe(0);
  });

  it('no deja repetir un inmueble en la misma parcela', async () => {
    const { crear } = armar();
    const inmuebleId = randomUUID();
    const ligas = [
      { inmuebleId, superficieM2: null },
      { inmuebleId, superficieM2: null },
    ];

    await expect(crear.ejecutar(operador, solicitud({ inmuebles: ligas }))).rejects.toThrow(ParcelaInvalida);
  });
});

describe('fecha de las mediciones', () => {
  it('una medición con fecha futura se rechaza, al crear y al registrar; la de hoy se acepta', async () => {
    const { crear, registrarMedicion } = armar();
    const futura = medicion({ vigenteDesde: '2026-11-24' });
    const parcela = await crear.ejecutar(operador, solicitud());

    await expect(registrarMedicion.ejecutar(operador, { parcelaId: parcela.id, solicitud: futura })).rejects.toThrow(
      MedicionConFechaFutura,
    );
    await expect(crear.ejecutar(operador, solicitud({ codigo: 'P2', medicion: futura }))).rejects.toThrow(
      MedicionConFechaFutura,
    );
    const ficha = await registrarMedicion.ejecutar(operador, {
      parcelaId: parcela.id,
      solicitud: medicion({ vigenteDesde: '2026-11-23' }),
    });
    expect(ficha.mediciones).toHaveLength(1);
  });
});
