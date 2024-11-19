'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ValueBox } from './value-box'
import { BanknoteIcon, WalletIcon, PiggyBankIcon, ClockIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Line } from 'recharts'

const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const twoWeekPeriod = [...daysOfWeek, ...daysOfWeek]

const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4)
  const minute = (i % 4) * 15
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

type WorkDay = {
  isWorking: boolean
  startTime: string
  endTime: string
}

const taxThresholds = [
  { threshold: 0, rate: 0 },
  { threshold: 18200, rate: 0.16 },
  { threshold: 45000, rate: 0.30 },
  { threshold: 135000, rate: 0.30 }
]

const laundryAllowance = 12.50

function convertTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours + minutes / 60
}

function calculateTax(incomePerPeriod: number, period: 'Weekly' | 'Fortnightly'): { taxPerPeriod: number; annualTax: number } {
  const periodsPerYear = period === 'Weekly' ? 52 : 26
  const annualIncome = incomePerPeriod * periodsPerYear
  let tax = 0

  for (let i = 0; i < taxThresholds.length; i++) {
    if (annualIncome > taxThresholds[i].threshold) {
      const taxableIncome = i === taxThresholds.length - 1
        ? annualIncome - taxThresholds[i].threshold
        : Math.min(annualIncome, taxThresholds[i + 1].threshold) - taxThresholds[i].threshold
      tax += taxableIncome * taxThresholds[i].rate
    }
  }

  const taxPerPeriod = tax / periodsPerYear
  return { taxPerPeriod, annualTax: tax }
}

function calculateShiftPay(day: string, startTime: number, endTime: number, baseRate: number, overtimeThreshold: number, cumulativeHours: number) {
  let shiftHours = 0
  let shiftIncome = 0
  let shiftDetails: { time: number; rate: number; hours: number; payType: string }[] = []

  let hoursWorked = endTime - startTime
  if (hoursWorked >= 5.5) {
    endTime -= 0.5
    hoursWorked = endTime - startTime
  }

  const times = Array.from({ length: (endTime - startTime) / 0.25 + 1 }, (_, i) => startTime + i * 0.25)

  for (let i = 0; i < times.length - 1; i++) {
    const currentTime = times[i]
    const nextTime = times[i + 1]
    const intervalHours = nextTime - currentTime

    let applicableRates = [baseRate]
    let payTypes = ['Base Pay']

    // Apply 125% premium for Thursday and Friday nights from 6 PM onwards
    if ((day === 'Thursday' || day === 'Friday') && currentTime >= 18) {
      applicableRates.push(1.25 * baseRate)
      payTypes.push('125% Premium')
    }

    if (day === 'Saturday' || day === 'Sunday') {
      applicableRates.push(1.5 * baseRate)
      payTypes.push('150% Premium')
    }

    // Check for overtime separately from other premiums
    if (cumulativeHours + intervalHours > overtimeThreshold) {
      const normalHours = Math.max(0, overtimeThreshold - cumulativeHours)
      const overtimeHours = intervalHours - normalHours

      if (normalHours > 0) {
        const normalRate = Math.max(...applicableRates)
        shiftHours += normalHours
        shiftIncome += normalHours * normalRate
        shiftDetails.push({ 
          time: currentTime, 
          rate: normalRate, 
          hours: normalHours, 
          payType: payTypes[applicableRates.indexOf(normalRate)] 
        })
      }

      if (overtimeHours > 0) {
        const overtimeRate = Math.max(1.5 * baseRate, ...applicableRates)
        shiftHours += overtimeHours
        shiftIncome += overtimeHours * overtimeRate
        shiftDetails.push({ 
          time: currentTime + normalHours, 
          rate: overtimeRate, 
          hours: overtimeHours, 
          payType: 'Overtime (150%)' 
        })
      }
    } else {
      const rate = Math.max(...applicableRates)
      const payType = payTypes[applicableRates.indexOf(rate)]

      shiftHours += intervalHours
      shiftIncome += intervalHours * rate
      shiftDetails.push({ time: currentTime, rate, hours: intervalHours, payType })
    }

    cumulativeHours += intervalHours
  }

  return { shiftHours, shiftIncome, shiftDetails, cumulativeHours }
}

function calculateFortnightlyIncome(schedule: { day: string; start: number; end: number }[], baseRate: number, overtimeThreshold: number) {
  let totalIncome = 0
  let totalHours = 0
  let cumulativeHours = 0
  let breakdown = [
    { payType: 'Base Pay', hours: 0, rate: baseRate, income: 0 },
    { payType: '125% Premium', hours: 0, rate: 1.25 * baseRate, income: 0 },
    { payType: '150% Premium', hours: 0, rate: 1.5 * baseRate, income: 0 },
    { payType: 'Overtime (150%)', hours: 0, rate: 1.5 * baseRate, income: 0 }
  ]
  let daySummary: { day: string; hours: number; salary: number }[] = []

  for (const { day, start, end } of schedule) {
    const shiftResult = calculateShiftPay(day, start, end, baseRate, overtimeThreshold, cumulativeHours)
    cumulativeHours = shiftResult.cumulativeHours
    totalHours += shiftResult.shiftHours
    totalIncome += shiftResult.shiftIncome

    for (const detail of shiftResult.shiftDetails) {
      const breakdownIndex = breakdown.findIndex(b => b.payType === detail.payType)
      if (breakdownIndex !== -1) {
        breakdown[breakdownIndex].hours += detail.hours
        breakdown[breakdownIndex].income += detail.hours * detail.rate
      } else {
        breakdown.push({
          payType: detail.payType,
          hours: detail.hours,
          rate: detail.rate,
          income: detail.hours * detail.rate
        })
      }
    }

    daySummary.push({
      day,
      hours: shiftResult.shiftHours,
      salary: shiftResult.shiftIncome
    })
  }

  return { totalIncome, totalHours, breakdown, daySummary }
}

export function PayslipPlannerComponent() {
  const [schedule, setSchedule] = useState<Record<string, WorkDay>>(
    Object.fromEntries(
      twoWeekPeriod.map((day, index) => [`${day}-${index}`, { isWorking: false, startTime: '09:00', endTime: '17:00' }])
    )
  )
  const [baseRate, setBaseRate] = useState(30.33)
  const [bracket, setBracket] = useState('19')
  const [esppContribution, setEsppContribution] = useState(10)
  const [incomeData, setIncomeData] = useState<ReturnType<typeof calculateFortnightlyIncome> | null>(null)
  const [taxData, setTaxData] = useState<ReturnType<typeof calculateTax> | null>(null)

  const handleToggleDay = (dayKey: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], isWorking: !prev[dayKey].isWorking }
    }))
  }

  const handleTimeChange = (dayKey: string, type: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [type]: value }
    }))
  }

  const handleCalculate = () => {
    const workSchedule = Object.entries(schedule)
      .filter(([_, { isWorking }]) => isWorking)
      .map(([dayKey, { startTime, endTime }]) => ({
        day: dayKey.split('-')[0],
        start: convertTime(startTime),
        end: convertTime(endTime)
      }))

    const fortnightlyData = calculateFortnightlyIncome(workSchedule, baseRate, Number(bracket))
    setIncomeData(fortnightlyData)

    const taxInfo = calculateTax(fortnightlyData.totalIncome, 'Fortnightly')
    setTaxData(taxInfo)
  }

  const grossIncome = incomeData ? incomeData.totalIncome : 0
  const netIncome = taxData ? grossIncome - taxData.taxPerPeriod : 0
  const esppContributionAmount = (esppContribution / 100) * netIncome
  const takeHomePay = netIncome - esppContributionAmount + laundryAllowance
  const totalHours = incomeData ? incomeData.totalHours : 0
  const averageHourlyRate = totalHours > 0 ? grossIncome / totalHours : 0

  const summaryData = [
    { variable: 'Fortnightly Gross Income', amount: grossIncome },
    { variable: 'Fortnightly Net Income', amount: netIncome },
    { variable: 'Fortnightly Tax Paid', amount: taxData ? taxData.taxPerPeriod : 0 },
    { variable: 'ESPP Contribution', amount: esppContributionAmount },
    { variable: 'Take-Home Pay After All Costs', amount: takeHomePay },
    { variable: 'Average Hourly Rate', amount: averageHourlyRate },
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Payslip Planner</h1>
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">Work Schedule</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="base-rate">Base Hourly Rate ($):</Label>
                  <Input
                    id="base-rate"
                    type="number"
                    value={baseRate}
                    onChange={(e) => setBaseRate(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="bracket">Part-Time Bracket (Hours):</Label>
                  <Select value={bracket} onValueChange={setBracket}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="19">15-19</SelectItem>
                      <SelectItem value="23">19-23</SelectItem>
                      <SelectItem value="27">23-27</SelectItem>
                      <SelectItem value="32">27-32</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="espp">ESPP Contribution (%):</Label>
                  <Input
                    id="espp"
                    type="number"
                    value={esppContribution}
                    onChange={(e) => setEsppContribution(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Work Schedule (Fortnightly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1].map((week) => (
                  <div key={week} className="space-y-4">
                    <h3 className="font-semibold">Week {week + 1}</h3>
                    {daysOfWeek.map((day, dayIndex) => {
                      const dayKey = `${day}-${week * 7 + dayIndex}`
                      return (
                        <div key={dayKey} className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${dayKey}-toggle`}
                              checked={schedule[dayKey].isWorking}
                              onCheckedChange={() => handleToggleDay(dayKey)}
                            />
                            <Label htmlFor={`${dayKey}-toggle`} className="w-20">{day}</Label>
                          </div>
                          {schedule[dayKey].isWorking && (
                            <div className="flex space-x-2">
                              <Select
                                value={schedule[dayKey].startTime}
                                onValueChange={(value) => handleTimeChange(dayKey, 'startTime', value)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder="Start" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map(time => <SelectItem key={`${dayKey}-start-${time}`} value={time}>{time}</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <Select
                                value={schedule[dayKey].endTime}
                                onValueChange={(value) => handleTimeChange(dayKey, 'endTime', value)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder="End" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map(time =>
                                    <SelectItem key={`${dayKey}-end-${time}`} value={time}>{time}</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Button onClick={handleCalculate} className="w-full">Calculate</Button>
        </TabsContent>
        <TabsContent value="results" className="space-y-6">
          {incomeData && taxData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ValueBox
                  value={`$${grossIncome.toFixed(2)}`}
                  subtitle="Fortnightly Gross Income"
                  icon={BanknoteIcon}
                  color="green"
                />
                <ValueBox
                  value={`$${netIncome.toFixed(2)}`}
                  subtitle="Fortnightly Net Income"
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
                  subtitle="Fortnightly Total Hours Worked"
                  icon={ClockIcon}
                  color="yellow"
                />
              </div>

              <Card>
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
                          <TableCell>${item.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
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

                <Card>
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
                          label
                        >
                          {incomeData.breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Day-by-Day Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeData.daySummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="hours" fill="#8884d8" name="Hours Worked" />
                      <Line yAxisId="right" type="monotone" dataKey="salary" stroke="#82ca9d" name="Salary Earned" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Please calculate your payslip first.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}