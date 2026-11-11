export async function imageToPng(file: File): Promise<File> {
  const image = new Image()
  const url = URL.createObjectURL(file)
  try {
    image.src = url
    try {
      await image.decode()
    } catch {
      throw new Error('이미지를 읽지 못했어요. 다른 사진을 선택해 주세요.')
    }
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 변환하지 못했어요.')
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('이미지를 변환하지 못했어요.'))
      }, 'image/png')
    })
    return new File([blob], file.name.replace(/\.(webp|svg)$/i, '') + '.png', {
      type: 'image/png',
      lastModified: file.lastModified,
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
