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
  createdAt: string
  updatedAt: string
}

export type UpdateGalleryItemInput = {
  title?: string
  description?: string
}

