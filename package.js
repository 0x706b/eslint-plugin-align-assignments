/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs/promises')
const path = require('path')

;(async () => {
  let package = await fs
    .readFile(path.resolve(__dirname, 'package.json'))
    .then((buffer) => JSON.parse(buffer.toString('utf-8')))

  delete package.devDependencies
  delete package.scripts

  Object.assign(package, {
    main: 'index.js'
  })

  await fs.writeFile(path.resolve(__dirname, 'dist/package.json'), JSON.stringify(package))
})()
