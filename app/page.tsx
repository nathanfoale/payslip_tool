"use client";

import { useEffect, useMemo, useState } from "react";

type Shift = {
  day: string;
  shortDay: string;
  enabled: boolean;
  start: string;
  end: string;
  breakMode: "auto" | "0" | "30" | "45" | "60";
  publicHoliday: boolean;
};

type PaySettings = {
  hourlyRate: number;
  contractRange: "15-19" | "19-23" | "23-27" | "27-32";
  esppPercent: number;
  payCycle: "weekly" | "fortnightly";
  applyOvertime: boolean;
};

type EsppScenario = {
  offeringPeriod: "feb-jul" | "aug-jan";
  offeringStartPrice: number;
  purchaseDatePrice: number;
  savingsRate: number;
};

type CalculatedShift = Shift & {
  paidHours: number;
  spanHours: number;
  breakMinutes: number;
  gross: number;
  turnaroundWarning: boolean;
};

type PayBucket = {
  multiplier: number;
  label: string;
  hours: number;
  amount: number;
  className: string;
};

const STORAGE_KEY = "payday-plan-v1";
const SLOT_MINUTES = 15;

const INITIAL_WEEK_SHIFTS: Shift[] = [
  {
    day: "Saturday",
    shortDay: "Sat",
    enabled: true,
    start: "09:00",
    end: "17:00",
    breakMode: "auto",
    publicHoliday: false,
  },
  {
    day: "Sunday",
    shortDay: "Sun",
    enabled: true,
    start: "09:00",
    end: "17:00",
    breakMode: "auto",
    publicHoliday: false,
  },
  {
    day: "Monday",
    shortDay: "Mon",
    enabled: true,
    start: "09:00",
    end: "17:00",
    breakMode: "auto",
    publicHoliday: false,
  },
  {
    day: "Tuesday",
    shortDay: "Tue",
    enabled: false,
    start: "09:00",
    end: "17:00",
    breakMode: "auto",
    publicHoliday: false,
  },
  {
    day: "Wednesday",
    shortDay: "Wed",
    enabled: false,
    start: "09:00",
    end: "17:00",
    breakMode: "auto",
    publicHoliday: false,
  },
  {
    day: "Thursday",
    shortDay: "Thu",
    enabled: false,
    start: "09:00",
    end: "17:00",
    breakMode: "auto",
    publicHoliday: false,
  },
  {
    day: "Friday",
    shortDay: "Fri",
    enabled: false,
    start: "09:00",
    end: "17:00",
    breakMode: "auto",
    publicHoliday: false,
  },
];

const SECOND_WEEK_SHIFTS: Shift[] = INITIAL_WEEK_SHIFTS.map((shift) => ({
  ...shift,
  enabled: false,
  publicHoliday: false,
}));

const INITIAL_SHIFTS: Shift[] = [
  ...INITIAL_WEEK_SHIFTS,
  ...SECOND_WEEK_SHIFTS,
];

const INITIAL_SETTINGS: PaySettings = {
  hourlyRate: 32.88,
  contractRange: "15-19",
  esppPercent: 10,
  payCycle: "weekly",
  applyOvertime: true,
};

const INITIAL_ESPP_SCENARIO: EsppScenario = {
  offeringPeriod: "feb-jul",
  offeringStartPrice: 0,
  purchaseDatePrice: 0,
  savingsRate: 4.5,
};

const OFFERING_PERIODS = {
  "feb-jul": {
    label: "1 February – 31 July",
    shortLabel: "Feb 1 → Jul 31",
    startDate: "Feb 1",
    purchaseDate: "Jul 31",
  },
  "aug-jan": {
    label: "1 August – 31 January",
    shortLabel: "Aug 1 → Jan 31",
    startDate: "Aug 1",
    purchaseDate: "Jan 31",
  },
} as const;

const CONTRACT_RANGES = {
  "15-19": { min: 15, max: 19 },
  "19-23": { min: 19, max: 23 },
  "23-27": { min: 23, max: 27 },
  "27-32": { min: 27, max: 32 },
};

const PAY_BUCKETS = [
  { multiplier: 1, label: "Ordinary", className: "ordinary" },
  { multiplier: 1.25, label: "Late night", className: "late" },
  { multiplier: 1.5, label: "Weekend / OT", className: "weekend" },
  { multiplier: 2, label: "200% premium", className: "double" },
  { multiplier: 2.5, label: "Public holiday", className: "holiday" },
] as const;

const currency = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat("en-AU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getSpanMinutes(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return endMinutes - startMinutes;
}

function getAutoBreakMinutes(spanMinutes: number) {
  const hours = spanMinutes / 60;
  if (hours > 5) return 30;
  return 0;
}

function getBreakMinutes(shift: Shift) {
  if (shift.breakMode === "auto") {
    return getAutoBreakMinutes(getSpanMinutes(shift.start, shift.end));
  }
  return Number(shift.breakMode);
}

function estimateAnnualTax(annualIncome: number) {
  let incomeTax = 0;

  if (annualIncome > 190_000) {
    incomeTax = 51_370 + (annualIncome - 190_000) * 0.45;
  } else if (annualIncome > 135_000) {
    incomeTax = 31_020 + (annualIncome - 135_000) * 0.37;
  } else if (annualIncome > 45_000) {
    incomeTax = 4_020 + (annualIncome - 45_000) * 0.3;
  } else if (annualIncome > 18_200) {
    incomeTax = (annualIncome - 18_200) * 0.15;
  }

  const medicare = annualIncome > 27_222 ? annualIncome * 0.02 : 0;
  return incomeTax + medicare;
}

function futureValueOfContributions(
  contribution: number,
  contributionCount: number,
  annualRate: number,
  contributionsPerYear: number,
) {
  if (contribution <= 0 || contributionCount <= 0) return 0;
  const periodicRate =
    Math.pow(1 + Math.max(0, annualRate) / 100, 1 / contributionsPerYear) - 1;
  if (periodicRate === 0) return contribution * contributionCount;
  return (
    contribution *
    ((Math.pow(1 + periodicRate, contributionCount) - 1) / periodicRate)
  );
}

function multiplierForSlot(
  absoluteMinute: number,
  shift: Shift,
  shiftDayIndex: number,
) {
  if (shift.publicHoliday) return 2.5;

  const calendarDayIndex = Math.floor(absoluteMinute / (24 * 60));
  const weekdayIndex = ((calendarDayIndex % 7) + 7) % 7;
  if (weekdayIndex === 0 || weekdayIndex === 1) return 1.5;

  const minuteOfDay =
    ((absoluteMinute % (24 * 60)) + 24 * 60) % (24 * 60);
  if (minuteOfDay >= 22 * 60 || minuteOfDay < 6 * 60) return 2;
  if (minuteOfDay >= 18 * 60 && minuteOfDay < 22 * 60) return 1.25;

  return shiftDayIndex >= 0 ? 1 : 1;
}

function calculatePlan(
  shifts: Shift[],
  settings: PaySettings,
): {
  calculatedShifts: CalculatedShift[];
  buckets: PayBucket[];
  periodGross: number;
  periodHours: number;
  weeklyHours: number[];
  turnaroundDays: Set<number>;
} {
  const enabledIntervals = shifts
    .map((shift, index) => {
      if (!shift.enabled) return null;
      const start = index * 24 * 60 + timeToMinutes(shift.start);
      const end = start + getSpanMinutes(shift.start, shift.end);
      return { index, start, end };
    })
    .filter(
      (interval): interval is { index: number; start: number; end: number } =>
        interval !== null,
    );

  const turnaroundDays = new Set<number>();
  enabledIntervals.forEach((interval, position) => {
    const previous = enabledIntervals[position - 1];
    if (previous && interval.start - previous.end < 12 * 60) {
      turnaroundDays.add(interval.index);
    }
  });

  const contractMax = CONTRACT_RANGES[settings.contractRange].max;
  const weekCount = Math.ceil(shifts.length / 7);
  const weeklyPaidMinutes = Array<number>(weekCount).fill(0);
  const weeklyOvertimeMinutes = Array<number>(weekCount).fill(0);
  let periodPaidMinutes = 0;
  const bucketTotals = new Map<number, { hours: number; amount: number }>();
  const dayGross = new Map<number, number>();
  const dayPaidMinutes = new Map<number, number>();

  shifts.forEach((shift, shiftIndex) => {
    if (!shift.enabled) return;

    const weekIndex = Math.floor(shiftIndex / 7);
    const spanMinutes = getSpanMinutes(shift.start, shift.end);
    const breakMinutes = Math.min(getBreakMinutes(shift), spanMinutes);
    const start = shiftIndex * 24 * 60 + timeToMinutes(shift.start);
    const end = start + spanMinutes;
    const midpoint = start + spanMinutes / 2;
    const breakStart =
      Math.round((midpoint - breakMinutes / 2) / SLOT_MINUTES) * SLOT_MINUTES;
    const breakEnd = breakStart + breakMinutes;
    let paidMinutesThisShift = 0;

    for (let minute = start; minute < end; minute += SLOT_MINUTES) {
      const slotEnd = Math.min(minute + SLOT_MINUTES, end);
      const slotMinutes = slotEnd - minute;
      const isUnpaidBreak =
        breakMinutes > 0 && minute >= breakStart && minute < breakEnd;
      if (isUnpaidBreak) continue;

      let multiplier = multiplierForSlot(minute, shift, shiftIndex);
      const weeklyOvertime =
        weeklyPaidMinutes[weekIndex] >= contractMax * 60 &&
        settings.applyOvertime;
      const dailyOvertime =
        paidMinutesThisShift >= 10 * 60 && settings.applyOvertime;

      if (weeklyOvertime || dailyOvertime) {
        const overtimeMultiplier =
          weeklyOvertimeMinutes[weekIndex] < 2 * 60 ? 1.5 : 2;
        multiplier = Math.max(multiplier, overtimeMultiplier);
        weeklyOvertimeMinutes[weekIndex] += slotMinutes;
      }

      if (turnaroundDays.has(shiftIndex)) {
        multiplier = Math.max(multiplier, 2);
      }

      const slotHours = slotMinutes / 60;
      const slotAmount = slotHours * settings.hourlyRate * multiplier;
      const existing = bucketTotals.get(multiplier) ?? { hours: 0, amount: 0 };
      bucketTotals.set(multiplier, {
        hours: existing.hours + slotHours,
        amount: existing.amount + slotAmount,
      });
      dayGross.set(shiftIndex, (dayGross.get(shiftIndex) ?? 0) + slotAmount);
      dayPaidMinutes.set(
        shiftIndex,
        (dayPaidMinutes.get(shiftIndex) ?? 0) + slotMinutes,
      );
      paidMinutesThisShift += slotMinutes;
      weeklyPaidMinutes[weekIndex] += slotMinutes;
      periodPaidMinutes += slotMinutes;
    }
  });

  const calculatedShifts: CalculatedShift[] = shifts.map((shift, index) => {
    const spanMinutes = shift.enabled
      ? getSpanMinutes(shift.start, shift.end)
      : 0;
    return {
      ...shift,
      spanHours: spanMinutes / 60,
      paidHours: (dayPaidMinutes.get(index) ?? 0) / 60,
      breakMinutes: getBreakMinutes(shift),
      gross: dayGross.get(index) ?? 0,
      turnaroundWarning: turnaroundDays.has(index),
    };
  });

  const buckets: PayBucket[] = PAY_BUCKETS.map((bucket) => {
    const total = bucketTotals.get(bucket.multiplier) ?? {
      hours: 0,
      amount: 0,
    };
    return { ...bucket, ...total };
  });

  return {
    calculatedShifts,
    buckets,
    periodGross: buckets.reduce((sum, bucket) => sum + bucket.amount, 0),
    periodHours: periodPaidMinutes / 60,
    weeklyHours: weeklyPaidMinutes.map((minutes) => minutes / 60),
    turnaroundDays,
  };
}

export default function Home() {
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [settings, setSettings] = useState<PaySettings>(INITIAL_SETTINGS);
  const [esppScenario, setEsppScenario] = useState<EsppScenario>(
    INITIAL_ESPP_SCENARIO,
  );
  const [storageReady, setStorageReady] = useState(false);
  const [copyState, setCopyState] = useState("Copy summary");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          shifts?: Shift[];
          settings?: Partial<PaySettings>;
          esppScenario?: Partial<EsppScenario>;
        };
        if (parsed.shifts?.length === 14) {
          setShifts(parsed.shifts);
        } else if (parsed.shifts?.length === 7) {
          setShifts([
            ...parsed.shifts.map((shift) => ({ ...shift })),
            ...SECOND_WEEK_SHIFTS,
          ]);
        }
        if (parsed.settings) {
          setSettings({
            hourlyRate:
              parsed.settings.hourlyRate ?? INITIAL_SETTINGS.hourlyRate,
            contractRange:
              parsed.settings.contractRange ?? INITIAL_SETTINGS.contractRange,
            esppPercent: Math.min(
              10,
              Math.max(
                0,
                parsed.settings.esppPercent ?? INITIAL_SETTINGS.esppPercent,
              ),
            ),
            payCycle:
              parsed.settings.payCycle ?? INITIAL_SETTINGS.payCycle,
            applyOvertime:
              parsed.settings.applyOvertime ?? INITIAL_SETTINGS.applyOvertime,
          });
        }
        if (parsed.esppScenario) {
          setEsppScenario({
            offeringPeriod:
              parsed.esppScenario.offeringPeriod ??
              INITIAL_ESPP_SCENARIO.offeringPeriod,
            offeringStartPrice: Math.max(
              0,
              parsed.esppScenario.offeringStartPrice ??
                INITIAL_ESPP_SCENARIO.offeringStartPrice,
            ),
            purchaseDatePrice: Math.max(
              0,
              parsed.esppScenario.purchaseDatePrice ??
                INITIAL_ESPP_SCENARIO.purchaseDatePrice,
            ),
            savingsRate: Math.max(
              0,
              parsed.esppScenario.savingsRate ??
                INITIAL_ESPP_SCENARIO.savingsRate,
            ),
          });
        }
      }
    } catch {
      // A private browsing policy can block storage; the calculator still works.
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ shifts, settings, esppScenario }),
      );
    } catch {
      // Saving is a convenience, not a requirement for calculations.
    }
  }, [shifts, settings, esppScenario, storageReady]);

  const periodWeeks = settings.payCycle === "fortnightly" ? 2 : 1;
  const periodLabel =
    settings.payCycle === "fortnightly" ? "Fortnightly" : "Weekly";
  const result = useMemo(
    () => calculatePlan(shifts.slice(0, periodWeeks * 7), settings),
    [periodWeeks, settings, shifts],
  );

  const grossPay = result.periodGross;
  const periodHours = result.periodHours;
  const periodsPerYear = settings.payCycle === "fortnightly" ? 26 : 52;
  const annualisedGross = grossPay * periodsPerYear;
  const taxEstimate = Math.min(
    grossPay,
    estimateAnnualTax(annualisedGross) / periodsPerYear,
  );
  const afterTax = Math.max(0, grossPay - taxEstimate);
  const espp = grossPay * (Math.max(0, settings.esppPercent) / 100);
  const takeHome = Math.max(0, afterTax - espp);
  const offeringContributionCount =
    settings.payCycle === "fortnightly" ? 13 : 26;
  const offeringPeriod = OFFERING_PERIODS[esppScenario.offeringPeriod];
  const pooledEspp = espp * offeringContributionCount;
  const bankValue = futureValueOfContributions(
    espp,
    offeringContributionCount,
    esppScenario.savingsRate,
    periodsPerYear,
  );
  const bankGrowth = bankValue - pooledEspp;
  const hasAaplPrices =
    esppScenario.offeringStartPrice > 0 && esppScenario.purchaseDatePrice > 0;
  const lookbackPrice = hasAaplPrices
    ? Math.min(
        esppScenario.offeringStartPrice,
        esppScenario.purchaseDatePrice,
      )
    : 0;
  const discountedPurchasePrice = lookbackPrice * 0.85;
  const aaplValue =
    discountedPurchasePrice > 0
      ? pooledEspp *
        (esppScenario.purchaseDatePrice / discountedPurchasePrice)
      : 0;
  const aaplGrowth = aaplValue - pooledEspp;
  const aaplVsBank = aaplValue - bankValue;
  const comparisonMax = Math.max(pooledEspp, bankValue, aaplValue, 1);
  const superEstimate = grossPay * 0.12;
  const effectiveRate = periodHours > 0 ? grossPay / periodHours : 0;
  const contract = CONTRACT_RANGES[settings.contractRange];
  const activeDays = result.calculatedShifts.filter((shift) => shift.enabled);
  const activeBuckets = result.buckets.filter((bucket) => bucket.hours > 0);
  const hasLongShift = activeDays.some((shift) => shift.spanHours > 10);
  const hasShortShift = activeDays.some(
    (shift) => shift.spanHours > 0 && shift.spanHours < 4,
  );

  const warnings: string[] = [];
  result.weeklyHours.forEach((hours, weekIndex) => {
    const prefix = periodWeeks === 2 ? `Week ${weekIndex + 1}: ` : "";
    if (hours < contract.min) {
      warnings.push(
        `${prefix}${decimal.format(hours)} paid hours is below your ${settings.contractRange} contract range.`,
      );
    }
    if (hours > contract.max) {
      warnings.push(
        `${prefix}${decimal.format(hours - contract.max)} hours are above the contract maximum and treated as potential approved overtime.`,
      );
    }
  });
  if (hasShortShift) {
    warnings.push(
      "One or more shifts are shorter than the 4-hour scheduling minimum used by this plan.",
    );
  }
  if (hasLongShift) {
    warnings.push(
      "One or more shifts exceed the 10-hour scheduling maximum used by this plan.",
    );
  }
  if (result.turnaroundDays.size > 0) {
    warnings.push(
      "A gap under 12 hours was found; the following shift is estimated at no less than 200%.",
    );
  }

  const updateShift = <K extends keyof Shift>(
    index: number,
    key: K,
    value: Shift[K],
  ) => {
    setShifts((current) =>
      current.map((shift, shiftIndex) =>
        shiftIndex === index ? { ...shift, [key]: value } : shift,
      ),
    );
  };

  const resetPlan = () => {
    setShifts(INITIAL_SHIFTS);
    setSettings(INITIAL_SETTINGS);
    setEsppScenario(INITIAL_ESPP_SCENARIO);
  };

  const copySummary = async () => {
    const lines = [
      `${periodLabel} pay estimate`,
      `Paid hours: ${decimal.format(periodHours)}`,
      `Gross pay: ${currency.format(grossPay)}`,
      `Tax + Medicare estimate: ${currency.format(taxEstimate)}`,
      `ESPP contribution: ${currency.format(espp)}`,
      `Estimated take-home: ${currency.format(takeHome)}`,
      `Employer super estimate: ${currency.format(superEstimate)}`,
      `Six-month ESPP pool (${offeringPeriod.label}): ${currency.format(pooledEspp)}`,
      `Savings comparison: ${currency.format(bankValue)}`,
    ];
    if (hasAaplPrices) {
      lines.push(`AAPL lookback value: ${currency.format(aaplValue)}`);
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyState("Copied");
      window.setTimeout(() => setCopyState("Copy summary"), 1600);
    } catch {
      setCopyState("Copy unavailable");
    }
  };

  return (
    <main>
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="eyebrow">Shift pay planner</p>
            <h1>Payday Plan</h1>
          </div>
        </div>
        <div className="header-actions">
          <p className="save-state" aria-live="polite">
            <span className={storageReady ? "saved-dot ready" : "saved-dot"} />
            {storageReady ? "Saved on this device" : "Preparing your plan"}
          </p>
          <button className="button button-quiet" onClick={resetPlan}>
            Reset sample
          </button>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="section-kicker">Plan the roster. See the payday.</p>
          <h2>A clearer estimate for every shift.</h2>
        </div>
        <p>
          Build your shifts and see a clear estimate of gross pay, deductions
          and take-home.
        </p>
      </section>

      <div className="app-grid">
        <div className="planner-column">
          <section className="card settings-card" aria-labelledby="pay-settings">
            <div className="card-heading">
              <div>
                <p className="card-overline">Your setup</p>
                <h3 id="pay-settings">Pay settings</h3>
              </div>
              <span className="agreement-chip">Part-time · Shift-based</span>
            </div>

            <div className="settings-grid">
              <label className="field">
                <span>Actual hourly rate</span>
                <div className="money-input">
                  <span>$</span>
                  <input
                    aria-label="Actual hourly rate in dollars"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    type="number"
                    value={settings.hourlyRate}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        hourlyRate: Math.max(0, Number(event.target.value)),
                      }))
                    }
                  />
                </div>
                <small>Use the rate shown on your payslip.</small>
              </label>

              <label className="field">
                <span>Contract range</span>
                <select
                  value={settings.contractRange}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      contractRange: event.target
                        .value as PaySettings["contractRange"],
                    }))
                  }
                >
                  <option value="15-19">15–19 hours</option>
                  <option value="19-23">19–23 hours</option>
                  <option value="23-27">23–27 hours</option>
                  <option value="27-32">27–32 hours</option>
                </select>
                <small>Used for the weekly overtime threshold.</small>
              </label>

              <label className="field">
                <span>ESPP contribution</span>
                <div className="percent-input">
                  <input
                    aria-label="ESPP contribution percentage"
                    inputMode="decimal"
                    min="0"
                    max="10"
                    step="0.5"
                    type="number"
                    value={settings.esppPercent}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        esppPercent: Math.min(
                          10,
                          Math.max(0, Number(event.target.value)),
                        ),
                      }))
                    }
                  />
                  <span>%</span>
                </div>
                <small>0–10% of gross pay, deducted after tax.</small>
              </label>

              <fieldset className="field">
                <legend>Pay cycle</legend>
                <div className="segmented">
                  <button
                    className={
                      settings.payCycle === "weekly" ? "active" : undefined
                    }
                    type="button"
                    aria-pressed={settings.payCycle === "weekly"}
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        payCycle: "weekly",
                      }))
                    }
                  >
                    Weekly
                  </button>
                  <button
                    className={
                      settings.payCycle === "fortnightly" ? "active" : undefined
                    }
                    type="button"
                    aria-pressed={settings.payCycle === "fortnightly"}
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        payCycle: "fortnightly",
                      }))
                    }
                  >
                    Fortnightly
                  </button>
                </div>
                <small>Fortnightly opens two separate weeks to complete.</small>
              </fieldset>
            </div>

            <details className="advanced-settings">
              <summary>Calculation assumptions</summary>
              <div className="assumption-row">
                <div>
                  <strong>Apply potential overtime</strong>
                  <p>
                    Treat approved hours above your weekly contract maximum as
                    150% for two hours, then 200%.
                  </p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.applyOvertime}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        applyOvertime: event.target.checked,
                      }))
                    }
                  />
                  <span aria-hidden="true" />
                  <em>
                    {settings.applyOvertime ? "Included" : "Not included"}
                  </em>
                </label>
              </div>
            </details>
          </section>

          <section className="card schedule-card" aria-labelledby="work-week">
            <div className="card-heading schedule-heading">
              <div>
                <p className="card-overline">
                  {periodWeeks === 2
                    ? "Two Saturday-to-Friday periods"
                    : "Saturday to Friday"}
                </p>
                <h3 id="work-week">
                  {periodWeeks === 2
                    ? "Build your fortnight"
                    : "Build your work week"}
                </h3>
              </div>
              <p className="live-total">
                <strong>{decimal.format(result.periodHours)} hrs</strong>
                <span>
                  paid {periodWeeks === 2 ? "across the fortnight" : "this week"}
                </span>
              </p>
            </div>

            <div className="week-sections">
              {Array.from({ length: periodWeeks }, (_, weekIndex) => {
                const weekStart = weekIndex * 7;
                const weekShifts = result.calculatedShifts.slice(
                  weekStart,
                  weekStart + 7,
                );
                const weekLabel = `Week ${weekIndex + 1}`;

                return (
                  <div className="week-block" key={weekLabel}>
                    {periodWeeks === 2 && (
                      <div className="week-heading">
                        <div>
                          <strong>{weekLabel}</strong>
                          <span>Saturday to Friday</span>
                        </div>
                        <p>
                          <strong>
                            {decimal.format(result.weeklyHours[weekIndex] ?? 0)}{" "}
                            hrs
                          </strong>
                          <span>paid</span>
                        </p>
                      </div>
                    )}

                    <div className="schedule-labels" aria-hidden="true">
                      <span>Day</span>
                      <span>Start &amp; finish</span>
                      <span>Unpaid break</span>
                      <span>Flags</span>
                      <span>Estimate</span>
                    </div>

                    <div className="shift-list">
                      {weekShifts.map((shift, dayIndex) => {
                        const shiftIndex = weekStart + dayIndex;
                        const accessiblePrefix =
                          periodWeeks === 2 ? `${weekLabel} ` : "";

                        return (
                          <article
                            className={`shift-row ${shift.enabled ? "enabled" : "disabled"}`}
                            key={`${weekLabel}-${shift.day}`}
                          >
                            <div className="shift-day">
                              <label className="day-toggle">
                                <input
                                  aria-label={`${accessiblePrefix}work on ${shift.day}`}
                                  type="checkbox"
                                  checked={shift.enabled}
                                  onChange={(event) =>
                                    updateShift(
                                      shiftIndex,
                                      "enabled",
                                      event.target.checked,
                                    )
                                  }
                                />
                                <span aria-hidden="true" />
                              </label>
                              <div>
                                <strong>{shift.shortDay}</strong>
                                <span>{shift.day}</span>
                              </div>
                            </div>

                            <div className="time-pair">
                              <label>
                                <span className="mobile-field-label">Start</span>
                                <input
                                  aria-label={`${accessiblePrefix}${shift.day} start time`}
                                  type="time"
                                  step="900"
                                  value={shift.start}
                                  disabled={!shift.enabled}
                                  onChange={(event) =>
                                    updateShift(
                                      shiftIndex,
                                      "start",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <span className="time-arrow" aria-hidden="true">
                                →
                              </span>
                              <label>
                                <span className="mobile-field-label">
                                  Finish
                                </span>
                                <input
                                  aria-label={`${accessiblePrefix}${shift.day} finish time`}
                                  type="time"
                                  step="900"
                                  value={shift.end}
                                  disabled={!shift.enabled}
                                  onChange={(event) =>
                                    updateShift(
                                      shiftIndex,
                                      "end",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                            </div>

                            <label className="break-field">
                              <span className="mobile-field-label">
                                Unpaid break
                              </span>
                              <select
                                aria-label={`${accessiblePrefix}${shift.day} unpaid meal break`}
                                value={shift.breakMode}
                                disabled={!shift.enabled}
                                onChange={(event) =>
                                  updateShift(
                                    shiftIndex,
                                    "breakMode",
                                    event.target.value as Shift["breakMode"],
                                  )
                                }
                              >
                                <option value="auto">
                                  Auto · {shift.breakMinutes}m
                                </option>
                                <option value="0">No break</option>
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                              </select>
                            </label>

                            <div className="shift-flags">
                              <label
                                className={`flag-check ${shift.publicHoliday ? "checked" : ""}`}
                              >
                                <input
                                  aria-label={`${accessiblePrefix}${shift.day} public holiday`}
                                  type="checkbox"
                                  checked={shift.publicHoliday}
                                  disabled={!shift.enabled}
                                  onChange={(event) =>
                                    updateShift(
                                      shiftIndex,
                                      "publicHoliday",
                                      event.target.checked,
                                    )
                                  }
                                />
                                <span>Public holiday</span>
                              </label>
                              {shift.turnaroundWarning && (
                                <span className="warning-pill">
                                  Under 12h break
                                </span>
                              )}
                            </div>

                            <div className="shift-result">
                              {shift.enabled ? (
                                <>
                                  <strong>{currency.format(shift.gross)}</strong>
                                  <span>
                                    {decimal.format(shift.paidHours)} paid hrs
                                  </span>
                                </>
                              ) : (
                                <span>Day off</span>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="results-column" id="results">
          <section className="pay-hero">
            <div className="pay-hero-topline">
              <span>{periodLabel} estimate</span>
              <span className="live-badge">Live</span>
            </div>
            <p>Estimated take-home</p>
            <h2>{currency.format(takeHome)}</h2>
            <div className="hero-stats">
              <div>
                <span>Paid hours</span>
                <strong>{decimal.format(periodHours)}</strong>
              </div>
              <div>
                <span>Effective rate</span>
                <strong>{currency.format(effectiveRate)}</strong>
              </div>
            </div>
            <div className="hero-actions">
              <button type="button" onClick={copySummary}>
                {copyState}
              </button>
              <button type="button" onClick={() => window.print()}>
                Print
              </button>
            </div>
          </section>

          <section className="card breakdown-card" aria-labelledby="pay-breakdown">
            <div className="card-heading compact">
              <div>
                <p className="card-overline">Money in, money out</p>
                <h3 id="pay-breakdown">Pay breakdown</h3>
              </div>
              <span className="period-chip">{periodLabel}</span>
            </div>

            <dl className="money-breakdown">
              <div>
                <dt>Gross pay</dt>
                <dd>{currency.format(grossPay)}</dd>
              </div>
              <div>
                <dt>
                  Tax + Medicare
                  <span>2026–27 estimate</span>
                </dt>
                <dd className="deduction">−{currency.format(taxEstimate)}</dd>
              </div>
              <div>
                <dt>
                  ESPP contribution
                  <span>
                    {decimal.format(settings.esppPercent)}% of gross · after tax
                  </span>
                </dt>
                <dd className="deduction">−{currency.format(espp)}</dd>
              </div>
              <div className="money-total">
                <dt>Estimated take-home</dt>
                <dd>{currency.format(takeHome)}</dd>
              </div>
            </dl>

            <div className="super-note">
              <span className="super-icon" aria-hidden="true">
                +
              </span>
              <div>
                <strong>{currency.format(superEstimate)} employer super</strong>
                <p>
                  Indicative 12% contribution, shown separately from take-home.
                </p>
              </div>
            </div>
          </section>

          <section className="card mix-card" aria-labelledby="pay-mix">
            <div className="card-heading compact">
              <div>
                <p className="card-overline">Where it comes from</p>
                <h3 id="pay-mix">Pay mix</h3>
              </div>
            </div>

            {grossPay > 0 ? (
              <>
                <div
                  className="mix-bar"
                  role="img"
                  aria-label="Pay mix by penalty rate"
                >
                  {activeBuckets.map((bucket) => (
                    <span
                      key={bucket.multiplier}
                      className={bucket.className}
                      style={{
                        width: `${(bucket.amount / result.periodGross) * 100}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="mix-list">
                  {activeBuckets.map((bucket) => (
                    <div className="mix-row" key={bucket.multiplier}>
                      <span
                        className={`mix-dot ${bucket.className}`}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{bucket.label}</strong>
                        <span>
                          {decimal.format(bucket.hours)} hrs ·{" "}
                          {decimal.format(bucket.multiplier * 100)}%
                        </span>
                      </div>
                      <b>{currency.format(bucket.amount)}</b>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-state">
                Turn on a work day to see your pay mix.
              </p>
            )}
          </section>

          <section
            className={`card check-card ${warnings.length ? "has-warnings" : "all-clear"}`}
            aria-labelledby="agreement-check"
          >
            <div className="check-heading">
              <span className="check-symbol" aria-hidden="true">
                {warnings.length ? "!" : "✓"}
              </span>
              <div>
                <p className="card-overline">Pay rule check</p>
                <h3 id="agreement-check">
                  {warnings.length
                    ? `${warnings.length} item${warnings.length === 1 ? "" : "s"} to review`
                    : periodWeeks === 2
                      ? "This fortnight looks consistent"
                      : "This week looks consistent"}
                </h3>
              </div>
            </div>
            {warnings.length ? (
              <ul>
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p>
                Each week’s paid hours sit inside the selected contract range,
                with no short shifts, long shifts or turnaround flags.
              </p>
            )}
          </section>
        </aside>
      </div>

      <section
        className="espp-section"
        aria-labelledby="espp-comparison-heading"
      >
        <div className="espp-intro">
          <div>
            <p className="section-kicker">Six-month ESPP comparison</p>
            <h2 id="espp-comparison-heading">
              See what the 15% lookback discount could be worth.
            </h2>
          </div>
          <div className="offer-badges" aria-label="Offering assumptions">
            <span>{offeringPeriod.shortLabel}</span>
            <span>15% discount</span>
            <span>
              {offeringContributionCount} {periodLabel.toLowerCase()} deposits
            </span>
          </div>
        </div>

        <div className="espp-panel">
          <fieldset className="offering-period-picker">
            <legend>Choose the offering period</legend>
            <div className="period-options">
              {Object.entries(OFFERING_PERIODS).map(([value, period]) => (
                <button
                  className={
                    esppScenario.offeringPeriod === value ? "active" : undefined
                  }
                  type="button"
                  aria-pressed={esppScenario.offeringPeriod === value}
                  key={value}
                  onClick={() =>
                    setEsppScenario((current) => ({
                      ...current,
                      offeringPeriod: value as EsppScenario["offeringPeriod"],
                    }))
                  }
                >
                  <strong>{period.label}</strong>
                  <span>
                    Purchase at the end of this six-month offering
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="scenario-fields">
            <label className="scenario-field">
              <span>AAPL at offering start</span>
              <div className="stock-input">
                <span>US$</span>
                <input
                  aria-label="AAPL price at the start of the offering in US dollars"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Enter price"
                  type="number"
                  value={esppScenario.offeringStartPrice || ""}
                  onChange={(event) =>
                    setEsppScenario((current) => ({
                      ...current,
                      offeringStartPrice: Math.max(
                        0,
                        Number(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <small>
                Use the plan’s {offeringPeriod.startDate} reference price.
              </small>
            </label>

            <label className="scenario-field">
              <span>AAPL at purchase date</span>
              <div className="stock-input">
                <span>US$</span>
                <input
                  aria-label="AAPL price at the end of the offering in US dollars"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Enter price"
                  type="number"
                  value={esppScenario.purchaseDatePrice || ""}
                  onChange={(event) =>
                    setEsppScenario((current) => ({
                      ...current,
                      purchaseDatePrice: Math.max(
                        0,
                        Number(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <small>
                Use the plan’s {offeringPeriod.purchaseDate} reference price.
              </small>
            </label>

            <label className="scenario-field">
              <span>Savings interest</span>
              <div className="stock-input">
                <input
                  aria-label="Annual savings account interest rate"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  type="number"
                  value={esppScenario.savingsRate}
                  onChange={(event) =>
                    setEsppScenario((current) => ({
                      ...current,
                      savingsRate: Math.max(0, Number(event.target.value)),
                    }))
                  }
                />
                <span>% p.a.</span>
              </div>
              <small>Interest compounds across each deposit.</small>
            </label>
          </div>

          <div className="pool-summary">
            <div>
              <span>From each {periodLabel.toLowerCase()} pay</span>
              <strong>{currency.format(espp)}</strong>
            </div>
            <span className="pool-arrow" aria-hidden="true">
              →
            </span>
            <div>
              <span>Pooled by {offeringPeriod.purchaseDate}</span>
              <strong>{currency.format(pooledEspp)}</strong>
            </div>
          </div>

          <div className="comparison-grid">
            <article className="outcome-card bank-outcome">
              <div className="outcome-heading">
                <span className="outcome-icon" aria-hidden="true">
                  %
                </span>
                <div>
                  <p>Keep it in savings</p>
                  <h3>{currency.format(bankValue)}</h3>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Money deposited</dt>
                  <dd>{currency.format(pooledEspp)}</dd>
                </div>
                <div>
                  <dt>Interest earned</dt>
                  <dd className="positive">+{currency.format(bankGrowth)}</dd>
                </div>
              </dl>
            </article>

            <article className="outcome-card stock-outcome">
              <div className="outcome-heading">
                <span className="outcome-icon" aria-hidden="true">
                  ↗
                </span>
                <div>
                  <p>Buy AAPL through ESPP</p>
                  <h3>
                    {hasAaplPrices ? currency.format(aaplValue) : "Enter prices"}
                  </h3>
                </div>
              </div>
              {hasAaplPrices ? (
                <dl>
                  <div>
                    <dt>
                      Discounted buy price
                      <span>
                        85% of US{currency.format(lookbackPrice)}
                      </span>
                    </dt>
                    <dd>US{currency.format(discountedPurchasePrice)}</dd>
                  </div>
                  <div>
                    <dt>Value above contributions</dt>
                    <dd className={aaplGrowth >= 0 ? "positive" : "negative"}>
                      {aaplGrowth >= 0 ? "+" : "−"}
                      {currency.format(Math.abs(aaplGrowth))}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="scenario-empty">
                  Add the start and end AAPL prices to calculate the discounted
                  purchase and end value.
                </p>
              )}
            </article>
          </div>

          <div className="comparison-chart" aria-label="ESPP value comparison">
            <div className="comparison-row">
              <span>Savings</span>
              <div className="comparison-track">
                <span
                  className="comparison-fill bank-fill"
                  style={{ width: `${(bankValue / comparisonMax) * 100}%` }}
                />
              </div>
              <strong>{currency.format(bankValue)}</strong>
            </div>
            <div className="comparison-row">
              <span>ESPP</span>
              <div className="comparison-track">
                <span
                  className="comparison-fill stock-fill"
                  style={{
                    width: hasAaplPrices
                      ? `${(aaplValue / comparisonMax) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              <strong>
                {hasAaplPrices ? currency.format(aaplValue) : "—"}
              </strong>
            </div>
          </div>

          {hasAaplPrices && (
            <div
              className={`comparison-verdict ${aaplVsBank >= 0 ? "stock-leads" : "bank-leads"}`}
              aria-live="polite"
            >
              <strong>
                {aaplVsBank >= 0 ? "ESPP leads by " : "Savings leads by "}
                {currency.format(Math.abs(aaplVsBank))}
              </strong>
              <span>
                {esppScenario.offeringStartPrice <=
                esppScenario.purchaseDatePrice
                  ? "The offering-start price is lower, so the 15% discount is applied to it."
                  : "The purchase-date price is lower, so the 15% discount is applied to it."}
              </span>
            </div>
          )}

          <p className="espp-footnote">
            Illustrative pre-tax comparison. It assumes the same pay every
            cycle, deposits at the end of each pay cycle, and values the shares
            at the {offeringPeriod.purchaseDate} price. AAPL prices are in USD;
            the stock result is an AUD-equivalent ratio that assumes the same
            exchange rate when buying and valuing the shares. It excludes FX
            movement, tax, fees, dividends and share-rounding rules. Confirm
            the dates and rules in your plan documents.
          </p>
        </div>
      </section>

      <section className="rules-section" aria-labelledby="rules-heading">
        <div className="rules-intro">
          <p className="section-kicker">Built-in guardrails</p>
          <h2 id="rules-heading">The pay rules behind the estimate.</h2>
          <p>
            When more than one premium could apply, the planner uses the highest
            rate for that time rather than stacking rates.
          </p>
        </div>
        <div className="rule-grid">
          <article>
            <span>01</span>
            <strong>Weekend</strong>
            <p>Saturday and Sunday work is estimated at 150%.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Late night</strong>
            <p>6–10 pm is 125%; 10 pm–6 am is 200%.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Public holiday</strong>
            <p>Worked hours are estimated at 250%.</p>
          </article>
          <article>
            <span>04</span>
            <strong>Rest &amp; breaks</strong>
            <p>Auto breaks and the 12-hour turnaround check follow Part 3.</p>
          </article>
        </div>
      </section>

      <footer>
        <p>
          Planning estimate only. Tax assumes one Australian-resident job,
          tax-free threshold claimed, no study debt or offsets, and includes an
          indicative 2% Medicare levy. Confirm your payslip and workplace
          interpretation.
        </p>
        <p>Payday Plan · Shift pay planner</p>
      </footer>

      <a className="mobile-result-bar" href="#results">
        <span>
          {periodLabel} take-home
          <strong>{currency.format(takeHome)}</strong>
        </span>
        <b>View estimate ↑</b>
      </a>
    </main>
  );
}
