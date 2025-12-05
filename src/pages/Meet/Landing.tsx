import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Plus, ArrowRight } from 'lucide-react'
import meetingIcon from '@/assets/icons8-meeting-100.png'

export function MeetLanding() {
  const [meetId, setMeetId] = useState('')
  const navigate = useNavigate()

  const handleJoin = () => {
    if (meetId.trim()) {
      navigate(`/meet/${meetId.trim()}`)
    }
  }

  const handleCreate = () => {
    const newMeetId = Math.random().toString(36).substring(2, 9)
    navigate(`/meet/${newMeetId}`)
  }

  return (
    <div className="h-full w-full flex flex-col items-center p-6 pt-[15vh] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top right blob */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-400/30 dark:bg-green-500/10 rounded-full blur-3xl" />
        {/* Bottom left blob */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-emerald-400/20 dark:bg-emerald-500/8 rounded-full blur-3xl" />
        {/* Center accent */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-green-500/15 dark:bg-green-600/5 rounded-full blur-2xl" />
        {/* Extra blob for light mode */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-teal-400/20 dark:bg-teal-500/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <img src={meetingIcon} alt="Meeting" className="w-24 h-24 mx-auto" />
          <h1 className="text-4xl font-medium text-foreground" style={{ fontFamily: "'Pacifico', cursive" }}>Video Meeting</h1>
          <p className="text-muted-foreground">Start or join a secure video call with your team</p>
        </div>

        {/* Join Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Join existing meeting</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter meeting ID"
              value={meetId}
              onChange={(e) => setMeetId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              className="flex-1"
            />
            <Button 
              onClick={handleJoin} 
              disabled={!meetId.trim()}
              variant="secondary"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Create Section */}
        <Button 
          onClick={handleCreate} 
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Meeting
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Secure and reliable video conferencing
        </p>
      </div>
    </div>
  )
}
