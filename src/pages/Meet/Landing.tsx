import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Video } from 'lucide-react'

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
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-6 w-6 text-primary" />
            <CardTitle>Video Meeting</CardTitle>
          </div>
          <CardDescription>
            Join an existing meeting or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter meeting ID"
              value={meetId}
              onChange={(e) => setMeetId(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoin()
                }
              }}
            />
            <Button onClick={handleJoin} className="w-full" disabled={!meetId.trim()}>
              Join Meeting
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button onClick={handleCreate} variant="outline" className="w-full">
            Create New Meeting
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

