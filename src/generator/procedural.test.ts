import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMicrodistrict } from './procedural';
import { DISTRICT_PRESETS } from './presets';
import { DistrictPresetId, GeneratorParams } from './types';

function makeDefaultParams(preset: DistrictPresetId = 'chertanovo', seed = 1980): GeneratorParams {
  return {
    preset,
    seed,
    ...DISTRICT_PRESETS[preset].defaultParams,
  };
}

test('deterministic procedural generation returns identical output for same seed', () => {
  const p1 = makeDefaultParams('chertanovo', 1980);
  const d1 = generateMicrodistrict(p1);
  const d2 = generateMicrodistrict(p1);

  assert.equal(d1.buildings.length, d2.buildings.length);
  assert.equal(d1.metrics.totalApartments, d2.metrics.totalApartments);
  assert.equal(d1.playgrounds.length, d2.playgrounds.length);
  assert.equal(d1.benchesAndUrns.length, d2.benchesAndUrns.length);
  assert.equal(d1.vegetation.length, d2.vegetation.length);
  assert.equal(d1.paths.length, d2.paths.length);
});

test('all four late-Soviet Moscow presets generate distinct series, facade variants, social infra, and landscaping', () => {
  const presets: DistrictPresetId[] = ['chertanovo', 'belyayevo', 'yasenevo', 'zyuzino'];

  for (const preset of presets) {
    const district = generateMicrodistrict(makeDefaultParams(preset, 1979));

    // Buildings & Social infrastructure (schools, kindergartens, polyclinics, universam, produkti)
    assert.ok(district.buildings.length >= 14, `${preset} should have at least 14 buildings`);
    assert.ok(district.metrics.residentialBuildings >= 8);
    assert.ok(district.metrics.socialBuildings >= 5, `${preset} should include full social infrastructure`);
    assert.ok(district.metrics.schoolsCount >= 1, `${preset} should have a school`);
    assert.ok(district.metrics.kindergartensCount >= 1, `${preset} should have a kindergarten`);
    assert.ok(district.metrics.polyclinicsCount >= 1, `${preset} should have a polyclinic`);
    assert.ok(district.metrics.storesCount >= 2, `${preset} should have Universam and Produkti store`);

    // Verify every building has a valid yearBuilt and facadeVariant
    for (const b of district.buildings) {
      assert.ok(b.yearBuilt >= 1965 && b.yearBuilt <= 1995);
      assert.ok(b.facadeVariant && b.facadeVariant.primaryColor);
    }

    // Playgrounds with characteristic Soviet play equipment
    assert.ok(district.playgrounds.length >= 4, `${preset} should have courtyard playgrounds`);
    assert.ok(district.metrics.playEquipmentCount >= 14, `${preset} should have characteristic play equipment`);

    // Benches & Urns
    assert.ok(district.benchesAndUrns.length >= 15, `${preset} should generate benches and urns`);
    assert.ok(district.metrics.urnsCount >= 10, `${preset} should include street urns`);

    // Pedestrian sidewalks & courtyard walkways
    assert.ok(district.paths.length >= 15, `${preset} should generate pedestrian paths`);
    assert.ok(district.metrics.pedestrianPathsLengthMeters > 500);

    // Trees & Shrubs
    assert.ok(district.metrics.treesCount >= 20, `${preset} should have trees (poplars, birches, maples)`);
    assert.ok(district.metrics.shrubsCount >= 10, `${preset} should have shrubs (lilac, hedgerows)`);
  }
});

test('landscaping and social infrastructure sliders scale counts appropriately', () => {
  const lowParams: GeneratorParams = {
    ...makeDefaultParams('belyayevo', 42),
    socialInfraLevel: 0.55,
    courtyardComplexity: 0.35,
    greeneryDensity: 0.25,
    sidewalkDensity: 0.35,
  };
  const highParams: GeneratorParams = {
    ...makeDefaultParams('belyayevo', 42),
    socialInfraLevel: 0.95,
    courtyardComplexity: 0.95,
    greeneryDensity: 0.95,
    sidewalkDensity: 0.95,
  };

  const lowDistrict = generateMicrodistrict(lowParams);
  const highDistrict = generateMicrodistrict(highParams);

  assert.ok(
    highDistrict.metrics.socialBuildings > lowDistrict.metrics.socialBuildings,
    'higher socialInfraLevel adds more social facilities'
  );
  assert.ok(
    highDistrict.metrics.playEquipmentCount > lowDistrict.metrics.playEquipmentCount,
    'higher courtyardComplexity increases play equipment count'
  );
  assert.ok(
    highDistrict.metrics.benchesCount > lowDistrict.metrics.benchesCount,
    'higher courtyardComplexity increases benches count'
  );
  assert.ok(
    highDistrict.metrics.treesCount + highDistrict.metrics.shrubsCount >
      lowDistrict.metrics.treesCount + lowDistrict.metrics.shrubsCount,
    'higher greeneryDensity increases vegetation count'
  );
  assert.ok(
    highDistrict.metrics.pedestrianPathsLengthMeters >
      lowDistrict.metrics.pedestrianPathsLengthMeters,
    'higher sidewalkDensity increases total pedestrian path length'
  );
});
