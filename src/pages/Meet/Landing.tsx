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
    <div className="flex flex-col items-center pt-[10vh]">
      <div className="w-full max-w-md space-y-8">
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
