import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, Loader2, X, BarChart2, Plus, Trash2 } from 'lucide-react'
import { getUserInitials, isValidImageUrl } from '@/utils/formatters'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface CreatePostCardProps {
    user: {
        name: string
        profilePic?: string
    }
    onCreatePost: (content: string, image?: File, poll?: any) => Promise<void>
}

export function CreatePostCard({ user, onCreatePost }: CreatePostCardProps) {
    const [postContent, setPostContent] = useState('')
    const [postImage, setPostImage] = useState<File | null>(null)
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [showPollCreator, setShowPollCreator] = useState(false)
    const [pollQuestion, setPollQuestion] = useState('')
    const [pollOptions, setPollOptions] = useState(['', ''])

    const postImageInputRef = useRef<HTMLInputElement>(null)

    const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setPostImage(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setPostImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemovePostImage = () => {
        setPostImage(null)
        setPostImagePreview(null)
        if (postImageInputRef.current) {
            postImageInputRef.current.value = ''
        }
    }

    const handleAddOption = () => {
        if (pollOptions.length < 5) {
            setPollOptions([...pollOptions, ''])
        }
    }

    const handleRemoveOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index))
        }
    }

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...pollOptions]
        newOptions[index] = value
        setPollOptions(newOptions)
    }

    const handleCreatePost = async () => {
        // Validate
        if (!postContent.trim() && !postImage && !showPollCreator) return

        let pollData = undefined
        if (showPollCreator) {
            if (!pollQuestion.trim()) {
                toast.error('Poll question is required')
                return
            }
            const validOptions = pollOptions.filter(o => o.trim())
            if (validOptions.length < 2) {
                toast.error('Poll must have at least 2 options')
                return
            }
            pollData = {
                question: pollQuestion,
                options: validOptions.map(text => ({ text, votes: [] }))
            }
        }

        setIsCreating(true)
        try {
            await onCreatePost(postContent, postImage || undefined, pollData)
            setPostContent('')
            handleRemovePostImage()
            setShowPollCreator(false)
            setPollQuestion('')
            setPollOptions(['', ''])
            toast.success('Post created successfully!')
        } catch (error) {
            console.error('Failed to create post:', error)
            toast.error('Failed to create post. Please try again.')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-6">
                <div className="flex items-start gap-4">
                    {isValidImageUrl(user.profilePic) ? (
                        <img
                            src={user.profilePic}
                            alt={user.name}
                            className="h-12 w-12 rounded-2xl object-cover flex-shrink-0 ring-2 ring-border/50"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                            }}
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0 ring-2 ring-border/50">
                            {getUserInitials(user.name)}
                        </div>
                    )}
                    <div className="flex-1 space-y-3">
                        <textarea
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            placeholder="Share something with the team..."
                            className="w-full min-h-[80px] p-3 border-0 rounded-xl resize-none focus:outline-none bg-background/50 placeholder:text-muted-foreground/60 text-base focus:ring-2 focus:ring-primary/20 transition-all"
                            rows={3}
                        />

                        {/* Poll Creator */}
                        <AnimatePresence>
                            {showPollCreator && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 rounded-xl border border-border/50 bg-secondary/20 space-y-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-semibold flex items-center gap-2">
                                                <BarChart2 className="w-4 h-4 text-primary" />
                                                Create Poll
                                            </span>
                                            <button
                                                onClick={() => setShowPollCreator(false)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ask a question..."
                                            value={pollQuestion}
                                            onChange={(e) => setPollQuestion(e.target.value)}
                                            className="w-full p-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                        />
                                        <div className="space-y-2">
                                            {pollOptions.map((option, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder={`Option ${index + 1}`}
                                                        value={option}
                                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                                        className="flex-1 p-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                                    />
                                                    {pollOptions.length > 2 && (
                                                        <button
                                                            onClick={() => handleRemoveOption(index)}
                                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {pollOptions.length < 5 && (
                                            <button
                                                onClick={handleAddOption}
                                                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Add Option
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {postImagePreview && (
                            <div className="relative rounded-xl overflow-hidden border border-border group">
                                <button
                                    onClick={handleRemovePostImage}
                                    className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background flex items-center justify-center text-foreground shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <img
                                    src={postImagePreview}
                                    alt="Preview"
                                    className="w-full max-h-96 object-cover"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 px-3 hover:bg-accent/50 text-muted-foreground rounded-xl"
                                    onClick={() => postImageInputRef.current?.click()}
                                    disabled={showPollCreator} // Disable image if poll is active (assume mutually exclusive for simplicity or allowed both) - letting both is fine but UI might get crowded. Let's allow both.
                                >
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                    Add photo
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-9 px-3 hover:bg-accent/50 rounded-xl",
                                        showPollCreator ? "text-primary bg-primary/10" : "text-muted-foreground"
                                    )}
                                    onClick={() => setShowPollCreator(!showPollCreator)}
                                >
                                    <BarChart2 className="h-4 w-4 mr-2" />
                                    Poll
                                </Button>
                            </div>

                            <Button
                                onClick={handleCreatePost}
                                disabled={isCreating || (!postContent.trim() && !postImage && !pollQuestion.trim())}
                                className="h-9 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Posting...
                                    </>
                                ) : (
                                    'Post'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <input
                    ref={postImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePostImageSelect}
                />
            </div>
        </div>
    )
}
// Helper cn since I used it
import { cn } from '@/utils/formatters'

