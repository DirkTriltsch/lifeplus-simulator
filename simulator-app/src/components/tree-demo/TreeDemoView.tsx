import { useMemo } from 'react';
import {
  simulatePersonTree,
  type SimulatorInputs,
} from '@mlm/simulator-core';
import { calculateTreeCompensation } from '@mlm/product-lifeplus';
import { ActivityAmpelDemo } from './ActivityAmpelDemo';
import { ClickToDrillDemo } from './ClickToDrillDemo';
import { LegCharacteristicsDemo } from './LegCharacteristicsDemo';
import { TimeLapseDemo } from './TimeLapseDemo';
import { VolumeBubblesDemo } from './VolumeBubblesDemo';

const DEMO_INPUTS: SimulatorInputs = {
  membersPerYear: 3,
  shoppersPerYear: 2,
  duplicationRate: 0.7,
  attritionRate: 0.18,
  memberMonthlyVolume: 200,
  shopperMonthlyVolume: 100,
  personalMonthlyVolume: 200,
  maxDirectMembersPerMember: 5,
};

const TOTAL_MONTHS = 60;
const FOCUS_MONTH_INDEX = 47;

export function TreeDemoView() {
  const snapshots = useMemo(
    () => simulatePersonTree(DEMO_INPUTS, TOTAL_MONTHS),
    [],
  );
  const focusSnapshot = snapshots[FOCUS_MONTH_INDEX] ?? snapshots[snapshots.length - 1];

  const compensation = useMemo(
    () =>
      calculateTreeCompensation(focusSnapshot, {
        rootPersonalMonthlyVolume:
          DEMO_INPUTS.personalMonthlyVolume ?? DEMO_INPUTS.memberMonthlyVolume,
      }),
    [focusSnapshot],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs uppercase tracking-wider text-gray-500">
          Personenbaum-Demo
        </p>
        <h1 className="mt-1 text-xl font-semibold text-gray-950">
          5 Features auf einen Blick
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Demo auf einem generierten Personenbaum (Default-Inputs, Monat{' '}
          {FOCUS_MONTH_INDEX + 1} fuer statische Demos, alle{' '}
          {snapshots.length} Monate fuer Time-Lapse).
          {' '}Daten kommen aus{' '}
          <code className="rounded bg-gray-100 px-1">simulatePersonTree</code>{' '}
          +{' '}
          <code className="rounded bg-gray-100 px-1">
            calculateTreeCompensation
          </code>
          .
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Snapshot: {focusSnapshot.persons.length} Personen-IDs (inkl.
          inaktive), Rang Root:{' '}
          <strong>{compensation.rankName}</strong>, QGV:{' '}
          {Math.round(compensation.qgv)} IP, aktive Direkt-Beine:{' '}
          {Math.round(compensation.directLegs)}.
        </p>
      </div>

      <ClickToDrillDemo snapshot={focusSnapshot} />
      <ActivityAmpelDemo snapshot={focusSnapshot} />
      <VolumeBubblesDemo snapshot={focusSnapshot} />
      <LegCharacteristicsDemo
        snapshot={focusSnapshot}
        compensation={compensation}
      />
      <TimeLapseDemo snapshots={snapshots} />
    </div>
  );
}
