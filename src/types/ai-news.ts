export type NewsItemType = 'news' | 'tweet'

export type NewsSource = 
  | 'openai' 
  | 'techcrunch' 
  | 'google-ai' 
  | 'sama'
  | 'wangzjeff'
  | 'mattpocockuk'
  | 'KaranVaidya6'
  | 'chetaslua'
  | 'MaximeRivest'

export interface NewsItem {
  id: string
  type: NewsItemType
  title: string
  content: string
  author?: string
  authorHandle?: string
  source: NewsSource
  url: string
  publishedAt: string
  imageUrl?: string
  avatarUrl?: string
  verified?: boolean
}

export type NewsFilter = 'all' | 'news' | 'tweets' | NewsSource

