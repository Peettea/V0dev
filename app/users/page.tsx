"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Users,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
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
  created_at: string
}

interface UserStats {
  user_id: string
  user_name: string
  total_activities: number
  total_duration: number
  avg_duration: number
  last_activity: string
}

export default function UsersManagement() {
  const router = useRouter()
  const [users, setUsers] = useState<AppUser[]>([])
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [selectedUserForCalendar, setSelectedUserForCalendar] = useState<string>("")
  const [weekActivities, setWeekActivities] = useState<Activity[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingWeekActivities, setIsLoadingWeekActivities] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)

  // Dialog stavy
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)

  // Formulářové stavy
  const [newUserName, setNewUserName] = useState("")
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user")

  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedUserForCalendar) {
      loadWeekActivities()
    }
  }, [currentWeek, selectedUserForCalendar])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([loadUsers(), loadUserStats(), loadActivities()])
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()

        // Validate and sanitize user data
        const validUsers = data
          .filter((user: any) => {
            return (
              user &&
              user.id &&
              typeof user.id === "string" &&
              user.name &&
              typeof user.name === "string" &&
              user.role &&
              ["user", "admin"].includes(user.role)
            )
          })
          .map((user: any) => ({
            id: user.id.toString(),
            name: user.name.toString(),
            role: user.role as "user" | "admin",
            created_at: user.created_at || new Date().toISOString(),
          }))

        setUsers(validUsers)
        if (validUsers.length > 0 && !selectedUserForCalendar) {
          setSelectedUserForCalendar(validUsers[0].id)
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst seznam uživatelů.")
      }
    } catch (error: any) {
      console.error("Error loading users:", error)
      toast({
        title: "Chyba načítání uživatelů",
        description: error.message || "Neočekávaná chyba při načítání uživatelů.",
        variant: "destructive",
      })
      // Set empty array to prevent further errors
      setUsers([])
    }
  }

  const loadUserStats = async () => {
    try {
      const response = await fetch("/api/admin/user-stats")
      if (response.ok) {
        const data = await response.json()

        // Validate and sanitize stats data
        const validStats = data
          .filter((stat: any) => {
            return (
              stat &&
              stat.user_id &&
              stat.user_name &&
              typeof stat.total_activities === "number" &&
              typeof stat.total_duration === "number"
            )
          })
          .map((stat: any) => ({
            user_id: stat.user_id.toString(),
            user_name: stat.user_name.toString(),
            total_activities: Number(stat.total_activities) || 0,
            total_duration: Number(stat.total_duration) || 0,
            avg_duration: Number(stat.avg_duration) || 0,
            last_activity: stat.last_activity || null,
          }))

        setUserStats(validStats)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst statistiky uživatelů.")
      }
    } catch (error: any) {
      console.error("Error loading user stats:", error)
      toast({
        title: "Chyba načítání statistik",
        description: error.message || "Neočekávaná chyba při načítání statistik.",
        variant: "destructive",
      })
      // Set empty array to prevent further errors
      setUserStats([])
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
        throw new Error(errorData.details || "Nepodařilo se načíst aktivity.")
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

  const loadWeekActivities = async () => {
    if (!selectedUserForCalendar) return

    // Basic UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(selectedUserForCalendar)) {
      console.error("Invalid UUID format for selectedUserForCalendar:", selectedUserForCalendar)
      setWeekActivities([])
      return
    }

    setIsLoadingWeekActivities(true)
    try {
      const weekStart = getWeekStart(currentWeek)
      const weekEnd = getWeekEnd(currentWeek)

      const response = await fetch(
        `/api/activities/week?user_id=${encodeURIComponent(selectedUserForCalendar)}&start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
      )
      if (response.ok) {
        const data = await response.json()

        // Validate and sanitize activities data
        const validActivities = data
          .filter((activity: any) => {
            return activity && activity.id && activity.name && activity.start_time && activity.user_id
          })
          .map((activity: any) => ({
            id: activity.id.toString(),
            name: activity.name.toString(),
            description: activity.description || undefined,
            start_time: activity.start_time,
            end_time: activity.end_time || undefined,
            duration: Number(activity.duration) || undefined,
            user_id: activity.user_id.toString(),
            created_at: activity.created_at || new Date().toISOString(),
            user_name: activity.user_name || undefined,
          }))

        setWeekActivities(validActivities)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst týdenní aktivity.")
      }
    } catch (error: any) {
      console.error("Error loading week activities:", error)
      toast({
        title: "Chyba načítání týdenních aktivit",
        description: error.message || "Neočekávaná chyba při načítání aktivit.",
        variant: "destructive",
      })
      setWeekActivities([])
    } finally {
      setIsLoadingWeekActivities(false)
    }
  }

  const addUser = async () => {
    if (!newUserName.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte jméno uživatele.",
        variant: "destructive",
      })
      return
    }

    setIsAddingUser(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUserName.trim(), role: newUserRole }),
      })

      if (response.ok) {
        await loadData()
        setNewUserName("")
        setNewUserRole("user")
        setIsAddUserDialogOpen(false)
        toast({
          title: "Uživatel přidán",
          description: `Uživatel ${newUserName} byl úspěšně přidán.`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se přidat uživatele.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsAddingUser(false)
    }
  }

  const editUser = (user: AppUser) => {
    setEditingUser(user)
    setNewUserName(user.name)
    setNewUserRole(user.role)
    setIsEditUserDialogOpen(true)
  }

  const saveEditedUser = async () => {
    if (!editingUser || !newUserName.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte jméno uživatele.",
        variant: "destructive",
      })
      return
    }

    setIsEditingUser(true)
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUserName.trim(), role: newUserRole }),
      })

      if (response.ok) {
        await loadData()
        setEditingUser(null)
        setIsEditUserDialogOpen(false)
        setNewUserName("")
        setNewUserRole("user")
        toast({
          title: "Uživatel upraven",
          description: "Změny byly úspěšně uloženy.",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se upravit uživatele.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsEditingUser(false)
    }
  }

  const deleteUser = async (id: string) => {
    setIsDeletingUser(true)
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await loadData()
        // Reset selected user for calendar if deleted user was selected
        if (selectedUserForCalendar === id && users.length > 1) {
          const remainingUsers = users.filter((u) => u.id !== id)
          if (remainingUsers.length > 0) {
            setSelectedUserForCalendar(remainingUsers[0].id)
          }
        }
        toast({
          title: "Uživatel smazán",
          description: "Uživatel byl úspěšně odstraněn.",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se smazat uživatele.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDeletingUser(false)
    }
  }

  // Pomocné funkce pro kalendář
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  const getWeekEnd = (date: Date) => {
    const weekStart = getWeekStart(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    return weekEnd
  }

  const getWeekDays = (date: Date) => {
    const weekStart = getWeekStart(date)
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getActivitiesForDay = (date: Date) => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return weekActivities.filter((activity) => {
      const activityDate = new Date(activity.start_time)
      return activityDate >= dayStart && activityDate <= dayEnd
    })
  }

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 0) return "0s"

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

  const formatWeekRange = (date: Date) => {
    const weekStart = getWeekStart(date)
    const weekEnd = getWeekEnd(date)
    return `${weekStart.toLocaleDateString("cs-CZ")} - ${weekEnd.toLocaleDateString("cs-CZ")}`
  }

  const dayNames = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-32 w-32 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Načítání správy uživatelů...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Správa uživatelů</h1>
            <p className="text-gray-600">Přehled a správa všech uživatelů systému</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět do aplikace
            </Button>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat uživatele
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Přidat nového uživatele</DialogTitle>
                  <DialogDescription>Zadejte údaje o novém uživateli.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-name">Jméno uživatele *</Label>
                    <Input
                      id="user-name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Např. Jan Novák"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-role">Role</Label>
                    <Select value={newUserRole} onValueChange={(value: "user" | "admin") => setNewUserRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Uživatel</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                    Zrušit
                  </Button>
                  <Button onClick={addUser} disabled={isAddingUser}>
                    {isAddingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {isAddingUser ? "Přidávání..." : "Přidat uživatele"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Taby */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Uživatelé
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="w-4 h-4 mr-2" />
              Statistiky
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Kalendář uživatele
            </TabsTrigger>
          </TabsList>

          {/* Seznam uživatelů */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Seznam uživatelů</CardTitle>
                <CardDescription>Správa všech uživatelů v systému</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jméno</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Vytvořen</TableHead>
                      <TableHead>Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Admin" : "Uživatel"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => editUser(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={isDeletingUser}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Smazat uživatele</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Opravdu chcete smazat uživatele "{user.name}"? Tato akce také smaže všechny jeho
                                    aktivity a nelze ji vrátit zpět.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteUser(user.id)} disabled={isDeletingUser}>
                                    {isDeletingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    {isDeletingUser ? "Mazání..." : "Smazat"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistiky uživatelů */}
          <TabsContent value="stats">
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
          </TabsContent>

          {/* Kalendář uživatele */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Týdenní kalendář uživatele
                    </CardTitle>
                    <CardDescription>Přehled aktivit vybraného uživatele</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="calendar-user-select">Uživatel:</Label>
                      <Select value={selectedUserForCalendar} onValueChange={setSelectedUserForCalendar}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Vyberte uživatele" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                        disabled={isLoadingWeekActivities}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[200px] text-center">
                        {formatWeekRange(currentWeek)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                        disabled={isLoadingWeekActivities}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                        Dnes
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedUserForCalendar ? (
                  isLoadingWeekActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <span className="ml-2">Načítání týdenních aktivit...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {getWeekDays(currentWeek).map((day, index) => {
                        const dayActivities = getActivitiesForDay(day)
                        const isToday = day.toDateString() === new Date().toDateString()
                        const totalDuration = dayActivities.reduce((sum, activity) => sum + (activity.duration || 0), 0)

                        return (
                          <div
                            key={day.toISOString()}
                            className={`border rounded-lg p-3 min-h-[300px] ${
                              isToday ? "border-blue-500 bg-blue-50" : "border-gray-200"
                            }`}
                          >
                            <div className="text-center mb-3">
                              <div className="text-sm font-medium">{dayNames[index]}</div>
                              <div className={`text-lg ${isToday ? "font-bold text-blue-600" : ""}`}>
                                {day.getDate()}
                              </div>
                              {totalDuration > 0 && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {formatDuration(totalDuration)}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              {dayActivities.map((activity) => (
                                <div key={activity.id} className="text-xs p-2 bg-white rounded border">
                                  <div className="font-medium truncate">{activity.name}</div>
                                  <div className="text-gray-500">
                                    {formatTime(activity.start_time)}
                                    {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                                  </div>
                                  {activity.duration && (
                                    <div className="text-gray-400">{formatDuration(activity.duration)}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-gray-500">Vyberte uživatele pro zobrazení kalendáře</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog pro úpravu uživatele */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upravit uživatele</DialogTitle>
              <DialogDescription>Upravte údaje o uživateli.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-user-name">Jméno uživatele *</Label>
                <Input id="edit-user-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-user-role">Role</Label>
                <Select value={newUserRole} onValueChange={(value: "user" | "admin") => setNewUserRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Uživatel</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={saveEditedUser} disabled={isEditingUser}>
                {isEditingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isEditingUser ? "Ukládání..." : "Uložit změny"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
