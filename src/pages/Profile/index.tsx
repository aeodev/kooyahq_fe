import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { Modal } from '@/components/ui/modal'
import { CommentSection } from '@/components/posts/CommentSection'
import { PostReactions } from '@/components/posts/PostReactions'
import { Camera, Loader2, Image as ImageIcon, X, Edit2, Trash2 } from 'lucide-react'
import { useProfile, useUserProfile, useProfilePosts } from '@/hooks/profile.hooks'
import { DEFAULT_IMAGE_FALLBACK, getInitialsFallback } from '@/utils/image.utils'
import type { Post } from '@/types/post'

export function Profile() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const hasAnyPermission = Array.isArray(user?.permissions) && user.permissions.length > 0
  const [searchParams] = useSearchParams()
  const viewedUserId = searchParams.get('userId')
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id
  const [viewedUser, setViewedUser] = useState<{ id: string; name: string; email: string; profilePic?: string; banner?: string; bio?: string } | null>(null)
  const [bio, setBio] = useState('')
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [savingBio, setSavingBio] = useState(false)
  
  const {
    profileData,
    loading,
    fetchProfile,
    updateProfile,
    updateBio,
    setProfileData,
  } = useProfile()
  
  const { fetchUserProfile } = useUserProfile()
  const {
    posts,
    loading: postsLoading,
    fetchProfilePosts,
    createProfilePost,
    updateProfilePost,
    deleteProfilePost,
  } = useProfilePosts()
  const [postContent, setPostContent] = useState('')
  const [postDraft, setPostDraft] = useState(false)
  const [creatingPost, setCreatingPost] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageFile, setCropImageFile] = useState<File | null>(null)
  const [cropImageType, setCropImageType] = useState<'profilePic' | 'banner'>('profilePic')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null)
  const [showDrafts, setShowDrafts] = useState(false)
  const [fullImageModalOpen, setFullImageModalOpen] = useState(false)
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null)
  
  const profilePicInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const postImageInputRef = useRef<HTMLInputElement>(null)

  if (!hasAnyPermission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 text-center">
          <p className="text-lg font-semibold">Your account has no permissions assigned.</p>
          <p className="text-sm text-muted-foreground">Please contact an admin to grant access.</p>
          <div className="flex justify-center">
            <Button onClick={logout} variant="outline">Log out</Button>
          </div>
        </div>
      </div>
    )
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  const isValidImageUrl = (url?: string): boolean => {
    return !!url && url !== 'undefined' && url.trim() !== '' && !url.includes('undefined')
  }

  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (user) {
      if (isOwnProfile && !hasFetchedRef.current) {
        hasFetchedRef.current = true
        fetchProfile().then((data) => {
          if (data?.bio) setBio(data.bio)
        })
      } else if (!isOwnProfile && viewedUserId) {
        fetchUserProfile(viewedUserId).then((data) => {
          if (data) {
            setViewedUser({
              id: data.id,
              name: data.name,
              email: data.email,
              profilePic: data.profilePic,
              banner: data.banner,
              bio: data.bio,
            })
            setProfileData({
              profilePic: data.profilePic,
              banner: data.banner,
              bio: data.bio,
            })
          }
        })
      }
    }
  }, [user, viewedUserId, isOwnProfile, fetchProfile, fetchUserProfile, setProfileData])

  // Update profileData when user changes to prevent flash
  useEffect(() => {
    if (user && isOwnProfile && !hasFetchedRef.current) {
      setProfileData({
        profilePic: user.profilePic,
        banner: user.banner,
        bio: user.bio,
      })
      setBio(user.bio || '')
    }
  }, [user, isOwnProfile, setProfileData])

  useEffect(() => {
    if (user) {
      fetchProfilePosts(showDrafts)
    }
  }, [user, showDrafts, fetchProfilePosts])

  const handleImageSelect = (file: File, type: 'profilePic' | 'banner') => {
    setCropImageFile(file)
    setCropImageType(type)
    setCropModalOpen(true)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profilePic' | 'banner') => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageSelect(file, type)
    }
    // Reset input value so the same file can be selected again
    e.target.value = ''
  }

  const handleImageUpload = async (file: File) => {
    try {
      const updatedUser = await updateProfile(file, cropImageType)
      const updatedUrl = updatedUser?.[cropImageType]
      
      // Update auth store so sidebar reflects the change
      if (user && updatedUrl) {
        const updatedUserState = {
          ...user,
          [cropImageType]: updatedUrl,
        }
        useAuthStore.setState({
          user: updatedUserState,
        })
      }
    } catch (error) {
      console.error(`Failed to update ${cropImageType}:`, error)
    }
  }

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

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postImage) return

    setCreatingPost(true)
    try {
      await createProfilePost(postContent, postImage || undefined, postDraft)
      setPostContent('')
      setPostDraft(false)
      setPostImage(null)
      setPostImagePreview(null)
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setCreatingPost(false)
    }
  }

  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id)
    setEditContent(post.content)
  }

  const handleUpdatePost = async () => {
    if (!editingPostId) return

    try {
      await updateProfilePost(editingPostId, editContent)
      setEditingPostId(null)
      setEditContent('')
    } catch (error) {
      console.error('Failed to update post:', error)
    }
  }

  const handleSaveBio = async () => {
    setSavingBio(true)
    try {
      await updateBio(bio.trim())
      setIsEditingBio(false)
    } catch (error) {
      console.error('Failed to update bio:', error)
    } finally {
      setSavingBio(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return

    try {
      await deleteProfilePost(postId)
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const handleImageClick = (imageUrl: string) => {
    setFullImageUrl(imageUrl)
    setFullImageModalOpen(true)
  }

  if (!user) return null

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
      {/* Profile Header - Modern Design */}
      <div className="relative rounded-3xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
        {/* Banner */}
        <div className="relative h-64 bg-gradient-to-br from-primary/30 via-primary/10 to-primary/5">
          {isValidImageUrl(profileData.banner) ? (
            <img
              src={profileData.banner}
              alt="Banner"
              className="w-full h-full object-cover cursor-pointer"
              onError={(e) => {
                const target = e.currentTarget
                target.onerror = null
                target.src = DEFAULT_IMAGE_FALLBACK
              }}
              onClick={() => handleImageClick(profileData.banner!)}
            />
          ) : null}
          {isOwnProfile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-background/90 hover:bg-background backdrop-blur-sm shadow-sm"
            onClick={() => bannerInputRef.current?.click()}
            disabled={loading}
          >
            <Camera className="h-4 w-4" />
          </Button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileInputChange(e, 'banner')}
          />

          {/* Profile Picture */}
          <div className="absolute -bottom-16 left-8">
            <div className="relative">
          {isValidImageUrl(profileData.profilePic) ? (
            <img
              src={profileData.profilePic}
              alt={isOwnProfile ? user.name : (viewedUser?.name || '')}
              className="h-32 w-32 rounded-3xl border-4 border-background object-cover shadow-2xl ring-4 ring-primary/20 cursor-pointer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                // Fallback to initials if image fails to load
                const parent = (e.target as HTMLImageElement).parentElement
                if (parent) {
                  const fallback = document.createElement('div')
                  fallback.className = 'h-32 w-32 rounded-3xl border-4 border-background bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-2xl ring-4 ring-primary/20'
                  fallback.textContent = getUserInitials(isOwnProfile ? user.name : (viewedUser?.name || ''))
                  parent.replaceChild(fallback, e.target as HTMLImageElement)
                }
              }}
              onClick={() => handleImageClick(profileData.profilePic!)}
            />
          ) : (
                <div className="h-32 w-32 rounded-3xl border-4 border-background bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-2xl ring-4 ring-primary/20">
                  {getUserInitials(isOwnProfile ? user.name : (viewedUser?.name || ''))}
                </div>
              )}
              {isOwnProfile && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-background border-2 border-border hover:bg-accent shadow-sm"
                onClick={() => profilePicInputRef.current?.click()}
                disabled={loading}
              >
                <Camera className="h-3.5 w-3.5" />
              </Button>
              )}
            </div>
            <input
              ref={profilePicInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileInputChange(e, 'profilePic')}
            />
          </div>
        </div>

        {/* User Info */}
        <div className="pt-20 sm:pt-24 pb-6 sm:pb-8 px-6 sm:px-10">
          <div className="flex flex-col gap-5">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {isOwnProfile ? user.name : (viewedUser?.name || 'Loading...')}
              </h1>
              <p className="text-muted-foreground mb-4">{isOwnProfile ? user.email : (viewedUser?.email || '')}</p>
          
              {/* Bio Section */}
              {isOwnProfile && isEditingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveBio}
                      disabled={savingBio}
                    >
                      {savingBio ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditingBio(false)
                        setBio(profileData.bio || '')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {profileData.bio ? (
                    <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">{profileData.bio}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No bio yet</p>
                  )}
                  {isOwnProfile && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingBio(true)}
                      className="h-9 px-4 text-sm rounded-xl mt-2"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {profileData.bio ? 'Edit bio' : 'Add bio'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Section - Only for own profile */}
      {isOwnProfile && (
      <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {isValidImageUrl(profileData.profilePic) ? (
              <img
                src={profileData.profilePic}
                alt={user.name}
                className="h-12 w-12 rounded-2xl object-cover flex-shrink-0 ring-2 ring-border/50"
                onError={(e) => {
                  const target = e.currentTarget
                  target.onerror = null
                  target.src = getInitialsFallback(user.name)
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
                placeholder="What's on your mind?"
                className="w-full min-h-[80px] p-3 border-0 rounded-xl resize-none focus:outline-none bg-background/50 placeholder:text-muted-foreground/60 text-base focus:ring-2 focus:ring-primary/20 transition-all"
                rows={3}
              />


              {postImagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border/50 ring-1 ring-border/30 group">
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
                    onError={(e) => {
                      const target = e.currentTarget
                      target.onerror = null
                      target.src = DEFAULT_IMAGE_FALLBACK
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-4 rounded-xl hover:bg-accent/50 text-muted-foreground"
                  onClick={() => postImageInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add photo
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={creatingPost || (!postContent.trim() && !postImage)}
                  className="h-9 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all"
                >
                  {creatingPost ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {postDraft ? 'Saving...' : 'Posting...'}
                    </>
                  ) : postDraft ? (
                    'Save Draft'
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
      )}

      {/* Posts Feed */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-semibold">Posts</h2>
          <Button
            variant={showDrafts ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowDrafts(!showDrafts)
              fetchProfilePosts(showDrafts)
            }}
          >
            {showDrafts ? 'Show Published' : 'Show Drafts'}
          </Button>
        </div>
        {postsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <p className="text-lg font-medium mb-2">No posts yet</p>
            {isOwnProfile && (
              <p className="text-sm">Start sharing your thoughts!</p>
            )}
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {isValidImageUrl(post.author.profilePic) ? (
                    <img
                      src={post.author.profilePic}
                      alt={post.author.name}
                      className="h-12 w-12 rounded-2xl object-cover flex-shrink-0 ring-2 ring-border/50"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.onerror = null
                        target.src = getInitialsFallback(post.author.name)
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0 ring-2 ring-border/50">
                      {getUserInitials(post.author.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{post.author.name}</p>
                      {post.draft && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded">Draft</span>
                      )}
                      {post.editedAt && (
                        <span className="text-xs text-muted-foreground">(edited)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                {user?.id === post.author.id && !editingPostId && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditPost(post)}
                      className="h-8 px-2"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePost(post.id)}
                      className="h-8 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {editingPostId === post.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdatePost}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingPostId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="text-base leading-relaxed rich-text-display text-foreground prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                  {isValidImageUrl(post.imageUrl) && (
                    <div className="rounded-xl overflow-hidden border border-border/50 ring-1 ring-border/30">
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full max-h-[500px] object-cover"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.onerror = null
                          target.src = DEFAULT_IMAGE_FALLBACK
                        }}
                      />
                    </div>
                  )}
                  <PostReactions 
                    postId={post.id} 
                    onCommentClick={() => {}} 
                  />
                  <CommentSection postId={post.id} />
                </>
              )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false)
          // Clear the file after a short delay to ensure modal closes first
          setTimeout(() => {
            setCropImageFile(null)
          }, 100)
        }}
        imageFile={cropImageFile}
        onCrop={async (file) => {
          await handleImageUpload(file)
          // Clear the file after upload completes
          setCropImageFile(null)
        }}
        aspectRatio={cropImageType === 'profilePic' ? 1 : 3 / 1}
        borderRadius={cropImageType === 'profilePic' ? '1.5rem' : '0px'}
      />

      {/* Full Image Modal */}
      {fullImageUrl && (
        <Modal
          open={fullImageModalOpen}
          onClose={() => {
            setFullImageModalOpen(false)
            setFullImageUrl(null)
          }}
          maxWidth="6xl"
          className="border-0 bg-transparent shadow-none"
        >
          <div className="p-6 relative">
            <button
              onClick={() => {
                setFullImageModalOpen(false)
                setFullImageUrl(null)
              }}
              className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/90 hover:bg-background flex items-center justify-center text-foreground shadow-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={fullImageUrl}
              alt="Full size"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              onError={(e) => {
                const target = e.currentTarget
                target.onerror = null
                target.src = DEFAULT_IMAGE_FALLBACK
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
