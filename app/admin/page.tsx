"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Users, Clock, BarChart3, Download } from "lucide-react" // Ensure all icons are imported
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Activity {
  id: string
  name: string
  description?: string
  start_time: string
  end_time?: string
  duration?: number
  user_id: string
  created_at: string
  user_name?: string
}

interface AppUser {
  id: string
  name: string
  role: "user" | "admin"
}

interface UserStats {
  user_id: string
  user_name: string
  total_activities: number
  total_duration: number
  avg_duration: number
  last_activity: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [users, setUsers] = useState<AppUser[]>([]) // State to hold all users for the filter dropdown
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()

  useEffect(() => {
    loadData()
    setLoading(false)
  }, [])

  const loadData = async () => {
    await Promise.all([loadUsers(), loadActivities(), loadUserStats()])
  }

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst seznam uživatelů pro admin panel.")
      }
    } catch (error: any) {
      console.error("Error loading users:", error)
      toast({
        title: "Chyba načítání uživatelů",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const loadActivities = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedUser !== "all") params.append("user_id", selectedUser)
      if (dateFrom) params.append("date_from", dateFrom)
      if (dateTo) params.append("date_to", dateTo)

      const response = await fetch(`/api/admin/activities?${params}`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst aktivity pro admin panel.")
      }
    } catch (error: any) {
      console.error("Error loading activities:", error)
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const loadUserStats = async () => {
    try {
      const response = await fetch("/api/admin/user-stats")
      if (response.ok) {
        const data = await response.json()
        setUserStats(data)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst statistiky uživatelů.")
      }
    } catch (error: any) {
      console.error("Error loading user stats:", error)
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const exportData = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedUser !== "all") params.append("user_id", selectedUser)
      if (dateFrom) params.append("date_from", dateFrom)
      if (dateTo) params.append("date_to", dateTo)

      const response = await fetch(`/api/admin/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `aktivity_${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)

        toast({
          title: "Export dokončen",
          description: "Data byla exportována do CSV souboru.",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se exportovat data.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba exportu",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Načítání admin panelu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hlavička */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Přehled aktivit všech uživatelů</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět do aplikace
            </Button>
            <Button onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Statistiky */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Celkem uživatelů</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Celkem aktivit</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activities.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Celkový čas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(activities.reduce((sum, activity) => sum + (activity.duration || 0), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtry */}
        <Card>
          <CardHeader>
            <CardTitle>Filtry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="user-select">Uživatel</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte uživatele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všichni uživatelé</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date-from">Od data</Label>
                <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="date-to">Do data</Label>
                <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={loadActivities} className="w-full">
                  Aplikovat filtry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiky uživatelů */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiky uživatelů</CardTitle>
            <CardDescription>Přehled aktivity jednotlivých uživatelů</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uživatel</TableHead>
                  <TableHead>Počet aktivit</TableHead>
                  <TableHead>Celkový čas</TableHead>
                  <TableHead>Průměrný čas</TableHead>
                  <TableHead>Poslední aktivita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userStats.map((stat) => (
                  <TableRow key={stat.user_id}>
                    <TableCell className="font-medium">{stat.user_name}</TableCell>
                    <TableCell>{stat.total_activities}</TableCell>
                    <TableCell>{formatDuration(stat.total_duration)}</TableCell>
                    <TableCell>{formatDuration(stat.avg_duration)}</TableCell>
                    <TableCell>{stat.last_activity ? formatDate(stat.last_activity) : "Nikdy"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Seznam aktivit */}
        <Card>
          <CardHeader>
            <CardTitle>Všechny aktivity</CardTitle>
            <CardDescription>Detailní přehled aktivit všech uživatelů</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uživatel</TableHead>
                  <TableHead>Aktivita</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Začátek</TableHead>
                  <TableHead>Konec</TableHead>
                  <TableHead>Doba trvání</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.user_name || "Neznámý"}</TableCell>
                    <TableCell>{activity.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{activity.description || "-"}</TableCell>
                    <TableCell>{formatDate(activity.start_time)}</TableCell>
                    <TableCell>{formatTime(activity.start_time)}</TableCell>
                    <TableCell>{activity.end_time ? formatTime(activity.end_time) : "-"}</TableCell>
                    <TableCell>
                      {activity.duration ? (
                        <Badge variant="outline">{formatDuration(activity.duration)}</Badge>
                      ) : (
                        <Badge variant="secondary">Běží</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
