import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useThemeSettingsStore, DEFAULT_THEME_SETTINGS, type ThemeSettings } from '@/stores/theme-settings.store'
import { Loader2, Save, Sun, Moon, CheckCircle, RotateCcw, Lock } from 'lucide-react'
import { toast } from 'sonner'

// Helper to validate hex color
function isValidHex(hex: string): boolean {
  // Allow partial hex (user typing) or full hex
  if (!hex.startsWith('#')) return false
  const hexPart = hex.slice(1)
  return /^[A-Fa-f0-9]{0,6}$/.test(hexPart) && (hexPart.length === 3 || hexPart.length === 6)
}

// Helper to normalize hex (add # if missing, pad to 6 digits)
function normalizeHex(hex: string): string {
  let normalized = hex.trim()
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized
  }
  const hexPart = normalized.slice(1)
  // If 3 digits, expand to 6
  if (hexPart.length === 3) {
    normalized = '#' + hexPart.split('').map(c => c + c).join('')
  }
  // Pad to 6 digits if less than 6
  if (hexPart.length > 0 && hexPart.length < 6 && hexPart.length !== 3) {
    normalized = '#' + hexPart.padEnd(6, '0')
  }
  return normalized
}

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

type ColorField = 'primary' | 'secondary' | 'accent' | 'destructive' | 'muted' | 'background' | 'foreground' | 'border'

const colorCategories = {
  primary: { label: 'Primary', description: 'Main brand color' },
  secondary: { label: 'Secondary', description: 'Supporting color' },
  accent: { label: 'Accent', description: 'Interactive elements' },
  destructive: { label: 'Destructive', description: 'Error states' },
  muted: { label: 'Muted', description: 'Subtle elements' },
  background: { label: 'Background', description: 'Page background' },
  foreground: { label: 'Foreground', description: 'Text color' },
  border: { label: 'Border', description: 'Border elements' },
}

export function ThemeSettingsSection() {
  const { settings, themeMandatory, loading, fetchThemeSettings, updateThemeSettings, updateThemeMandatory } = useThemeSettingsStore()
  const [localSettings, setLocalSettings] = useState<ThemeSettings | null>(null)
  const [localMandatory, setLocalMandatory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingMandatory, setSavingMandatory] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (!settings) {
      fetchThemeSettings()
    } else {
      setLocalSettings(settings)
      setLocalMandatory(themeMandatory)
    }
  }, [settings, themeMandatory, fetchThemeSettings])

  const handleColorChange = (mode: 'light' | 'dark', field: ColorField, hexValue: string) => {
    if (!localSettings) return

    // Normalize and validate hex
    const normalizedHex = normalizeHex(hexValue)
    if (!isValidHex(normalizedHex)) return

    try {
      const hsl = hexToHsl(normalizedHex)
      setLocalSettings({
        ...localSettings,
        [mode]: {
          ...localSettings[mode],
          [field]: hsl,
        },
      })
      setHasChanges(true)
    } catch (error) {
      // Invalid conversion, don't update
      return
    }
  }

  const handleSave = async () => {
    if (!localSettings) return

    setSaving(true)
    try {
      await updateThemeSettings(localSettings)
      setHasChanges(false)
      toast.success('Theme settings updated successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update theme settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setLocalSettings(DEFAULT_THEME_SETTINGS)
    setHasChanges(true)
  }

  const handleMandatoryToggle = async (checked: boolean) => {
    setSavingMandatory(true)
    try {
      await updateThemeMandatory(checked)
      setLocalMandatory(checked)
      toast.success(checked ? 'Theme is now mandatory for all users' : 'Users can now customize their theme')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update mandatory setting')
    } finally {
      setSavingMandatory(false)
    }
  }

  if (loading || !localSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const coreColors: ColorField[] = ['primary', 'secondary', 'accent', 'destructive']
  const surfaceColors: ColorField[] = ['background', 'foreground', 'muted', 'border']

  const ColorInput = ({ mode, field }: { mode: 'light' | 'dark'; field: ColorField }) => {
    const hslValue = localSettings[mode][field]
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
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Mandatory Theme Setting */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="theme-mandatory" className="text-base font-medium">
                  Enforce theme for all users
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, users cannot customize their own theme colors
                </p>
              </div>
            </div>
            <Switch
              checked={localMandatory}
              onCheckedChange={handleMandatoryToggle}
              disabled={savingMandatory}
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Editor */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/20">

        <CardContent>
          <Tabs defaultValue="light" className="w-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-semibold text-foreground">Color Palette</h2>
              <TabsList className="h-10 p-1 bg-muted/50 rounded-lg">
                <TabsTrigger value="light" className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
                  <Sun className="h-3.5 w-3.5" />
                  Light
                </TabsTrigger>
                <TabsTrigger value="dark" className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </TabsTrigger>
              </TabsList>
            </div>

            {(['light', 'dark'] as const).map((mode) => (
              <TabsContent key={mode} value={mode} className="space-y-8 mt-0">
                {/* Core Colors */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Core Colors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coreColors.map((field) => (
                      <ColorInput key={field} mode={mode} field={field} />
                    ))}
                  </div>
                </div>

                {/* Surface Colors */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Surface Colors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {surfaceColors.map((field) => (
                      <ColorInput key={field} mode={mode} field={field} />
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Live Preview</h3>
                  <div className="rounded-2xl overflow-hidden border shadow-lg">
                    <div
                      className="p-6 space-y-4"
                      style={{
                        backgroundColor: `hsl(${localSettings[mode].background})`,
                        color: `hsl(${localSettings[mode].foreground})`
                      }}
                    >
                      {/* Header Preview */}
                      <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: `hsl(${localSettings[mode].muted})` }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg"
                            style={{ backgroundColor: `hsl(${localSettings[mode].primary})` }}
                          />
                          <span className="font-semibold">KooyaHQ</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="px-3 py-1 rounded-lg text-sm"
                            style={{ backgroundColor: `hsl(${localSettings[mode].secondary})` }}
                          >
                            Profile
                          </div>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="grid grid-cols-3 gap-4">
                        <div
                          className="p-4 rounded-xl border"
                          style={{
                            backgroundColor: `hsl(${localSettings[mode].background})`,
                            borderColor: `hsl(${localSettings[mode].border})`
                          }}
                        >
                          <div
                            className="w-full h-3 rounded mb-2"
                            style={{ backgroundColor: `hsl(${localSettings[mode].muted})` }}
                          />
                          <div
                            className="w-3/4 h-2 rounded"
                            style={{ backgroundColor: `hsl(${localSettings[mode].accent})` }}
                          />
                        </div>
                        <div
                          className="p-4 rounded-xl border"
                          style={{
                            backgroundColor: `hsl(${localSettings[mode].background})`,
                            borderColor: `hsl(${localSettings[mode].border})`
                          }}
                        >
                          <div
                            className="w-full h-3 rounded mb-2"
                            style={{ backgroundColor: `hsl(${localSettings[mode].muted})` }}
                          />
                          <div
                            className="w-1/2 h-2 rounded"
                            style={{ backgroundColor: `hsl(${localSettings[mode].primary})` }}
                          />
                        </div>
                        <div
                          className="p-4 rounded-xl"
                          style={{ backgroundColor: `hsl(${localSettings[mode].accent})` }}
                        >
                          <div
                            className="w-full h-3 rounded mb-2"
                            style={{ backgroundColor: `hsl(${localSettings[mode].foreground})`, opacity: 0.5 }}
                          />
                          <div
                            className="w-2/3 h-2 rounded"
                            style={{ backgroundColor: `hsl(${localSettings[mode].foreground})`, opacity: 0.3 }}
                          />
                        </div>
                      </div>

                      {/* Button Preview */}
                      <div className="flex items-center gap-3 pt-4">
                        <button
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: `hsl(${localSettings[mode].primary})`,
                            color: `hsl(${localSettings[mode].foreground})`
                          }}
                        >
                          Primary Button
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                          style={{
                            borderColor: `hsl(${localSettings[mode].border})`,
                            backgroundColor: `hsl(${localSettings[mode].background})`,
                            color: `hsl(${localSettings[mode].foreground})`
                          }}
                        >
                          Secondary
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg text-sm font-medium"
                          style={{
                            backgroundColor: `hsl(${localSettings[mode].destructive})`,
                            color: `hsl(${localSettings[mode].foreground})`
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        <Button
          onClick={handleReset}
          disabled={saving}
          size="lg"
          variant="outline"
          className="gap-2 px-8"
        >
          <RotateCcw className="h-5 w-5" />
          Reset to Defaults
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          size="lg"
          className="gap-2 px-8"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving Changes...
            </>
          ) : hasChanges ? (
            <>
              <CheckCircle className="h-5 w-5" />
              Save Theme Settings
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              No Changes to Save
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

