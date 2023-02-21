import React from 'react'
import ReactDOM from 'react-dom/client'
import { run } from './benches/preact-signals-monkey'

async function main() {
  const element = document.getElementById('root') as HTMLElement

  console.log(`starting benchmarks`)

  console.log(`results: `, await run(element))
}

main()
