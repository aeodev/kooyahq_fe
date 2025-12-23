export type GalleryItem = {
  id: string
  title: string
  description?: string
  filename: string
  path: string
  imageUrl: string
  mimetype: string
  size: number
  uploadedBy: string
  status: 'pending' | 'approved'
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

export type UpdateGalleryItemInput = {
  title?: string
  description?: string
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type GallerySearchParams = {
  page?: number
  limit?: number
  search?: string
  sort?: string
}

