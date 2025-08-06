"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Play,
  Square,
  Plus,
  Edit,
  Trash2,
  Mic,
  MicOff,
  Clock,
  Settings,
  UsersIcon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SpeechRecognition } from "types/web"

interface Activity {
  id: string
  name: string
  description?: string
  start_time: string
  end_time?: string
  duration?: number
  user_id: string
  created_at: string
}

interface AppUser {
  id: string
  name: string
  role: "user" | "admin"
}

export default function WorkActivityLogger() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [weekActivities, setWeekActivities] = useState<Activity[]>([])
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  // Loading states
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [isLoadingWeekActivities, setIsLoadingWeekActivities] = useState(false)
  const [isStartingActivity, setIsStartingActivity] = useState(false)
  const [isStoppingActivity, setIsStoppingActivity] = useState(false)

  // Dialog stavy
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isQuickStartDialogOpen, setIsQuickStartDialogOpen] = useState(false)
  const [isCalendarAddDialogOpen, setIsCalendarAddDialogOpen] = useState(false)

  // Formulářové stavy
  const [newActivityName, setNewActivityName] = useState("")
  const [newActivityDescription, setNewActivityDescription] = useState("")
  const [newActivityStartTime, setNewActivityStartTime] = useState("")
  const [newActivityEndTime, setNewActivityEndTime] = useState("")

  // Calendar add dialog state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null)

  const { toast } = useToast()

  // Načtení uživatelů při startu
  useEffect(() => {
    loadUsers()
  }, [])

  // Načtení dat při výběru uživatele
  useEffect(() => {
    if (selectedUserId) {
      const user = users.find((u) => u.id === selectedUserId)
      setSelectedUser(user || null)
      loadActivities()
      loadCurrentActivity()
      loadWeekActivities()
    } else {
      setActivities([])
      setCurrentActivity(null)
      setWeekActivities([])
    }
  }, [selectedUserId, users])

  // Načtení týdenních aktivit při změně týdne
  useEffect(() => {
    if (selectedUserId) {
      loadWeekActivities()
    }
  }, [currentWeek, selectedUserId])

  const loadUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)

        if (data.length > 0 && !selectedUserId) {
          setSelectedUserId(data[0].id)
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst seznam uživatelů.")
      }
    } catch (error: any) {
      console.error("Error loading users:", error)
      toast({
        title: "Chyba načítání uživatelů",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const loadActivities = async () => {
    if (!selectedUserId) return

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(selectedUserId)) {
      console.error("Invalid UUID format for selectedUserId:", selectedUserId)
      setActivities([])
      return
    }

    setIsLoadingActivities(true)
    try {
      const response = await fetch(`/api/activities?user_id=${encodeURIComponent(selectedUserId)}`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst aktivity pro vybraného uživatele.")
      }
    } catch (error: any) {
      console.error("Error loading activities:", error)
      toast({
        title: "Chyba načítání aktivit",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoadingActivities(false)
    }
  }

  const loadWeekActivities = async () => {
    if (!selectedUserId) return

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(selectedUserId)) {
      console.error("Invalid UUID format for selectedUserId:", selectedUserId)
      setWeekActivities([])
      return
    }

    setIsLoadingWeekActivities(true)
    try {
      const weekStart = getWeekStart(currentWeek)
      const weekEnd = getWeekEnd(currentWeek)

      const response = await fetch(
        `/api/activities/week?user_id=${encodeURIComponent(selectedUserId)}&start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`,
      )
      if (response.ok) {
        const data = await response.json()
        setWeekActivities(data)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se načíst týdenní aktivity.")
      }
    } catch (error: any) {
      console.error("Error loading week activities:", error)
      toast({
        title: "Chyba načítání týdenních aktivit",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoadingWeekActivities(false)
    }
  }

  const loadCurrentActivity = async () => {
    if (!selectedUserId) return

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(selectedUserId)) {
      console.error("Invalid UUID format for selectedUserId:", selectedUserId)
      setCurrentActivity(null)
      return
    }

    try {
      const response = await fetch(`/api/activities/current?user_id=${encodeURIComponent(selectedUserId)}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentActivity(data)
      } else if (response.status === 404) {
        setCurrentActivity(null)
      } else {
        const errorData = await response.json()
        console.error("API Error:", errorData)
        throw new Error(errorData.details || "Nepodařilo se načíst aktuální aktivitu.")
      }
    } catch (error: any) {
      console.error("Error loading current activity:", error)
      setCurrentActivity(null)
    }
  }

  // Aktualizace času každou sekundu
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Inicializace hlasového rozpoznávání
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = "cs-CZ"

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase()
        handleVoiceCommand(transcript)
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
      }

      recognitionInstance.onerror = (event) => {
        setIsListening(false)
        toast({
          title: "Chyba hlasového rozpoznávání",
          description: `Nepodařilo se rozpoznat hlasový příkaz: ${event.error}`,
          variant: "destructive",
        })
      }

      setRecognition(recognitionInstance)
    }
  }, [])

  const handleVoiceCommand = (command: string) => {
    if (command.includes("začni") || command.includes("start")) {
      const activityName = command.replace(/začni|start/g, "").trim()
      if (activityName) {
        startActivity(activityName)
        toast({
          title: "Aktivita zahájena hlasem",
          description: `Spuštěna aktivita: ${activityName}`,
        })
      }
    } else if (command.includes("ukonči") || command.includes("stop")) {
      if (currentActivity) {
        stopActivity()
        toast({
          title: "Aktivita ukončena hlasem",
          description: "Aktuální aktivita byla ukončena.",
        })
      }
    }
  }

  const startVoiceRecognition = () => {
    if (!selectedUserId) {
      toast({
        title: "Vyberte uživatele",
        description: "Nejprve vyberte uživatele pro hlasové příkazy.",
        variant: "destructive",
      })
      return
    }

    if (recognition) {
      setIsListening(true)
      recognition.start()
    } else {
      toast({
        title: "Hlasové rozpoznávání není podporováno",
        description: "Váš prohlížeč nepodporuje hlasové rozpoznávání.",
        variant: "destructive",
      })
    }
  }

  const handleQuickStart = async () => {
    if (!newActivityName.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte název aktivity.",
        variant: "destructive",
      })
      return
    }

    await startActivity(newActivityName.trim(), newActivityDescription.trim() || undefined)
    setNewActivityName("")
    setNewActivityDescription("")
    setIsQuickStartDialogOpen(false)
  }

  const startActivity = async (name: string, description?: string) => {
    if (!selectedUserId) {
      toast({
        title: "Vyberte uživatele",
        description: "Nejprve vyberte uživatele.",
        variant: "destructive",
      })
      return
    }

    if (currentActivity) {
      await stopActivity()
    }

    setIsStartingActivity(true)
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, user_id: selectedUserId }),
      })

      if (response.ok) {
        const newActivity = await response.json()
        setCurrentActivity(newActivity)
        toast({
          title: "Aktivita zahájena",
          description: `Spuštěna aktivita: ${name}`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se spustit aktivitu.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsStartingActivity(false)
    }
  }

  const stopActivity = async () => {
    if (!currentActivity || !selectedUserId) return

    setIsStoppingActivity(true)
    try {
      const response = await fetch(`/api/activities/${currentActivity.id}/stop`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUserId }),
      })

      if (response.ok) {
        const stoppedActivity = await response.json()
        setCurrentActivity(null)
        await Promise.all([loadActivities(), loadWeekActivities()])

        toast({
          title: "Aktivita ukončena",
          description: `Aktivita "${stoppedActivity.name}" trvala ${formatDuration(stoppedActivity.duration)}`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se ukončit aktivitu.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsStoppingActivity(false)
    }
  }

  const addManualActivity = async () => {
    if (!selectedUserId || !newActivityName.trim() || !newActivityStartTime) {
      toast({
        title: "Chyba",
        description: "Vyberte uživatele a vyplňte název aktivity a čas začátku.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/activities/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newActivityName.trim(),
          description: newActivityDescription.trim() || undefined,
          start_time: newActivityStartTime,
          end_time: newActivityEndTime || undefined,
          user_id: selectedUserId,
        }),
      })

      if (response.ok) {
        await Promise.all([loadActivities(), loadWeekActivities()])
        resetFormFields()
        setIsAddDialogOpen(false)
        setIsCalendarAddDialogOpen(false)

        toast({
          title: "Aktivita přidána",
          description: "Aktivita byla úspěšně přidána.",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se přidat aktivitu.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const editActivity = (activity: Activity) => {
    setEditingActivity(activity)
    setNewActivityName(activity.name)
    setNewActivityDescription(activity.description || "")
    setNewActivityStartTime(new Date(activity.start_time).toISOString().slice(0, 16))
    setNewActivityEndTime(activity.end_time ? new Date(activity.end_time).toISOString().slice(0, 16) : "")
    setIsEditDialogOpen(true)
  }

  const saveEditedActivity = async () => {
    if (!editingActivity || !newActivityName.trim() || !newActivityStartTime || !selectedUserId) {
      toast({
        title: "Chyba",
        description: "Vyplňte všechna povinná pole.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/activities/${editingActivity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newActivityName.trim(),
          description: newActivityDescription.trim() || undefined,
          start_time: newActivityStartTime,
          end_time: newActivityEndTime || undefined,
          user_id: selectedUserId,
        }),
      })

      if (response.ok) {
        await Promise.all([loadActivities(), loadWeekActivities()])
        setEditingActivity(null)
        setIsEditDialogOpen(false)
        resetFormFields()

        toast({
          title: "Aktivita upravena",
          description: "Změny byly úspěšně uloženy.",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se upravit aktivitu.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const deleteActivity = async (id: string) => {
    if (!selectedUserId) return

    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUserId }),
      })

      if (response.ok) {
        await Promise.all([loadActivities(), loadWeekActivities()])
        toast({
          title: "Aktivita smazána",
          description: "Aktivita byla úspěšně odstraněna.",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || "Nepodařilo se smazat aktivitu.")
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const resetFormFields = () => {
    setNewActivityName("")
    setNewActivityDescription("")
    setNewActivityStartTime("")
    setNewActivityEndTime("")
  }

  const openCalendarAddDialog = (date: Date) => {
    setSelectedCalendarDate(date)
    // Set default time to current time or 9:00 AM
    const defaultTime = new Date(date)
    defaultTime.setHours(9, 0, 0, 0)
    setNewActivityStartTime(defaultTime.toISOString().slice(0, 16))
    setIsCalendarAddDialogOpen(true)
  }

  // Pomocné funkce pro kalendář
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Pondělí jako první den
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

  const getCurrentActivityDuration = () => {
    if (!currentActivity) return 0
    return Math.floor((currentTime.getTime() - new Date(currentActivity.start_time).getTime()) / 1000)
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

  if (isLoadingUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-32 w-32 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Načítání aplikace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hlavička s výběrem uživatele */}
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Logování pracovních činností</h1>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Vyberte uživatele" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                        {user.role === "admin" && (
                          <Badge className="ml-2" variant="secondary">
                            Admin
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedUser?.role === "admin" && (
                <Button variant="outline" onClick={() => (window.location.href = "/admin")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="outline" onClick={() => (window.location.href = "/users")}>
                <UsersIcon className="w-4 h-4 mr-2" />
                Správa uživatelů
              </Button>
            </div>
          </div>
        </div>

        {!selectedUserId ? (
          <Card>
            <CardContent className="text-center py-12">
              <UsersIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Vyberte uživatele</h3>
              <p className="text-gray-500">Pro začátek práce vyberte uživatele ze seznamu výše.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Aktuální aktivita */}
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Aktuální aktivita - {selectedUser?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentActivity ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-blue-700">{currentActivity.name}</h3>
                      {currentActivity.description && (
                        <p className="text-gray-600 mt-1">{currentActivity.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">Začátek: {formatTime(currentActivity.start_time)}</div>
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {formatDuration(getCurrentActivityDuration())}
                      </Badge>
                    </div>
                    <Button onClick={stopActivity} className="w-full" size="lg" disabled={isStoppingActivity}>
                      {isStoppingActivity ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Square className="w-4 h-4 mr-2" />
                      )}
                      {isStoppingActivity ? "Ukončování..." : "Ukončit aktivitu"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Žádná aktivita není spuštěna</p>
                    <div className="flex gap-2 justify-center">
                      <Dialog open={isQuickStartDialogOpen} onOpenChange={setIsQuickStartDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="lg" disabled={isStartingActivity}>
                            {isStartingActivity ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            {isStartingActivity ? "Spouštění..." : "Spustit aktivitu"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Spustit novou aktivitu</DialogTitle>
                            <DialogDescription>Zadejte název aktivity, kterou chcete spustit.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="quick-activity-name">Název aktivity *</Label>
                              <Input
                                id="quick-activity-name"
                                value={newActivityName}
                                onChange={(e) => setNewActivityName(e.target.value)}
                                placeholder="Např. Schůzka s klientem"
                                onKeyDown={(e) => e.key === "Enter" && handleQuickStart()}
                              />
                            </div>
                            <div>
                              <Label htmlFor="quick-activity-description">Popis (volitelné)</Label>
                              <Textarea
                                id="quick-activity-description"
                                value={newActivityDescription}
                                onChange={(e) => setNewActivityDescription(e.target.value)}
                                placeholder="Krátký popis aktivity"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsQuickStartDialogOpen(false)}>
                              Zrušit
                            </Button>
                            <Button onClick={handleQuickStart} disabled={isStartingActivity}>
                              {isStartingActivity ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              {isStartingActivity ? "Spouštění..." : "Spustit aktivitu"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button onClick={startVoiceRecognition} variant="outline" size="lg" disabled={isListening}>
                        {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isListening ? "Naslouchám..." : "Hlasový příkaz"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Taby pro přehled */}
            <Tabs defaultValue="calendar" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calendar">
                  <Calendar className="w-4 h-4 mr-2" />
                  Týdenní kalendář
                </TabsTrigger>
                <TabsTrigger value="list">
                  <Clock className="w-4 h-4 mr-2" />
                  Seznam aktivit
                </TabsTrigger>
              </TabsList>

              {/* Týdenní kalendář */}
              <TabsContent value="calendar">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Týdenní přehled - {selectedUser?.name}
                      </CardTitle>
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
                    <CardDescription>
                      Přehled aktivit pro vybraný týden. Klikněte na den pro přidání aktivity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingWeekActivities ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="ml-2">Načítání týdenních aktivit...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-2">
                        {getWeekDays(currentWeek).map((day, index) => {
                          const dayActivities = getActivitiesForDay(day)
                          const isToday = day.toDateString() === new Date().toDateString()
                          const totalDuration = dayActivities.reduce(
                            (sum, activity) => sum + (activity.duration || 0),
                            0,
                          )

                          return (
                            <div
                              key={day.toISOString()}
                              className={`border rounded-lg p-3 min-h-[300px] cursor-pointer hover:bg-gray-50 transition-colors ${
                                isToday ? "border-blue-500 bg-blue-50" : "border-gray-200"
                              }`}
                              onClick={() => openCalendarAddDialog(day)}
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
                                {dayActivities.length === 0 ? (
                                  <div className="text-xs text-gray-400 text-center py-4">
                                    <Plus className="w-4 h-4 mx-auto mb-1" />
                                    Klikněte pro přidání
                                  </div>
                                ) : (
                                  dayActivities.map((activity) => (
                                    <div
                                      key={activity.id}
                                      className="text-xs p-2 bg-white rounded border hover:bg-gray-50 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        editActivity(activity)
                                      }}
                                    >
                                      <div className="font-medium truncate">{activity.name}</div>
                                      <div className="text-gray-500">
                                        {formatTime(activity.start_time)}
                                        {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                                      </div>
                                      {activity.duration && (
                                        <div className="text-gray-400">{formatDuration(activity.duration)}</div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Seznam aktivit */}
              <TabsContent value="list">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Historie aktivit - {selectedUser?.name}</CardTitle>
                        <CardDescription>Přehled všech zaznamenaných aktivit</CardDescription>
                      </div>
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Přidat aktivitu
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Přidat novou aktivitu</DialogTitle>
                            <DialogDescription>
                              Zadejte podrobnosti o aktivitě, kterou chcete zaznamenat.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="activity-name">Název aktivity *</Label>
                              <Input
                                id="activity-name"
                                value={newActivityName}
                                onChange={(e) => setNewActivityName(e.target.value)}
                                placeholder="Např. Schůzka s klientem"
                              />
                            </div>
                            <div>
                              <Label htmlFor="activity-description">Popis</Label>
                              <Textarea
                                id="activity-description"
                                value={newActivityDescription}
                                onChange={(e) => setNewActivityDescription(e.target.value)}
                                placeholder="Volitelný popis aktivity"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="start-time">Čas začátku *</Label>
                                <Input
                                  id="start-time"
                                  type="datetime-local"
                                  value={newActivityStartTime}
                                  onChange={(e) => setNewActivityStartTime(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="end-time">Čas konce</Label>
                                <Input
                                  id="end-time"
                                  type="datetime-local"
                                  value={newActivityEndTime}
                                  onChange={(e) => setNewActivityEndTime(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                              Zrušit
                            </Button>
                            <Button onClick={addManualActivity}>Přidat aktivitu</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingActivities ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="ml-2">Načítání aktivit...</span>
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">Zatím nebyly zaznamenány žádné aktivity</div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <h4 className="font-semibold">{activity.name}</h4>
                              {activity.description && (
                                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span>
                                  {formatDate(activity.start_time)} {formatTime(activity.start_time)}
                                </span>
                                {activity.end_time && (
                                  <>
                                    <span>→</span>
                                    <span>{formatTime(activity.end_time)}</span>
                                  </>
                                )}
                                {activity.duration && (
                                  <Badge variant="outline">{formatDuration(activity.duration)}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => editActivity(activity)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Smazat aktivitu</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Opravdu chcete smazat aktivitu "{activity.name}"? Tuto akci nelze vrátit zpět.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteActivity(activity.id)}>
                                      Smazat
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Dialog pro přidání aktivity z kalendáře */}
            <Dialog open={isCalendarAddDialogOpen} onOpenChange={setIsCalendarAddDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Přidat aktivitu - {selectedCalendarDate?.toLocaleDateString("cs-CZ")}</DialogTitle>
                  <DialogDescription>Zadejte podrobnosti o aktivitě pro vybraný den.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="calendar-activity-name">Název aktivity *</Label>
                    <Input
                      id="calendar-activity-name"
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      placeholder="Např. Schůzka s klientem"
                    />
                  </div>
                  <div>
                    <Label htmlFor="calendar-activity-description">Popis</Label>
                    <Textarea
                      id="calendar-activity-description"
                      value={newActivityDescription}
                      onChange={(e) => setNewActivityDescription(e.target.value)}
                      placeholder="Volitelný popis aktivity"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="calendar-start-time">Čas začátku *</Label>
                      <Input
                        id="calendar-start-time"
                        type="datetime-local"
                        value={newActivityStartTime}
                        onChange={(e) => setNewActivityStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="calendar-end-time">Čas konce</Label>
                      <Input
                        id="calendar-end-time"
                        type="datetime-local"
                        value={newActivityEndTime}
                        onChange={(e) => setNewActivityEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCalendarAddDialogOpen(false)
                      resetFormFields()
                    }}
                  >
                    Zrušit
                  </Button>
                  <Button onClick={addManualActivity}>Přidat aktivitu</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog pro úpravu aktivity */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upravit aktivitu</DialogTitle>
                  <DialogDescription>Upravte podrobnosti o aktivitě.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-activity-name">Název aktivity *</Label>
                    <Input
                      id="edit-activity-name"
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-activity-description">Popis</Label>
                    <Textarea
                      id="edit-activity-description"
                      value={newActivityDescription}
                      onChange={(e) => setNewActivityDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-start-time">Čas začátku *</Label>
                      <Input
                        id="edit-start-time"
                        type="datetime-local"
                        value={newActivityStartTime}
                        onChange={(e) => setNewActivityStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-end-time">Čas konce</Label>
                      <Input
                        id="edit-end-time"
                        type="datetime-local"
                        value={newActivityEndTime}
                        onChange={(e) => setNewActivityEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false)
                      resetFormFields()
                    }}
                  >
                    Zrušit
                  </Button>
                  <Button onClick={saveEditedActivity}>Uložit změny</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  )
}
