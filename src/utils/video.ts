// 업로드 전에 영상 길이와 첫 프레임 썸네일을 읽습니다.
export function videoMetadata(
  file: File,
  maxDuration: number,
): Promise<{ durationSec: number; thumbnail?: Blob }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const cleanup = () => {
      clearTimeout(timer)
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
    }
    const fail = (message: string) => {
      cleanup()
      reject(new Error(message))
    }
    const timer = setTimeout(() => fail('영상 정보를 읽지 못했어요. 다시 선택해 주세요.'), 15000)
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onerror = () => fail('영상을 읽지 못했어요.')
    video.onloadeddata = () => {
      const durationSec = video.duration
      if (!Number.isFinite(durationSec) || durationSec > maxDuration) {
        fail(`${maxDuration}초 이하 영상을 선택해 주세요.`)
        return
      }
      const canvas = document.createElement('canvas')
      const ratio = Math.min(1, 640 / video.videoWidth)
      canvas.width = Math.max(1, Math.round(video.videoWidth * ratio))
      canvas.height = Math.max(1, Math.round(video.videoHeight * ratio))
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (thumbnail) => {
          cleanup()
          resolve({ durationSec, ...(thumbnail ? { thumbnail } : {}) })
        },
        'image/jpeg',
        0.8,
      )
    }
    video.src = url
  })
}
