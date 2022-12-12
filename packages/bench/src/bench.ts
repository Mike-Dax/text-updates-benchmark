import * as ss from 'simple-statistics'

function timeString(time: number) {
  if (time > 1_000) {
    // Between 1 and 10 seconds, show seconds to one decimal place
    // Math.round(( val / 1000 ) * 10) / 10
    const seconds = Math.round(time / 100) / 10

    return `${seconds}s`
  } else if (time > 1) {
    // Between 1ms and 1 second, milliseconds to 1 decimal places
    const milliseconds = Math.round(time * 10) / 10

    return `${milliseconds}ms`
  }

  // Below 1ms, display microseconds
  const microseconds = Math.round(time * 1000 * 10) / 10

  return `${microseconds}µs`
}

const confidenceInterval = 0.95
const measurementTime = 10_000 //

// The bench function runs a sample function a bunch of times and returns some statistics
export function bench(name: string, sample: () => void) {
  console.log('Characterising our clock...')

  let clockMinimumSamplingDuration = 0
  // Characterise the clock, to find a minimum sampling duration such that the clock is insignificant
  {
    const start = performance.now()
    const clockIterations = 10_000

    let dontoptimisemeout = 0
    for (let index = 0; index < clockIterations; index++) {
      dontoptimisemeout = performance.now()
    }

    // This will never be 0.
    if (dontoptimisemeout === 0) {
      console.log(`a wild side effect appears!`)
    }

    const end = performance.now()
    const clockDuration = end - start
    const estimatedClockCost = clockDuration / clockIterations

    // 10,000 x estimatedClockCost = the clock cost is 1/10_000th of the total
    const tenThousandsOfClockCost = 10_000 * estimatedClockCost
    clockMinimumSamplingDuration = tenThousandsOfClockCost
  }

  let coarseTimePerIteration = 0

  console.log('Characterising our sampling function...')

  // Characterise our sampling function to get a rough idea of how long it takes
  {
    // Collect a second of samples
    const coarseStart = Date.now()
    let iterations = 0

    let loopIter = 1
    while (Date.now() - coarseStart < 500) {
      for (let index = 0; index < Math.pow(2, loopIter); index++) {
        sample()
        iterations++
      }
      loopIter++
    }

    const coarseEnd = Date.now()

    const coarseTime = coarseEnd - coarseStart
    const coarseIterations = iterations
    coarseTimePerIteration = coarseTime / coarseIterations

    console.log(
      `did ${iterations} iterations in ${timeString(
        coarseTime,
      )} over ${loopIter} geometric loops, coarseTimePerIteration ${timeString(coarseTimePerIteration)}`,
    )
  }

  let outlierLimits: OutlierLimits = {
    mildMin: 0,
    mildMax: 0,
    severeMin: 0,
    severeMax: 0,
  }

  // How many samples to do for real
  let realSamples = 0

  console.log('Bootstrapping our stats...')

  // Bootstrap our statistics so we know when things are outliers
  {
    // Bootstrap for 3 seconds
    outlierLimits = calculateOutlierLimits(
      doMeasurement(sample, clockMinimumSamplingDuration, coarseTimePerIteration, 3_000),
    )
  }

  console.log('Sampling...')
  {
    let times: number[] = []
    let iterations = 100
    let samples = realSamples * 2
    let outliersTotal = 0
    let outliersMild = 0
    let outliersSevere = 0

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      for (let index = 0; index < samples; index++) {
        sample()
      }
      const end = performance.now()

      const time = (end - start) / samples

      times.push(time)

      const classification = classifySample(time, outlierLimits)

      if (classification === 'mild') {
        outliersMild++
        outliersTotal++
        console.log(`mild outlier: ${timeString(time)}`)
      } else if (classification === 'severe') {
        outliersSevere++
        outliersTotal++
        console.log(`severe outlier: ${timeString(time)}`)
      }
    }

    const min = ss.min(times)
    const max = ss.max(times)
    const std = ss.standardDeviation(times)
    const mean = ss.mean(times)
    const median = ss.median(times)
    const mad = ss.mad(times)

    // Calculate the bootstrap mean, standard deviation, variance
    const popStdDev = ss.standardDeviation(times)

    // calculate the lower bound
    const mean_lb = mean - (popStdDev * confidenceInterval) / Math.sqrt(times.length)
    const mean_ub = mean + (popStdDev * confidenceInterval) / Math.sqrt(times.length)

    if (outliersTotal > 0) {
      console.log(
        `total outliers: ${outliersTotal} (${
          Math.round((outliersTotal / iterations) * 100 * 10) / 10
        }% of iterations), mild: ${outliersMild} ${
          outliersMild > 0 ? `(${Math.round((outliersMild / outliersTotal) * 100 * 10) / 10}% of outliers)` : ``
        }, severe: ${outliersSevere} ${
          outliersSevere > 0 ? `(${Math.round((outliersSevere / outliersTotal) * 100 * 10) / 10}% of outliers)` : ``
        }`,
      )

      if (outliersTotal / iterations > 0.01) {
        console.error(`more than 1% of iterations were outliers`)
      }
    } else {
      console.log(`no outliers`)
    }

    console.log(`${iterations} iterations, ${samples} samples per iteration`)

    console.log(`mean_lb: ${timeString(mean_lb)}, mean: ${timeString(mean)}, mean_ub: ${timeString(mean_ub)}`)

    const smplStdDev = ss.sampleStandardDeviation(times)

    const smplStdDev_lb = smplStdDev - (popStdDev * confidenceInterval) / Math.sqrt(times.length)
    const smplStdDev_ub = smplStdDev + (popStdDev * confidenceInterval) / Math.sqrt(times.length)

    console.log(
      `smplStdDev_lb: ${timeString(smplStdDev_lb)}, smplStdDev: ${timeString(smplStdDev)}, smplStdDev_ub: ${timeString(
        smplStdDev_ub,
      )}`,
    )

    console.log(
      `${name} min: ${timeString(min)} max: ${timeString(max)} median: ${timeString(median)} mad: ${timeString(mad)}`,
    )
  }
}

// collecting 100 samples, 1911 iterations each, in estimated 995.8188 ms

// collect some samples to bootstrap the statistics

interface OutlierLimits {
  mildMin: number
  mildMax: number
  severeMin: number
  severeMax: number
}

function calculateOutlierLimits(times: number[]): OutlierLimits {
  const q1 = ss.quantile(times, 0.25)
  const q3 = ss.quantile(times, 0.75)
  const iqr = q3 - q1

  // Between these two is considered normal
  const mildMin = q1 - 1.5 * iqr
  const mildMax = q3 + 1.5 * iqr

  // Between the mild and severe values is considered a mild outlier
  const severeMin = q1 - 3 * iqr
  const severeMax = q3 + 3 * iqr

  console.log(`mildMin: ${timeString(mildMin)}, mildMax: ${timeString(mildMax)}`)
  console.log(`severeMin: ${timeString(severeMin)}, severeMax: ${timeString(severeMax)}`)

  // Beyond the severe values is considered a severe outlier
  return {
    mildMin,
    mildMax,
    severeMin,
    severeMax,
  }
}

type Classification = 'normal' | 'mild' | 'severe'

function classifySample(sample: number, outlierLimits: OutlierLimits): Classification {
  if (sample < outlierLimits.severeMin) {
    return 'severe'
  }
  if (sample < outlierLimits.mildMin) {
    return 'mild'
  }
  if (sample > outlierLimits.severeMax) {
    return 'severe'
  }
  if (sample > outlierLimits.mildMax) {
    return 'mild'
  }
  return 'normal'
}

type Samples = number[] // an array of sample times in milliseconds

function doMeasurement(
  sample: () => void,
  clockMinimumSamplingDuration: number,
  coarseTimePerIteration: number,
  measurementTime: number,
): Samples {
  // Calculate the minimum number of samples to do such that the clock time is not significant
  const minSamples = Math.ceil(clockMinimumSamplingDuration / coarseTimePerIteration)

  // Begin sampling, increasing the factor of samples until the measurement time is reached

  const start = Date.now()
  let N = 1

  // Record the calculated time for each iteration
  const times: number[] = []

  while (Date.now() - start < measurementTime) {
    const samples = N * minSamples

    const start = performance.now()
    for (let index = 0; index < samples; index++) {
      sample()
    }
    const end = performance.now()

    times.push((end - start) / samples)

    N++
  }

  console.log(`Completed ${N} iterations from ${minSamples} to ${N * minSamples} samples`)

  return times
}
