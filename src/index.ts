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
import { verifyScan } from './scan'

export interface CliOptions {
  dirSource: string
  dirValid: string
  dirInvalid: string
  mode: 'move' | 'copy'
}

async function run() {
  const options: CliOptions = {
    dirSource: process.cwd(),
    dirValid: join(process.cwd(), 'scannable'),
    dirInvalid: join(process.cwd(), 'non-scannable'),
    mode: 'move',
  }

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

  const files = await fg('*.{png,jpg,jpeg,webp}', {
    cwd: options.dirSource,
    onlyFiles: true,
    dot: false,
    absolute: true,
  })

  console.log(c.blue(`\n - ${files.length} files founded\n`))

  const limit = pLimit(5)

  await Promise.all([
    fs.ensureDir(options.dirValid),
    fs.ensureDir(options.dirInvalid),
  ])

  await Promise.all(
    files.map(file => limit(async () => {
      const result = await verifyScan(file, {
        resize: 300,
        preprocess: [
          {},
          ...[4, 3, 1.5].flatMap(contrast =>
            [1, 0.5, 2].flatMap(blur =>
              [0.9, 1.1, 1.2, 1.4].map((brightness) => {
                return {
                  contrast,
                  blur,
                  brightness,
                }
              }),
            ),
          ).sort(() => Math.random() - 0.5),
        ],
      })

      const path = relative(options.dirSource, file)

      if (result)
        console.log(`${c.green.bold.inverse(' SCAN ')} ${c.gray(`${path} - `)} ${c.green.bold(result)}`)
      else
        console.log(`${c.yellow.bold.inverse(' FAIL ')} ${c.gray(path)}`)

      const targetDir = result ? options.dirValid : options.dirInvalid
      if (options.mode === 'move')
        await fs.move(file, join(targetDir, basename(file)))
      else
        await fs.copy(file, join(targetDir, basename(file)))
    })),
  )
}

run()
