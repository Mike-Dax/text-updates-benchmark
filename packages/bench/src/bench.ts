import * as ss from 'simple-statistics'

// A function that returns a factory
type Sampler = () => () => void
type Milliseconds = number // float number of milliseconds
type FloatPercentage = number // float 0 - 1 representing 0 - 100%

type Measurement = {
  iterations: number // how many iterations of the sampler function were run
  elapsedTime: Milliseconds // the amount of milliseconds it took to do that many iterations
}

// Convert a time into a string
function timeString(time: Milliseconds) {
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

interface BenchSettings {
  minMeasurementTime: Milliseconds
  maxMeasurementTime: Milliseconds
  targetSignificanceLevel: FloatPercentage
  /**
   * How insignificant should the clock be. The reciprocal of this number is the amount the clock may have significance.
   *
   * @default 10_000
   */
  clockFactor: number

  /**
   * When calculating properties, how many bootstrap resamples to do
   */

  bootstrapResamples: number

  /**
   * The confidence interval to use when calculating bootstrapped statistics
   */
  confidenceInterval: FloatPercentage
}

const defaultSettings: BenchSettings = {
  minMeasurementTime: 2_000,
  maxMeasurementTime: 30_000,
  targetSignificanceLevel: 0.05,
  clockFactor: 1_000,
  bootstrapResamples: 100_000, // 100k in criterion
  confidenceInterval: 0.95,
}

// The bench function runs a sample function a bunch of times and returns some statistics
export function bench(name: string, samplerFactory: Sampler, settings: Partial<BenchSettings> = {}) {
  console.log('Characterising our clock...')

  const settingsWithDefaults = Object.assign({}, defaultSettings, settings)

  // Characterise the clock, to find a minimum sampling duration such that the clock is insignificant
  const clockMinimumSamplingDuration = minIterationTimeForInsignificantClockInterference(
    settingsWithDefaults.clockFactor,
  )

  console.log('Characterising our sampling function...')
  const coarseTimePerIteration = warmup(samplerFactory, 2000)

  console.log('Sampling...')
  const measurements = doMeasurements(
    samplerFactory,
    clockMinimumSamplingDuration,
    coarseTimePerIteration,
    settingsWithDefaults.minMeasurementTime,
    settingsWithDefaults.maxMeasurementTime,
    settingsWithDefaults.targetSignificanceLevel,
  )

  console.log('Calculating outlier limits...')
  const outlierLimits = calculateOutlierLimits(measurements)

  console.log('Calculating outliers...')
  const {
    normal: normalCount,
    mild: mildCount,
    severe: severeCount,
  } = classifyMeasurements(measurements, outlierLimits)

  const outliersTotal = mildCount + severeCount
  const measurementCount = measurements.length

  if (outliersTotal > 0) {
    console.log(
      `total outliers: ${outliersTotal} (${
        Math.round((outliersTotal / measurementCount) * 100 * 10) / 10
      }% of iterations), mild: ${mildCount} ${
        mildCount > 0 ? `(${Math.round((mildCount / outliersTotal) * 100 * 10) / 10}% of outliers)` : ``
      }, severe: ${severeCount} ${
        severeCount > 0 ? `(${Math.round((severeCount / outliersTotal) * 100 * 10) / 10}% of outliers)` : ``
      }`,
    )

    if (outliersTotal / measurementCount > 0.01) {
      console.error(`more than 1% of iterations were outliers`)
    }
  } else {
    console.log(`no outliers`)
  }

  console.log('Bootstrapping statistics...')

  const times = measurements.map(m => m.elapsedTime / m.iterations)
  const line = measurements.map(m => [m.elapsedTime, m.iterations])

  const bootstrapResults = bootstrapStatistics(
    times,
    settingsWithDefaults.confidenceInterval,
    settingsWithDefaults.bootstrapResamples,
    (propertySample: number[]) => ({
      mean: ss.mean(propertySample),
      stddev: ss.standardDeviation(propertySample),
      median: ss.median(propertySample),
      mad: ss.mad(propertySample),
      r2: ss.rSquared(line, ss.linearRegressionLine(ss.linearRegression(line))),
    }),
  )

  for (const stat of Object.keys(bootstrapResults)) {
    console.log(
      `${stat}: ${timeString(bootstrapResults[stat as keyof typeof bootstrapResults].stat)} (lb: ${timeString(
        bootstrapResults[stat as keyof typeof bootstrapResults].lb,
      )} ub: ${timeString(bootstrapResults[stat as keyof typeof bootstrapResults].ub)})`,
    )
  }
}

// collecting 100 samples, 1911 iterations each, in estimated 995.8188 ms

// collect some samples to bootstrap the statistics

type OutlierLimits = {
  mildMin: number
  mildMax: number
  severeMin: number
  severeMax: number
}

function calculateOutlierLimits(measurements: Measurement[]): OutlierLimits {
  const times = measurements.map(m => m.elapsedTime / m.iterations)

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

type ClassifiedMeasurementCounts = {
  normal: number
  mild: number
  severe: number
}

function classifyMeasurements(measurements: Measurement[], outlierLimits: OutlierLimits): ClassifiedMeasurementCounts {
  let normal = 0
  let mild = 0
  let severe = 0

  for (let index = 0; index < measurements.length; index++) {
    const measurement = measurements[index]
    const time = measurement.elapsedTime / measurement.iterations

    if (time < outlierLimits.severeMin) {
      severe++
    } else if (time < outlierLimits.mildMin) {
      mild++
    } else if (time > outlierLimits.severeMax) {
      severe++
    } else if (time > outlierLimits.mildMax) {
      mild++
    } else {
      normal++
    }
  }

  return {
    normal,
    mild,
    severe,
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

/**
 * In browsers, the clock might be rounded to the nearest millisecond
 */
function minIterationTimeForInsignificantClockInterference(clockFactor: number): Milliseconds {
  // Do 10k clock iterations to get a rough idea of how long it takes to call
  let estimatedClockCost = 0
  {
    const start = performance.now()
    const clockIterations = 10_000

    let dontoptimisemeout = 0
    for (let index = 0; index < clockIterations; index++) {
      dontoptimisemeout = performance.now()
    }

    const end = performance.now()

    // This will never be a 0, but the runtime won't know that
    if (dontoptimisemeout === 0) {
      console.log(`a wild side effect appears!`)
    }

    const clockDuration = end - start
    estimatedClockCost = clockDuration / clockIterations
  }

  console.log(`estimatedClockCost: ${timeString(estimatedClockCost)}`)

  let estimatedClockPrecision = 0
  // Count how many iterations it takes for the clock to change value
  // So we can estimate rounding
  {
    let t0 = performance.now()
    let t1 = performance.now()
    while (t0 === t1) {
      t1 = performance.now()
    }

    estimatedClockPrecision = t1 - t0
  }

  console.log(`estimatedClockPrecision: ${timeString(estimatedClockPrecision)}`)

  const largerClockCost = Math.max(estimatedClockCost, estimatedClockPrecision)

  // 10,000 x estimatedClockCost = the clock cost is 1/10,000th of the total time
  const multipliedOutClockCost = clockFactor * largerClockCost

  console.log(`clockBasedMinSamplingDuration: ${timeString(multipliedOutClockCost)}`)

  return multipliedOutClockCost
}

// Warms up the JIT and returns the coarse time per iteration
function warmup(samplerFactory: Sampler, warmupTime: Milliseconds): Milliseconds {
  const coarseStart = Date.now()
  let iterations = 0

  let loopIter = 1
  while (Date.now() - coarseStart < warmupTime) {
    const sampler = samplerFactory()
    for (let index = 0; index < Math.pow(2, loopIter); index++) {
      sampler()
      iterations++
    }
    loopIter++
  }

  const coarseEnd = Date.now()

  const coarseTime = coarseEnd - coarseStart
  const coarseIterations = iterations

  return coarseTime / coarseIterations
}

function doMeasurements(
  samplerFactory: Sampler,
  minimumIterationTimeForClockInterference: Milliseconds, // the minimum sampling duration where the clock is not statistically significant
  coarseTimePerIteration: Milliseconds, // estimation for a single iteration
  minMeasurementTime: Milliseconds, // 2 seconds min
  maxMeasurementTime: Milliseconds, // 10 seconds max
  targetSignificanceLevel: number, // 0.05
): Measurement[] {
  // Calculate the minimum number of samples to do such that the clock time is not significant
  const minIterations = Math.ceil(minimumIterationTimeForClockInterference / coarseTimePerIteration)

  // Begin sampling, increasing the factor of samples until the measurement time is reached
  let N = 1

  // Record the calculated time for each iteration
  const measurements: Measurement[] = []

  const measurementStart = Date.now()

  while (true) {
    const iterations = N * minIterations

    console.log(`Running ${iterations} iterations on run ${N}`)

    // We ignore the setup time
    const sampler = samplerFactory()

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      sampler()
    }
    const end = performance.now()

    measurements.push({
      iterations,
      elapsedTime: end - start,
    })

    // Increase the number of iterations
    N++

    // Calculate exit conditions
    const measurementDuration = Date.now() - measurementStart

    // Exceeded the maximum measurement duration, exit now
    if (measurementDuration > maxMeasurementTime) {
      console.log(`measurementDuration: ${timeString(measurementDuration)}`)
      break
    }

    // If we have more than one measurement, and the measurement duration is greater than the minimum measurement duration
    // then we can calculate the standard deviation of the measurements and check if it is below the threshold
    // if (measurements.length > 1 && measurementDuration > minMeasurementTime) {
    //   const sampleStandardDev = ss.sampleStandardDeviation(measurements.map(m => m.elapsedTime / m.iterations))

    //   console.log(`sampleStandardDev: ${sampleStandardDev} targetSignificanceLevel: ${targetSignificanceLevel}`)

    //   if (sampleStandardDev < targetSignificanceLevel) {
    //     console.log(`exiting early`)
    //     break
    //   }
    // }
  }

  return measurements
}

/**
 * Criterion
 * 
    confidence_level: 0.95,
    measurement_time: Duration::from_secs(5),
    noise_threshold: 0.01,
    nresamples: 100_000,
    sample_size: 100,
    significance_level: 0.05,
    warm_up_time: Duration::from_secs(3),
    sampling_mode: SamplingMode::Auto,
    quick_mode: false,
 */

interface KeyedStatistics {
  [key: string]: number
}

function bootstrapStatistics<Stats extends KeyedStatistics>(
  propertySample: number[],
  confidenceInterval: FloatPercentage,
  resamples: number,
  calcStatistics: (propertySample: number[]) => Stats,
) {
  // Uses bootstrap sampling to calculate upper and lower bounds to a confidence interval

  const baseStats = calcStatistics(propertySample)

  // Preallocated array for holding the bootstrapped samples
  const sampleScratch = new Array(propertySample.length)

  // Our bootstrapped statistic values, in an object of arrays
  const resampledStatsBag: {
    [K in keyof Stats]: number[]
  } = {} as any

  const statKeys: (keyof Stats)[] = Object.keys(baseStats)
  const statKeyLength = statKeys.length

  for (const statKey of statKeys) {
    resampledStatsBag[statKey] = new Array(resamples)
  }

  // For each resample iteration
  for (let i = 0; i < resamples; i++) {
    // Sample with replacement into the sampleScratch array
    for (let j = 0; j < propertySample.length; j++) {
      // Pick a random element from the propertySample
      const randomIndex = Math.floor(Math.random() * propertySample.length)
      const randomSample = propertySample[randomIndex]

      sampleScratch[j] = randomSample
    }

    // Calculate our resampled statistic
    const resampledStats = calcStatistics(sampleScratch)

    for (let j = 0; j < statKeyLength; j++) {
      const statKey = statKeys[j]
      const resampledStatAtKey = resampledStats[statKey]

      resampledStatsBag[statKey][i] = resampledStatAtKey
    }
  }

  // For each statistic

  const results: {
    [K in keyof Stats]: {
      stat: number
      lb: number
      ub: number
    }
  } = {} as any

  for (let j = 0; j < statKeyLength; j++) {
    const statKey = statKeys[j]
    const samples = resampledStatsBag[statKey]

    // In place, sort the samples
    samples.sort()

    const numSamples = samples.length
    const mean = ss.mean(samples)

    // Calculate the lower and upper bounds of the statistics
    const lowerBound = ss.quantileSorted(samples, 0.5 - confidenceInterval / 2)
    const upperBound = ss.quantileSorted(samples, 0.5 + confidenceInterval / 2)

    results[statKey] = {
      stat: baseStats[statKey],
      lb: lowerBound,
      ub: upperBound,
    }
  }

  return results
}
