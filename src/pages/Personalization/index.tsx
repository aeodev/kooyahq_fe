import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserPreferencesStore, type FontSize, type UserPreferences } from '@/stores/user-preferences.store'
import { useThemeSettingsStore, DEFAULT_THEME_SETTINGS, type ThemeColors } from '@/stores/theme-settings.store'
import { Loader2, Sun, Moon, Palette, Type, PanelLeftClose, RotateCcw, Save, Lock } from 'lucide-react'
import { toast } from 'sonner'

// Helper to convert HSL string to hex
function hslToHex(hsl: string): string {
  const match = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/)
  if (!match) return '#000000'
  
  const h = parseFloat(match[1]) / 360
  const s = parseFloat(match[2]) / 100
  const l = parseFloat(match[3]) / 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Helper to convert hex to HSL string
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  h = Math.round(h * 360)
  s = Math.round(s * 100)
  const lPercent = Math.round(l * 100)

  return `${h} ${s}% ${lPercent}%`
}

// Helper to validate hex color
function isValidHex(hex: string): boolean {
  if (!hex.startsWith('#')) return false
  const hexPart = hex.slice(1)
  return /^[A-Fa-f0-9]{6}$/.test(hexPart)
}

// Helper to normalize hex
function normalizeHex(hex: string): string {
  let normalized = hex.trim()
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized
  }
  const hexPart = normalized.slice(1)
  if (hexPart.length === 3) {
    normalized = '#' + hexPart.split('').map(c => c + c).join('')
  }
  return normalized
}

type ColorField = 'primary' | 'secondary' | 'accent' | 'destructive' | 'muted' | 'background' | 'foreground' | 'border'

const colorCategories: Record<ColorField, { label: string; description: string }> = {
  primary: { label: 'Primary', description: 'Main brand color' },
  secondary: { label: 'Secondary', description: 'Supporting color' },
  accent: { label: 'Accent', description: 'Interactive elements' },
  destructive: { label: 'Destructive', description: 'Error states' },
  muted: { label: 'Muted', description: 'Subtle elements' },
  background: { label: 'Background', description: 'Page background' },
  foreground: { label: 'Foreground', description: 'Text color' },
  border: { label: 'Border', description: 'Border elements' },
}

export function Personalization() {
  const { preferences, loading, fetchPreferences, updatePreferences, resetPreferences } = useUserPreferencesStore()
  const { themeMandatory, fetchThemeSettings } = useThemeSettingsStore()
  
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(preferences)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchPreferences()
    fetchThemeSettings()
  }, [fetchPreferences, fetchThemeSettings])

  useEffect(() => {
    setLocalPreferences(preferences)
  }, [preferences])

  const handleColorChange = (mode: 'light' | 'dark', field: ColorField, hexValue: string) => {
    const normalizedHex = normalizeHex(hexValue)
    if (!isValidHex(normalizedHex)) return

    try {
      const hsl = hexToHsl(normalizedHex)
      const currentColors = localPreferences.themeColors?.[mode] || DEFAULT_THEME_SETTINGS[mode]
      
      setLocalPreferences({
        ...localPreferences,
        themeColors: {
          ...localPreferences.themeColors,
          [mode]: {
            ...currentColors,
            [field]: hsl,
          },
        },
      })
      setHasChanges(true)
    } catch (error) {
      // Invalid conversion
    }
  }

  const handleFontSizeChange = (fontSize: FontSize) => {
    setLocalPreferences({
      ...localPreferences,
      fontSize,
    })
    setHasChanges(true)
  }

  const handleSidebarToggle = (collapsed: boolean) => {
    setLocalPreferences({
      ...localPreferences,
      sidebarCollapsed: collapsed,
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePreferences(localPreferences)
      setHasChanges(false)
      toast.success('Preferences saved successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await resetPreferences()
      setHasChanges(false)
      toast.success('Preferences reset to defaults')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const getThemeColors = (mode: 'light' | 'dark'): ThemeColors => {
    return localPreferences.themeColors?.[mode] || DEFAULT_THEME_SETTINGS[mode]
  }

  const coreColors: ColorField[] = ['primary', 'secondary', 'accent', 'destructive']
  const surfaceColors: ColorField[] = ['background', 'foreground', 'muted', 'border']

  const ColorInput = ({ mode, field }: { mode: 'light' | 'dark'; field: ColorField }) => {
    const colors = getThemeColors(mode)
    const hslValue = colors[field]
    const hexValue = hslToHex(hslValue)
    const fieldId = `${mode}-${field}`

    return (
      <div className="flex items-center gap-3">
        <div className="relative">
          <Input
            id={fieldId}
            type="color"
            value={hexValue}
            onChange={(e) => handleColorChange(mode, field, e.target.value)}
            className="h-12 w-12 rounded-xl cursor-pointer border-2 border-border hover:border-ring transition-colors"
            disabled={themeMandatory}
          />
          <div
            className="absolute inset-1 rounded-lg pointer-events-none"
            style={{ backgroundColor: `hsl(${hslValue})` }}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {colorCategories[field].label}
          </Label>
          <p className="text-xs text-muted-foreground">{colorCategories[field].description}</p>
          <Input
            value={hexValue}
            onChange={(e) => handleColorChange(mode, field, e.target.value)}
            className="mt-1 h-8 text-xs font-mono"
            placeholder="#8fb84d"
            disabled={themeMandatory}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Personalization</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Make KooyaHQ feel like yours</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Button
            onClick={handleReset}
            disabled={saving}
            variant="outline"
            size="icon"
            className="sm:hidden"
            title="Reset to Defaults"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleReset}
            disabled={saving}
            variant="outline"
            className="hidden sm:flex gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            size="icon"
            className="sm:hidden"
            title={saving ? 'Saving...' : 'Save Changes'}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="hidden sm:flex gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Theme Colors Section - Takes 2 columns on xl */}
        <Card className="xl:col-span-2 border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Theme Colors</CardTitle>
                <CardDescription>Customize your color palette for light and dark modes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {themeMandatory ? (
              <div className="flex items-center gap-4 p-6 rounded-xl bg-muted/30 border border-border/50">
                <div className="p-3 rounded-full bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Theme colors are managed by your administrator</p>
                  <p className="text-sm text-muted-foreground mt-1">Contact your admin if you need custom theme colors</p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="light" className="w-full">
                <TabsList className="mb-8 h-12 p-1 bg-muted/50">
                  <TabsTrigger value="light" className="flex items-center gap-2 px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Sun className="h-4 w-4" />
                    Light Mode
                  </TabsTrigger>
                  <TabsTrigger value="dark" className="flex items-center gap-2 px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Moon className="h-4 w-4" />
                    Dark Mode
                  </TabsTrigger>
                </TabsList>

                {(['light', 'dark'] as const).map((mode) => (
                  <TabsContent key={mode} value={mode} className="space-y-8 mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <h4 className="text-sm font-medium text-muted-foreground px-2">Core Colors</h4>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {coreColors.map((field) => (
                          <ColorInput key={field} mode={mode} field={field} />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <h4 className="text-sm font-medium text-muted-foreground px-2">Surface Colors</h4>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {surfaceColors.map((field) => (
                          <ColorInput key={field} mode={mode} field={field} />
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Settings */}
        <div className="space-y-6">
          {/* Font Size Section */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <Type className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Font Size</CardTitle>
                  <CardDescription>Adjust text size for readability</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={localPreferences.fontSize || 'medium'}
                onValueChange={(value) => handleFontSizeChange(value as FontSize)}
                className="space-y-3"
              >
                {[
                  { value: 'small', label: 'Small', desc: 'Compact text', size: '14px' },
                  { value: 'medium', label: 'Medium', desc: 'Default size', size: '16px' },
                  { value: 'large', label: 'Large', desc: 'Better readability', size: '18px' },
                ].map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`font-${option.value}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/30 hover:border-border transition-all cursor-pointer group"
                  >
                    <RadioGroupItem value={option.value} id={`font-${option.value}`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.desc}</span>
                    </div>
                    <span className="text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      {option.size}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Sidebar Section */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <PanelLeftClose className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Sidebar</CardTitle>
                  <CardDescription>Configure sidebar behavior</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10">
                <div className="space-y-1">
                  <Label htmlFor="sidebar-collapsed" className="font-medium cursor-pointer">
                    Start collapsed
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Sidebar will be collapsed by default
                  </p>
                </div>
                <Switch
                  id="sidebar-collapsed"
                  checked={localPreferences.sidebarCollapsed || false}
                  onCheckedChange={handleSidebarToggle}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
