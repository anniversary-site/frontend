export async function webpToPng(file: File): Promise<File> {
  let image: ImageBitmap
  try {
    image = await createImageBitmap(file)
  } catch {
    throw new Error('WEBP 이미지를 읽지 못했어요. 다른 사진을 선택해 주세요.')
  }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 변환하지 못했어요.')
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('이미지를 변환하지 못했어요.'))
      }, 'image/png')
    })
    return new File([blob], file.name.replace(/\.webp$/i, '') + '.png', {
      type: 'image/png',
      lastModified: file.lastModified,
    })
  } finally {
    image.close()
  }
}
