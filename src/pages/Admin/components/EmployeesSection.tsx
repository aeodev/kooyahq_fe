import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import axiosInstance from '@/utils/axios.instance'
import { GET_USERS, UPDATE_EMPLOYEE } from '@/utils/api.routes'
import type { User } from '@/types/user'
import { Edit2, Save, X, Loader2 } from 'lucide-react'

export function EmployeesSection() {
  const [employees, setEmployees] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ name: string; email: string; position: string; birthday: string; isAdmin: boolean }>({
    name: '',
    email: '',
    position: '',
    birthday: '',
    isAdmin: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<{ status: string; data: User[] }>(GET_USERS())
      setEmployees(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (employee: User) => {
    setEditingId(employee.id)
    setEditData({
      name: employee.name,
      email: employee.email,
      position: employee.position || '',
      birthday: employee.birthday ? employee.birthday.split('T')[0] : '',
      isAdmin: employee.isAdmin,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({ name: '', email: '', position: '', birthday: '', isAdmin: false })
  }

  const handleSave = async (employeeId: string) => {
    setSaving(true)
    try {
      const updates: { name?: string; email?: string; position?: string; birthday?: string; isAdmin?: boolean } = {}

      if (editData.name !== employees.find((e) => e.id === employeeId)?.name) {
        updates.name = editData.name.trim()
      }
      if (editData.email !== employees.find((e) => e.id === employeeId)?.email) {
        updates.email = editData.email.trim()
      }
      if (editData.position !== (employees.find((e) => e.id === employeeId)?.position || '')) {
        updates.position = editData.position.trim() || undefined
      }
      const currentBirthday = employees.find((e) => e.id === employeeId)?.birthday
      const currentBirthdayDate = currentBirthday ? currentBirthday.split('T')[0] : ''
      if (editData.birthday !== currentBirthdayDate) {
        updates.birthday = editData.birthday ? editData.birthday : undefined
      }
      if (editData.isAdmin !== employees.find((e) => e.id === employeeId)?.isAdmin) {
        updates.isAdmin = editData.isAdmin
      }

      if (Object.keys(updates).length === 0) {
        cancelEdit()
        return
      }

      const response = await axiosInstance.put<{ status: string; data: User }>(
        UPDATE_EMPLOYEE(employeeId),
        updates
      )

      setEmployees(employees.map((e) => (e.id === employeeId ? response.data.data : e)))
      cancelEdit()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update employee')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {employees.map((employee) => (
            <Card key={employee.id}>
              <CardContent className="pt-6">
                {editingId === employee.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${employee.id}`}>Name</Label>
                      <Input
                        id={`name-${employee.id}`}
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Employee name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`email-${employee.id}`}>Email</Label>
                      <Input
                        id={`email-${employee.id}`}
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        placeholder="Employee email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`position-${employee.id}`}>Position</Label>
                      <Input
                        id={`position-${employee.id}`}
                        value={editData.position}
                        onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                        placeholder="e.g., Software Engineer, Product Manager"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`birthday-${employee.id}`}>Birthday</Label>
                      <Input
                        id={`birthday-${employee.id}`}
                        type="date"
                        value={editData.birthday}
                        onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`admin-${employee.id}`}
                        checked={editData.isAdmin}
                        onChange={(e) => setEditData({ ...editData, isAdmin: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor={`admin-${employee.id}`} className="cursor-pointer">
                        Admin Access
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleSave(employee.id)} disabled={saving} size="sm">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm" disabled={saving}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base sm:text-lg">{employee.name}</h3>
                        {employee.isAdmin && (
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                      {employee.position && (
                        <p className="text-sm font-medium text-foreground">{employee.position}</p>
                      )}
                    </div>
                    <Button onClick={() => startEdit(employee)} variant="outline" size="sm" className="flex-shrink-0">
                      <Edit2 className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}







