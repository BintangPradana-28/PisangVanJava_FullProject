import { v2 as cloudinary } from 'cloudinary'
import { env } from '@/src/env'

if (env.CLOUDINARY_API_SECRET && env.CLOUDINARY_API_KEY && env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  })
}

export { cloudinary }
