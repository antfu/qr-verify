/* eslint-disable no-console */
import process from 'node:process'
import { basename, join, relative } from 'node:path'
import prompts from 'prompts'
import c from 'chalk'
import fg from 'fast-glob'
import boxen from 'boxen'
import fs from 'fs-extra'
import pLimit from 'p-limit'
import { version } from '../package.json'
import type { PreprocessOptions } from './scan'
import { verifyScan } from './scan'

export interface CliOptions {
  dirSource: string
  dirValid: string
  dirInvalid: string
  mode: 'move' | 'copy' | 'none'
  tolerance: 'none' | 'high' | 'medium'
}

async function run() {
  const options: CliOptions = {
    dirSource: process.cwd(),
    dirValid: join(process.cwd(), 'scannable'),
    dirInvalid: join(process.cwd(), 'non-scannable'),
    mode: 'move',
    tolerance: 'high',
  }

  const files = await fg('*.{png,jpg,jpeg,webp}', {
    cwd: options.dirSource,
    onlyFiles: true,
    dot: false,
    absolute: true,
  })

  if (!files.length) {
    console.log(c.yellow('\nNo images found in this directory'))
    process.exit(0)
  }

  console.log(c.blue(`\n· ${files.length} images founded\n`))

  Object.assign(options, await prompts([
    {
      type: 'select',
      name: 'mode',
      message: 'Select the mode of file operation',
      choices: [
        {
          value: 'move',
          title: 'Move images',
        },
        {
          value: 'move',
          title: 'Copy images',
        },
        {
          value: 'none',
          title: 'Scan only',
        },
      ],
    },
    {
      type: 'select',
      name: 'tolerance',
      message: 'Select scanner tolerance (chance to get scanned)',
      choices: [
        {
          value: 'high',
          title: 'High tolerance (try 25 times)',
        },
        {
          value: 'medium',
          title: 'Medium tolerance (try 9 times)',
        },
        {
          value: 'none',
          title: 'No preprocessing',
        },
      ],
    },
  ]))

  console.log()
  console.log(boxen([
    c.green.bold('QR Code Verifier') + c.gray(` v${version}`),
    '',
    'Verify images in the current directory to see if they are scannable QR Code',
    c.blue(`${options.dirSource}`),
    '',
  `If it's scannable, ${c.yellow.bold(options.mode)} to:`,
  c.blue(`${options.dirValid}`),
  `If not, ${c.yellow.bold(options.mode)} to:`,
  c.blue(`${options.dirInvalid}`),
  ].join('\n'), { padding: 1, borderColor: 'green', borderStyle: 'round' }))
  console.log()

  const { confirm } = await prompts([
    {
      name: 'confirm',
      type: 'confirm',
      initial: true,
      message: 'Start?',
    },
  ])

  if (!confirm)
    process.exit(1)

  console.log()

  const limit = pLimit(5)

  await Promise.all([
    fs.ensureDir(options.dirValid),
    fs.ensureDir(options.dirInvalid),
  ])

  let validCount = 0
  let invalidCount = 0

  const preprocess = options.tolerance === 'high'
    ? createPreprocessCombinations(
      [4, 3, 1.5],
      [0.9, 1.1, 1.2, 1.4],
      [0.5, 1, 2],
    )
    : options.tolerance === 'medium'
      ? createPreprocessCombinations(
        [1.5],
        [0.9, 1.1],
        [0.5, 1],
      )
      : []

  await Promise.all(
    files.map(file => limit(async () => {
      const result = await verifyScan(file, {
        resize: 300,
        preprocess: [
          {},
          ...preprocess,
        ].sort(() => Math.random() - 0.5),
      })

      const path = relative(options.dirSource, file)

      if (result) {
        validCount += 1
        console.log(`${c.green.bold.inverse(' SCAN ')} ${c.gray(`${path} - `)}${c.green.bold(result)}`)
      }
      else {
        invalidCount += 1
        console.log(`${c.red.bold.inverse(' FAIL ')} ${c.gray(path)}`)
      }

      if (options.mode !== 'none') {
        const targetDir = result ? options.dirValid : options.dirInvalid
        if (options.mode === 'move')
          await fs.move(file, join(targetDir, basename(file)))
        else
          await fs.copy(file, join(targetDir, basename(file)))
      }
    })),
  )

  console.log(`\n${c.green.bold('Task finished.')}\n${c.green.bold(validCount)} scannable images, ${c.yellow.bold(invalidCount)} non-scannable images.`)
  console.log(`\n${c.gray('Note that non-scannable images do no mean they are impossible to scan,\nbut at least it indicates they may be hard to scan.\nYou can utilize https://qrcode.antfu.me to investigate more.')}\n`)
}

function createPreprocessCombinations(
  _contrast: number[],
  _brightness: number[],
  _blur: number[],
): PreprocessOptions[] {
  return _contrast.flatMap(contrast =>
    _blur.flatMap(blur =>
      _brightness.map((brightness) => {
        return {
          contrast,
          blur,
          brightness,
        }
      }),
    ),
  )
}

run()
