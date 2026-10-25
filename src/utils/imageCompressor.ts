export interface CompressedImage {
  blob: Blob
  /** Base64 puro, sin el prefijo `data:image/webp;base64,` (listo para la API de GitHub). */
  base64: string
  previewUrl: string
  sizeKb: number
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo leer la imagen seleccionada.'))
    }
    image.src = objectUrl
  })
}

function computeDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let width = srcWidth
  let height = srcHeight

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width)
    width = maxWidth
  }

  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height)
    height = maxHeight
  }

  return { width, height }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo comprimido.'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Comprime una imagen en el navegador (Canvas) redimensionándola
 * proporcionalmente y convirtiéndola a `image/webp`.
 */
export async function compressImage(
  file: File,
  maxWidth = 900,
  maxHeight = 600,
  quality = 0.82,
): Promise<CompressedImage> {
  const image = await loadImage(file)
  const { width, height } = computeDimensions(image.width, image.height, maxWidth, maxHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo crear el contexto 2D del canvas.')
  }

  context.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('No se pudo generar la imagen WebP.'))
      },
      'image/webp',
      quality,
    )
  })

  const base64 = await blobToBase64(blob)

  return {
    blob,
    base64,
    previewUrl: URL.createObjectURL(blob),
    sizeKb: Math.max(1, Math.round(blob.size / 1024)),
  }
}
