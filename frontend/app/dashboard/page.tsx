"use client"

import React, { useState, useEffect } from "react"
import { ArrowLeft, TrendingDown, Leaf, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAllSavings, getTotalSavings, getSavingsByPeriod, getModelStats } from "@/lib/api"
import Link from "next/link"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface SavingEntry {
  id: number
  created_at: string
  original_model_name: string
  suggested_model_name: string
  cost_saved_input: number
  cost_saved_output: number
  co2_saved: number
  complexity_level: number
  query_preview: string | null
}

const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']

export default function Dashboard() {
  const [savings, setSavings] = useState<SavingEntry[]>([])
  const [totals, setTotals] = useState<any>({ total_cost: 0, total_co2: 0, total_switches: 0 })
  const [periodData, setPeriodData] = useState<any[]>([])
  const [modelStats, setModelStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [savingsData, totalsData, periodData, statsData] = await Promise.all([
          getAllSavings().catch(() => []),
          getTotalSavings().catch(() => ({ total_cost: 0, total_co2: 0, total_switches: 0 })),
          getSavingsByPeriod(30).catch(() => []),
          getModelStats().catch(() => []),
        ])
        setSavings(savingsData || [])
        setTotals(totalsData || { total_cost: 0, total_co2: 0, total_switches: 0 })
        setPeriodData(periodData || [])
        setModelStats(statsData || [])
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        // Set defaults on error
        setSavings([])
        setTotals({ total_cost: 0, total_co2: 0, total_switches: 0 })
        setPeriodData([])
        setModelStats([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Savings Dashboard</h1>
                <p className="text-sm text-muted-foreground">Track your cost and CO₂ savings from smart model selection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Cost Saved */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-sm font-medium text-green-900 dark:text-green-100">Total Cost Saved</h3>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${totals.total_cost.toFixed(2)}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Per 1K tokens across all switches
            </p>
          </div>

          {/* Total CO2 Saved */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Leaf className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Total CO₂ Saved</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {totals.total_co2.toFixed(2)}g
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Carbon emissions reduced
            </p>
          </div>

          {/* Total Switches */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">Smart Switches</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totals.total_switches}
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
              Times you chose efficiency
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Savings Over Time */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Savings Over Time (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={periodData.reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Legend />
                <Line type="monotone" dataKey="daily_cost_saved" stroke="#10b981" name="Cost Saved ($)" strokeWidth={2} />
                <Line type="monotone" dataKey="daily_co2_saved" stroke="#3b82f6" name="CO₂ Saved (g)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Model Switch Distribution */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Top Model Switches</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelStats.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="suggested_model_name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Bar dataKey="switch_count" fill="#f97316" name="Switches" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Savings History</h3>
            <p className="text-sm text-muted-foreground mt-1">Click on a row to see more details</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">From → To</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Saved</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CO₂ Saved</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Complexity</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {savings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No savings yet. Start switching to efficient models to track your savings!
                    </td>
                  </tr>
                ) : (
                  savings.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr
                        onClick={() => toggleRow(entry.id)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-foreground">
                          {new Date(entry.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-red-500 dark:text-red-400">{entry.original_model_name}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-500 dark:text-green-400">{entry.suggested_model_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            ${(entry.cost_saved_input + entry.cost_saved_output).toFixed(3)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {entry.co2_saved.toFixed(2)}g
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                            Level {entry.complexity_level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {expandedRows.has(entry.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </td>
                      </tr>
                      {expandedRows.has(entry.id) && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground mb-1">Original Model</p>
                                <p className="font-medium text-foreground">{entry.original_model_name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Suggested Model</p>
                                <p className="font-medium text-foreground">{entry.suggested_model_name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Input Cost Saved</p>
                                <p className="font-medium text-green-600 dark:text-green-400">${entry.cost_saved_input.toFixed(3)}/1K tokens</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Output Cost Saved</p>
                                <p className="font-medium text-green-600 dark:text-green-400">${entry.cost_saved_output.toFixed(3)}/1K tokens</p>
                              </div>
                              {entry.query_preview && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground mb-1">Query Preview</p>
                                  <p className="font-medium text-foreground italic">"{entry.query_preview}"</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
