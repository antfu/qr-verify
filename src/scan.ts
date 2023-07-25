import { scan } from 'qr-scanner-wechat'
import type { Sharp } from 'sharp'
import sharp from 'sharp'

export interface VerifyOptions {
  resize: number
  preprocess: PreprocessOptions[]
}

export interface PreprocessOptions {
  brightness?: number
  contrast?: number
  blur?: number
  grayscale?: boolean
}

export function preprocess(img: Sharp, options: PreprocessOptions) {
  const {
    blur = 0,
    brightness = 1,
    contrast = 1,
    grayscale = true,
  } = options
  if (grayscale)
    img = img.grayscale()
  if (contrast !== 1)
    img = img.linear(contrast, -(128 * contrast) + 128)
  if (brightness !== 1)
    img = img.modulate({ brightness })
  if (blur)
    img = img.blur(blur)
  return img
}

export async function verifyScan(path: string, options: VerifyOptions) {
  const resized = sharp(path)
    .resize({ withoutEnlargement: true, width: options.resize, height: options.resize, fit: 'outside' })
    .ensureAlpha()

  for (const preset of options.preprocess) {
    const precessed = preprocess(resized, preset)

    const { data, info } = await precessed
      .raw()
      .toBuffer({
        resolveWithObject: true,
      })
    try {
      const result = await scan({
        width: info.width,
        height: info.height,
        data: Uint8ClampedArray.from(data),
      })
      if (result.text)
        return result.text
    }
    catch (e) {
      // console.error(e)
    }
  }

  return false
}
