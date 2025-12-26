import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useThemeSettingsStore, type ThemeSettings } from '@/stores/theme-settings.store'
import { Loader2, Palette, Save } from 'lucide-react'
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

export function ThemeSettingsSection() {
  const { settings, loading, fetchThemeSettings, updateThemeSettings } = useThemeSettingsStore()
  const [localSettings, setLocalSettings] = useState<ThemeSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [inputModes, setInputModes] = useState<Record<string, 'hex' | 'hsl'>>({})

  useEffect(() => {
    if (!settings) {
      fetchThemeSettings()
    } else {
      setLocalSettings(settings)
    }
  }, [settings, fetchThemeSettings])

  const handleColorChange = (mode: 'light' | 'dark', field: ColorField, value: string, type: 'hex' | 'hsl') => {
    if (!localSettings) return

    let hsl: string
    if (type === 'hex') {
      // Normalize hex input
      const normalizedHex = normalizeHex(value)
      // If it's a valid hex (3 or 6 digits), convert to HSL
      if (isValidHex(normalizedHex)) {
        try {
          hsl = hexToHsl(normalizedHex)
        } catch (error) {
          // Invalid conversion, don't update
          return
        }
      } else {
        // Invalid hex, don't update
        return
      }
    } else {
      // It's HSL, use directly
      hsl = value
    }

    setLocalSettings({
      ...localSettings,
      [mode]: {
        ...localSettings[mode],
        [field]: hsl,
      },
    })
  }

  const handleSave = async () => {
    if (!localSettings) return

    setSaving(true)
    try {
      await updateThemeSettings(localSettings)
      toast.success('Theme settings updated successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update theme settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !localSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const colorFields: { key: ColorField; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' },
    { key: 'destructive', label: 'Destructive' },
    { key: 'muted', label: 'Muted' },
    { key: 'background', label: 'Background' },
    { key: 'foreground', label: 'Foreground' },
    { key: 'border', label: 'Border' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Theme Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize global theme colors for all users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Configuration
          </CardTitle>
          <CardDescription>Adjust colors for light and dark modes. Changes apply globally to all users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="light" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="light">Light Mode</TabsTrigger>
              <TabsTrigger value="dark">Dark Mode</TabsTrigger>
            </TabsList>

            {(['light', 'dark'] as const).map((mode) => (
              <TabsContent key={mode} value={mode} className="space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {colorFields.map(({ key, label }) => {
                    const hslValue = localSettings[mode][key]
                    const hexValue = hslToHex(hslValue)
                    const fieldId = `${mode}-${key}`
                    const inputMode = inputModes[fieldId] || 'hex'

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={fieldId} className="text-sm font-medium">
                            {label}
                          </Label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setInputModes({ ...inputModes, [fieldId]: 'hex' })}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                inputMode === 'hex'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              HEX
                            </button>
                            <button
                              type="button"
                              onClick={() => setInputModes({ ...inputModes, [fieldId]: 'hsl' })}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                inputMode === 'hsl'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              HSL
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            id={`${fieldId}-color`}
                            type="color"
                            value={hexValue}
                            onChange={(e) => handleColorChange(mode, key, e.target.value, 'hex')}
                            className="h-10 w-20 cursor-pointer"
                          />
                          <Input
                            id={fieldId}
                            type="text"
                            value={inputMode === 'hex' ? hexValue : hslValue}
                            onChange={(e) => {
                              if (inputMode === 'hex') {
                                handleColorChange(mode, key, e.target.value, 'hex')
                              } else {
                                handleColorChange(mode, key, e.target.value, 'hsl')
                              }
                            }}
                            className="flex-1 font-mono text-xs"
                            placeholder={inputMode === 'hex' ? '#8fb84d' : '142 71% 29%'}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 rounded-lg border" style={{ backgroundColor: `hsl(${localSettings[mode].background})` }}>
                  <div className="space-y-2">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `hsl(${localSettings[mode].primary})`, color: `hsl(${localSettings[mode].foreground})` }}
                    >
                      <span className="text-sm font-medium">Primary Color Preview</span>
                    </div>
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `hsl(${localSettings[mode].secondary})`, color: `hsl(${localSettings[mode].foreground})` }}
                    >
                      <span className="text-sm font-medium">Secondary Color Preview</span>
                    </div>
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `hsl(${localSettings[mode].accent})`, color: `hsl(${localSettings[mode].foreground})` }}
                    >
                      <span className="text-sm font-medium">Accent Color Preview</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Theme Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

