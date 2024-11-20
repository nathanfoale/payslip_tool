// components/payslip-planner.tsx

import {
  BanknoteIcon,
  WalletIcon,
  PiggyBankIcon,
  ClockIcon
} from 'lucide-react';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  LineChart,
  Line,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import { ValueBox } from '@/components/value-box'; // Only import, no redeclaration

// Define DayOfWeek type
type DayOfWeek = 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

const esppData = [
  {
    Beginning_Date: "2014-02-01",
    Ending_Date: "2014-07-31",
    Period_Beginning_Value: 17.91,
    Period_Ending_Value_a: 23.9,
    Purchase_Price_b: 15.23,
  },
  {
    Beginning_Date: "2014-08-01",
    Ending_Date: "2015-01-31",
    Period_Beginning_Value: 24.03,
    Period_Ending_Value_a: 29.29,
    Purchase_Price_b: 20.43,
  },
  {
    Beginning_Date: "2015-02-01",
    Ending_Date: "2015-07-31",
    Period_Beginning_Value: 29.66,
    Period_Ending_Value_a: 30.33,
    Purchase_Price_b: 25.21,
  },
  {
    Beginning_Date: "2015-08-01",
    Ending_Date: "2016-01-31",
    Period_Beginning_Value: 29.61,
    Period_Ending_Value_a: 24.34,
    Purchase_Price_b: 20.69,
  },
  {
    Beginning_Date: "2016-02-01",
    Ending_Date: "2016-07-31",
    Period_Beginning_Value: 24.11,
    Period_Ending_Value_a: 26.05,
    Purchase_Price_b: 20.49,
  },
  {
    Beginning_Date: "2016-08-01",
    Ending_Date: "2017-01-31",
    Period_Beginning_Value: 26.51,
    Period_Ending_Value_a: 30.34,
    Purchase_Price_b: 22.54,
  },
  {
    Beginning_Date: "2017-02-01",
    Ending_Date: "2017-07-31",
    Period_Beginning_Value: 32.19,
    Period_Ending_Value_a: 37.18,
    Purchase_Price_b: 27.36,
  },
  {
    Beginning_Date: "2017-08-01",
    Ending_Date: "2018-01-31",
    Period_Beginning_Value: 37.51,
    Period_Ending_Value_a: 41.86,
    Purchase_Price_b: 31.89,
  },
  {
    Beginning_Date: "2018-02-01",
    Ending_Date: "2018-07-31",
    Period_Beginning_Value: 41.95,
    Period_Ending_Value_a: 47.57,
    Purchase_Price_b: 35.65,
  },
  {
    Beginning_Date: "2018-08-01",
    Ending_Date: "2019-01-31",
    Period_Beginning_Value: 50.38,
    Period_Ending_Value_a: 41.61,
    Purchase_Price_b: 35.37,
  },
  {
    Beginning_Date: "2019-02-01",
    Ending_Date: "2019-07-31",
    Period_Beginning_Value: 41.63,
    Period_Ending_Value_a: 53.26,
    Purchase_Price_b: 35.39,
  },
  {
    Beginning_Date: "2019-08-01",
    Ending_Date: "2020-01-31",
    Period_Beginning_Value: 52.11,
    Period_Ending_Value_a: 77.38,
    Purchase_Price_b: 44.29,
  },
  {
    Beginning_Date: "2020-02-01",
    Ending_Date: "2020-07-31",
    Period_Beginning_Value: 77.17,
    Period_Ending_Value_a: 106.26,
    Purchase_Price_b: 65.59,
  },
  {
    Beginning_Date: "2020-08-01",
    Ending_Date: "2021-01-31",
    Period_Beginning_Value: 108.94,
    Period_Ending_Value_a: 131.96,
    Purchase_Price_b: 92.6,
  },
  {
    Beginning_Date: "2021-02-01",
    Ending_Date: "2021-07-31",
    Period_Beginning_Value: 134.14,
    Period_Ending_Value_a: 145.86,
    Purchase_Price_b: 114.02,
  },
  {
    Beginning_Date: "2021-08-01",
    Ending_Date: "2022-01-31",
    Period_Beginning_Value: 145.52,
    Period_Ending_Value_a: 174.78,
    Purchase_Price_b: 123.69,
  },
  {
    Beginning_Date: "2022-02-01",
    Ending_Date: "2022-07-31",
    Period_Beginning_Value: 174.61,
    Period_Ending_Value_a: 162.51,
    Purchase_Price_b: 138.13,
  },
  {
    Beginning_Date: "2022-08-01",
    Ending_Date: "2023-01-31",
    Period_Beginning_Value: 161.51,
    Period_Ending_Value_a: 144.29,
    Purchase_Price_b: 122.65,
  },
  {
    Beginning_Date: "2023-02-01",
    Ending_Date: "2023-07-31",
    Period_Beginning_Value: 145.43,
    Period_Ending_Value_a: 196.45,
    Purchase_Price_b: 123.62,
  },
  {
    Beginning_Date: "2023-08-01",
    Ending_Date: "2024-01-31",
    Period_Beginning_Value: 195.6,
    Period_Ending_Value_a: 184.4,
    Purchase_Price_b: 156.74,
  },
  {
    Beginning_Date: "2024-02-01",
    Ending_Date: "2024-07-31",
    Period_Beginning_Value: 186.86,
    Period_Ending_Value_a: 222.08,
    Purchase_Price_b: 158.83,
  },
];


// Constants and Types
const daysOfWeek: DayOfWeek[] = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}`;
});

type WorkDay = {
  isWorking: boolean;
  startTime: string;
  endTime: string;
};

const taxThresholds = [
  { threshold: 0, rate: 0 },
  { threshold: 18200, rate: 0.16 },
  { threshold: 45000, rate: 0.30 },
  { threshold: 135000, rate: 0.45 },
];

const laundryAllowance = 12.5;

// Utility Functions
function convertTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

function calculateTax(
  incomePerPeriod: number,
  period: 'Weekly' | 'Fortnightly'
) {
  const periodsPerYear = period === 'Weekly' ? 52 : 26;
  const annualIncome = incomePerPeriod * periodsPerYear;
  let tax = 0;

  for (let i = 0; i < taxThresholds.length; i++) {
    if (annualIncome > taxThresholds[i].threshold) {
      const taxableIncome =
        i === taxThresholds.length - 1
          ? annualIncome - taxThresholds[i].threshold
          : Math.min(
              annualIncome,
              taxThresholds[i + 1].threshold
            ) - taxThresholds[i].threshold;
      tax += taxableIncome * taxThresholds[i].rate;
    }
  }

  const taxPerPeriod = tax / periodsPerYear;
  return { taxPerPeriod, annualTax: tax };
}

function calculateShiftPay(
  day: DayOfWeek,
  startTime: number,
  endTime: number,
  baseRate: number,
  overtimeThreshold: number,
  cumulativeHours: number
) {
  let shiftHours = 0;
  let shiftIncome = 0;
  const shiftDetails: {
    time: number;
    rate: number;
    hours: number;
    payType: string;
  }[] = [];

  if (endTime - startTime >= 5.5) {
    endTime -= 0.5;
  }

  const times = Array.from(
    {
      length: Math.ceil((endTime - startTime) / 0.25)
    },
    (_, i) => startTime + i * 0.25
  );

  for (let i = 0; i < times.length - 1; i++) {
    const currentTime = times[i];
    const nextTime = times[i + 1];
    const intervalHours = nextTime - currentTime;

    const applicableRates = [baseRate];
    const payTypes = ['Base Pay'];

    if (currentTime >= 18 && currentTime < 22) {
      applicableRates.push(1.25 * baseRate);
      payTypes.push('125% Premium');
    }

    if (day === 'Saturday' || day === 'Sunday') {
      applicableRates.push(1.5 * baseRate);
      payTypes.push('150% Premium');
    }

    cumulativeHours += intervalHours;
    if (cumulativeHours > overtimeThreshold) {
      const overtimeHours = cumulativeHours - overtimeThreshold;
      if (overtimeHours <= 2) {
        applicableRates.push(1.5 * baseRate);
        payTypes.push('150% Premium');
      } else {
        applicableRates.push(2.0 * baseRate);
        payTypes.push('200% Premium');
      }
    }

    const rate = Math.max(...applicableRates);
    const payType = payTypes[applicableRates.indexOf(rate)];

    shiftHours += intervalHours;
    shiftIncome += intervalHours * rate;
    shiftDetails.push({
      time: currentTime,
      rate,
      hours: intervalHours,
      payType
    });
  }

  return {
    shiftHours,
    shiftIncome,
    shiftDetails,
    cumulativeHours
  };
}

function calculateWeeklyIncome(
  schedule: { day: DayOfWeek; start: number; end: number }[],
  baseRate: number,
  overtimeThreshold: number
): {
  totalIncome: number;
  totalHours: number;
  breakdown: { payType: string; hours: number; rate: number; income: number }[];
  daySummary: { day: DayOfWeek; hours: number; salary: number }[];
} {
  let totalIncome = 0;
  let totalHours = 0;
  let cumulativeHours = 0;
  const breakdown = [
    { payType: 'Base Pay', hours: 0, rate: baseRate, income: 0 },
    { payType: '125% Premium', hours: 0, rate: 1.25 * baseRate, income: 0 },
    { payType: '150% Premium', hours: 0, rate: 1.5 * baseRate, income: 0 },
    { payType: '200% Premium', hours: 0, rate: 2.0 * baseRate, income: 0 },
  ];
  const daySummary: { day: DayOfWeek; hours: number; salary: number }[] = [];

  for (const { day, start, end } of schedule) {
    const shiftResult = calculateShiftPay(
      day,
      start,
      end,
      baseRate,
      overtimeThreshold,
      cumulativeHours
    );
    cumulativeHours = shiftResult.cumulativeHours;
    totalHours += shiftResult.shiftHours;
    totalIncome += shiftResult.shiftIncome;

    for (const detail of shiftResult.shiftDetails) {
      const breakdownIndex = breakdown.findIndex(
        (b) => b.payType === detail.payType
      );
      if (breakdownIndex !== -1) {
        breakdown[breakdownIndex].hours += detail.hours;
        breakdown[breakdownIndex].income += detail.hours * detail.rate;
      }
    }

    daySummary.push({
      day,
      hours: shiftResult.shiftHours,
      salary: shiftResult.shiftIncome,
    });
  }

  return { totalIncome, totalHours, breakdown, daySummary };
}

// Custom Label for PieChart with Defensive Programming
const renderCustomizedLabel = ({
  payload,
  x,
  y
}: {
  payload: { payType: string; income?: number };
  x: number;
  y: number;
}) => {
  const income = payload.income ?? 0; // Default to 0 if undefined
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
    >
      {`${payload.payType}: $${income.toFixed(2)}`}
    </text>
  );
};

// Define fixed colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const HOURS_WORKED_COLOR = '#8884d8'; // Blue
const SALARY_EARNED_COLOR = '#82ca9d'; // Green

// Process ESPP data to include cumulativeContribution and investmentValue
const esppChartData = esppData.map((item, index) => {
  const cumulativeContribution = esppData
    .slice(0, index + 1)
    .reduce((acc, curr) => acc + curr.Purchase_Price_b, 0);
  const investmentValue = item.Period_Ending_Value_a;
  return {
    Ending_Date: item.Ending_Date,
    cumulativeContribution,
    investmentValue
  };
});

// Payslip Planner Component
export function PayslipPlannerComponent() {
  const [schedule, setSchedule] = useState<Record<DayOfWeek, WorkDay>>(
    Object.fromEntries(
      daysOfWeek.map((day) => [
        day,
        { isWorking: false, startTime: '09:00', endTime: '17:00' }
      ])
    ) as Record<DayOfWeek, WorkDay>
  );
  const [baseRate, setBaseRate] = useState(30.33);
  const [bracket, setBracket] = useState('19');
  const [esppContribution, setEsppContribution] = useState(10);
  const [summaryPeriod, setSummaryPeriod] = useState<'Weekly' | 'Fortnightly'>('Weekly');
  const [incomeData, setIncomeData] = useState<ReturnType<typeof calculateWeeklyIncome> | null>(null);
  const [taxData, setTaxData] = useState<ReturnType<typeof calculateTax> | null>(null);
  const [activeTab, setActiveTab] = useState('schedule');

  const handleToggleDay = (day: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], isWorking: !prev[day].isWorking }
    }));
  };

  const handleTimeChange = (
    day: DayOfWeek,
    type: 'startTime' | 'endTime',
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [type]: value }
    }));
  };

  const handleCalculate = () => {
    const workSchedule = Object.entries(schedule)
      .filter(([_, { isWorking }]) => isWorking)
      .map(([day, { startTime, endTime }]) => ({
        day: day as DayOfWeek,
        start: convertTime(startTime),
        end: convertTime(endTime)
      }));

    const weeklyData = calculateWeeklyIncome(workSchedule, baseRate, Number(bracket));
    setIncomeData(weeklyData);

    // Log the breakdown data for debugging
    console.log('Breakdown Data:', weeklyData.breakdown);
    console.log('Day Summary:', weeklyData.daySummary); // Added for debugging

    const periodMultiplier = summaryPeriod === 'Weekly' ? 1 : 2;
    const incomePerPeriod = weeklyData.totalIncome * periodMultiplier;
    const taxInfo = calculateTax(incomePerPeriod, summaryPeriod);
    setTaxData(taxInfo);

    // Switch to results tab after calculation
    setActiveTab('results');
  };

  const grossIncome = incomeData ? incomeData.totalIncome * (summaryPeriod === 'Weekly' ? 1 : 2) : 0;
  const netIncome = taxData ? grossIncome - taxData.taxPerPeriod : 0;
  const esppContributionAmount = (esppContribution / 100) * netIncome;
  const takeHomePay = netIncome - esppContributionAmount + laundryAllowance;
  const totalHours = incomeData ? incomeData.totalHours * (summaryPeriod === 'Weekly' ? 1 : 2) : 0;
  const averageHourlyRate = totalHours > 0 ? grossIncome / totalHours : 0;

  const summaryData = [
    {
      variable: `${summaryPeriod} Gross Income`,
      amount: grossIncome
    },
    {
      variable: `${summaryPeriod} Net Income`,
      amount: netIncome
    },
    {
      variable: `${summaryPeriod} Tax Paid`,
      amount: taxData ? taxData.taxPerPeriod : 0
    },
    {
      variable: 'ESPP Contribution',
      amount: esppContributionAmount
    },
    {
      variable: 'Take-Home Pay After All Costs',
      amount: takeHomePay
    },
    {
      variable: 'Average Hourly Rate',
      amount: averageHourlyRate
    },
  ];

  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-600 text-white min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">Payslip Planner</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-700 p-1 rounded-lg space-x-2">
          <TabsTrigger 
            value="schedule" 
            className="px-4 py-2 rounded-md data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all duration-200 hover:bg-gray-600"
          >
            Work Schedule
          </TabsTrigger>
          <TabsTrigger 
            value="results"
            className="px-4 py-2 rounded-md data-[state=active]:bg-teal-500 data-[state=active]:text-white transition-all duration-200 hover:bg-gray-600"
          >
            Results
          </TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-gray-700 text-white">
              <CardHeader>
                <CardTitle>Input Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Label htmlFor="base-rate">Base Hourly Rate ($):</Label>
                  <Input
                    id="base-rate"
                    type="number"
                    value={baseRate}
                    onChange={(e) => setBaseRate(Number(e.target.value))}
                    className="w-24"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="bracket">Part-Time Bracket (Hours):</Label>
                  <Select
                    value={bracket}
                    onValueChange={setBracket}
                  >
                    <SelectTrigger className="w-32 bg-gray-800 text-white border border-gray-700 rounded-md hover:bg-teal-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white">
                      <SelectItem value="19">15-19</SelectItem>
                      <SelectItem value="23">19-23</SelectItem>
                      <SelectItem value="27">23-27</SelectItem>
                      <SelectItem value="32">27-32</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="espp">ESPP Contribution (%):</Label>
                  <Input
                    id="espp"
                    type="number"
                    value={esppContribution}
                    onChange={(e) => setEsppContribution(Number(e.target.value))}
                    className="w-24"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="summary-period">Summary Period:</Label>
                  <Select
                    value={summaryPeriod}
                    onValueChange={(value: 'Weekly' | 'Fortnightly') => setSummaryPeriod(value)}
                  >
                    <SelectTrigger className="w-32 bg-gray-800 text-white border border-gray-700 rounded-md hover:bg-teal-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white">
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-700 text-white">
              <CardHeader>
                <CardTitle>Work Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="flex items-center space-x-4 py-2 border-b border-gray-600"
                  >
                    <Switch
                      id={`${day}-toggle`}
                      checked={schedule[day].isWorking}
                      onCheckedChange={() => handleToggleDay(day)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        schedule[day].isWorking ? 'bg-teal-500' : 'bg-gray-500'
                      } transition-colors duration-200`}
                    >
                      <span
                        className={`absolute left-1 h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          schedule[day].isWorking ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </Switch>
                    <Label htmlFor={`${day}-toggle`} className="w-24">
                      {day}
                    </Label>
                    {schedule[day].isWorking && (
                      <>
                        <Select
                          value={schedule[day].startTime}
                          onValueChange={(value) => handleTimeChange(day, 'startTime', value)}
                        >
                          <SelectTrigger className="w-32 bg-gray-800 text-white border border-gray-700 rounded-md hover:bg-teal-500">
                            <SelectValue placeholder="Start" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 text-white">
                            {timeOptions.map((time) => (
                              <SelectItem key={`${day}-start-${time}`} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={schedule[day].endTime}
                          onValueChange={(value) => handleTimeChange(day, 'endTime', value)}
                        >
                          <SelectTrigger className="w-32 bg-gray-800 text-white border border-gray-700 rounded-md hover:bg-teal-500">
                            <SelectValue placeholder="End" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 text-white">
                            {timeOptions.map((time) => (
                              <SelectItem key={`${day}-end-${time}`} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
          <Button
            className="mt-6 bg-teal-500 hover:bg-teal-600 transition-colors duration-200"
            onClick={handleCalculate}
          >
            Calculate
          </Button>
        </TabsContent>
        <TabsContent value="results">
          {incomeData && taxData && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ValueBox
                  value={`$${grossIncome.toFixed(2)}`}
                  subtitle={`${summaryPeriod} Gross Income`}
                  icon={BanknoteIcon}
                  color="green"
                />
                <ValueBox
                  value={`$${netIncome.toFixed(2)}`}
                  subtitle={`${summaryPeriod} Net Income`}
                  icon={WalletIcon}
                  color="blue"
                />
                <ValueBox
                  value={`$${esppContributionAmount.toFixed(2)}`}
                  subtitle="ESPP Contribution"
                  icon={PiggyBankIcon}
                  color="purple"
                />
                <ValueBox
                  value={`${totalHours.toFixed(2)} hrs`}
                  subtitle={`${summaryPeriod} Total Hours Worked`}
                  icon={ClockIcon}
                  color="yellow"
                />
              </div>
              <Card className="bg-gray-700 text-white">
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variable</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.variable}</TableCell>
                          <TableCell>
                            ${item.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
             
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-gray-700 text-white">
                  <CardHeader>
                    <CardTitle>Breakdown of Hours Worked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pay Type</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Income</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeData.breakdown.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.payType}</TableCell>
                            <TableCell>{item.hours.toFixed(2)}</TableCell>
                            <TableCell>${item.rate.toFixed(2)}</TableCell>
                            <TableCell>${item.income.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card className="bg-gray-700 text-white">
                  <CardHeader>
                    <CardTitle>Income by Pay Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incomeData.breakdown}
                          dataKey="income"
                          nameKey="payType"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={renderCustomizedLabel}
                        >
                          {incomeData.breakdown.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            `$${value.toFixed(2)}`
                          }
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <Card className="bg-gray-700 text-white">
                <CardHeader>
                  <CardTitle>Day-by-Day Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeData.daySummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      {/* Define Left Y-Axis for Hours */}
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#8884d8"
                        label={{
                          value: 'Hours Worked',
                          angle: -90,
                          position: 'insideLeft'
                        }}
                      />
                      {/* Define Right Y-Axis for Salary */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#82ca9d"
                        label={{
                          value: 'Salary Earned ($)',
                          angle: 90,
                          position: 'insideRight'
                        }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === 'hours' ? `${value.toFixed(2)} hrs` : `$${value.toFixed(2)}`
                        }
                      />
                      <Legend />
                      {/* Hours Worked Bar with Fixed Color */}
                      <Bar yAxisId="left" dataKey="hours" name="Hours Worked" fill={HOURS_WORKED_COLOR}>
                        {/* No need for individual Cell colors */}
                      </Bar>
                      {/* Salary Earned Bar with Fixed Color */}
                      <Bar yAxisId="right" dataKey="salary" name="Salary Earned" fill={SALARY_EARNED_COLOR}>
                        {/* No need for individual Cell colors */}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="bg-gray-700 text-white">
                <CardHeader>
                  <CardTitle>ESPP Investment Value vs. Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={esppChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="Ending_Date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cumulativeContribution"
                        stroke="#8884d8"
                        name="Cumulative Contributions"
                      />
                      <Line
                        type="monotone"
                        dataKey="investmentValue"
                        stroke="#82ca9d"
                        name="Investment Value"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
