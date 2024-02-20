import { join } from 'node:path'
import process from 'node:process'
import { Command, Option } from '@commander-js/extra-typings'
import type { PromptObject } from 'prompts'
import prompts from 'prompts'
import { version } from '../package.json'

export interface CliOptions {
  yes?: true
  skipConfirm: boolean
  dirSource: string
  dirValid: string
  dirInvalid: string
  mode: 'move' | 'copy' | 'none' | 'move-valid' | 'move-invalid'
  tolerance: 'none' | 'high' | 'medium'
}

export class TestingOverrideExit extends Error {
  constructor(public code: number) {
    super(`TestingOverrideExit with code: ${code}`)
    this.name = 'TestingOverrideExit'
  }
}

export function initializeCliOptions(
  overrideExit = false,
): Partial<CliOptions> {
  const program = new Command()

  // Optionally override exit behavior
  if (overrideExit) {
    program.exitOverride((err) => {
      throw new TestingOverrideExit(err.exitCode)
    })
  }

  program
    .version(version)
    .option('-y, --yes', 'Skip setup and use default settings')
    .option('-s, --dir-source <dir>', 'Source directory', process.cwd())
    .option(
      '-v, --dir-valid <dir>',
      'Valid directory',
      join(process.cwd(), 'scannable'),
    )
    .option(
      '-i, --dir-invalid <dir>',
      'Invalid directory',
      join(process.cwd(), 'non-scannable'),
    )
    .addOption(
      new Option('-m, --mode <mode>', 'File operation mode').choices([
        'move',
        'copy',
        'none',
        'move-valid',
        'move-invalid',
      ] as const),
    )
    .addOption(
      new Option('-t, --tolerance <tolerance>', 'Scanner tolerance').choices([
        'none',
        'high',
        'medium',
      ] as const),
    )
    .addOption(
      new Option('-c, --skip-confirm', 'Skip confirmation').default(false),
    )
    .parse(process.argv)

  return program.opts()
}

export async function promptForMissingOptions(
  options: Partial<CliOptions>,
): Promise<CliOptions> {
  const promptQuestions: PromptObject<string>[] = []

  if (!options.mode) {
    promptQuestions.push({
      type: 'select',
      name: 'mode',
      message: 'Select the mode of file operation',
      choices: [
        {
          value: 'move',
          title: 'Move images',
        },
        {
          value: 'copy',
          title: 'Copy images',
        },
        {
          value: 'none',
          title: 'Scan only',
        },
        {
          value: 'move-valid',
          title: 'Move scannable images only',
        },
        {
          value: 'move-invalid',
          title: 'Move non-scannable images only',
        },
      ],
    })
  }

  if (!options.tolerance) {
    promptQuestions.push({
      type: 'select',
      name: 'tolerance',
      message: 'Scanner tolerance',
      choices: [
        {
          value: 'high',
          title: 'High tolerance (try 37 times)',
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
    })
  }

  if (!promptQuestions)
    return options as CliOptions

  return Object.assign(options, await prompts(promptQuestions)) as CliOptions
}
